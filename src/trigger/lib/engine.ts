import { mkdirSync } from "node:fs";
import type { ClaudeSDKAgent } from "@mastra/claude";
import type { z } from "zod";
import { cvxMutation } from "@/factory/convex";

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
  const runId = (await cvxMutation("pipeline:startRun", {
    ...(opts.appId ? { appId: opts.appId } : {}),
    stage: opts.stage,
    triggerRunId: opts.triggerRunId,
    model: opts.model,
  })) as string;

  try {
    const result = await agent.generate(prompt, {
      ...(opts.schema ? { structuredOutput: { schema: opts.schema } } : {}),
      sdkOptions: {
        model: opts.model,
        env: claudeEnv(),
        ...(opts.cwd ? { cwd: opts.cwd } : {}),
        ...(opts.maxTurns ? { maxTurns: opts.maxTurns } : {}),
      },
    } as never);

    const usage = (result as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const rate = RATES[opts.model] ?? RATES.sonnet;
    const costUsd = (inputTokens * rate.in + outputTokens * rate.out) / 1_000_000;

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
