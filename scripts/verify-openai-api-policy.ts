import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  scanOpenAiApiPolicy,
  type OpenAiApiPolicyViolation,
} from "../src/trigger/lib/openai-api-policy";
import { runGates } from "../src/trigger/lib/gates";
import { commitAndPush, portForgeSource, scaffoldApp } from "../src/trigger/lib/workspace";

const work = mkdtempSync(join(tmpdir(), "factory-openai-policy-"));

function write(relativePath: string, contents: string) {
  const file = join(work, relativePath);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, contents);
}

function rules(root: string): OpenAiApiPolicyViolation["rule"][] {
  return scanOpenAiApiPolicy(root).map((violation) => violation.rule);
}

async function main() {
  try {
    // These fixtures are created at runtime: a static scan of this repository
    // alone would not prove that hidden and newly-created files are covered.
    write("host.ts", 'fetch("https://api.openai.com/v1/responses");');
    write("sdk.ts", "const client = new OpenAI({});");
    write("env.ts", 'const key = process.env.OPENAI_API_KEY;');
    write(".claude/skills/provider/SKILL.md", "Use OpenAI to generate the answer.");
    assert.deepEqual(new Set(rules(work)), new Set(["host", "sdk", "key", "instruction"]));

    const cleanRepo = join(work, "clean-repo");
    cpSync(join(process.cwd(), "templates", "starter"), join(cleanRepo, "templates", "starter"), {
      recursive: true,
    });
    const starter = scaffoldApp(cleanRepo, "policy-starter", "Policy Starter");
    assert.equal(scanOpenAiApiPolicy(starter).length, 0, "real starter scaffold must pass");

    writeFileSync(join(starter, "safe-env.ts"), 'export const env = { OPENAI_API_KEY: "", CODEX_API_KEY: "" };');
    writeFileSync(join(starter, "codex-cli.ts"), 'import "@openai/codex";');
    assert.equal(
      scanOpenAiApiPolicy(starter).length,
      0,
      "explicit empty key values and @openai/codex CLI wiring are permitted",
    );

    mkdirSync(join(starter, ".agent"), { recursive: true });
    writeFileSync(join(starter, ".agent", "note.md"), "Use OpenAI for copy.");
    const gates = await runGates(starter);
    assert.ok(
      gates.issues.some((issue) => issue.fingerprint === "gate:openai-api-policy" && issue.severity === "P0"),
      "runGates must report the policy as P0",
    );
    await assert.rejects(
      commitAndPush(cleanRepo, "policy-starter", "test(policy): must never commit poison"),
      /OpenAI API policy blocked commit/,
    );

    // Generated output may be present when a build, design, package, or WIP
    // path commits. It must not be exempted simply because app .gitignores
    // commonly exclude it: tracked or explicitly-added output is still stageable.
    const outputStarter = scaffoldApp(cleanRepo, "output-policy-starter", "Output Policy Starter");
    for (const directory of ["dist", "build", "out"]) {
      const outputPath = join(outputStarter, directory, "generated.js");
      mkdirSync(join(outputPath, ".."), { recursive: true });
      writeFileSync(outputPath, 'fetch("https://api.openai.com/v1/responses");');
    }
    const outputViolations = scanOpenAiApiPolicy(outputStarter);
    assert.deepEqual(
      new Set(outputViolations.map((violation) => violation.path.split("/")[0])),
      new Set(["dist", "build", "out"]),
      "generated dist, build, and out files must be scanned",
    );
    await assert.rejects(
      commitAndPush(cleanRepo, "output-policy-starter", "test(policy): output poison must never commit"),
      /OpenAI API policy blocked commit/,
    );

    const forgeSource = join(work, "forge-source");
    mkdirSync(forgeSource, { recursive: true });
    writeFileSync(join(forgeSource, "package.json"), '{"name":"forge-source"}');
    mkdirSync(join(forgeSource, "docs"), { recursive: true });
    writeFileSync(join(forgeSource, "docs", "integration.sql"), "-- call OpenAI before inserting");
    execFileSync("git", ["init"], { cwd: forgeSource, stdio: "ignore" });
    execFileSync("git", ["add", "."], { cwd: forgeSource, stdio: "ignore" });
    execFileSync("git", ["-c", "user.name=Policy Test", "-c", "user.email=policy@test.invalid", "commit", "-m", "fixture"], {
      cwd: forgeSource,
      stdio: "ignore",
    });
    const forgeRepo = join(work, "forge-repo");
    const forged = await portForgeSource(forgeRepo, "poisoned-forge", forgeSource);
    assert.ok(rules(forged).includes("instruction"), "Forge import must be scanned before commit");
    await assert.rejects(
      commitAndPush(forgeRepo, "poisoned-forge", "test(policy): Forge poison must never commit"),
      /OpenAI API policy blocked commit/,
    );

    console.log("OpenAI API policy fixtures passed");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

void main();
