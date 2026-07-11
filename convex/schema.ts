import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Single source of truth for the whole factory. v1 kept this in JSON files on
// a VPS disk; every table here replaces one of those ad-hoc files.

export const STAGE_KEYS = [
  "inception",
  "roadmap",
  "design",
  "build",
  "validate",
  "review",
  "approval",
  "package",
] as const;

const stageKey = v.union(
  v.literal("inception"),
  v.literal("roadmap"),
  v.literal("design"),
  v.literal("build"),
  v.literal("validate"),
  v.literal("review"),
  v.literal("approval"),
  v.literal("package"),
);

const appStatus = v.union(
  v.literal("queued"),
  v.literal("active"),
  v.literal("waiting_approval"),
  v.literal("approved"),
  v.literal("shipped"),
  v.literal("paused"),
  v.literal("failed"),
  v.literal("archived"),
);

const severity = v.union(
  v.literal("P0"),
  v.literal("P1"),
  v.literal("P2"),
  v.literal("P3"),
);

export default defineSchema({
  apps: defineTable({
    slug: v.string(),
    name: v.string(),
    oneLiner: v.string(),
    idea: v.string(),
    origin: v.union(v.literal("daniel"), v.literal("factory"), v.literal("forge")),
    status: appStatus,
    stage: stageKey, // current pipeline stage
    stageState: v.union(
      v.literal("pending"), // runnable, waiting for a slot
      v.literal("running"),
      v.literal("waiting"), // waiting on a human approval
      v.literal("failed"), // last run failed; orchestrator may retry
    ),
    buildRound: v.number(), // how many build↔validate loops completed
    reviewRound: v.number(), // hard-capped at 2
    brief: v.optional(v.string()), // inception output (markdown)
    brand: v.optional(
      v.object({
        primary: v.string(),
        accent: v.string(),
        font: v.string(),
        vibe: v.string(),
      }),
    ),
    pricing: v.optional(v.string()),
    shareToken: v.string(), // public share page /s/<token>
    demoBuildKey: v.optional(v.string()), // R2 prefix of latest passing web export
    demoUpdatedAt: v.optional(v.number()),
    forgeSource: v.optional(
      v.object({ repoUrl: v.string(), license: v.string(), stars: v.number() }),
    ),
    lockedBy: v.optional(v.string()), // trigger run id currently working this app
    lockedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    attempts: v.number(), // consecutive failures of the current stage
    priority: v.number(), // daniel ideas > forge > factory
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_shareToken", ["shareToken"]),

  roadmapItems: defineTable({
    appId: v.id("apps"),
    milestone: v.number(), // 1..5
    order: v.number(),
    title: v.string(),
    acceptance: v.string(), // machine/LLM-checkable criterion
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"), // builder claims done
      v.literal("verified"), // validate/review confirmed
    ),
    buildRound: v.optional(v.number()), // round in which it was implemented
  }).index("by_app", ["appId"]),

  issues: defineTable({
    appId: v.id("apps"),
    fingerprint: v.string(), // stable hash: source+category+screen — dedup key
    severity,
    source: v.union(
      v.literal("gate"), // deterministic gate (tsc, export, playwright)
      v.literal("vision"),
      v.literal("review"),
      v.literal("daniel"),
    ),
    title: v.string(),
    detail: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("fixing"),
      v.literal("fixed"), // fixer claims fixed; re-verified mechanically next validate
      v.literal("verified"),
      v.literal("waived"), // explicitly accepted; never re-raised
    ),
    attempts: v.number(),
    firstSeenRound: v.number(),
    lastSeenRound: v.number(),
    updatedAt: v.number(),
  })
    .index("by_app", ["appId"])
    .index("by_app_fingerprint", ["appId", "fingerprint"]),

  runs: defineTable({
    appId: v.optional(v.id("apps")),
    stage: v.string(),
    triggerRunId: v.string(),
    model: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    summary: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_app", ["appId"])
    .index("by_startedAt", ["startedAt"]),

  events: defineTable({
    appId: v.optional(v.id("apps")),
    kind: v.string(), // stage_started | stage_done | gate_failed | demo_updated | ...
    message: v.string(),
    data: v.optional(v.string()), // JSON blob for detail views
    ts: v.number(),
  })
    .index("by_app", ["appId"])
    .index("by_ts", ["ts"]),

  ideas: defineTable({
    text: v.string(),
    source: v.union(v.literal("daniel"), v.literal("factory")),
    status: v.union(
      v.literal("new"),
      v.literal("deliberated"),
      v.literal("approved"), // becomes an app
      v.literal("rejected"),
    ),
    verdict: v.optional(v.string()), // one-call deliberation summary
    score: v.optional(v.number()), // 0-10
    appId: v.optional(v.id("apps")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  approvals: defineTable({
    appId: v.id("apps"),
    stage: stageKey,
    question: v.string(),
    context: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    note: v.optional(v.string()), // daniel's note on decision
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_app", ["appId"]),

  forgeCandidates: defineTable({
    repoUrl: v.string(),
    name: v.string(),
    stars: v.number(),
    license: v.string(),
    category: v.string(),
    pitch: v.string(), // why it's worth converting
    audit: v.optional(v.string()),
    status: v.union(
      v.literal("candidate"),
      v.literal("approved"),
      v.literal("converting"),
      v.literal("converted"),
      v.literal("rejected"),
    ),
    appId: v.optional(v.id("apps")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_repoUrl", ["repoUrl"]),

  settings: defineTable({
    key: v.string(),
    // singleton row key="global"
    running: v.boolean(), // master kill switch
    maxConcurrent: v.number(), // 2 = Balanced
    dailyBudgetUsd: v.number(),
    spentTodayUsd: v.number(),
    budgetDay: v.string(), // YYYY-MM-DD the spent counter refers to
    forgeScoutEnabled: v.boolean(),
    designSignoffRequired: v.boolean(), // if false, design auto-advances
    ideaScoutEnabled: v.optional(v.boolean()), // daily autonomous idea generation
  }).index("by_key", ["key"]),
});
