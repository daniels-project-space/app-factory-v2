/** Local smoke test: Mastra ClaudeSDKAgent → structured output → Convex ledger. */
import { triageAgent } from "../src/mastra/agents";
import { IdeaVerdictSchema } from "../src/factory/schemas";
import { runAgent } from "../src/trigger/lib/engine";

process.env.FACTORY_CONVEX_URL ??= "https://frugal-jackal-724.convex.cloud";

async function main() {
  const { text, object } = await runAgent(
    triageAgent,
    "Idea: an app that identifies houseplants from a photo and builds watering schedules with push reminders.",
    {
      stage: "triage",
      model: "haiku",
      triggerRunId: "local-smoke",
      schema: IdeaVerdictSchema,
    },
  );
  console.log("TEXT:", text.slice(0, 200));
  console.log("OBJECT:", JSON.stringify(object));
  if (typeof object.score !== "number") throw new Error("no structured score");
  console.log("SMOKE OK");
}

main().catch((e) => {
  console.error("SMOKE FAILED:", e);
  process.exit(1);
});
