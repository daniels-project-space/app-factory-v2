import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const now = () => Date.now();

/* ── ideas (Daniel's route + factory inception) ─────────────────────────── */

export const submitIdea = mutation({
  args: { text: v.string(), source: v.union(v.literal("daniel"), v.literal("factory")) },
  handler: async (ctx, { text, source }) =>
    ctx.db.insert("ideas", { text, source, status: "new", createdAt: now() }),
});

export const ideas = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("ideas").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const newIdeas = query({
  args: {},
  handler: async (ctx) =>
    ctx.db.query("ideas").withIndex("by_status", (q) => q.eq("status", "new")).collect(),
});

export const setIdeaVerdict = mutation({
  args: { id: v.id("ideas"), verdict: v.string(), score: v.number() },
  handler: async (ctx, { id, verdict, score }) => {
    await ctx.db.patch(id, { verdict, score, status: "deliberated" });
  },
});

/** One-click: approve an idea → create its app → enter the pipeline. */
export const approveIdea = mutation({
  args: { id: v.id("ideas"), name: v.string(), slug: v.string() },
  handler: async (ctx, { id, name, slug }) => {
    const idea = await ctx.db.get(id);
    if (!idea) throw new Error("idea gone");
    const clash = await ctx.db
      .query("apps")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (clash) throw new Error(`slug taken: ${slug}`);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31])
      .join("");
    const appId = await ctx.db.insert("apps", {
      slug,
      name,
      oneLiner: idea.text.slice(0, 120),
      idea: idea.text,
      origin: idea.source === "daniel" ? "daniel" : "factory",
      status: "queued",
      stage: "inception",
      stageState: "pending",
      buildRound: 0,
      reviewRound: 0,
      shareToken: token,
      attempts: 0,
      priority: idea.source === "daniel" ? 100 : 10,
      createdAt: now(),
      updatedAt: now(),
    });
    await ctx.db.patch(id, { status: "approved", appId });
    await ctx.db.insert("events", {
      appId,
      kind: "app_created",
      message: `${name} entered the factory (from idea)`,
      ts: now(),
    });
    return appId;
  },
});

export const decideIdea = mutation({
  args: { id: v.id("ideas"), approve: v.boolean(), appId: v.optional(v.id("apps")) },
  handler: async (ctx, { id, approve, appId }) => {
    await ctx.db.patch(id, { status: approve ? "approved" : "rejected", appId });
  },
});

/* ── approvals (the human gate) ─────────────────────────────────────────── */

export const requestApproval = mutation({
  args: {
    appId: v.id("apps"),
    stage: v.union(
      v.literal("inception"),
      v.literal("roadmap"),
      v.literal("design"),
      v.literal("build"),
      v.literal("validate"),
      v.literal("review"),
      v.literal("approval"),
      v.literal("package"),
    ),
    question: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // One pending approval per app+stage.
    const pending = await ctx.db
      .query("approvals")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();
    if (pending.some((p) => p.status === "pending" && p.stage === args.stage)) return null;
    return ctx.db.insert("approvals", { ...args, status: "pending", createdAt: now() });
  },
});

export const pendingApprovals = query({
  args: {},
  handler: async (ctx) =>
    ctx.db.query("approvals").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
});

export const decideApproval = mutation({
  args: {
    id: v.id("approvals"),
    approve: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, approve, note }) => {
    const approval = await ctx.db.get(id);
    if (!approval || approval.status !== "pending") return;
    await ctx.db.patch(id, {
      status: approve ? "approved" : "rejected",
      note,
      decidedAt: now(),
    });
    const app = await ctx.db.get(approval.appId);
    if (!app) return;
    if (approve) {
      // Stage-aware advance: ship gate → package; design sign-off → build;
      // anything else just becomes runnable again at its current stage.
      const nextStageMap: Record<string, string> = {
        approval: "package",
        design: "build",
        inception: "roadmap",
      };
      await ctx.db.patch(approval.appId, {
        stage: (nextStageMap[approval.stage] ?? app.stage) as typeof app.stage,
        stageState: "pending",
        status: approval.stage === "approval" ? "approved" : "active",
        updatedAt: now(),
      });
    } else {
      // Rejection sends it back to build with the note as a P1 issue.
      if (note) {
        await ctx.db.insert("issues", {
          appId: approval.appId,
          fingerprint: `daniel:reject:${now()}`,
          severity: "P1",
          source: "daniel",
          title: note.slice(0, 120),
          detail: note,
          status: "open",
          attempts: 0,
          firstSeenRound: app.buildRound,
          lastSeenRound: app.buildRound,
          updatedAt: now(),
        });
      }
      await ctx.db.patch(approval.appId, {
        stage: "build",
        stageState: "pending",
        status: "active",
        updatedAt: now(),
      });
    }
    await ctx.db.insert("events", {
      appId: approval.appId,
      kind: approve ? "approved" : "rejected",
      message: approve
        ? `Daniel approved ${approval.stage}`
        : `Daniel rejected ${approval.stage}${note ? `: ${note.slice(0, 140)}` : ""}`,
      ts: now(),
    });
  },
});

/* ── forge candidates ───────────────────────────────────────────────────── */

export const addForgeCandidates = mutation({
  args: {
    candidates: v.array(
      v.object({
        repoUrl: v.string(),
        name: v.string(),
        stars: v.number(),
        license: v.string(),
        category: v.string(),
        pitch: v.string(),
      }),
    ),
  },
  handler: async (ctx, { candidates }) => {
    let added = 0;
    for (const c of candidates) {
      const existing = await ctx.db
        .query("forgeCandidates")
        .withIndex("by_repoUrl", (q) => q.eq("repoUrl", c.repoUrl))
        .unique();
      if (existing) continue;
      await ctx.db.insert("forgeCandidates", { ...c, status: "candidate", createdAt: now() });
      added++;
    }
    return added;
  },
});

export const forgeCandidates = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("forgeCandidates").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Approve a forge candidate → creates the app (origin=forge) and links it. */
export const approveForgeCandidate = mutation({
  args: { id: v.id("forgeCandidates"), slug: v.string() },
  handler: async (ctx, { id, slug }) => {
    const cand = await ctx.db.get(id);
    if (!cand || cand.status !== "candidate") throw new Error("not a pending candidate");
    const clash = await ctx.db
      .query("apps")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (clash) throw new Error(`slug taken: ${slug}`);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31])
      .join("");
    const appId = await ctx.db.insert("apps", {
      slug,
      name: cand.name,
      oneLiner: cand.pitch.slice(0, 120),
      idea: `FORGE conversion of ${cand.repoUrl}: ${cand.pitch}`,
      origin: "forge",
      status: "queued",
      stage: "inception",
      stageState: "pending",
      buildRound: 0,
      reviewRound: 0,
      shareToken: token,
      forgeSource: { repoUrl: cand.repoUrl, license: cand.license, stars: cand.stars },
      attempts: 0,
      priority: 50,
      createdAt: now(),
      updatedAt: now(),
    });
    await ctx.db.patch(id, { status: "converting", appId });
    await ctx.db.insert("events", {
      appId,
      kind: "forge_approved",
      message: `Forge conversion approved: ${cand.name} (${cand.repoUrl})`,
      ts: now(),
    });
    return appId;
  },
});

export const setForgeStatus = mutation({
  args: {
    id: v.id("forgeCandidates"),
    status: v.union(
      v.literal("candidate"),
      v.literal("approved"),
      v.literal("converting"),
      v.literal("converted"),
      v.literal("rejected"),
    ),
    appId: v.optional(v.id("apps")),
    audit: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, rest);
  },
});

/* ── settings ───────────────────────────────────────────────────────────── */

const DEFAULTS = {
  key: "global",
  running: true,
  maxConcurrent: 2,
  dailyBudgetUsd: 50,
  spentTodayUsd: 0,
  budgetDay: "1970-01-01",
  forgeScoutEnabled: false,
  designSignoffRequired: true,
};

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    return s ?? DEFAULTS;
  },
});

export const updateSettings = mutation({
  args: {
    running: v.optional(v.boolean()),
    maxConcurrent: v.optional(v.number()),
    dailyBudgetUsd: v.optional(v.number()),
    forgeScoutEnabled: v.optional(v.boolean()),
    designSignoffRequired: v.optional(v.boolean()),
    // accounting corrections only (e.g. estimator bug) — not a control knob
    spentTodayUsd: v.optional(v.number()),
  },
  handler: async (ctx, patch) => {
    const s = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, val]) => val !== undefined),
    );
    if (s) await ctx.db.patch(s._id, clean);
    else await ctx.db.insert("settings", { ...DEFAULTS, ...clean });
  },
});
