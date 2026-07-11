import { defineConfig } from "@trigger.dev/sdk";
import { additionalPackages, aptGet } from "@trigger.dev/build/extensions/core";
import { playwright } from "@trigger.dev/build/extensions/playwright";

/**
 * app-factory-jobs — all factory LLM work runs here, on Daniel's Claude Max
 * subscription (CLAUDE_CODE_OAUTH_TOKEN in project env; ANTHROPIC_API_KEY is
 * scrubbed at runtime so the dead platform key can never win).
 *
 * The Claude Agent SDK spawns its bundled `claude` CLI as a subprocess, so it
 * must stay OUT of the esbuild bundle and be installed fresh in the Linux
 * image (correct platform binary) — same pattern remote-work-hub proved.
 */
export default defineConfig({
  project: "proj_vltrshgupsrfmimsntgm",
  runtime: "node",
  logLevel: "log",
  dirs: ["./src/trigger"],
  maxDuration: 5400, // 90 min ceiling per stage run
  machine: "small-2x",
  build: {
    external: ["@anthropic-ai/claude-agent-sdk", "@mastra/claude", "@mastra/core"],
    extensions: [
      additionalPackages({
        packages: [
          "@anthropic-ai/claude-agent-sdk@0.3.207",
          "@mastra/claude@0.3.0",
          "@mastra/core@1.50.1",
        ],
      }),
      aptGet({ packages: ["git", "ca-certificates"] }),
      playwright({ browsers: ["chromium"] }),
    ],
  },
});
