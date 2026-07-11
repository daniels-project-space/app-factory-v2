import { schedules } from "@trigger.dev/sdk";
import { cvxMutation, cvxQuery, logEvent } from "@/factory/convex";
import { ForgeCandidatesSchema } from "@/factory/schemas";
import { forgeScoutAgent } from "@/mastra/agents";
import { runAgent } from "./lib/engine";

/**
 * Daily scout for the Forge lane: finds MIT/Apache-licensed apps that can be
 * legally rebranded into paid products. OFF by default (settings.forgeScoutEnabled)
 * — candidates only ever become apps when Daniel approves them in the UI.
 */
export const forgeScout = schedules.task({
  id: "forge-scout",
  cron: "15 7 * * *",
  maxDuration: 1800,
  run: async (payload) => {
    const settings = (await cvxQuery("intake:getSettings")) as {
      running: boolean;
      forgeScoutEnabled: boolean;
    };
    if (!settings.running || !settings.forgeScoutEnabled) return { skipped: true };

    const existing = (await cvxQuery("intake:forgeCandidates")) as Array<{ repoUrl: string }>;
    const known = existing.map((c) => c.repoUrl).slice(0, 40);

    const { object } = await runAgent(
      forgeScoutAgent,
      `Find up to 6 NEW conversion candidates (mobile-first: React Native/Expo, or trivially portable). Already known — do not repeat:\n${known.join("\n") || "(none yet)"}`,
      {
        stage: "forgeScout",
        model: "sonnet",
        triggerRunId: payload.scheduleId ?? "forge-scout",
        schema: ForgeCandidatesSchema,
      },
    );

    const added = await cvxMutation("intake:addForgeCandidates", {
      candidates: object.candidates,
    });
    await logEvent(undefined, "forge_scout", `Forge scout: ${added} new candidate(s)`);
    return { added };
  },
});
