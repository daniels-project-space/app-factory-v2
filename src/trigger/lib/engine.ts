import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { ClaudeSDKAgent } from "@mastra/claude";
import { z } from "zod";
import { cvxMutation, cvxQuery } from "@/factory/convex";
import { EFFORT, SESSION_USD_CAP } from "@/factory/config";
import { AGENT_INSTRUCTIONS } from "@/mastra/agents";

/**
 * Single execution wrapper for every Mastra agent run. Guarantees:
 * - runs on the Max subscription token (ANTHROPIC_API_KEY scrubbed)
 * - usage is recorded to Convex `runs` (the factory's cost ledger)
 * - structured output parsed + validated when a schema is given
 */

// Rough $/MTok for the ledger — client-side estimate, not billing truth.
const RATES: Record<string, { in: number; out: number }> = {
  opus: { in: 5, out: 25 },
  sonnet: { in: 3, out: 15 },
  haiku: { in: 1, out: 5 },
};

function claudeEnv(): Record<string, string> {
  mkdirSync("/tmp/claude-home", { recursive: true });
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.HOME = "/tmp/claude-home";
  env.ANTHROPIC_API_KEY = ""; // the dead platform key must never win
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = "1";
  return env;
}

const nodeRequire = createRequire(import.meta.url);
const CODEX_MODELS: Record<string, { model: string; effort: string }> = {
  haiku: { model: "gpt-5.6-terra", effort: "low" },
  sonnet: { model: "gpt-5.6-sol", effort: "medium" },
  opus: { model: "gpt-5.6", effort: "high" },
};
const STAGE_AGENT: Record<string, string> = {
  triage: "triage",
  "forge-scout": "forge-scout",
  inception: "inception",
  roadmap: "roadmap",
  design: "designer",
  build: "builder",
  fix: "fixer",
  vision: "vision",
  review: "reviewer",
  package: "packager",
};

function resolveCodexBin(): string | null {
  try {
    const pkgJson = nodeRequire.resolve("@openai/codex/package.json");
    const pkgDir = dirname(pkgJson);
    const nodeModules = dirname(dirname(pkgDir));
    const candidates = [join(nodeModules, ".bin", "codex")];
    const pkg = JSON.parse(readFileSync(pkgJson, "utf8")) as { bin?: string | Record<string, string> };
    const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.codex;
    if (rel) candidates.push(join(pkgDir, rel));
    return candidates.find((path) => existsSync(path)) ?? null;
  } catch {
    return null;
  }
}

function codexEnv(runId: string): NodeJS.ProcessEnv {
  const home = `/tmp/codex-home-${runId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  mkdirSync(home, { recursive: true });
  const encoded = process.env.CODEX_AUTH_JSON_B64;
  const raw = process.env.CODEX_AUTH_JSON;
  if (encoded || raw) {
    const json = encoded ? Buffer.from(encoded, "base64").toString("utf8") : raw!;
    JSON.parse(json);
    const authPath = join(home, "auth.json");
    writeFileSync(authPath, json, { mode: 0o600 });
    chmodSync(authPath, 0o600);
  }
  if (!process.env.CODEX_ACCESS_TOKEN && !encoded && !raw) throw new Error("Codex subscription auth is not configured");
  return { ...process.env, HOME: home, CODEX_HOME: home, OPENAI_API_KEY: "", CODEX_API_KEY: "" };
}

async function codexGenerate<S extends z.ZodTypeAny | undefined>(
  prompt: string,
  opts: RunOpts<S>,
): Promise<{ text: string; object: unknown }> {
  const bin = resolveCodexBin();
  if (!bin) throw new Error("Codex binary not found in Trigger image");
  const selected = CODEX_MODELS[opts.model] ?? CODEX_MODELS.sonnet;
  const tmp = `/tmp/factory-codex-${opts.triggerRunId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const outputPath = join(tmp, "final.txt");
  const args = [
    "exec",
    "--model", selected.model,
    "--config", `model_reasoning_effort=\"${selected.effort}\"`,
    "--dangerously-bypass-approvals-and-sandbox",
    "--ignore-user-config",
    "--output-last-message", outputPath,
  ];
  if (opts.schema) {
    const schemaPath = join(tmp, "schema.json");
    writeFileSync(schemaPath, JSON.stringify(z.toJSONSchema(opts.schema)));
    args.push("--output-schema", schemaPath);
  }
  const role = AGENT_INSTRUCTIONS[STAGE_AGENT[opts.stage] ?? opts.stage] ?? "You are a senior product and software agent. Complete the task precisely.";
  args.push(`${role}\n\nTask:\n${prompt}`);
  const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const child = spawn(bin, args, { cwd: opts.cwd, env: codexEnv(opts.triggerRunId), stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (data) => (stderr += data.toString()));
    child.on("close", (code) => resolve({ code, stderr }));
    child.on("error", (error) => resolve({ code: -1, stderr: `${stderr}\n${error.message}` }));
  });
  if (result.code !== 0) throw new Error(`Codex ${opts.stage} failed (${result.code}): ${result.stderr.slice(-500)}`);
  const text = existsSync(outputPath) ? readFileSync(outputPath, "utf8").trim() : "";
  if (!text) throw new Error(`Codex ${opts.stage} returned no final response`);
  return { text, object: opts.schema ? JSON.parse(text) : undefined };
}

export type RunOpts<S extends z.ZodTypeAny | undefined> = {
  appId?: string;
  stage: string;
  model: string;
  triggerRunId: string;
  cwd?: string;
  maxTurns?: number;
  schema?: S;
};

export async function runAgent<S extends z.ZodTypeAny | undefined = undefined>(
  agent: ClaudeSDKAgent,
  prompt: string,
  opts: RunOpts<S>,
): Promise<{ text: string; object: S extends z.ZodTypeAny ? z.infer<S> : undefined }> {
  const settings = (await cvxQuery("intake:getSettings")) as { agentProvider?: "codex" | "claude" };
  const provider = settings.agentProvider === "claude" ? "claude" : "codex";
  const selectedModel = provider === "codex" ? CODEX_MODELS[opts.model]?.model ?? CODEX_MODELS.sonnet.model : opts.model;
  const runId = (await cvxMutation("pipeline:startRun", {
    ...(opts.appId ? { appId: opts.appId } : {}),
    stage: opts.stage,
    triggerRunId: opts.triggerRunId,
    model: `${provider}/${selectedModel}`,
  })) as string;

  try {
    const result = provider === "codex"
      ? await codexGenerate(prompt, opts)
      : await agent.generate(prompt, {
          ...(opts.schema ? { structuredOutput: { schema: opts.schema } } : {}),
          sdkOptions: {
            model: opts.model,
            env: claudeEnv(),
            // Claude-only safety rails: effort routing controls thinking cost,
            // and the session cap stops a runaway subscription session.
            effort: EFFORT[opts.stage] ?? "medium",
            maxBudgetUsd: SESSION_USD_CAP[opts.stage] ?? 6,
            ...(opts.cwd ? { cwd: opts.cwd } : {}),
            ...(opts.maxTurns ? { maxTurns: opts.maxTurns } : {}),
          },
        } as never);

    const usage = (
      result as {
        usage?: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number };
      }
    ).usage;
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const cached = Math.min(usage?.cachedInputTokens ?? 0, inputTokens);
    const rate = RATES[opts.model] ?? RATES.sonnet;
    // Cache reads bill at ~10% of input rate — without this the budget guard
    // over-counts agentic sessions ~5-10x (they are mostly cache hits).
    const costUsd = provider === "codex"
      ? 0
      : ((inputTokens - cached) * rate.in + cached * rate.in * 0.1 + outputTokens * rate.out) /
        1_000_000;

    const text = (result as { text?: string }).text ?? "";
    const object = (result as { object?: unknown }).object;

    await cvxMutation("pipeline:finishRun", {
      runId,
      status: "succeeded",
      summary: text.slice(0, 300),
      inputTokens,
      outputTokens,
      costUsd,
    });

    if (opts.schema) {
      const parsed = (opts.schema as z.ZodTypeAny).safeParse(object);
      if (!parsed.success) {
        throw new Error(
          `structured output failed validation for ${opts.stage}: ${parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500)}`,
        );
      }
      return { text, object: parsed.data as never };
    }
    return { text, object: undefined as never };
  } catch (err) {
    await cvxMutation("pipeline:finishRun", {
      runId,
      status: "failed",
      summary: String(err).slice(0, 300),
    }).catch(() => {});
    throw err;
  }
}
