import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export type OpenAiApiPolicyViolation = {
  rule: "host" | "sdk" | "key" | "instruction";
  path: string;
  line: number;
};

const HOST_RE = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)*openai(?:\.azure)?\.com(?:[/:?#]|$)/i;
const SDK_RE = /(?:\bfrom\s*["'](?:openai|@azure\/openai)["']|\brequire\(\s*["'](?:openai|@azure\/openai)["']\s*\)|\bimport\(\s*["'](?:openai|@azure\/openai)["']\s*\)|\bnew\s+(?:OpenAI|AzureOpenAI)\b|\b(?:OpenAI|AzureOpenAI)\s*\()/;
const KEY_RE = /\b(?:OPENAI_API_KEY|AZURE_OPENAI_API_KEY|CODEX_API_KEY)\b/g;
// This catches provider directions and model names without matching incidental
// lockfile/base64 text. @openai/codex itself is masked as the one permitted
// subscription-CLI wiring token before these checks run.
const INSTRUCTION_RE = /\b(?:open\s*ai|chat\s*gpt|gpt(?:[-_ ]?(?:\d|4o|o\d)))\b/i;

function isExplicitEmptyKeyAssignment(line: string, keyAt: number): boolean {
  const tail = line.slice(keyAt);
  // JS/TS object properties and assignments: OPENAI_API_KEY: "" or = "".
  if (/^(?:OPENAI_API_KEY|AZURE_OPENAI_API_KEY|CODEX_API_KEY)\s*(?::|=)\s*(?:""|''|``)(?=\s*[,;}\r\n]|$)/.test(tail)) {
    return true;
  }
  // .env and shell assignments: OPENAI_API_KEY= (an optional comment is safe).
  return /^(?:OPENAI_API_KEY|AZURE_OPENAI_API_KEY|CODEX_API_KEY)\s*=\s*(?:#.*)?$/.test(tail.trimEnd());
}

function findLine(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function makeViolation(
  rule: OpenAiApiPolicyViolation["rule"],
  root: string,
  file: string,
  text: string,
  index: number,
): OpenAiApiPolicyViolation {
  return { rule, path: relative(root, file), line: findLine(text, index) };
}

function scanText(root: string, file: string, text: string): OpenAiApiPolicyViolation[] {
  const violations: OpenAiApiPolicyViolation[] = [];
  // @openai/codex is the only OpenAI package this project permits, and only as
  // subscription-authenticated CLI wiring. Other OpenAI mentions remain visible.
  const withoutCodexCli = text.replace(/@openai\/codex(?![a-z0-9_.\/-])/gi, "");

  for (const [rule, expression] of [
    ["host", HOST_RE],
    ["sdk", SDK_RE],
    ["instruction", INSTRUCTION_RE],
  ] as const) {
    const hit = withoutCodexCli.match(expression);
    if (hit?.index !== undefined) {
      violations.push(makeViolation(rule, root, file, text, hit.index));
    }
  }

  for (const match of text.matchAll(KEY_RE)) {
    if (match.index === undefined) continue;
    const lineStart = text.lastIndexOf("\n", match.index) + 1;
    const lineEnd = text.indexOf("\n", match.index);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    if (!isExplicitEmptyKeyAssignment(line, match.index - lineStart)) {
      violations.push(makeViolation("key", root, file, text, match.index));
    }
  }

  return violations;
}

/**
 * Scan the complete app tree that could be staged by the factory. This works
 * before `git add`, so a new hidden instruction, generated build artifact, or
 * file copied from a Forge source cannot evade the policy merely because it is
 * currently untracked. Only Git's own metadata is excluded: it is outside the
 * app payload and `git add apps/<slug>` can never stage it.
 *
 * Deliberately do not use an extension or output-directory allow-list. Policy
 * instructions can live in markdown, shell files, docs, SQL, templates, or
 * generated `dist`/`build`/`out` files.
 */
export function scanOpenAiApiPolicy(root: string): OpenAiApiPolicyViolation[] {
  const resolvedRoot = resolve(root);
  const violations: OpenAiApiPolicyViolation[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== ".git") walk(`${dir}/${entry.name}`);
        continue;
      }
      if (!entry.isFile()) continue;
      const file = `${dir}/${entry.name}`;
      // A symlink is not a file the factory can safely commit as source; do not
      // follow it outside the app tree.
      if (!lstatSync(file).isFile()) continue;
      const contents = readFileSync(file);
      if (contents.includes(0)) continue; // binary assets cannot carry instructions/code.
      violations.push(...scanText(resolvedRoot, file, contents.toString("utf8")));
    }
  };

  walk(resolvedRoot);
  return violations;
}

export function formatOpenAiApiPolicyViolations(violations: OpenAiApiPolicyViolation[]): string {
  return violations
    .slice(0, 24)
    .map((violation) => `${violation.path}:${violation.line} [${violation.rule}]`)
    .join("\n");
}
