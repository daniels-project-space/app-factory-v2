import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const now = () => Date.now();

/* ── roadmap ────────────────────────────────────────────────────────────── */

export const setRoadmap = mutation({
  args: {
    appId: v.id("apps"),
    items: v.array(
      v.object({
        milestone: v.number(),
        order: v.number(),
        title: v.string(),
        acceptance: v.string(),
      }),
    ),
  },
  handler: async (ctx, { appId, items }) => {
    // Roadmap is written once at the roadmap stage; hard cap 60 (v1 had 302-item
    // roadmaps that guaranteed nothing ever finished).
    const capped = items.slice(0, 60);
    const existing = await ctx.db
      .query("roadmapItems")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
    for (const item of capped) {
      await ctx.db.insert("roadmapItems", { appId, ...item, status: "todo" });
    }
    return capped.length;
  },
});

export const roadmap = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const items = await ctx.db
      .query("roadmapItems")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    return items.sort((a, b) => a.milestone - b.milestone || a.order - b.order);
  },
});

export const updateRoadmapItems = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("roadmapItems"),
        status: v.union(
          v.literal("todo"),
          v.literal("in_progress"),
          v.literal("done"),
          v.literal("verified"),
        ),
        buildRound: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { updates }) => {
    for (const u of updates) {
      await ctx.db.patch(u.id, {
        status: u.status,
        ...(u.buildRound !== undefined ? { buildRound: u.buildRound } : {}),
      });
    }
  },
});

/* ── issues ─────────────────────────────────────────────────────────────── */

export const reportIssues = mutation({
  args: {
    appId: v.id("apps"),
    round: v.number(),
    issues: v.array(
      v.object({
        fingerprint: v.string(),
        severity: v.union(v.literal("P0"), v.literal("P1"), v.literal("P2"), v.literal("P3")),
        source: v.union(
          v.literal("gate"),
          v.literal("vision"),
          v.literal("review"),
          v.literal("daniel"),
        ),
        title: v.string(),
        detail: v.string(),
      }),
    ),
  },
  handler: async (ctx, { appId, round, issues }) => {
    let fresh = 0;
    for (const issue of issues) {
      const existing = await ctx.db
        .query("issues")
        .withIndex("by_app_fingerprint", (q) =>
          q.eq("appId", appId).eq("fingerprint", issue.fingerprint),
        )
        .unique();
      if (existing) {
        // Waived issues are never re-raised — that's the anti-ratchet rule.
        if (existing.status === "waived") continue;
        await ctx.db.patch(existing._id, {
          status: existing.status === "verified" ? "open" : existing.status,
          lastSeenRound: round,
          severity: issue.severity,
          detail: issue.detail,
          updatedAt: now(),
        });
      } else {
        fresh++;
        await ctx.db.insert("issues", {
          appId,
          ...issue,
          status: "open",
          attempts: 0,
          firstSeenRound: round,
          lastSeenRound: round,
          updatedAt: now(),
        });
      }
    }
    return { fresh };
  },
});

export const openIssues = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const all = await ctx.db
      .query("issues")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    return all.filter((i) => i.status === "open" || i.status === "fixing");
  },
});

export const allIssues = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) =>
    ctx.db
      .query("issues")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect(),
});

export const updateIssues = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("issues"),
        status: v.union(
          v.literal("open"),
          v.literal("fixing"),
          v.literal("fixed"),
          v.literal("verified"),
          v.literal("waived"),
        ),
        bumpAttempts: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, { updates }) => {
    for (const u of updates) {
      const issue = await ctx.db.get(u.id);
      if (!issue) continue;
      await ctx.db.patch(u.id, {
        status: u.status,
        attempts: u.bumpAttempts ? issue.attempts + 1 : issue.attempts,
        updatedAt: now(),
      });
    }
  },
});

/* ── runs + events ──────────────────────────────────────────────────────── */

export const startRun = mutation({
  args: {
    appId: v.optional(v.id("apps")),
    stage: v.string(),
    triggerRunId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("runs", { ...args, status: "running", startedAt: now() }),
});

export const finishRun = mutation({
  args: {
    runId: v.id("runs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    summary: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, { runId, ...rest }) => {
    await ctx.db.patch(runId, { ...rest, endedAt: now() });
    if (rest.costUsd) {
      const settings = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .unique();
      if (settings) {
        const day = new Date().toISOString().slice(0, 10);
        await ctx.db.patch(settings._id, {
          spentTodayUsd:
            settings.budgetDay === day ? settings.spentTodayUsd + rest.costUsd : rest.costUsd,
          budgetDay: day,
        });
      }
    }
  },
});

export const recentRuns = query({
  args: { appId: v.optional(v.id("apps")) },
  handler: async (ctx, { appId }) => {
    if (appId) {
      const runs = await ctx.db
        .query("runs")
        .withIndex("by_app", (q) => q.eq("appId", appId))
        .collect();
      return runs.sort((a, b) => b.startedAt - a.startedAt).slice(0, 50);
    }
    return ctx.db.query("runs").withIndex("by_startedAt").order("desc").take(50);
  },
});

export const log = mutation({
  args: {
    appId: v.optional(v.id("apps")),
    kind: v.string(),
    message: v.string(),
    data: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", { ...args, ts: now() });
  },
});

export const recentEvents = query({
  args: { appId: v.optional(v.id("apps")), limit: v.optional(v.number()) },
  handler: async (ctx, { appId, limit }) => {
    const n = Math.min(limit ?? 60, 200);
    if (appId) {
      const evs = await ctx.db
        .query("events")
        .withIndex("by_app", (q) => q.eq("appId", appId))
        .collect();
      return evs.sort((a, b) => b.ts - a.ts).slice(0, n);
    }
    return ctx.db.query("events").withIndex("by_ts").order("desc").take(n);
  },
});
