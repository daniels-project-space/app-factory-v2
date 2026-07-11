import { schedules } from "@trigger.dev/sdk";
import { z } from "zod";
import { cvxMutation, cvxQuery, logEvent } from "@/factory/convex";
import { inceptionAgent } from "@/mastra/agents";
import { runAgent } from "./lib/engine";

/**
 * Autonomous inception — v1's deliberate-ideas/factory-tournament rebuilt lean.
 * v1 burned 8-14 LLM calls per idea across blind experts, debates, kill rounds
 * and an ensemble judge. Here: ONE Opus session researches gaps and pitches
 * 3-5 revenue-ready ideas, each with an honest kill-test verdict baked in.
 * They land on /ideas with scores; apps are only created when Daniel approves.
 */

const IdeaBatchSchema = z.object({
  ideas: z
    .array(
      z.object({
        pitch: z
          .string()
          .max(600)
          .describe("the idea as a build brief: wedge, target user, paywall moment, differentiator"),
        killTest: z.string().max(300).describe("the strongest reason this DIES — argued honestly"),
        score: z.number().min(0).max(10).describe("survival score AFTER the kill test; most ideas are 3-6"),
      }),
    )
    .min(3)
    .max(5),
});

export const ideaScout = schedules.task({
  id: "idea-scout",
  cron: "45 6 * * *",
  maxDuration: 1800,
  run: async (payload) => {
    const settings = (await cvxQuery("intake:getSettings")) as {
      running: boolean;
      ideaScoutEnabled?: boolean;
    };
    if (!settings.running || settings.ideaScoutEnabled === false) return { skipped: true };

    const existing = (await cvxQuery("intake:ideas")) as Array<{ text: string; status: string }>;
    const recent = existing.slice(0, 20).map((i) => i.text.slice(0, 80));

    const { object } = await runAgent(
      inceptionAgent,
      [
        "Generate 3-5 NEW mobile subscription app ideas worth building this quarter.",
        "Method: use up to 4 web searches to find real, current demand signals (App Store category gaps, rising search trends, complaint threads about incumbent apps). Every idea must name the incumbent it undercuts or the unmet pain it solves.",
        "Then run your own kill test on each idea and score its survival honestly — a batch where everything scores 8+ is a failed batch.",
        recent.length ? `Already in the pipeline — do NOT repeat or near-duplicate:\n${recent.join("\n")}` : "",
      ].join("\n\n"),
      {
        stage: "ideaScout",
        model: "opus",
        triggerRunId: payload.scheduleId ?? "idea-scout",
        schema: IdeaBatchSchema,
      },
    );

    let added = 0;
    for (const idea of object.ideas) {
      const id = await cvxMutation("intake:submitIdea", {
        text: idea.pitch,
        source: "factory",
      });
      await cvxMutation("intake:setIdeaVerdict", {
        id,
        verdict: `Kill test: ${idea.killTest}`,
        score: idea.score,
      });
      added++;
    }
    await logEvent(undefined, "idea_scout", `Idea scout: ${added} candidate(s) on the board`);
    return { added };
  },
});
