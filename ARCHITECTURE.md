# App Factory v2 — Architecture

Autonomous idea→shipped-app builder. Full rebuild of the VPS `app-factory` + `autonomous` (Sentinel) stack on the standard platform: **Convex + Trigger.dev + R2 + Vercel + Mastra**, running all LLM work on Daniel's **Claude Max subscription** (Agent SDK + `CLAUDE_CODE_OAUTH_TOKEN`).

## Why v1 died (audit, 2026-07-11)

163 sessions, **0 apps shipped, $0 revenue**. Root causes, each with its v2 countermeasure:

| v1 failure | v2 design answer |
|---|---|
| Review ratchet: `P1>0 → regress`, adversarial reviewers always find something; apps looped build↔review forever | Bounded review: max 2 review rounds, fixed acceptance criteria set at roadmap time, issues fingerprinted — an issue is raised once, fixed or explicitly waived, never re-litigated |
| 11 human gates → OnePrompt idled 48 sessions at one gate | 2 human gates total (design sign-off optional, ship approval). Waiting apps NEVER block other work; approvals batched in the UI |
| Reviewed a lossy web export of a native app (Skia crashed on web) | Web-cleanliness is a scaffold constraint: every component must render via react-native-web. The demo link IS the validated artifact. Native-only flourishes allowed only behind `Platform` guards on non-critical paths |
| Grep-based "gates" (payments gate = Stripe string present) | Gates are executed behavior: tsc/eslint pass, `expo export` succeeds, Playwright drives real sessions, Stripe checkout reached in test mode |
| 130KB bash worker, JSON files on disk, `.bak` archaeology, 20 overlapping QA scripts | TypeScript everywhere, state in Convex, one validation suite, git for history |
| Token furnace: 8 LLM calls to score one idea, 40KB prompts, giant state files re-read every session, 6–9 grader sessions per review | Compact stage briefs assembled from Convex (never whole history), one deliberation call, one validation round with one vision pass, structured outputs, per-stage `maxTurns` budgets |
| Home-rolled OAuth refresh pinned to a CLI client_id | Long-lived `claude setup-token` (~1yr) in Trigger env — proven in prod by remote-work-hub since 2026-06-12 |
| 300-item roadmaps for MVPs | Roadmap hard cap: ≤ 60 items, milestone-sliced, each with executable acceptance criteria |

## Topology

```
Next.js 16 (Vercel) ── live UI, Convex live queries, share/demo routes
      │
Convex (frugal-jackal-724) ── single source of truth: apps, stages, roadmap,
      │                        issues, runs, events, ideas, approvals, settings
      │
Trigger.dev (app-factory-jobs / proj_vltrshgupsrfmimsntgm)
      ├─ orchestrator  (cron */5) claims runnable stages, respects concurrency=2
      ├─ stage-runner  runs ONE stage for ONE app via Mastra agents
      └─ forge-scout   (daily, gated) finds MIT/Apache OSS conversion candidates
      │
Claude Max subscription ── @anthropic-ai/claude-agent-sdk, CLAUDE_CODE_OAUTH_TOKEN
      │                     (ANTHROPIC_API_KEY scrubbed to "")
R2 (bucket app-factory-v2) ── web-export demos, screenshots, artifacts
GitHub (this repo) ── generated apps live in apps/<slug>/, self-contained
```

## Generated apps

- **Target**: Expo SDK 54 mobile apps (App Store one day), scaffolded from `templates/starter/` — a minimal, verified-clean kit (expo-router, NativeWind, tokens, ~15 primitives, auth-ready, paywall abstraction, demo-mode fallbacks). No 146-component dump; quality over volume.
- **Location**: `apps/<slug>/` in this repo. Fully self-contained (own package.json, no imports from factory code) → extraction to its own repo later = copy folder + `git init`. Non-destructive by construction.
- **Demo links**: every passing build exports web (`expo export -p web`) → uploaded to R2 → served at `/demo/<slug>/` from the factory app. Public share page `/s/<token>` (no hub chrome, noindex) shows phone-framed demo + QR.
- **Payments**: provider-abstracted paywall. Demo mode = mocked checkout (always works). Web lane = Stripe Checkout (keys in vault). Store lane = RevenueCat wiring, activated at ship time.
- **Backend**: apps run demo-first (local MMKV/AsyncStorage state); Supabase wiring optional and activated per-app when promoted.

## Pipeline (state machine in Convex, executed by Trigger)

`inception → roadmap → design → build (N rounds) → validate → review → approved → package → shipped`

- **inception** (Opus): idea → brief — positioning, persona, pricing, MVP feature cut, brand direction. Structured output.
- **roadmap** (Opus): brief → ≤60 items across 3–5 milestones, each item has machine-checkable acceptance criteria. This is the contract; review may not add scope.
- **design** (Opus): design language, tokens, screen map, signature element spec. Writes `DESIGN.md` + tokens into the app folder. Optional human sign-off (non-blocking: auto-approves after configurable window unless Daniel holds it).
- **build round** (Sonnet, agentic): implements next milestone slice in the app folder; inline quality loop (tsc + eslint + expo export web) every few files; commits per slice.
- **validate** (deterministic + Sonnet fixes): export web → serve → single Playwright suite (cold start, nav walk, auth flow, interaction probe, checkout reach) → screenshots → ONE vision review call. Failures become fingerprinted issues; fix rounds bounded (2 attempts/issue, then flagged for review).
- **review** (Opus, max 2 rounds): full design+code review with screenshots against the roadmap's acceptance criteria only. Verdict: approve / fix-list (bounded) / hold-for-daniel.
- **approval** (human, batched): Daniel approves in UI → package. The ONLY hard human gate.
- **package** (Sonnet): store metadata, screenshots, privacy policy → artifacts in R2. EAS/store submission stays a manual-assisted lane.

Concurrency: 2 stage-runners max (Balanced budget). Model routing lives in ONE config (`src/factory/models.ts`). Global kill switch + daily budget in Convex `settings`.

## Forge module (OSS → commercial)

What Daniel described: take free, already-built apps; rebrand; add payment logic.
- **forge-scout** (gated, off by default): finds high-star MIT/Apache Expo/RN apps + web apps worth converting; writes `forgeCandidates` with license audit.
- **forge-convert**: audit → rebrand plan → port into `apps/<slug>/` → payments wiring → then joins the SAME validate/review pipeline as factory apps (no separate quality path — that's what let goldmine ship hollow work).
- License blocklist: GPL/AGPL/SSPL. Attribution file auto-maintained.

## Mastra layer

All LLM roles are Mastra agents in `src/mastra/` (executed inside Trigger tasks, never on Vercel):
- `inception`, `roadmap`, `designer`, `reviewer` — ClaudeSDKAgent (Opus), structured outputs.
- `builder`, `fixer`, `packager`, `forgeConverter` — Agent SDK `query()` with file/bash tools in the app cwd (Sonnet).
- `visionQA` — screenshot batch review (Sonnet).
Stage internals that are multi-step (validate loop) are Mastra workflows; cross-stage orchestration is the Convex state machine + Trigger scheduler (durable, observable, resumable).

## Token discipline (mechanical, not aspirational)

1. Stage briefs are ≤ ~4KB, assembled from Convex fields — never raw history/state dumps.
2. Deterministic code does everything non-creative: scaffold, rename, dep install, export, upload, screenshots.
3. One vision call per validate round (batched images). One review session per round.
4. `maxTurns` per stage; runs record usage; orchestrator enforces daily budget and pauses at cap.
5. Opus ONLY for inception/roadmap/design/review. Sonnet builds. Haiku for trivial classification.
6. Issues deduped by fingerprint; "already fixed" work is never re-verified by an LLM (gates re-verify mechanically).
