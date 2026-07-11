import { task } from "@trigger.dev/sdk";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { cvxMutation, cvxQuery, logEvent } from "@/factory/convex";
import { BUDGETS, R2 as R2CFG } from "@/factory/config";
import {
  BriefSchema,
  RoadmapSchema,
  ReviewVerdictSchema,
  VisionFindingsSchema,
  type Brief,
} from "@/factory/schemas";
import {
  inceptionAgent,
  roadmapAgent,
  designerAgent,
  builderAgent,
  fixerAgent,
  visionAgent,
  reviewerAgent,
  packagerAgent,
} from "@/mastra/agents";
import { runAgent } from "./lib/engine";
import {
  prepareRepo,
  scaffoldApp,
  portForgeSource,
  appDir,
  ensureDeps,
  commitAndPush,
  readReport,
  writeBriefFile,
} from "./lib/workspace";
import { runGates, runLintAdvisory, type GateIssue } from "./lib/gates";
import { validateWebBuild } from "./lib/validate";
import { uploadDir, uploadFile, downloadPrefix } from "./lib/r2";

type Payload = {
  appId: string;
  slug: string;
  name: string;
  stage: string;
  buildRound: number;
  reviewRound: number;
  origin: "daniel" | "factory" | "forge";
  attempts: number;
};

type AppDoc = {
  _id: string;
  slug: string;
  name: string;
  idea: string;
  oneLiner: string;
  brief?: string;
  pricing?: string;
  brand?: { primary: string; accent: string; font: string; vibe: string };
  forgeSource?: { repoUrl: string; license: string; stars: number };
  buildRound: number;
  reviewRound: number;
};

type RoadmapItem = {
  _id: string;
  milestone: number;
  order: number;
  title: string;
  acceptance: string;
  status: "todo" | "in_progress" | "done" | "verified";
};

type Issue = {
  _id: string;
  fingerprint: string;
  severity: "P0" | "P1" | "P2" | "P3";
  title: string;
  detail: string;
  status: string;
  attempts: number;
};

export const stageRunner = task({
  id: "stage-runner",
  // large-1x (4 vCPU / 8GB): npm ci + Metro web export + the claude subprocess
  // OOM-killed a 1GB machine (silent death, no catch — the exact v1 failure mode).
  machine: "large-1x",
  maxDuration: 5400,
  queue: { concurrencyLimit: 2 }, // Balanced: never more than 2 Claude sessions
  retry: { maxAttempts: 1 }, // Convex attempts-counter owns retries, not Trigger
  run: async (payload: Payload, { ctx }) => {
    const workerId = ctx.run.id;
    const heartbeat = setInterval(() => {
      void cvxMutation("apps:heartbeat", { id: payload.appId, workerId }).catch(() => {});
    }, 60_000);

    try {
      const app = (await cvxQuery("apps:get", { id: payload.appId })) as AppDoc | null;
      if (!app) throw new Error("app not found");
      await logEvent(payload.appId, "stage_started", `${payload.stage} started (${payload.name})`);

      switch (payload.stage) {
        case "inception":
          return await runInception(payload, app, workerId);
        case "roadmap":
          return await runRoadmap(payload, app, workerId);
        case "design":
          return await runDesign(payload, app, workerId);
        case "build":
          return await runBuild(payload, app, workerId);
        case "validate":
          return await runValidate(payload, app, workerId);
        case "review":
          return await runReview(payload, app, workerId);
        case "package":
          return await runPackage(payload, app, workerId);
        default:
          throw new Error(`unknown stage ${payload.stage}`);
      }
    } catch (err) {
      await cvxMutation("apps:failStage", {
        id: payload.appId,
        workerId,
        error: String(err instanceof Error ? (err.stack ?? err.message) : err),
      }).catch(() => {});
      throw err;
    } finally {
      clearInterval(heartbeat);
    }
  },
});

/* ── stage handlers ─────────────────────────────────────────────────────── */

async function runInception(p: Payload, app: AppDoc, workerId: string) {
  const forgeNote = app.forgeSource
    ? `\nThis is a FORGE conversion of an existing open-source app: ${app.forgeSource.repoUrl} (${app.forgeSource.license}, ${app.forgeSource.stars}★). Brief the REBRANDED product: new name, positioning against the original, and which existing capabilities become the paid core. The clone/port happens later.`
    : "";
  const { object } = await runAgent(inceptionAgent, `Raw idea:\n${app.idea}${forgeNote}`, {
    appId: p.appId,
    stage: "inception",
    model: "opus",
    triggerRunId: workerId,
    schema: BriefSchema,
  });
  const brief = object as Brief;

  const briefMd = [
    `# ${brief.name} — ${brief.oneLiner}`,
    `\n## Positioning\n${brief.positioning}`,
    `\n## Persona\n${brief.persona}`,
    `\n## Pricing\n${brief.pricing}`,
    `\n## MVP features\n${brief.mvpFeatures.map((f) => `- ${f}`).join("\n")}`,
    `\n## Brand\n${brief.brand.vibe} — primary ${brief.brand.primary}, accent ${brief.brand.accent}, font ${brief.brand.font}`,
    `\n## Risks\n${brief.risks.map((r) => `- ${r}`).join("\n")}`,
    `\n## Build-worthiness\n${brief.verdictScore}/10`,
  ].join("\n");

  if (brief.verdictScore < 6 && p.origin === "factory") {
    // Factory-originated ideas that score badly die here — cheaply.
    await cvxMutation("apps:completeStage", {
      id: p.appId,
      workerId,
      outcome: "wait_signoff",
      summary: `Inception scored ${brief.verdictScore}/10 — parked for Daniel instead of burning build tokens`,
      patch: { brief: briefMd, name: brief.name, oneLiner: brief.oneLiner, pricing: brief.pricing, brand: brief.brand },
    });
    await cvxMutation("intake:requestApproval", {
      appId: p.appId,
      stage: "inception",
      question: `Inception scored ${brief.verdictScore}/10. Build anyway?`,
      context: briefMd.slice(0, 4000),
    });
    return { verdict: "parked" };
  }

  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: "advance",
    summary: `Brief ready: ${brief.name} — ${brief.oneLiner} (score ${brief.verdictScore}/10)`,
    patch: { brief: briefMd, name: brief.name, oneLiner: brief.oneLiner, pricing: brief.pricing, brand: brief.brand },
  });
  return { verdict: "advanced", name: brief.name };
}

async function runRoadmap(p: Payload, app: AppDoc, workerId: string) {
  const { object } = await runAgent(
    roadmapAgent,
    `Product brief:\n\n${app.brief ?? app.idea}`,
    {
      appId: p.appId,
      stage: "roadmap",
      model: "opus",
      triggerRunId: workerId,
      schema: RoadmapSchema,
    },
  );
  const byMilestone = new Map<number, number>();
  const items = object.items.map((it) => {
    const order = (byMilestone.get(it.milestone) ?? 0) + 1;
    byMilestone.set(it.milestone, order);
    return { milestone: it.milestone, order, title: it.title, acceptance: it.acceptance };
  });
  const count = await cvxMutation("pipeline:setRoadmap", { appId: p.appId, items });
  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: "advance",
    summary: `Roadmap: ${count} items across ${byMilestone.size} milestones`,
  });
  return { items: count };
}

async function runDesign(p: Payload, app: AppDoc, workerId: string) {
  const repo = await prepareRepo();
  const dir = app.forgeSource
    ? await portForgeSource(repo, app.slug, app.forgeSource.repoUrl)
    : scaffoldApp(repo, app.slug, app.name);
  writeBriefFile(dir, app.brief ?? app.idea);
  await ensureDeps(dir);

  const forgeNote = app.forgeSource
    ? `\nFORGE MODE: this folder is a port of ${app.forgeSource.repoUrl}. FULL REBRAND required — replace every upstream name/logo/link with the new brand, but NEVER remove the upstream LICENSE file (legal obligation, see .factory/FORGE.md). Wire the paywall abstraction (lib/payments) around the most valuable existing capability.`
    : "";
  await runAgent(
    designerAgent,
    `App: ${app.name} — ${app.oneLiner}\nBrand: ${JSON.stringify(app.brand)}${forgeNote}\n\nThe product brief is at .factory/brief.md — read it first. Produce the design DNA per your instructions.`,
    {
      appId: p.appId,
      stage: "design",
      model: "opus",
      triggerRunId: workerId,
      cwd: dir,
      maxTurns: BUDGETS.design,
    },
  );

  await commitAndPush(repo, app.slug, `design(${app.slug}): design DNA, tokens, DESIGN.md`);

  const settings = (await cvxQuery("intake:getSettings")) as { designSignoffRequired: boolean };
  if (settings.designSignoffRequired) {
    await cvxMutation("intake:requestApproval", {
      appId: p.appId,
      stage: "design",
      question: `Design DNA for ${app.name} is in DESIGN.md — approve to start building?`,
      context: `Brand: ${JSON.stringify(app.brand)}. Files: apps/${app.slug}/DESIGN.md + constants/theme.ts`,
    });
    await cvxMutation("apps:completeStage", {
      id: p.appId,
      workerId,
      outcome: "wait_signoff",
      summary: "Design DNA written — awaiting sign-off",
    });
    return { signoff: "requested" };
  }
  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: "advance",
    summary: "Design DNA written",
  });
  return { signoff: "auto" };
}

async function runBuild(p: Payload, app: AppDoc, workerId: string) {
  const repo = await prepareRepo();
  const dir = app.forgeSource
    ? await portForgeSource(repo, app.slug, app.forgeSource.repoUrl)
    : scaffoldApp(repo, app.slug, app.name);
  writeBriefFile(dir, app.brief ?? app.idea);
  await ensureDeps(dir);

  const roadmap = (await cvxQuery("pipeline:roadmap", { appId: p.appId })) as RoadmapItem[];
  const openIssues = (await cvxQuery("pipeline:openIssues", { appId: p.appId })) as Issue[];

  // Next slice: open issues first, then the first incomplete milestone's items.
  const incomplete = roadmap.filter((r) => r.status === "todo" || r.status === "in_progress");
  const nextMilestone = incomplete.length ? Math.min(...incomplete.map((r) => r.milestone)) : 0;
  const slice = incomplete.filter((r) => r.milestone === nextMilestone).slice(0, 12);
  const fixables = openIssues
    .filter((i) => i.attempts < BUDGETS.maxFixAttemptsPerIssue)
    .slice(0, 10);

  if (slice.length === 0 && fixables.length === 0) {
    await cvxMutation("apps:completeStage", {
      id: p.appId,
      workerId,
      outcome: "advance",
      summary: "Nothing left to build — advancing to validate",
    });
    return { built: 0 };
  }

  await cvxMutation("pipeline:updateIssues", {
    updates: fixables.map((i) => ({ id: i._id, status: "fixing" as const, bumpAttempts: true })),
  });

  const prompt = [
    `App: ${app.name} — ${app.oneLiner} (build round ${app.buildRound + 1})`,
    fixables.length
      ? `\nOPEN ISSUES — fix these FIRST:\n${fixables
          .map((i, n) => `${n + 1}. [${i.severity}] (${i.fingerprint}) ${i.title}\n   ${i.detail.slice(0, 400)}`)
          .join("\n")}`
      : "",
    slice.length
      ? `\nROADMAP ITEMS to implement this round (milestone ${nextMilestone}):\n${slice
          .map((r, n) => `${n + 1}. ${r.title}\n   Acceptance: ${r.acceptance}`)
          .join("\n")}`
      : "",
  ].join("\n");

  await runAgent(builderAgent, prompt, {
    appId: p.appId,
    stage: "build",
    model: "sonnet",
    triggerRunId: workerId,
    cwd: dir,
    maxTurns: BUDGETS.build,
  });

  // Trust but verify: builder's report updates state, gates verify reality.
  const report = readReport(dir);
  const doneIds = slice
    .filter((r) => report.completedItems.some((t) => t.toLowerCase() === r.title.toLowerCase()))
    .map((r) => r._id);
  await cvxMutation("pipeline:updateRoadmapItems", {
    updates: doneIds.map((id) => ({ id, status: "done" as const, buildRound: app.buildRound + 1 })),
  });
  const fixedFps = new Set(report.fixedIssues);
  await cvxMutation("pipeline:updateIssues", {
    updates: fixables.map((i) => ({
      id: i._id,
      status: fixedFps.has(i.fingerprint) ? ("fixed" as const) : ("open" as const),
    })),
  });

  // Deterministic gates with ONE bounded fixer retry (dyad pattern).
  let gates = await runGates(dir);
  if (!gates.ok) {
    await logEvent(p.appId, "gate_failed", `Build gates failed — one fixer retry`, gates.issues);
    await runAgent(
      fixerAgent,
      `Automated gates failed after the build session. Fix EXACTLY these:\n${gates.issues
        .map((i, n) => `${n + 1}. (${i.fingerprint}) ${i.title}\n${i.detail.slice(0, 1200)}`)
        .join("\n\n")}`,
      {
        appId: p.appId,
        stage: "fix",
        model: "sonnet",
        triggerRunId: workerId,
        cwd: dir,
        maxTurns: BUDGETS.fix,
      },
    );
    gates = await runGates(dir);
  }

  if (!gates.ok) {
    // Commit progress so nothing is lost, then let the attempts counter decide.
    await commitAndPush(repo, app.slug, `wip(${app.slug}): build round ${app.buildRound + 1} (gates failing)`);
    throw new Error(
      `gates still failing after fixer retry: ${gates.issues.map((i) => i.fingerprint).join(", ")}`,
    );
  }

  await commitAndPush(
    repo,
    app.slug,
    `feat(${app.slug}): build round ${app.buildRound + 1} — ${doneIds.length} items${fixables.length ? `, ${report.fixedIssues.length} fixes` : ""}`,
  );
  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: "advance",
    summary: `Round ${app.buildRound + 1}: ${doneIds.length}/${slice.length} items done, gates green`,
  });
  return { built: doneIds.length };
}

async function runValidate(p: Payload, app: AppDoc, workerId: string) {
  const repo = await prepareRepo();
  const dir = appDir(repo, app.slug);
  await ensureDeps(dir);

  const gates = await runGates(dir);
  const allIssues: GateIssue[] = [...gates.issues];
  let paywallReachable = false;
  let screenshotCount = 0;

  if (gates.exportDir) {
    const shotsDir = `/tmp/factory/shots/${app.slug}`;
    rmSync(shotsDir, { recursive: true, force: true });
    mkdirSync(shotsDir, { recursive: true });

    const result = await validateWebBuild(gates.exportDir, shotsDir);
    allIssues.push(...result.issues);
    paywallReachable = result.paywallReachable;
    screenshotCount = result.screenshots.length;

    // Publish demo + screenshots regardless of verdict — Daniel always sees latest.
    const buildKey = `${R2CFG.demoPrefix}/${app.slug}/${workerId.replace(/[^a-z0-9_-]/gi, "")}`;
    await uploadDir(gates.exportDir, buildKey);
    const shotsKey = `${R2CFG.shotsPrefix}/${app.slug}/round-${app.buildRound}`;
    for (const s of result.screenshots) {
      await uploadFile(s, `${shotsKey}/${s.split(/[\\/]/).pop()}`);
    }
    await logEvent(p.appId, "demo_updated", `Demo published (${result.screensVisited} screens driven)`);

    // ONE vision pass over the batch of screenshots.
    const { object: vision } = await runAgent(
      visionAgent,
      `Screenshots of "${app.name}" (${app.oneLiner}) are in this directory as PNG files. Brand vibe: ${app.brand?.vibe ?? "n/a"}. Read each and report real defects only.`,
      {
        appId: p.appId,
        stage: "vision",
        model: "sonnet",
        triggerRunId: workerId,
        cwd: shotsDir,
        schema: VisionFindingsSchema,
      },
    );
    for (const f of vision.findings) {
      allIssues.push({
        fingerprint: `vision:${f.category}:${f.screen.slice(0, 32)}`,
        severity: f.severity,
        source: "gate",
        title: f.title,
        detail: f.detail,
      });
    }

    // Persist issues (fingerprint-deduped; waived never re-raised).
    await cvxMutation("pipeline:reportIssues", {
      appId: p.appId,
      round: app.buildRound,
      issues: allIssues.map(({ fingerprint, severity, source, title, detail }) => ({
        fingerprint,
        severity,
        source,
        title: title.slice(0, 120),
        detail: detail.slice(0, 1800),
      })),
    });

    const lint = await runLintAdvisory(dir);
    if (lint.length)
      await cvxMutation("pipeline:reportIssues", {
        appId: p.appId,
        round: app.buildRound,
        issues: lint,
      });

    // Routing: still-fixable P0s → build loop; otherwise → review.
    const open = (await cvxQuery("pipeline:openIssues", { appId: p.appId })) as Issue[];
    const fixableP0s = open.filter(
      (i) => i.severity === "P0" && i.attempts < BUDGETS.maxFixAttemptsPerIssue,
    );
    const loop =
      fixableP0s.length > 0 && app.buildRound < BUDGETS.maxBuildRounds ? "loop_build" : "advance";
    await cvxMutation("apps:completeStage", {
      id: p.appId,
      workerId,
      outcome: loop,
      summary:
        loop === "loop_build"
          ? `${fixableP0s.length} fixable P0(s) → build loop (vision ${vision.overall}/10)`
          : `Validation done: ${open.length} open issue(s), vision ${vision.overall}/10, paywall ${paywallReachable ? "reachable" : "NOT reached"}`,
      patch: { demoBuildKey: buildKey },
    });
    return { issues: allIssues.length, loop, screenshotCount };
  }

  // Export itself failed → issues recorded; loop back to build if budget allows.
  await cvxMutation("pipeline:reportIssues", {
    appId: p.appId,
    round: app.buildRound,
    issues: allIssues,
  });
  const loop = app.buildRound < BUDGETS.maxBuildRounds ? "loop_build" : "advance";
  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: loop,
    summary: `Web export failed — ${loop === "loop_build" ? "back to build" : "budget exhausted, escalating to review"}`,
  });
  return { issues: allIssues.length, loop };
}

async function runReview(p: Payload, app: AppDoc, workerId: string) {
  const repo = await prepareRepo();
  const dir = appDir(repo, app.slug);

  const roadmap = (await cvxQuery("pipeline:roadmap", { appId: p.appId })) as RoadmapItem[];
  const open = (await cvxQuery("pipeline:openIssues", { appId: p.appId })) as Issue[];
  const shotsDir = `/tmp/factory/review-shots/${app.slug}`;
  const shots = await downloadPrefix(
    `${R2CFG.shotsPrefix}/${app.slug}/round-${Math.max(0, app.buildRound - 1)}`,
    shotsDir,
  ).catch(() => [] as string[]);

  const { object: verdict } = await runAgent(
    reviewerAgent,
    [
      `Final review of "${app.name}" — ${app.oneLiner}. Review round ${app.reviewRound + 1} of ${BUDGETS.maxReviewRounds}.`,
      `Latest validation screenshots: ${shots.length ? shotsDir : "none available"}.`,
      `\nROADMAP CONTRACT (judge ONLY these):\n${roadmap
        .map((r) => `- [${r.status}] ${r.title} — acceptance: ${r.acceptance}`)
        .join("\n")}`,
      open.length
        ? `\nKnown open issues (context, do not duplicate):\n${open
            .map((i) => `- [${i.severity}] ${i.title}`)
            .join("\n")}`
        : "",
    ].join("\n"),
    {
      appId: p.appId,
      stage: "review",
      model: "opus",
      triggerRunId: workerId,
      cwd: dir,
      schema: ReviewVerdictSchema,
    },
  );

  // Mark verified roadmap items.
  const verifiedIds = roadmap
    .filter((r) => verdict.roadmapItemsVerified.some((t) => t.toLowerCase() === r.title.toLowerCase()))
    .map((r) => r._id);
  await cvxMutation("pipeline:updateRoadmapItems", {
    updates: verifiedIds.map((id) => ({ id, status: "verified" as const })),
  });

  const roundsLeft = app.reviewRound + 1 < BUDGETS.maxReviewRounds;

  if (verdict.verdict === "fix_first" && roundsLeft && verdict.fixes.length > 0) {
    await cvxMutation("pipeline:reportIssues", {
      appId: p.appId,
      round: app.buildRound,
      issues: verdict.fixes.map((f) => ({
        fingerprint: `review:${f.title.slice(0, 48)}`,
        severity: f.severity,
        source: "review" as const,
        title: f.title,
        detail: f.detail,
      })),
    });
    await cvxMutation("apps:completeStage", {
      id: p.appId,
      workerId,
      outcome: "loop_build",
      summary: `Review round ${app.reviewRound + 1}: ${verdict.fixes.length} fixes required — ${verdict.summary.slice(0, 200)}`,
    });
    return { verdict: "fix_first" };
  }

  // approve, hold, or review budget exhausted → the human gate (with full context).
  await cvxMutation("intake:requestApproval", {
    appId: p.appId,
    stage: "approval",
    question:
      verdict.verdict === "approve"
        ? `${app.name} passed review — approve for packaging/ship?`
        : verdict.verdict === "hold_for_daniel"
          ? `${app.name}: reviewer needs your call`
          : `${app.name}: review budget exhausted with open items — ship-decide anyway?`,
    context: `${verdict.summary}\n\nVerified: ${verdict.roadmapItemsVerified.length}/${roadmap.length} roadmap items.\nOpen issues: ${open.length}.`,
  });
  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: "needs_approval",
    summary: `Review verdict: ${verdict.verdict} — parked at ship gate`,
  });
  return { verdict: verdict.verdict };
}

async function runPackage(p: Payload, app: AppDoc, workerId: string) {
  const repo = await prepareRepo();
  const dir = appDir(repo, app.slug);

  await runAgent(
    packagerAgent,
    `Prepare "${app.name}" (${app.oneLiner}, pricing: ${app.pricing ?? "subscription"}) for store submission per your instructions.`,
    {
      appId: p.appId,
      stage: "package",
      model: "sonnet",
      triggerRunId: workerId,
      cwd: dir,
      maxTurns: BUDGETS.package,
    },
  );
  await commitAndPush(repo, app.slug, `chore(${app.slug}): store packaging collateral`);
  await cvxMutation("apps:completeStage", {
    id: p.appId,
    workerId,
    outcome: "shipped",
    summary: "Store collateral ready — EAS submission is the manual lane",
  });
  return { shipped: true };
}
