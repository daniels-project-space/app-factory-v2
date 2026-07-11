# Working Context — reviewpulse

*Regenerated: 2026-04-24T04:10:02+00:00. This file is REWRITTEN at the start of every worker
session. If you're seeing stale information, the rest of this content is
also stale — trust `.factory/tasks.json` and `/home/ubuntu/app-factory/state/reviewpulse.json`
as ground truth.*

## One-line pitch
(no tagline set)

> The only mobile-native review manager built for solo business owners — send SMS review requests, monitor Google/Yelp/Trustpilot in real time, and reply with AI-drafted responses for $14.99/month with no annual contract.

## Current phase & gates

- **Phase:** `build`
- **Scope frozen:** false  (if true: ROADMAP.md is read-only; new checklist items forbidden)
- **E2E eligible:** true  (if true: reverify runs post-session automatically — do NOT invoke it manually)
- **Build iteration:** 2

## DAG snapshot (authoritative: `.factory/tasks.json`)

done: 138, ready: 25

### Frontier preview — top 10 eligible tasks

- `t_f09db14899a2` **Feature 10: Customer List Management** — Test on real iOS device (not just simulator)
- `t_5dc8b6e2d4ed` **Feature 10: Customer List Management** — Test on Android device
- `t_067af4279c37` **Feature 10: Customer List Management** — Production EAS build
- `t_b5cbc53a9a2c` **Feature 10: Customer List Management** — TestFlight internal review
- `t_76208ff7046c` **Feature 10: Customer List Management** — Submit for App Store review
- `t_60624849669f` **Marketing & Psychology** — Implement 3-tier anchoring pricing page (Free/Pro/Business) with decoy tier
- `t_9fe733d4d7a0` **Marketing & Psychology** — Add loss-aversion trial expiry messaging ("Your X will be archived in 3 days")
- `t_3234b803a89b` **Marketing & Psychology** — Pre-select Pro annual plan as default on pricing page (default bias)
- `t_166074095003` **Marketing & Psychology** — Implement pain-pleasure copy framework on landing/onboarding (pain → amplify → solution → 
- `t_d924967cd103` **Marketing & Psychology** — Add social proof elements: user count, testimonials section, or "Used by" logos

*Always pick via `/home/ubuntu/autonomous/lib/next-eligible-task.py reviewpulse --claim worker-$(date +%s)` — do not walk the ROADMAP top-to-bottom.*

## Recent session history (last 3)

- **2026-04-17T18:19:55.315960Z** [build / ?]: Auto-reset to build from 'build' by pipeline-audit-2026-04-17 — new Tier A/B/C gates require re-work. 3 fresh critique items injected.
- **2026-04-17T17:53:10.035285Z** [build / ?]: Auto-reset to build from 'deploy' by pipeline-audit-2026-04-17 — new Tier A/B/C gates require re-work. 0 fresh critique items injected.
- **2026-04-15T17:50:00.606Z** [deploy / ?]: Approved by Daniel — moving to deploy

## Open critique notes (highest-severity, unresolved)

- **[? / feature_completeness]** Feature 'AI-drafted review reply suggestions (Claude Haiku)' incomplete — missing ai_client
  Fix hint: 
- **[? / feature_completeness]** Feature 'Push notifications for new reviews' incomplete — missing time_selector
  Fix hint: 
- **[? / routing]** Route mismatches or silent auth-wall redirects detected
  Fix hint: 
- **[e2e-gate / navigation_broken]** Tab "Analytics" shows an error on navigation: "something went wrong
an unexpected error occurred. tap below to try again.
try again"
  Fix hint: Fix the error that fires when this tab is first opened. This is likely caused by missing Supabase tables/seed data or an unhandled null state. Add error boundaries and check that a
- **[e2e-gate / navigation_broken]** Tab "Settings" shows an error on navigation: "something went wrong
an unexpected error occurred. tap below to try again.
try again"
  Fix hint: Fix the error that fires when this tab is first opened. This is likely caused by missing Supabase tables/seed data or an unhandled null state. Add error boundaries and check that a

## Key-file manifest

- `ROADMAP.md` — Full product spec + feature checklist (authoritative scope)
- `DESIGN.md` — Design decisions and rationale (written in design phase)
- `.factory/tasks.json` — DAG of all checklist items (authoritative task state)
- `.factory/working-context.md` — THIS FILE (regenerated every session)
- `.phase-state.json` — e2eEligible + buildIteration flags
- `supabase/migrations` — Database schema migrations
- `supabase/functions` — Edge Functions (Claude Vision calls etc.)


## Delegation reminder (you've seen this in the system prompt — here for reinforcement)

- Any question about existing code → `factory-researcher` via Agent tool
- Any verification → `factory-verifier` via Agent tool
- Direct tools you may use yourself: `Edit`, `Write`, `Agent`, `Bash` (pipeline helpers only), `Read` (only `.factory/*`)
- If tempted to `Read` a source file or `Grep` the repo, rewrite as a subagent call

## Where to look next

1. Run `next-eligible-task.py` to claim work
2. If you already have a claim, see §"Currently claimed task" above
3. Spawn `factory-researcher` with a specific question about your task area
4. Make the edit
5. Spawn `factory-verifier` to confirm it holds
6. Update `tasks.json` (`status: "done"`, `completed_at: <iso>`)
7. Loop
