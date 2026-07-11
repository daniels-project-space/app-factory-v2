import { schedules, tasks } from "@trigger.dev/sdk";
import { cvxMutation, cvxQuery, logEvent } from "@/factory/convex";
import { IdeaVerdictSchema } from "@/factory/schemas";
import { triageAgent } from "@/mastra/agents";
import { runAgent } from "./lib/engine";

/**
 * The factory's pulse. Every 5 minutes: check the kill switch + budget, count
 * live workers, claim runnable apps up to the concurrency cap, and dispatch a
 * stage-runner per claim. Also triages newly submitted ideas (one cheap Haiku
 * call each) so the ideas board always shows a verdict.
 *
 * Deliberately boring: all intelligence lives in the stage runner; all state
 * lives in Convex. v1's 130KB bash dispatcher is 100 lines of TypeScript now.
 */
export const orchestrator = schedules.task({
  id: "factory-orchestrator",
  cron: "*/5 * * * *",
  maxDuration: 600,
  run: async () => {
    const settings = (await cvxQuery("intake:getSettings")) as {
      running: boolean;
      maxConcurrent: number;
      dailyBudgetUsd: number;
      spentTodayUsd: number;
      budgetDay: string;
    };
    if (!settings.running) return { skipped: "kill switch off" };

    const today = new Date().toISOString().slice(0, 10);
    if (settings.budgetDay === today && settings.spentTodayUsd >= settings.dailyBudgetUsd) {
      await logEvent(undefined, "budget_pause", `Daily budget $${settings.dailyBudgetUsd} reached — pausing dispatch until tomorrow`);
      return { skipped: "budget" };
    }

    const running = (await cvxQuery("apps:runningCount")) as number;
    const slots = Math.max(0, settings.maxConcurrent - running);

    let dispatched = 0;
    if (slots > 0) {
      const claims = (await cvxMutation("apps:claimWork", {
        slots,
        workerId: "pending-dispatch",
      })) as Array<{
        id: string;
        slug: string;
        name: string;
        stage: string;
        buildRound: number;
        reviewRound: number;
        origin: "daniel" | "factory" | "forge";
        attempts: number;
      }>;

      for (const claim of claims) {
        const handle = await tasks.trigger("stage-runner", {
          appId: claim.id,
          slug: claim.slug,
          name: claim.name,
          stage: claim.stage,
          buildRound: claim.buildRound,
          reviewRound: claim.reviewRound,
          origin: claim.origin,
          attempts: claim.attempts,
        });
        // Re-stamp the lock with the real run id so heartbeats match.
        await cvxMutation("apps:heartbeat", { id: claim.id, workerId: "pending-dispatch" });
        await cvxMutation("apps:relock", { id: claim.id, from: "pending-dispatch", to: handle.id });
        dispatched++;
        await logEvent(claim.id, "dispatched", `${claim.stage} dispatched (${handle.id})`);
      }
    }

    // Idea triage — cheap, bounded, keeps the ideas board live.
    const newIdeas = (await cvxQuery("intake:newIdeas")) as Array<{ _id: string; text: string }>;
    for (const idea of newIdeas.slice(0, 2)) {
      try {
        const { object } = await runAgent(triageAgent, `Idea: ${idea.text}`, {
          stage: "triage",
          model: "haiku",
          triggerRunId: `triage-${idea._id}`,
          schema: IdeaVerdictSchema,
        });
        await cvxMutation("intake:setIdeaVerdict", {
          id: idea._id,
          verdict: object.verdict,
          score: object.score,
        });
      } catch (err) {
        await logEvent(undefined, "triage_failed", String(err).slice(0, 200));
      }
    }

    return { dispatched, running, slots, ideasTriaged: Math.min(newIdeas.length, 2) };
  },
});
