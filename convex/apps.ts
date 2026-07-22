import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const now = () => Date.now();

// Stage order — the pipeline state machine. "build" and "validate" loop until
// milestones are done or budgets exhausted; "approval" is the only hard human gate.
export const STAGE_ORDER = [
  "inception",
  "roadmap",
  "design",
  "build",
  "validate",
  "review",
  "approval",
  "package",
] as const;
export type StageKey = (typeof STAGE_ORDER)[number];

function nextStage(stage: StageKey): StageKey | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("apps").collect();
    return apps.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { id: v.id("apps") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) =>
    ctx.db
      .query("apps")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique(),
});

export const byShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .unique();
    if (!app) return null;
    // Public payload only — nothing that links back to the hub.
    return {
      name: app.name,
      oneLiner: app.oneLiner,
      slug: app.slug,
      brand: app.brand ?? null,
      demoBuildKey: app.demoBuildKey ?? null,
      demoUpdatedAt: app.demoUpdatedAt ?? null,
    };
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    oneLiner: v.string(),
    idea: v.string(),
    origin: v.union(v.literal("daniel"), v.literal("factory"), v.literal("forge")),
    priority: v.optional(v.number()),
    forgeSource: v.optional(
      v.object({ repoUrl: v.string(), license: v.string(), stars: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error(`slug taken: ${args.slug}`);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31])
      .join("");
    const id = await ctx.db.insert("apps", {
      slug: args.slug,
      name: args.name,
      oneLiner: args.oneLiner,
      idea: args.idea,
      origin: args.origin,
      status: "queued",
      stage: "inception",
      stageState: "pending",
      buildRound: 0,
      reviewRound: 0,
      shareToken: token,
      forgeSource: args.forgeSource,
      attempts: 0,
      priority: args.priority ?? (args.origin === "daniel" ? 100 : args.origin === "forge" ? 50 : 10),
      createdAt: now(),
      updatedAt: now(),
    });
    await ctx.db.insert("events", {
      appId: id,
      kind: "app_created",
      message: `${args.name} entered the factory (${args.origin})`,
      ts: now(),
    });
    return id;
  },
});

/**
 * Orchestrator work-claiming. Atomically claims up to `slots` runnable apps by
 * setting a lock. Stale locks (>90 min) are treated as dead and reclaimable —
 * v1's "silent worker death" must never wedge an app forever.
 */
export const claimWork = mutation({
  args: { slots: v.number(), workerId: v.string() },
  handler: async (ctx, { slots, workerId }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (!settings?.running) return [];

    // Heartbeats land every 60s while a runner is alive; 20 min of silence
    // means the container died (e.g. OOM) — reclaim fast, never wedge an app.
    const STALE_MS = 20 * 60 * 1000;
    const apps = await ctx.db.query("apps").collect();
    const runnable = apps
      .filter(
        (a) =>
          (a.status === "queued" || a.status === "active") &&
          a.stage !== "approval" &&
          (a.stageState === "pending" ||
            (a.stageState === "failed" && a.attempts < 3) ||
            (a.stageState === "running" &&
              a.lockedAt !== undefined &&
              now() - a.lockedAt > STALE_MS)),
      )
      .sort((a, b) => b.priority - a.priority || a.updatedAt - b.updatedAt);

    const claimed = [];
    for (const app of runnable.slice(0, slots)) {
      await ctx.db.patch(app._id, {
        stageState: "running",
        status: "active",
        lockedBy: workerId,
        lockedAt: now(),
        updatedAt: now(),
      });
      claimed.push({
        id: app._id,
        slug: app.slug,
        name: app.name,
        stage: app.stage,
        buildRound: app.buildRound,
        reviewRound: app.reviewRound,
        origin: app.origin,
        attempts: app.attempts,
      });
    }
    return claimed;
  },
});

/** Count apps currently holding a fresh lock (for slot math in the orchestrator). */
export const runningCount = query({
  args: {},
  handler: async (ctx) => {
    // Heartbeats land every 60s while a runner is alive; 20 min of silence
    // means the container died (e.g. OOM) — reclaim fast, never wedge an app.
    const STALE_MS = 20 * 60 * 1000;
    const apps = await ctx.db.query("apps").collect();
    return apps.filter(
      (a) =>
        a.stageState === "running" &&
        a.lockedAt !== undefined &&
        now() - a.lockedAt < STALE_MS,
    ).length;
  },
});

/** Swap a claim's lock owner (orchestrator claim → real trigger run id). */
export const relock = mutation({
  args: { id: v.id("apps"), from: v.string(), to: v.string() },
  handler: async (ctx, { id, from, to }) => {
    const app = await ctx.db.get(id);
    if (app?.lockedBy === from) {
      await ctx.db.patch(id, { lockedBy: to, lockedAt: now() });
    }
  },
});

export const heartbeat = mutation({
  args: { id: v.id("apps"), workerId: v.string() },
  handler: async (ctx, { id, workerId }) => {
    const app = await ctx.db.get(id);
    if (app?.lockedBy === workerId) {
      await ctx.db.patch(id, { lockedAt: now() });
    }
  },
});

/**
 * Stage completion — the ONLY place stage transitions happen, so the state
 * machine is auditable in one function.
 */
export const completeStage = mutation({
  args: {
    id: v.id("apps"),
    workerId: v.string(),
    outcome: v.union(
      v.literal("advance"), // stage done → next stage
      v.literal("loop_build"), // validate/review found fixable problems → back to build
      v.literal("wait_signoff"), // park at CURRENT stage awaiting a human decision
      v.literal("needs_approval"), // park at the ship approval gate
      v.literal("shipped"),
    ),
    summary: v.string(),
    patch: v.optional(
      v.object({
        name: v.optional(v.string()),
        oneLiner: v.optional(v.string()),
        brief: v.optional(v.string()),
        pricing: v.optional(v.string()),
        brand: v.optional(
          v.object({
            primary: v.string(),
            accent: v.string(),
            font: v.string(),
            vibe: v.string(),
          }),
        ),
        demoBuildKey: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { id, workerId, outcome, summary, patch }) => {
    const app = await ctx.db.get(id);
    if (!app) throw new Error("app gone");
    if (app.lockedBy !== workerId) throw new Error("lock lost");

    const base: Record<string, unknown> = {
      lockedBy: undefined,
      lockedAt: undefined,
      attempts: 0,
      lastError: undefined,
      updatedAt: now(),
      ...(patch ?? {}),
    };
    if (patch?.demoBuildKey) base.demoUpdatedAt = now();

    let stage = app.stage;
    let stageState: "pending" | "waiting" = "pending";
    let status = app.status;

    if (app.stage === "build") base.buildRound = app.buildRound + 1;
    if (app.stage === "review") base.reviewRound = app.reviewRound + 1;

    if (outcome === "advance") {
      const nxt = nextStage(app.stage as StageKey);
      if (nxt) stage = nxt;
      if (stage === "approval") {
        stageState = "waiting";
        status = "waiting_approval";
      }
    } else if (outcome === "loop_build") {
      stage = "build";
    } else if (outcome === "wait_signoff") {
      stageState = "waiting";
      status = "waiting_approval";
    } else if (outcome === "needs_approval") {
      stage = "approval";
      stageState = "waiting";
      status = "waiting_approval";
    } else if (outcome === "shipped") {
      status = "shipped";
    }

    await ctx.db.patch(id, { ...base, stage, stageState, status });
    await ctx.db.insert("events", {
      appId: id,
      kind: "stage_done",
      message: `${app.stage} → ${outcome === "advance" || outcome === "loop_build" ? stage : outcome}: ${summary}`,
      ts: now(),
    });
    return { stage, stageState };
  },
});

export const failStage = mutation({
  args: { id: v.id("apps"), workerId: v.string(), error: v.string() },
  handler: async (ctx, { id, workerId, error }) => {
    const app = await ctx.db.get(id);
    if (!app || app.lockedBy !== workerId) return;
    const attempts = app.attempts + 1;
    await ctx.db.patch(id, {
      lockedBy: undefined,
      lockedAt: undefined,
      stageState: "failed",
      attempts,
      lastError: error.slice(0, 2000),
      status: attempts >= 3 ? "failed" : app.status,
      updatedAt: now(),
    });
    await ctx.db.insert("events", {
      appId: id,
      kind: "stage_failed",
      message: `${app.stage} failed (attempt ${attempts}/3): ${error.slice(0, 300)}`,
      ts: now(),
    });
  },
});

/** Point the demo proxy at a new R2 build prefix (used by republish tooling). */
export const setDemo = mutation({
  args: { id: v.id("apps"), demoBuildKey: v.string() },
  handler: async (ctx, { id, demoBuildKey }) => {
    await ctx.db.patch(id, { demoBuildKey, demoUpdatedAt: now(), updatedAt: now() });
  },
});

/** Daniel's controls */
export const setPaused = mutation({
  args: { id: v.id("apps"), paused: v.boolean() },
  handler: async (ctx, { id, paused }) => {
    const app = await ctx.db.get(id);
    if (!app) return;
    await ctx.db.patch(id, {
      status: paused ? "paused" : app.stage === "approval" ? "waiting_approval" : "active",
      stageState: paused ? app.stageState : "pending",
      updatedAt: now(),
    });
  },
});

export const retry = mutation({
  args: { id: v.id("apps") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      stageState: "pending",
      status: "active",
      attempts: 0,
      lastError: undefined,
      lockedBy: undefined,
      lockedAt: undefined,
      updatedAt: now(),
    });
  },
});

export const requestChanges = mutation({
  args: { id: v.id("apps"), text: v.string() },
  handler: async (ctx, { id, text }) => {
    const app = await ctx.db.get(id);
    if (!app) return;
    const jarvisWave = text.match(/^\[JARVIS-GOAL-WAVE-\d+\]/)?.[0];
    const fingerprint = jarvisWave ? `jarvis:${jarvisWave}` : `daniel:${text.slice(0, 60)}`;
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_app_fingerprint", (q) => q.eq("appId", id).eq("fingerprint", fingerprint))
      .first();
    // Jarvis retries this cross-provider mutation until Jarvis Convex records
    // its acknowledgement. Replaying an accepted wave must never reset an app
    // that has already advanced past build.
    if (existing && jarvisWave) return existing._id;
    if (existing) {
      await ctx.db.patch(existing._id, {
        severity: "P1",
        title: text.slice(0, 120),
        detail: text,
        status: existing.status === "waived" ? "waived" : "open",
        lastSeenRound: app.buildRound,
        updatedAt: now(),
      });
    } else {
      await ctx.db.insert("issues", {
        appId: id,
        fingerprint,
        severity: "P1",
        source: "daniel",
        title: text.slice(0, 120),
        detail: text,
        status: "open",
        attempts: 0,
        firstSeenRound: app.buildRound,
        lastSeenRound: app.buildRound,
        updatedAt: now(),
      });
    }
    // Daniel's change requests re-open the build loop regardless of stage.
    await ctx.db.patch(id, {
      stage: "build",
      stageState: "pending",
      status: "active",
      updatedAt: now(),
    });
    await ctx.db.insert("events", {
      appId: id,
      kind: "daniel_request",
      message: `Change requested: ${text.slice(0, 140)}`,
      ts: now(),
    });
  },
});
