import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { npx } from "./shell";

export const EAS_CLI = "eas-cli@21.7.0";

export class EasSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EasSetupError";
  }
}

export type EasBuild = {
  id: string;
  status: string;
  detailsUrl?: string;
  artifactUrl?: string;
  error?: string;
};

function redacted(text: string) {
  const token = process.env.EXPO_TOKEN;
  return token ? text.replaceAll(token, "[redacted]") : text;
}

function parseJson(stdout: string): unknown {
  const clean = stdout.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const first = Math.max(clean.lastIndexOf("\n{"), clean.lastIndexOf("\n["));
    if (first >= 0) return JSON.parse(clean.slice(first + 1));
    throw new Error(`EAS returned non-JSON output: ${clean.slice(-600)}`);
  }
}

function normaliseBuild(payload: unknown): EasBuild {
  const root = Array.isArray(payload) ? payload[0] : payload;
  const value =
    root && typeof root === "object" && "build" in root
      ? (root as { build: unknown }).build
      : root;
  if (!value || typeof value !== "object") throw new Error("EAS did not return a build object");
  const build = value as Record<string, unknown>;
  const id = typeof build.id === "string" ? build.id : undefined;
  if (!id) throw new Error("EAS build response has no id");
  const artifacts =
    build.artifacts && typeof build.artifacts === "object"
      ? (build.artifacts as Record<string, unknown>)
      : undefined;
  const errorValue = build.error ?? build.errorMessage;
  return {
    id,
    status: String(build.status ?? "UNKNOWN").toUpperCase(),
    detailsUrl:
      (typeof build.buildDetailsPageUrl === "string" && build.buildDetailsPageUrl) ||
      (typeof build.detailsPageUrl === "string" && build.detailsPageUrl) ||
      (typeof build.url === "string" && build.url) ||
      undefined,
    artifactUrl:
      (typeof artifacts?.buildUrl === "string" && artifacts.buildUrl) ||
      (typeof build.artifactUrl === "string" && build.artifactUrl) ||
      undefined,
    error:
      typeof errorValue === "string"
        ? errorValue
        : errorValue && typeof errorValue === "object" && "message" in errorValue
          ? String((errorValue as { message: unknown }).message)
          : undefined,
  };
}

function projectIdFromAppJson(dir: string) {
  const path = join(dir, "app.json");
  if (!existsSync(path)) return undefined;
  try {
    const config = JSON.parse(readFileSync(path, "utf8")) as {
      expo?: { extra?: { eas?: { projectId?: unknown } } };
    };
    const value = config.expo?.extra?.eas?.projectId;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function setupError(detail: string) {
  return /EXPO_TOKEN|not logged in|authentication|project id|project.*not found/i.test(detail);
}

/** Link a generated app to its own EAS project; EAS writes the unique ID into app.json. */
export async function ensureEasProject(dir: string) {
  const existing = projectIdFromAppJson(dir);
  if (existing) return { projectId: existing, created: false };
  if (!process.env.EXPO_TOKEN) {
    throw new EasSetupError("EXPO_TOKEN is not configured for the Trigger worker");
  }

  const result = await npx([EAS_CLI, "init", "--force", "--non-interactive"], {
    cwd: dir,
    timeoutMs: 5 * 60 * 1000,
  });
  const detail = redacted(`${result.stdout}\n${result.stderr}`);
  if (result.code !== 0) {
    if (setupError(detail)) throw new EasSetupError(detail.slice(-1800));
    throw new Error(`eas init failed: ${detail.slice(-1800)}`);
  }
  const projectId = projectIdFromAppJson(dir);
  if (!projectId) {
    throw new EasSetupError("eas init completed without writing extra.eas.projectId to app.json");
  }
  return { projectId, created: true };
}

/** Queue a cloud-built iOS Simulator artifact. This never invokes a local Xcode build. */
export async function queueIosSimulatorBuild(dir: string): Promise<EasBuild> {
  if (!process.env.EXPO_TOKEN) {
    throw new EasSetupError("EXPO_TOKEN is not configured for the Trigger worker");
  }
  const result = await npx(
    [
      EAS_CLI,
      "build",
      "--platform",
      "ios",
      "--profile",
      "preview-simulator",
      "--non-interactive",
      "--no-wait",
      "--json",
    ],
    { cwd: dir, timeoutMs: 5 * 60 * 1000 },
  );
  const detail = redacted(`${result.stdout}\n${result.stderr}`);
  if (result.code !== 0) {
    if (setupError(detail)) throw new EasSetupError(detail.slice(-1800));
    throw new Error(`eas build failed to start: ${detail.slice(-1800)}`);
  }
  return normaliseBuild(parseJson(result.stdout));
}

/** Read a queued EAS build by immutable ID; usable from a small poller worker. */
export async function getEasBuild(buildId: string): Promise<EasBuild> {
  if (!process.env.EXPO_TOKEN) {
    throw new EasSetupError("EXPO_TOKEN is not configured for the Trigger worker");
  }
  const result = await npx([EAS_CLI, "build:view", buildId, "--json", "--non-interactive"], {
    timeoutMs: 2 * 60 * 1000,
  });
  const detail = redacted(`${result.stdout}\n${result.stderr}`);
  if (result.code !== 0) {
    if (setupError(detail)) throw new EasSetupError(detail.slice(-1800));
    throw new Error(`eas build:view failed: ${detail.slice(-1800)}`);
  }
  return normaliseBuild(parseJson(result.stdout));
}
