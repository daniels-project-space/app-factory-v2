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
  design: 40,
  build: 120,
  fix: 60,
  vision: 12,
  review: 40,
  package: 40,
  forgeScout: 30,
  // loop bounds
  maxFixAttemptsPerIssue: 2, // dyad pattern: 2 bounded retries then surface
  maxBuildRounds: 8,
  maxReviewRounds: 2,
  maxStageAttempts: 3,
} as const;

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
