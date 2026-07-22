import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { sh, npx } from "./shell";
import { formatOpenAiApiPolicyViolations, scanOpenAiApiPolicy } from "./openai-api-policy";

/**
 * Deterministic quality gates. These are EXECUTED BEHAVIOR, not grep-theater:
 * a gate failure is a hard fact with the tool's own output attached.
 */

export type GateIssue = {
  fingerprint: string;
  severity: "P0" | "P1" | "P2" | "P3";
  source: "gate";
  title: string;
  detail: string;
};

export type GateResult = {
  ok: boolean;
  issues: GateIssue[];
  exportDir?: string;
};

export async function runGates(dir: string): Promise<GateResult> {
  const issues: GateIssue[] = [];

  // 1. No OpenAI API path or instruction may enter a generated app. This is
  // intentionally first and scans dotfiles, docs, SQL, templates, and Forge
  // imports before any executable quality check can mask the policy failure.
  const policyViolations = scanOpenAiApiPolicy(dir);
  if (policyViolations.length > 0) {
    issues.push({
      fingerprint: "gate:openai-api-policy",
      severity: "P0",
      source: "gate",
      title: `OpenAI API policy violation in ${policyViolations.length} location(s)`,
      detail: formatOpenAiApiPolicyViolations(policyViolations),
    });
  }

  // 2. TypeScript — blocking.
  const tsc = await npx(["tsc", "--noEmit"], { cwd: dir, timeoutMs: 5 * 60 * 1000 });
  if (tsc.code !== 0) {
    issues.push({
      fingerprint: "gate:tsc",
      severity: "P0",
      source: "gate",
      title: "TypeScript errors",
      detail: (tsc.stdout + tsc.stderr).slice(-3500),
    });
  }

  // 3. Placeholder scan — blocking (v1's zero-placeholder policy, kept).
  const bad = scanPlaceholders(dir);
  if (bad.length > 0) {
    issues.push({
      fingerprint: "gate:placeholders",
      severity: "P0",
      source: "gate",
      title: `Placeholder content in ${bad.length} file(s)`,
      detail: bad.slice(0, 12).join("\n"),
    });
  }

  // 4. Expo web export — blocking. The demo artifact must exist.
  let exportDir: string | undefined;
  if (issues.length === 0) {
    const exp = await npx(["expo", "export", "--platform", "web", "--output-dir", "dist"], {
      cwd: dir,
      timeoutMs: 12 * 60 * 1000,
      env: {
        ...process.env,
        CI: "1",
        EXPO_NO_TELEMETRY: "1",
        // Scaffolded apps bake baseUrl in app.json; ported apps read this env
        // (their app.config.ts uses EXPO_BASE_URL). Both resolve to /demo/<slug>.
        EXPO_BASE_URL: `/demo/${basename(dir)}`,
      },
    });
    if (exp.code !== 0 || !existsSync(join(dir, "dist", "index.html"))) {
      issues.push({
        fingerprint: "gate:export",
        severity: "P0",
        source: "gate",
        title: "expo export --platform web failed",
        detail: (exp.stdout + exp.stderr).slice(-3500),
      });
    } else {
      exportDir = join(dir, "dist");
    }
  }

  return { ok: issues.filter((i) => i.severity === "P0").length === 0, issues, exportDir };
}

// NOTE: the bare word "placeholder" is NOT scanned — it's a legitimate RN
// TextInput prop. We hunt placeholder CONTENT, plus unrendered scaffold tokens.
const PLACEHOLDER_RE =
  /(\blorem\b|john doe|jane doe|foo@example|test@example|your-\w+-here|sk_test_[A-Za-z0-9]{8}|__APP_SLUG__|__APP_NAME__|__BUNDLE_ID__)/i;
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".json"]);

function scanPlaceholders(root: string): string[] {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (SCAN_EXT.has(name.slice(name.lastIndexOf(".")))) {
        if (st.size > 300_000) continue;
        const text = readFileSync(p, "utf8");
        const m = text.match(PLACEHOLDER_RE);
        if (m) hits.push(`${p.slice(root.length + 1)}: "${m[0]}"`);
      }
    }
  };
  walk(root);
  return hits;
}

/** eslint is advisory (P2) — never blocks a demo, surfaces in review. */
export async function runLintAdvisory(dir: string): Promise<GateIssue[]> {
  if (!existsSync(join(dir, "eslint.config.js")) && !existsSync(join(dir, "eslint.config.mjs")))
    return [];
  const res = await npx(["eslint", ".", "--max-warnings", "9999"], {
    cwd: dir,
    timeoutMs: 4 * 60 * 1000,
  });
  if (res.code === 0) return [];
  const errCount = (res.stdout.match(/\d+ errors?/) ?? ["errors"])[0];
  return [
    {
      fingerprint: "gate:eslint",
      severity: "P2",
      source: "gate",
      title: `ESLint: ${errCount}`,
      detail: res.stdout.slice(-2500),
    },
  ];
}
