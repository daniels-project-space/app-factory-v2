# OnePrompt — Product Roadmap

> **"One Thought. One Day. Forever."**
> Minimal micro-journaling: one sentence per day, sealed in time capsules, revealed later. AI weekly insights, photo journaling, mood tracking, philosopher guides.
> Premium: £2.99/mo or £19.99/yr. iOS first, then Android.

---

## Feature Breakdown

### Feature 1: Daily Journal Entry
Write one thought per day with a 150-character limit, saved locally with streak tracking.

### Feature 2: Time Capsule Reveal
Entries are sealed and revealed after a user-chosen delay (instant, tomorrow, 1 week, 1 month).

### Feature 3: AI Reflection Insights
Weekly AI-generated insights based on journal entries, philosopher guides, and user goals.

### Feature 4: Onboarding Flow
Seven-screen onboarding with terms, goal selection, theme picker, time capsule config, and reminders.

### Feature 5: Settings Panel
In-app settings with theme selection, appearance mode, haptics, notification preferences, and account.

### Feature 6: Calendar Panel
Swipe-down calendar view showing all past entries with mood tracking and streak visualization.

### Feature 7: Premium Subscription Paywall
Monthly/yearly subscription with RevenueCat, unlocking unlimited AI insights and themes.

### Feature 8: Photo Journal
Optional photo attachment to journal entries with upload progress and gallery access.

### Feature 9: Journaling Paths
Structured multi-day paths (gratitude, growth, mindfulness) with sequential daily prompts.

### Feature 10: Achievement System
Milestone badges for streaks, entry counts, and path completions with celebration animations.

---

## 1. Foundation & Infrastructure

- [x] 1.1 Initialize Expo project (SDK 53, React Native 0.76.7, TypeScript)
- [x] 1.2 Configure NativeWind + Tailwind v3 styling system
- [x] 1.3 Set up Expo Router file-based navigation (Stack navigator)
- [x] 1.4 Configure Zustand stores with AsyncStorage persistence (journal, settings, onboarding, auth)
- [x] 1.5 Set up Supabase client (auth, database, storage, realtime)
- [x] 1.6 Write database migration: profiles, journal_entries, user_settings, push_tokens tables
- [x] 1.7 Configure Row Level Security policies for all tables
- [x] 1.8 Create Supabase Storage bucket for journal photos with RLS
- [x] 1.9 Set up React Query for server/async state management
- [x] 1.10 Configure EAS build profiles (development, preview, production)
- [x] 1.11 Set up Sentry error tracking
- [x] 1.12 Set up PostHog anonymous analytics
- [x] 1.13 Create cn() utility for NativeWind className merging
- [x] 1.14 Set up DM Sans custom font via @expo-google-fonts

---

## 2. Design System & Theming

- [x] 2.1 Implement 9 color themes (Classic Blue, Mint Calm, Lavender, Sunset, Mono, Midnight, Coral, Sky, Golden Hour)
- [x] 2.2 Build theme provider with useAppTheme hook
- [x] 2.3 Implement System/Light/Dark appearance mode toggle
- [x] 2.4 Create live theme preview in settings
- [x] 2.5 Persist theme selection across sessions (AsyncStorage)
- [x] 2.6 Build glassmorphic card components using expo-blur
- [x] 2.7 Configure haptic feedback system with toggle (expo-haptics)
- [x] 2.8 Implement Reduce Motion accessibility support

---

## 3. Onboarding Flow (7 Screens)

- [x] 3.1 Welcome screen with app intro and tagline
- [x] 3.2 Terms & Conditions acceptance screen with checkboxes
- [x] 3.3 Goals selection screen (9-tile grid, select up to 3: Self-Awareness, Gratitude, Stress Relief, Creativity, Goal Tracking, Emotional Processing, Mindfulness, Personal Growth, Memory Keeping)
- [x] 3.4 Theme chooser with live preview (6 themes)
- [x] 3.5 Time Capsule reveal delay selector (Tomorrow/Week/Month/Right Away)
- [x] 3.6 Daily reminder time picker with notification permission request
- [x] 3.7 Optional sign-in screen (skippable)
- [x] 3.8 Onboarding completion state persistence (prevent replay, allow reset from settings)

---

## 4. Home Screen (Daily Input)

- [x] 4.1 Daily prompt display with deterministic date-based selection
- [x] 4.2 Double-tap to shuffle through 5 random prompt options
- [x] 4.3 Text input field with 150-character max limit
- [x] 4.4 Streak badge display (current + longest)
- [x] 4.5 Send button with Energy Bubble animation (2-second sequence: compress, charge, color fill, pulse, particle burst, dissolve, confirmation)
- [x] 4.6 Sealed state display with countdown timer after submission
- [x] 4.7 Swipe-down gesture to reveal Calendar & History panel (glassmorphic)
- [x] 4.8 Swipe-left gesture to reveal Settings panel (slide-in from right)
- [x] 4.9 Lock entries after submission (no edits, enforces authentic expression)
- [x] 4.10 Prompt style setting: Gentle/Neutral/Deep tone preference

---

## 5. Prompt System

- [x] 5.1 Build prompt database: 7 categories x 200 prompts = 1,400 base prompts
- [x] 5.2 Implement Gratitude category (200 prompts)
- [x] 5.3 Implement Self-Discovery category (200 prompts)
- [x] 5.4 Implement Relationships category (200 prompts)
- [x] 5.5 Implement Growth category (200 prompts)
- [x] 5.6 Implement Mindfulness category (200 prompts)
- [x] 5.7 Implement Creativity category (200 prompts)
- [x] 5.8 Implement Reflection category (200 prompts)
- [x] 5.9 Build prompt selection algorithm (deterministic daily seed + shuffle)
- [x] 5.10 Create prompt categories screen with multi-select UI (Premium)
- [x] 5.11 Build custom prompts manager with add/remove (10-200 chars, Premium)
- [x] 5.12 Integrate custom prompts into daily rotation alongside category prompts

---

## 6. History & Calendar

- [x] 6.1 Build CalendarView component (month grid with filled dots for entry days)
- [x] 6.2 Build CalendarPanel (swipe-down glassmorphic overlay)
- [x] 6.3 Create history screen with recent entries list (last 7 days)
- [x] 6.4 Implement entry detail modal (entry/[date].tsx dynamic route)
- [x] 6.5 Display photo entries with image viewer
- [x] 6.6 Sealed/revealed badges on entries
- [x] 6.7 "Newly revealed" badge for just-unlocked time capsules
- [x] 6.8 Entry deletion with confirmation
- [x] 6.9 Stats tiles: current streak, longest streak
- [x] 6.10 Staggered list animations (FadeInDown + Layout shifts)

---

## 7. Time Capsule System

- [x] 7.1 Implement reveal delay options: instant, tomorrow (24h), week (7d), month (30d)
- [x] 7.2 Store reveal_at timestamp with each entry
- [x] 7.3 Build sealed state UI with countdown display
- [x] 7.4 Energy Bubble send animation (compress -> charge -> particle pulse -> dissolve)
- [x] 7.5 ParticlePulse component for radial burst effect on send
- [x] 7.6 Reveal notification when entry unlocks (push notification)
- [x] 7.7 Configurable default delay in settings

---

## 8. Animations & Visual Effects

- [x] 8.1 Build ParticleBackground component (floating star particles, theme-colored)
- [x] 8.2 Build FireplaceBackground component (blue flames, flickering elements, 15 rising embers with 10-18s rise time, sway animations)
- [x] 8.3 Build NeonBackground component (animated cyan/magenta gradients, two traveling neon edge lines with glow pulse)
- [x] 8.4 Build EnergyBubbleSend animation (2-second sequence with 6 stages)
- [x] 8.5 Build ParticlePulse component (radial burst outward)
- [x] 8.6 Implement BackgroundMusicPlayer (ambient looping, auto-pause on background)
- [x] 8.7 Particle toggle (Settings, respects Reduce Motion)
- [x] 8.8 Premium gating for Fireplace, Neon, and Background Music effects
- [x] 8.9 Gesture animations: swipe panels slide in/out, modal fade + slide
- [x] 8.10 Button press scaling + glow micro-interactions

---

## 9. Authentication

- [x] 9.1 Email/password sign-in screen
- [x] 9.2 Email/password sign-up screen
- [x] 9.3 Apple Sign-In integration (iOS)
- [x] 9.4 Google Sign-In integration (Android)
- [x] 9.5 Forgot password / reset flow
- [x] 9.6 Auto-sync on user change
- [x] 9.7 Auto-logout and local data clear on user switch
- [x] 9.8 Session persistence across app restarts
- [x] 9.9 Error boundaries with graceful fallback

---

## 10. Settings Screen (9 Sections)

- [x] 10.1 Premium status section (upgrade, restore purchases)
- [x] 10.2 Account section (email, sign-in method, sign-out)
- [x] 10.3 Appearance section (theme picker with live preview, light/dark/system, particle toggle)
- [x] 10.4 Pro Effects section (Fireplace, Neon, Music, Photo Prompts, Mood tracking, Custom prompts, Categories, Philosopher guide)
- [x] 10.5 Notifications section (daily reminder time picker, evening nudge toggle, reveal notification toggle)
- [x] 10.6 Widget section (show/hide prompt & streak on home screen)
- [x] 10.7 Preferences section (prompt style, shuffle toggle, haptic toggle)
- [x] 10.8 Time Capsule section (reveal delay selector)
- [x] 10.9 Data section (cloud sync toggle, PDF export, delete all data)
- [x] 10.10 Legal & About section (ToS, Privacy, Disclaimer, version)
- [x] 10.11 Testing tools (load test data, reset purchases, replay onboarding, full reset)

---

## 11. AI Weekly Reflections (Premium)

- [x] 11.1 Build weekly-reflection screen UI (summary, themes, mood chart, encouragement)
- [x] 11.2 Implement sentiment analysis engine (9 emotional categories, negation detection)
- [x] 11.3 Build expandable mood chart (day-by-day bars, color-coded 1-5, week navigation)
- [x] 11.4 Integrate philosopher guide voice selection (6 philosophers shape reflection tone)
- [x] 11.5 Build refresh/regenerate button for AI insights
- [x] 11.6 Implement photo insights (GPT-4o vision analysis for photo entries)
- [x] 11.7 Premium gate on AI reflections access
- [x] 11.8 Deploy Supabase Edge Function for AI reflection generation (protects OpenAI API key from client)
- [x] 11.9 Implement server-side prompt construction with philosopher persona injection
- [x] 11.10 Add rate limiting on Edge Function (max 3 regenerations per week per user)
- [x] 11.11 Add reflection caching (store generated reflections, re-serve if entries unchanged)

---

## 12. Photo Journaling (Premium)

- [x] 12.1 Build photo-prompt screen with full-screen camera interface
- [x] 12.2 Implement front/back camera flip
- [x] 12.3 Build daily photo prompt display (5 shuffleable options)
- [x] 12.4 Capture flow with live preview and retake option
- [x] 12.5 Time capsule reveal delays for photo entries
- [x] 12.6 Store photos with metadata in journal entries
- [x] 12.7 Photo display in entry detail view
- [x] 12.8 Populate category-specific photo prompt lists (40 per category x 7 = 280 total)
- [x] 12.9 Upload photos to Supabase Storage when cloud sync enabled
- [x] 12.10 Optimize photo compression for storage efficiency

---

## 13. Mood Tracking (Premium)

- [x] 13.1 Build inline 1-5 scale mood selector on home screen
- [x] 13.2 Store mood with each journal entry
- [x] 13.3 Display mood in weekly reflection chart
- [x] 13.4 Build mood-insights screen with detailed history
- [x] 13.5 Week navigation (swipe through past weeks)
- [x] 13.6 Average mood score calculation per week
- [x] 13.7 Advanced sentiment analysis on text entries (9 categories)
- [x] 13.8 Toggle mood tracking on/off in settings
- [x] 13.9 Hide mood selector when in photo-only mode

---

## 14. Philosopher Guide (Premium)

- [x] 14.1 Build philosopher-guide selection screen
- [x] 14.2 Implement 6 philosopher personas (Default, Nietzsche, Marcus Aurelius, Plato, Schiller, Camus)
- [x] 14.3 Write personality descriptions and selection UI
- [x] 14.4 Integrate philosopher voice into weekly reflection tone
- [x] 14.5 Persist philosopher selection across sessions

---

## 15. Journaling Paths & Achievements

- [x] 15.1 Build paths screen for guided 30/90-day journeys
- [x] 15.2 Define journey data structures (daily prompts, themes, milestones)
- [x] 15.3 Track path completion status per user
- [x] 15.4 Build achievements system with celebration animations
- [x] 15.5 Define achievement criteria and rewards

---

## 16. Cloud Sync

- [x] 16.1 Implement bidirectional sync (push local -> cloud, pull cloud -> local)
- [x] 16.2 Build offline queue for sync when no internet
- [x] 16.3 Implement conflict resolution (last-write-wins by updatedAt)
- [x] 16.4 Build sync status indicators (idle, syncing, success, error, offline)
- [x] 16.5 Add manual sync trigger in Settings > Data
- [x] 16.6 Sync journal entries to Supabase
- [x] 16.7 Sync user settings and mood history
- [x] 16.8 Add upload progress indicator for photo sync to Supabase Storage
- [x] 16.9 Auto-sync on app startup when signed in (currently manual)

---

## 17. Notifications

- [x] 17.1 Daily reminder notifications (configurable time, recurring)
- [x] 17.2 Evening nudge notification (optional, if entry not completed)
- [x] 17.3 Time capsule reveal notifications (when sealed entry unlocks)
- [x] 17.4 Android notification channel with custom vibration pattern
- [x] 17.5 Permission request flow with graceful skip option
- [x] 17.6 Notification scheduling and cancellation

---

## 18. PDF Export (Premium)

- [x] 18.1 Build PDF generation with date header and insights section
- [x] 18.2 Include total entries, streak stats, journaling days count
- [x] 18.3 Auto-detect and include themes (Gratitude, Growth, etc.)
- [x] 18.4 Chronologically sorted entries in export
- [x] 18.5 Share via mail/messaging integration
- [x] 18.6 Polish PDF styling for all 9 themes (theme-matched headers and accents)
- [x] 18.7 Include mood chart visualization in PDF export

---

## 19. Legal & Compliance

- [x] 19.1 Terms of Service (full text)
- [x] 19.2 Privacy Policy (GDPR/CCPA compliant, covers AI data processing)
- [x] 19.3 Disclaimer (mental health non-substitute clause)
- [x] 19.4 Legal screen accessible from settings

---

## 20. Subscription & Monetization

- [x] 20.1 Build paywall screen with feature checklist and staggered entrance animations
- [x] 20.2 Implement usePremium hook with RevenueCat integration
- [x] 20.3 Define products: monthly (£2.99) and annual (£19.99)
- [x] 20.4 Restore purchases flow
- [x] 20.5 Premium gating on all 11 premium features
- [ ] 20.6 Configure RevenueCat API key in .env
- [ ] 20.7 Create App Store Connect subscription products (monthly + annual)
- [ ] 20.8 Create Google Play subscription products (monthly + annual)
- [ ] 20.9 Test purchase flow in sandbox/TestFlight
- [ ] 20.10 Verify restore purchases works across devices

---

## 21. Review & QA

- [ ] 21.1 Full feature walkthrough: verify all 13 free features function correctly
- [ ] 21.2 Full feature walkthrough: verify all 11 premium features function correctly
- [ ] 21.3 Test all 7 onboarding screens and completion flow
- [ ] 21.4 Test all 9 settings sections — every toggle, picker, and action
- [ ] 21.5 Test time capsule system: all 4 delay options, countdown, reveal
- [ ] 21.6 Test auth flows: sign-up, sign-in, Apple, Google, password reset, sign-out
- [ ] 21.7 Test cloud sync: online, offline queue, conflict resolution, photo sync
- [ ] 21.8 Test notifications: daily reminder, evening nudge, reveal notification
- [ ] 21.9 Test all 9 themes in light and dark mode across all screens
- [ ] 21.10 Test all animations: Energy Bubble, Fireplace, Neon, Particles, gestures
- [ ] 21.11 Performance audit: cold start time, animation frame rates, memory usage
- [ ] 21.12 Accessibility audit: VoiceOver, TalkBack, Reduce Motion, contrast
- [ ] 21.13 Test on physical iPhone (not just simulator)
- [ ] 21.14 Test on physical Android device
- [ ] 21.15 Test offline mode: full app functionality without internet
- [ ] 21.16 Test PDF export across all themes with varied entry data
- [ ] 21.17 Edge case testing: empty states, max-length inputs, rapid taps, background/foreground cycling
- [x] 21.18 Code review: security (no API keys in client), RLS policies, data handling
- [ ] 21.19 Fix all critical and high-priority issues found during QA

---

## 22. Package & Ship

- [ ] 22.1 Configure RevenueCat API key and verify sandbox purchases
- [ ] 22.2 Deploy Supabase Edge Functions for AI reflections
- [x] 22.3 Populate 280 photo prompts (40 per category x 7)
- [ ] 22.4 Create App Store screenshots (6.7" and 6.1") with marketing captions
- [ ] 22.5 Write App Store listing: title, subtitle, description, keywords
- [ ] 22.6 Review and finalize app-store-metadata.md
- [ ] 22.7 Build production EAS build (iOS)
- [ ] 22.8 Submit to TestFlight for beta testing
- [ ] 22.9 Beta feedback round (10-20 testers, 1 week)
- [ ] 22.10 Fix beta feedback issues
- [ ] 22.11 Final production build
- [ ] 22.12 Submit to App Store Review
- [ ] 22.13 Build production EAS build (Android)
- [ ] 22.14 Submit to Google Play (after iOS approval)

---

## POLISH & MOTION SPEC (MANDATORY — 2026-04-14 regression)

Current rendered preview fails the polish rubric (`/home/ubuntu/app-factory/crew/rubrics/polish-rubric.md`). Polish-probe reported: 0 motion primitives, 0 premium primitives (no SVG, Canvas, Lottie, gradient, blur), potential text-on-missing-background issues. Fixing this is not optional — it is the first priority for the next build session.

### Mandatory fixes before this app can pass review

1. **Explicit background colors on every text container** — `#root`, `<body>`, every main view wrapper. Every visible text node must hit WCAG AA (≥ 4.5:1) against the actual rendered background. Use `axe-core` or `pa11y` to verify — do not eyeball.
2. **At least one premium primitive per main screen**:
   - Gradient background (LinearGradient via Reanimated or CSS `conic-gradient`)
   - OR backdrop-filter blur panel
   - OR bespoke SVG illustration (not a generic icon)
   - OR Skia canvas element
3. **At least one motion element per main screen**:
   - Entrance animation on page load (fade + translate via Reanimated spring with tuned params)
   - Ambient motion on hero art (subtle breathing / particle drift)
   - Interaction feedback (press scale, hover glow)
4. **Hero / splash / daily-prompt reveal** — the "one prompt" drop must feel ceremonial: a layered reveal with gradient backdrop, prompt text type-in animation, subtle glow pulse on the CTA.
5. **No default Expo placeholder** on launch — app wordmark with entrance.
6. **Replace ActivityIndicator** (if used anywhere) with a branded loader (skeleton shimmer or Lottie).

### Premium visual language for one-prompt specifically

The app's concept is "one thought a day, one prompt, one sentence". The visual language should feel like a journal meets zen garden: warm neutrals, soft gradients, slow organic motion, tactile paper-like texture, high-legibility serif for prompt text. Tailwind defaults + flat whites violate this.

Required tech:
- `react-native-reanimated` v3+ for all UI motion
- `react-native-svg` + path morphing for decorative illustrations
- `expo-linear-gradient` or Skia for atmospheric backgrounds
- `@shopify/react-native-skia` for any shader-based ambience (optional but preferred for the daily-prompt hero)

Acceptance: polish-probe PASSES with 0 P0 issues, and the rendered preview visually reads as a handcrafted journaling experience, not a minimal HTML mockup.

---

## Onboarding polish — audit gaps (2026-04-14)

Added after manual review of crew run `one-prompt-20260414-170202`. The standard design-QA rubric caught polish primitives, easing, contrast, and accessibility gaps — those will be fixed automatically on the next build dispatch. The items below are things the rubric does **not** currently measure, surfaced by eyeball on the captured screenshots. They are not covered by automation and must be tracked manually.

- [ ] **Onboarding hero spatial density** — slide 1 has ~45% dead vertical space between the icon+text block and the CTA. Tighten vertical rhythm; introduce a secondary visual element (ambient motif, quote card, or streak preview) that fills the gap with intent rather than void. File: `src/components/Onboarding.tsx`. Acceptance: no onboarding slide has >25% empty mid-screen vertical space at 390×844.
- [ ] **Typography weight hierarchy** — slide titles render at 400 weight against a pale cream background and read as a whisper, not a brand voice. Bump title to 600–700 with tighter line-height; give subtitles a semibold lead line before the descriptive text. File: `src/components/Onboarding.tsx` and any shared typography primitive. Acceptance: title hierarchy is parseable from 1m away on-device.
- [ ] **Pagination dots too quiet** — 6px dots, low contrast, active dot barely distinct. Replace with either (a) a 24×6 pill for the active dot + smaller muted dots for inactive, or (b) a continuous filled progress bar across slides. File: `src/components/Onboarding.tsx`. Acceptance: active position is instantly readable at a glance.
- [ ] **CTA button distinctiveness** — full-width amber gradient rectangle is generic SaaS. Give the primary CTA a recognizable silhouette: subtle inner shadow or embossed highlight, a glyph (caret / arrow / sparkle) integrated into the label, spring-scale on press-in (`withSpring(damping: 20, stiffness: 180)`). The polish rubric catches *missing* motion but not a button's generic **shape**. File: `src/components/Onboarding.tsx`, `src/app/paywall.tsx`, any shared button primitive. Acceptance: the CTA feels specifically designed for OnePrompt, not reusable across any generic app.
- [ ] **Playwright can't advance onboarding past slide 1** — BLOCKER for all future visual audits. The e2e gate captured slide 1 three times because synthetic taps on the Begin button didn't register (likely Reanimated gesture handler swallowing the synthetic click). Add a Playwright-friendly fallback: honor `onKeyDown` Enter on the CTA, **and** add `testID="onboarding-begin"` / `accessibilityLabel="Begin"` so the crew's Playwright driver can target it reliably. File: `src/components/Onboarding.tsx`. Acceptance: next `review-crew.sh one-prompt` run produces distinct screenshots for slides 1 through 7.
- [ ] **Rubric extension: onboarding arc cohesion** — once slides 2–7 are captureable, extend the polish rubric to score "onboarding_arc_cohesion" (slides feel like one journey vs. 7 unrelated screens). Rubric file change, not an app change. File: `/home/ubuntu/app-factory/crew/rubrics/polish-rubric.md`. Acceptance: design-QA `scorecard` contains `onboarding_arc_cohesion: 0–10`; a score ≤5 raises a P1.

Items 1–4 are straightforward UI tweaks. Item 5 is the **blocker** — until Playwright can advance onboarding, every audit is partial. Item 6 is a rubric addition owned by the crew repo, not the app repo.


## Marketing & Psychology

> Added by pipeline automation. Workers must complete these items during relevant phases.
> Full blueprint: /home/ubuntu/autonomous/lib/marketing-psychology-blueprint.md

### Pricing Psychology Checklist
- [ ] 3-tier pricing designed (Free / Pro / Premium) with anchoring effect
- [ ] Decoy pricing: top tier priced 2-3x middle to make middle look reasonable
- [ ] Annual pricing shown as monthly equivalent with "Save X%" badge
- [ ] Annual plan pre-selected by default (default bias)
- [ ] 7-day free trial configured with loss-aversion messaging
- [ ] Competitor pricing researched (3+ competitors documented in market-research.json)

### Emotional Marketing Requirements
- [ ] Pain-pleasure framework applied to landing page / app store copy
- [ ] Social proof included (at least 2 types: numbers, testimonials, logos, ratings)
- [ ] CTAs use action + outcome formula ("Start building" not "Sign up")
- [ ] Features described as benefits, not technical specs
- [ ] Color psychology applied to CTA buttons (warm colors on dark backgrounds)
- [ ] Urgency elements are ethical and factual (no fake countdown timers)

### App Naming Research
- [ ] 3+ name candidates with keyword data in market-research.json
- [ ] Domain availability checked (.com, .io, .app)
- [ ] Social handle availability checked (X, Instagram)
- [ ] Competitive naming analysis completed (top 10 competitors listed)
- [ ] Final name passes pronunciation test

### Paywall Placement Strategy
- [ ] Paywall appears AFTER user has experienced core value
- [ ] Free tier provides enough functionality to form a daily/weekly habit
- [ ] Export/share/download gated behind Pro
- [ ] Usage limits clearly communicated before user hits the wall
- [ ] CTA text uses low-commitment language ("Start free trial" not "Buy now")
- [ ] Loss framing on trial expiry ("Your data will be archived" not "Upgrade to continue")
