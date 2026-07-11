/**
 * ALL model routing + budget knobs in ONE place. v1 scattered model IDs across
 * 30 shell scripts; this file is the only spot a model name may appear.
 *
 * Routing philosophy (Balanced): Opus plans, Sonnet executes, Haiku classifies.
 */
export const MODELS = {
  inception: "opus",
  roadmap: "opus",
  design: "opus",
  review: "opus",
  build: "sonnet",
  fix: "sonnet",
  vision: "sonnet",
  package: "sonnet",
  forgeScout: "sonnet",
  triage: "haiku",
} as const;

export const BUDGETS = {
  // maxTurns per Claude session, by stage
  inception: 16,
  roadmap: 16,
  design: 26,
  build: 90,
  fix: 45,
  vision: 10,
  review: 28,
  package: 24,
  forgeScout: 30,
  // loop bounds
  maxFixAttemptsPerIssue: 2, // dyad pattern: 2 bounded retries then surface
  maxBuildRounds: 8,
  maxReviewRounds: 2,
  maxStageAttempts: 3,
  sliceSize: 8, // roadmap items per build round — shorter sessions, flatter context growth
} as const;

/**
 * Reasoning-effort routing: thinking tokens bill as output, so mechanical
 * stages run lean while judgment stages keep full depth.
 */
export const EFFORT: Record<string, "low" | "medium" | "high"> = {
  inception: "high",
  roadmap: "high",
  design: "high",
  review: "high",
  build: "medium",
  fix: "medium",
  vision: "medium",
  package: "low",
  forgeScout: "medium",
  ideaScout: "high",
  triage: "low",
};

/** Hard per-session USD ceilings (cache-aware estimate) — a runaway session dies, not the budget. */
export const SESSION_USD_CAP: Record<string, number> = {
  build: 8,
  fix: 4,
  design: 4,
  review: 4,
  inception: 2,
  roadmap: 2,
  vision: 1.5,
  package: 2,
  forgeScout: 2,
  ideaScout: 2,
  triage: 0.5,
};

export const REPO = {
  full: "daniels-project-space/app-factory-v2",
  appsDir: "apps",
  templateDir: "templates/starter",
} as const;

export const R2 = {
  bucket: "app-factory-v2",
  demoPrefix: "demos", // demos/<slug>/<buildId>/...
  shotsPrefix: "shots", // shots/<slug>/<round>/<name>.png
  artifactsPrefix: "artifacts",
} as const;

export const stageModel = (stage: string): string =>
  (MODELS as Record<string, string>)[stage] ?? "sonnet";
