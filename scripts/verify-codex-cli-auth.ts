import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCodexCliForTest } from "../src/trigger/lib/engine";

const work = mkdtempSync(join(tmpdir(), "factory-codex-cli-test-"));
const capture = join(work, "capture.json");
const fakeCodex = join(work, "fake-codex");
const authEnvNames = [
  "CODEX_AUTH_JSON_B64",
  "CODEX_AUTH_JSON",
  "CODEX_ACCESS_TOKEN",
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "GITHUB_TOKEN",
  "R2_ACCESS_KEY_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
] as const;
const originalEnv = new Map(authEnvNames.map((name) => [name, process.env[name]]));

type Capture = {
  args: string[];
  env: Record<string, string | undefined>;
  config: string;
  authExists: boolean;
};

function restoreEnv() {
  for (const [name, value] of originalEnv) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function fakeCli() {
  writeFileSync(fakeCodex, `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const output = args[args.indexOf("--output-last-message") + 1];
fs.writeFileSync(${JSON.stringify(capture)}, JSON.stringify({
  args,
  env: process.env,
  config: fs.readFileSync(path.join(process.env.CODEX_HOME, "config.toml"), "utf8"),
  authExists: fs.existsSync(path.join(process.env.CODEX_HOME, "auth.json")),
}));
fs.writeFileSync(output, "offline fake response");
`);
  chmodSync(fakeCodex, 0o755);
}

async function main() {
  try {
    fakeCli();
    process.env.CODEX_AUTH_JSON_B64 = Buffer.from(JSON.stringify({ tokens: { access_token: "test-only" } })).toString("base64");
    process.env.CODEX_AUTH_JSON = "raw-auth-sentinel";
    process.env.CODEX_ACCESS_TOKEN = "token-sentinel";
    process.env.OPENAI_API_KEY = "api-only-sentinel";
    process.env.CODEX_API_KEY = "api-only-sentinel";
    process.env.GITHUB_TOKEN = "github-sentinel";
    process.env.R2_ACCESS_KEY_ID = "r2-sentinel";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "supabase-sentinel";
    process.env.ANTHROPIC_API_KEY = "provider-sentinel";

    const result = await runCodexCliForTest(fakeCodex, "This fake executable must not call a model.", {
      stage: "build",
      model: "sonnet",
      triggerRunId: "offline-auth-test",
      cwd: process.cwd(),
    });
    assert.equal(result.text, "offline fake response");

    const observed = JSON.parse(readFileSync(capture, "utf8")) as Capture;
    assert.ok(observed.args.includes("exec"));
    assert.ok(observed.args.includes('forced_login_method="chatgpt"'), "Codex must be forced to ChatGPT login");
    assert.equal(observed.config, 'forced_login_method = "chatgpt"\n');
    assert.equal(observed.authExists, true, "controller subscription auth must be available only in the temporary home");
    assert.equal(observed.env.OPENAI_API_KEY, "");
    assert.equal(observed.env.CODEX_API_KEY, "");
    assert.equal(observed.env.CODEX_AUTH_JSON_B64, undefined, "serialized controller auth must not leak into the child env");
    assert.equal(observed.env.CODEX_AUTH_JSON, undefined, "raw auth must not reach the child env");
    assert.equal(observed.env.CODEX_ACCESS_TOKEN, undefined, "token auth must not reach the child env");
    for (const sentinel of ["GITHUB_TOKEN", "R2_ACCESS_KEY_ID", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]) {
      assert.equal(observed.env[sentinel], undefined, `${sentinel} must not reach Codex`);
    }
    assert.equal(existsSync(observed.env.HOME!), false, "temporary Codex auth home must be removed after launch");

    rmSync(capture, { force: true });
    delete process.env.CODEX_AUTH_JSON_B64;
    process.env.CODEX_AUTH_JSON = "raw-auth-sentinel";
    process.env.CODEX_ACCESS_TOKEN = "token-sentinel";
    process.env.OPENAI_API_KEY = "api-only-sentinel";
    process.env.CODEX_API_KEY = "api-only-sentinel";
    await assert.rejects(
      runCodexCliForTest(fakeCodex, "No auth must fail before a child process starts.", {
        stage: "build",
        model: "sonnet",
        triggerRunId: "offline-api-only-test",
        cwd: process.cwd(),
      }),
      /Codex subscription auth is not configured/,
    );
    assert.equal(existsSync(capture), false, "API-only auth must not invoke the CLI");

    console.log("Codex CLI subscription-auth launch fixtures passed");
  } finally {
    restoreEnv();
    rmSync(work, { recursive: true, force: true });
  }
}

void main();
