# OnePrompt — Audit Notes

Running log of visual + UX audit findings that either (a) were fixed already,
or (b) informed roadmap additions. Newest entries first. Pair each entry with
the crew run directory so the raw JSON / screenshots are retrievable.

---

## 2026-04-14 — Onboarding audit (crew run `one-prompt-20260414-170202`)

Raw artifacts: `/home/ubuntu/app-factory/crew/runs/one-prompt-20260414-170202/`

### Crew verdict

| Metric | Score |
|---|---|
| overall_score | 5.29 / 10 |
| per_agent: code-qa | 7.4 |
| per_agent: design-qa | 7.0 |
| per_agent: e2e-gate | 1.47 |
| e2e_verdict | PASS |
| devil_verdict | HOLD |

Issue counts: **6 P0 / 7 P1 / 10 P2 / 6 P3 = 29 total**.

Design-QA scorecard:

| dimension | score |
|---|---|
| visual_consistency | 5 / 10 |
| ux_flows | 7 / 10 |
| accessibility | 6 / 10 |
| ai_slob_absence | 9 / 10 |
| screen_completeness | 8 / 10 |

### Caught by rubric (will be fixed by next build dispatch)

Design P0:
- Hero onboarding = flat sparkle + text on plain gradient, no depth/bloom/richness (`graphics_too_basic`) — `src/components/Onboarding.tsx`
- "Skip setup →" fails contrast on cream background — `src/components/Onboarding.tsx`
- Paywall entrance uses raw `withTiming`, no easing (`linear_easing` P0) — `src/app/paywall.tsx:71`

Design P1:
- SparklesIcon has no bloom / corona / twinkle — `src/components/Onboarding.tsx:35`
- Paywall FEATURES list = generic_card_grid, no hierarchy — `src/app/paywall.tsx:28`
- Home empty state has no illustration / shimmer — `src/app/index.tsx`

Design P2: 4× missing `accessibilityLabel`, ChevronLeft rotated as right-arrow (RTL hostile).

Design P3: backup file `Onboarding.tsx.bak` shipped; lowercase proper nouns in consent copy.

### NOT caught by rubric — surfaced manually

See ROADMAP.md "Onboarding polish — audit gaps (2026-04-14)". These are the
roadmap-worthy gaps, because the current rubric doesn't measure them:

1. Hero spatial density (~45% vertical dead space on slide 1)
2. Typography weight hierarchy (titles at 400 weight read as whisper)
3. Pagination dots too quiet (6px, low contrast)
4. CTA button silhouette is generic SaaS rectangle
5. **Playwright can't advance onboarding past slide 1** — audit blocker
6. Rubric extension: onboarding arc cohesion (pending #5)

### Screenshot inventory

Six screenshots captured; all three of the "cold path" frames show slide 1
because the Playwright driver couldn't advance:

- `01-cold-landing.png` — slide 1, first frame
- `03-cold-final.png` — slide 1 again
- `04-returning-landing.png` — slide 1 again (session 2)
- `05-deep-home.png` — slide 1 again (session 3 — app never reached home)
- `06-deep-tab-Begin.png` — slide 1 after tapping Begin (click fired, state didn't advance)
- `06-deep-tab-Skip-setup--.png` — after tapping Skip setup

### Environmental findings (not audit-related, context only)

- Preview served at `/preview/one-prompt/` (Expo `experiments.baseUrl`) —
  fixed earlier in the same session (previously 404 / "Unmatched Route").
- Nginx redirect added for `/preview/<id>` no-slash → `/preview/<id>/` with
  301 so direct-typed URLs work.
- Factory pipeline now injects `EXPO_BASE_URL=/preview/<slug>` automatically
  on every `build-verify.sh` run.
