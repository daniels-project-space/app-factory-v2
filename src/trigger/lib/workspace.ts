import { existsSync, mkdirSync, rmSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sh } from "./shell";
import { REPO } from "@/factory/config";
import { formatOpenAiApiPolicyViolations, scanOpenAiApiPolicy } from "./openai-api-policy";

const WS = "/tmp/factory";

const token = () => {
  const t = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  if (!t) throw new Error("GITHUB_TOKEN not set");
  return t;
};
const remoteUrl = () => `https://x-access-token:${token()}@github.com/${REPO.full}.git`;

/** Fresh shallow checkout of the factory repo (apps live inside it). */
export async function prepareRepo(): Promise<string> {
  const dir = join(WS, "repo");
  if (existsSync(join(dir, ".git"))) {
    await sh("git", ["-C", dir, "fetch", "--depth", "1", "origin", "main"]);
    await sh("git", ["-C", dir, "reset", "--hard", "origin/main"]);
    await sh("git", ["-C", dir, "clean", "-fd", "--exclude=apps/*/node_modules"]);
    return dir;
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(WS, { recursive: true });
  const res = await sh("git", ["clone", "--depth", "1", remoteUrl(), dir]);
  if (res.code !== 0) throw new Error(`clone failed: ${res.stderr.slice(0, 400)}`);
  await sh("git", ["-C", dir, "config", "user.name", "App Factory"]);
  await sh("git", ["-C", dir, "config", "user.email", "factory@daniels-project-space.local"]);
  return dir;
}

export const appDir = (repo: string, slug: string) => join(repo, REPO.appsDir, slug);

/**
 * Scaffold a new app from templates/starter. Deterministic — zero LLM tokens.
 * The app folder is fully self-contained so it can later be extracted to its
 * own repo by copying the folder.
 */
export function scaffoldApp(repo: string, slug: string, name: string): string {
  const dst = appDir(repo, slug);
  if (existsSync(join(dst, "package.json"))) return dst;
  const src = join(repo, REPO.templateDir);
  if (!existsSync(join(src, "package.json"))) {
    throw new Error(`starter template missing at ${src}`);
  }
  cpSync(src, dst, { recursive: true });
  // Rewrite identity files.
  for (const file of ["package.json", "app.json"]) {
    const p = join(dst, file);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, "utf8");
    text = text
      .replaceAll("__APP_SLUG__", slug)
      .replaceAll("__APP_NAME__", name)
      .replaceAll("__BUNDLE_ID__", `space.danielsproject.${slug.replace(/-/g, "")}`);
    writeFileSync(p, text);
  }
  // Web exports are served from /demo/<slug>/ — bake the base URL so asset
  // paths resolve there (v1 sed-hacked exported bundles instead; never again).
  const appJsonPath = join(dst, "app.json");
  const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));
  appJson.expo.experiments = { ...(appJson.expo.experiments ?? {}), baseUrl: `/demo/${slug}` };
  writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  mkdirSync(join(dst, ".factory"), { recursive: true });
  return dst;
}

/**
 * Forge lane: port an OSS repo into apps/<slug> as the starting point instead
 * of the starter template. Keeps the upstream LICENSE (MIT/Apache obligation),
 * strips git history and upstream branding files that the designer will replace.
 */
export async function portForgeSource(
  repo: string,
  slug: string,
  sourceRepoUrl: string,
): Promise<string> {
  const dst = appDir(repo, slug);
  if (existsSync(join(dst, "package.json"))) return dst;
  const tmp = join(WS, "forge-src", slug);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const res = await sh("git", ["clone", "--depth", "1", sourceRepoUrl, tmp], {
    timeoutMs: 5 * 60 * 1000,
  });
  if (res.code !== 0) throw new Error(`forge clone failed: ${res.stderr.slice(0, 400)}`);
  rmSync(join(tmp, ".git"), { recursive: true, force: true });
  cpSync(tmp, dst, { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(join(dst, ".factory"), { recursive: true });
  writeFileSync(
    join(dst, ".factory", "FORGE.md"),
    `Ported from ${sourceRepoUrl} — upstream LICENSE retained in this folder (legal requirement). All upstream names/logos must be replaced; LICENSE file must never be removed.`,
  );
  return dst;
}

/** Ensure the app's node_modules exist (npm ci against committed lockfile). */
export async function ensureDeps(dir: string): Promise<void> {
  if (existsSync(join(dir, "node_modules", ".package-lock.json"))) return;
  const hasLock = existsSync(join(dir, "package-lock.json"));
  const res = await sh("npm", [hasLock ? "ci" : "install", "--no-audit", "--no-fund"], {
    cwd: dir,
    timeoutMs: 10 * 60 * 1000,
  });
  if (res.code !== 0) throw new Error(`npm install failed: ${res.stderr.slice(-800)}`);
}

/** Commit everything under the app folder and push, rebase-retrying once. */
export async function commitAndPush(repo: string, slug: string, message: string) {
  const dir = appDir(repo, slug);
  const policyViolations = scanOpenAiApiPolicy(dir);
  if (policyViolations.length > 0) {
    throw new Error(
      `OpenAI API policy blocked commit for ${REPO.appsDir}/${slug}:\n${formatOpenAiApiPolicyViolations(policyViolations)}`,
    );
  }
  await sh("git", ["-C", repo, "add", `${REPO.appsDir}/${slug}`]);
  const status = await sh("git", ["-C", repo, "status", "--porcelain"]);
  if (status.stdout.trim()) {
    await sh("git", ["-C", repo, "commit", "-m", message]);
  }
  let push = await sh("git", ["-C", repo, "push", remoteUrl(), "HEAD:main"]);
  const out = (push.stdout + push.stderr).toLowerCase();
  if (/shallow update not allowed/.test(out)) {
    await sh("git", ["-C", repo, "fetch", "--unshallow"]);
    push = await sh("git", ["-C", repo, "push", remoteUrl(), "HEAD:main"]);
  } else if (/rejected|non-fast-forward|fetch first/.test(out)) {
    await sh("git", ["-C", repo, "fetch", "origin", "main"]);
    await sh("git", ["-C", repo, "rebase", "origin/main"]);
    push = await sh("git", ["-C", repo, "push", remoteUrl(), "HEAD:main"]);
  }
  const finalOut = (push.stdout + push.stderr).toLowerCase();
  if (push.code !== 0 && !/everything up-to-date/.test(finalOut)) {
    throw new Error(`push failed: ${push.stderr.slice(-400)}`);
  }
}

export function readReport(dir: string): { completedItems: string[]; fixedIssues: string[]; notes: string } {
  try {
    const raw = readFileSync(join(dir, ".factory", "report.json"), "utf8");
    const parsed = JSON.parse(raw);
    return {
      completedItems: Array.isArray(parsed.completedItems) ? parsed.completedItems : [],
      fixedIssues: Array.isArray(parsed.fixedIssues) ? parsed.fixedIssues : [],
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return { completedItems: [], fixedIssues: [], notes: "no report written" };
  }
}

export function writeBriefFile(dir: string, content: string) {
  mkdirSync(join(dir, ".factory"), { recursive: true });
  writeFileSync(join(dir, ".factory", "brief.md"), content);
}
