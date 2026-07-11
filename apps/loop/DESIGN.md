# Loop — Design DNA

> Three daily anchors, a handful of tiny habits, and a streak flame you'd hate to let shrink.

This is the art-direction contract for Loop. Screens and components read the tokens in `constants/theme.ts` through `useTheme()` — never hardcode. When a spec here and the tokens disagree, the tokens win; update this doc.

---

## 1. Art direction

**One line:** a warm hearth you tend for thirty seconds, three times a day.

**Vibe:** warm ember, dark hearth, quiet resolve. Loop should feel like a lit room at night, not a productivity dashboard at noon. It is calm, low-stakes, and slightly protective of you. It never scolds. When you slip, it dims — it does not slam a red zero in your face.

**Design-first decisions**

- **Dark is the hero.** The app is designed dark-first ("dark hearth"): warm near-black `#14100D`, ember `#F0602F`, amber glow `#F2B441`. Light is "hearth at dawn" — warm cream paper `#FBF3E9`, never a clinical white. Both are first-class and driven entirely from tokens.
- **One typeface: Sora.** A single geometric grotesque carries everything — the giant flame count, the anchor titles, the caption eyebrows. No secondary face. Cohesion is the flex. Headings get negative tracking (`-0.8` display, `-0.3` title) to pull Sora's width tight; captions get `+0.4` because they're uppercase eyebrows (`ANCHORS`, `THIS WEEK`).
- **One hero color, used sparingly.** Ember `primary` is reserved for the flame, the active anchor, and the single primary CTA per screen. Amber `accent` is the *glow* — streak count, progress, "kept" ticks. If everything is ember, nothing is. Most of the screen is warm neutrals.
- **Warm neutrals only.** Every gray is tinted toward brown/amber. There is no `#888`. Backgrounds, surfaces, borders, and muted text all carry warmth so the ember never looks like it's floating on ash.
- **Generous, cozy geometry.** Cards are `radius.lg` (22px) — soft, rounded, room-like. Chips and the flame halo are `full`. Screen gutter is `spacing.xl` (24). Vertical rhythm is 8-point.
- **Roominess over density.** Loop's whole thesis is *less*. Three anchors, one flame, lots of breathing room. A screen that feels empty is on-brief. Never a 20-item checklist; never a Tailwind card grid.

**Banned (house rules):** default Tailwind grids, purple/indigo "AI" gradients, lorem ipsum or filler copy, dead buttons, a raw `ActivityIndicator` as a hero loader, emoji-as-icon. Ember and amber are the only saturated hues; danger red appears only on genuine errors and destructive confirms.

---

## 2. Tokens at a glance

Full definitions live in `constants/theme.ts`. Highlights:

| Token | Dark (hero) | Light | Meaning |
|---|---|---|---|
| `bg` | `#14100D` | `#FBF3E9` | the hearth |
| `surface` | `#201A15` | `#FFFDF9` | cards, sheets |
| `surfaceAlt` | `#2A2119` | `#F5EADB` | anchor rail, pressed rows, sheet-over-card |
| `text` | `#F6EEE4` | `#241A12` | warm ivory / warm espresso |
| `textMuted` | `#AB9B8B` | `#7A6B5C` | warm taupe |
| `primary` | `#F0602F` | `#E8552B` | the ember |
| `onPrimary` | `#FFF4EC` | `#FFF4EC` | warm-white label on ember |
| `accent` | `#F2B441` | `#B4700F` | the glow (amber on dark; burnt honey on light for legibility) |
| `success` | `#5BB06A` | `#3E7A46` | anchor completed |
| `danger` | `#FF6B5C` | `#CF4438` | errors only |
| `border` | `#33291F` | `#EADCC9` | warm hairline |

`flame` (per theme): ordered gradient stops `core → mid → tip → smoke` for the signature element (§4).

**Type scale:** `display` 34/40 · `title` 19/25 · `body` 16/24 · `caption` 13/17. **Spacing:** 4·8·12·16·24·32·48. **Radius:** 10·14·22·full.

---

## 3. Per-screen layout specs

Coordinates use spacing tokens. Every tappable element gets a stable `testID`. All screens wrap in `<Screen>` (SafeArea + themed bg).

### 3.1 Onboarding — "pick 3 in under 60 seconds" (`app/onboarding.tsx`)

Goal: no blank-slate paralysis. One scroll, one decision, done.

- **Structure:** three steps in a single stack (progress dots at bottom, ember-filled for the active step).
  1. **Welcome.** The flame at rest (small, one tongue), display line *"Tend a small fire."*, body *"Three moments a day. One or two tiny things each. A flame that dims when you slip — never resets."* Primary CTA `Start` (`testID="onboarding-cta"`). `Skip` top-right (`testID="onboarding-skip"`).
  2. **Pick your three.** A pre-filled menu of tiny, real habits grouped under the three anchors (see fixtures §7). Each is a selectable `ListRow` with a left icon and a check on the right when picked. A live counter pins to the bottom: *"2 of 3 chosen"*. The CTA stays disabled until exactly 3 are picked, then reads `Light it` — the moment the flame first ignites. Every row `testID="onboarding-habit-<id>"`.
  3. **Set your times (optional).** Three rows — morning / midday / evening — each showing a default window (`7:00`, `12:30`, `21:00`) as a pressable chip. CTA `Done`. Copy: *"We'll nudge you at these. Change them anytime."*
- **Layout:** vertical center for step 1; top-aligned scrollable list for steps 2–3 so the CTA never jumps. Anchor group headers are `caption` eyebrows in `textMuted` (`MORNING`, `MIDDAY`, `EVENING`).
- **Signature moment:** on reaching step 3 the flame animates from one tongue to three (one per anchor) — the payoff for finishing setup.

### 3.2 Today — the home (`app/(tabs)/index.tsx`)

The heart of the app. Above the fold: the flame and today's three anchors.

- **Header row:** eyebrow `caption` `textMuted` with the date (*"Friday · Jul 11"*), display greeting that changes by anchor window — *"Morning, Maya."* / *"Midday."* / *"Winding down."* Right side: the `Free`/`Pro` badge (neutral/accent tone).
- **Flame hero (signature, §4):** centered, ~140px tall on a `surface` card with a soft radial halo. Directly beneath, the streak count in `display` + amber `accent` (*"12"*) and a `caption` label *"day streak"*. One quiet reassurance line under it, tone-tuned to state:
  - full week kept → *"Roaring. Don't look down."*
  - slipped yesterday → *"A little smaller today. It comes back."*
  - fresh streak → *"Day one. This is the hard part — you're past it."*
- **Anchor rail:** three stacked anchor cards (`surface`, `radius.lg`), each a section:
  - Left: an anchor glyph in a `surfaceAlt` rounded square — `sunny-outline` / `partly-sunny-outline` / `moon-outline` (Ionicons; no emoji).
  - Title (`title`) + a `caption` window time (*"7:00"*). A hairline-thin `ProgressRing` (accent) at right showing that anchor's completion (e.g. `1/2`).
  - Body: 1–3 habit rows. Each row is a **single-tap complete gesture**: tap anywhere fills the left check from hollow `ellipse-outline` → filled `checkmark-circle` in `success`, the label eases to `textMuted` with a strikethrough-free "kept" look (0.6 opacity), and the anchor ring advances. `testID="habit-<id>"`.
  - The active anchor (current time window) gets a 1px ember `primary` border; the others use `border`.
- **Completion beat:** completing the last habit of an anchor bumps the flame up one notch (§5 motion) and the reassurance line updates. Completing all three anchors is the day's win — the flame flares once and the streak count ticks.
- **Free-tier ceiling:** past 1 active anchor / 2 habits, extra habit rows render locked with a `lock-closed-outline` and a `Badge` "Pro". Tapping routes to the paywall. This is the **3rd-anchor-completion paywall trigger** wired to the loss-aversion beat.

### 3.3 Weekly Reflection — the shareable card (`app/(tabs)/reflect.tsx`, new MVP screen)

Turns private effort into an export-ready artifact.

- **Header:** display *"This week"*, `caption` date range (*"Jul 5 – Jul 11"*).
- **The story card:** a single tall `surface` card, `radius.lg`, that is the exportable artifact — designed to look good screenshotted. Contents, top to bottom:
  - The flame at its end-of-week size, centered on the amber halo.
  - Big `display` stat: *"18 / 21 anchors kept"* with a one-line honest summary — *"Three slips. The flame held."*
  - A 7-day **ember strip**: seven rounded bars, height mapped to anchors kept that day, colored on a `smoke → tip → core` ramp from `flame`. Missed days are short and cool; strong days are tall and hot. Built with plain `View`s — see §4 fallback technique. Each bar `testID="reflect-day-<n>"`.
  - A pull-quote line in the app voice, e.g. *"You showed up midday every single day."* (auto-picked from the week's best pattern).
  - Small `caption` wordmark footer *"Loop · keep the flame"* so shared images carry the brand.
- **Actions:** primary `Share card` (`testID="reflect-share"`) and a ghost `Save image`. On web, Share uses the Web Share API when present, else copies a link and toasts *"Link copied."* (§6). Free tier sees the current week only; the archive (past weeks list) is Pro — locked rows with a `Badge` "Pro" routing to paywall. First visit here is the alternate **paywall trigger**.

### 3.4 Paywall (`app/paywall.tsx`)

Modal. Wired to the loss-aversion beat — arrives right after a win, so it feels like *protecting* progress, not a wall.

- **Close** `x` top-right (`testID="paywall-close"`), never auto-dismiss.
- **Hook:** the flame, then display *"Keep it burning."* Sub: *"You've kept 3 anchors. Don't let a busy week cost you the whole flame."*
- **Value rows** (Ionicons, ember): unlimited habits · all three anchors, always · custom anchor times · the full reflection archive. Real, from the brief — no "everything included" filler.
- **Plans:** two selectable `Card`s. Annual is pre-selected with an `accent` badge *"Save 33%"* — `$39.99/yr` note *"about $0.77 a week"*; Weekly `$4.99/wk` note *"cancel anytime"*. `testID="paywall-plan-annual|weekly"`.
- **CTA:** `Start free week` → `Continue` while processing (spinner in-button, never a bare hero spinner). Below: `Restore purchases` ghost link. Error state: inline `danger` caption, never a blocking alert.
- **Success:** the flame flares, `checkmark-circle` in `success`, *"You're set. Tend it well."*, `Continue` closes.

### 3.5 Settings (`app/(tabs)/settings.tsx`)

Calm utility. Grouped `caption` eyebrows over `unpadded` cards of `ListRow`s.

- **APPEARANCE:** System / Light / Dark, check on the active (`testID="settings-appearance-<v>"`).
- **ANCHORS:** three rows to edit each window time; a row *"Notifications"* toggle. Custom times gate to Pro for free users (locked row → paywall).
- **THE FLAME:** a *"How the flame works"* row opening a `Sheet` that explains, in-voice, that it dims and never resets — the off-ramp tone that keeps the loss-aversion mechanic from reading as shame.
- **SUBSCRIPTION:** current plan + `Upgrade to Pro` / `Manage`.
- **LEGAL:** Privacy · Terms. Footer: `caption` `textMuted` version.

---

## 4. Signature element — the Living Flame

**One element, unmistakable: a hand-built ember that grows with kept anchors and *shrinks, never resets,* on a slip.** It is the product thesis rendered as a single object. It appears on Today (hero), Onboarding, Reflection, and Paywall.

### What it is
An SVG flame — layered vector tongues over a glowing core — that (a) has a **size/intensity driven by streak strength** (a `heat` value 0–1), and (b) **flickers** with a gentle looped animation. Built entirely from `react-native-svg` + the RN `Animated` API, so it renders identically under `expo export --platform web`.

### How it's built (RN primitives / SVG — web-safe)

`components/Flame.tsx`, props `{ heat: number /*0–1*/, size?: number }`.

1. **Halo.** An `Svg` `<RadialGradient>` fill on a `<Circle>` behind everything: center `flame.core` at ~35% opacity → transparent `flame.smoke`. This is the warmth spill on the card. Radius scales with `heat`.
2. **Body.** Two stacked `<Path>` tongues (a `d` teardrop: rounded base, cubic-Bézier sides meeting at a point) filled with a vertical `<LinearGradient>`: `flame.tip` (bottom) → `flame.mid` → `flame.core` (top). The outer tongue is the full flame; a smaller inner tongue in `flame.core` is the hot heart.
   Reference path for a unit tongue (viewBox `0 0 100 140`), scaled by `heat`:
   ```
   M50 138 C18 120 8 92 8 66 C8 40 30 22 42 2 C40 30 60 40 60 64
   C60 40 78 44 88 72 C96 96 82 122 50 138 Z
   ```
3. **Heat → shape.** `heat` maps to overall `scale` (0.55 → 1.15), halo radius, and how many tongues are visible: low heat = one short tongue (an ember), high heat = full multi-tongue flare. On a *miss* the target `heat` steps **down one notch** (e.g. −0.12), never to zero — a slip costs a little, not everything. Minimum floor is a live ember (`heat ≥ 0.12`), so it never goes out.
4. **Flicker (motion).** An `Animated.loop` drives a shared value 0→1→0 over ~2.2s (`useNativeDriver: false` for web parity) mapped to: tiny `scaleY` breathe (0.98–1.03), ±1.5° `rotate` sway, and halo opacity shimmer. A second, faster loop (~700ms) offsets the inner tongue so the heart licks independently. Transitions between heat levels use `Animated.spring` so growth feels alive and shrink feels like a settle, not a snap.
5. **Web guard + reduced motion.** Pure SVG + `Animated` is web-clean, but honor `AccessibilityInfo.isReduceMotionEnabled()` (and, on web, `prefers-reduced-motion`): when set, render the flame at its static `heat` shape with the halo but no loop. No native-only module is ever on this path.

### Fallback / ancillary form
The Reflection **ember strip** reuses the same palette without SVG: seven `<View>` bars, `height = f(anchorsKept)`, `backgroundColor` interpolated along `smoke → tip → core`, `radius.sm` tops. It reads as "the flame, over seven days" and is trivially screenshot-safe.

### Rules
- Exactly **one** flame per screen, always the emotional focal point — never decoration.
- Never pair the flame with another saturated color; it owns the ember/amber.
- The number beside it (streak) is always Sora `display` in `accent`.

---

## 5. Motion rules

Motion is warm and physical — like a fire reacting — never bouncy-cute or corporate-snappy.

- **Durations:** micro-feedback 120ms; state transitions 220ms; the flame flare on a win ~450ms. Standard easing `ease-out`; the flame uses spring (low tension, moderate friction).
- **Habit complete:** the check fills (120ms), the label softens to 0.6 opacity + `textMuted` (220ms), the anchor ring advances (spring). Haptic `selection` on native only (`Platform.OS !== 'web'` guard); web gets the visual beat.
- **Anchor complete → flame grows:** `heat` springs up one notch; halo widens; a single soft flare.
- **Miss (on reopen/reconcile):** `heat` springs *down* one notch with a slow settle (~600ms) — deliberately gentle so it reads as "dimmed," not "punished."
- **Screen/step transitions:** 200ms cross-fade + 8px upward slide. Sheets slide from the bottom over a `#000` scrim at ~45% opacity.
- **Loading:** never a bare spinner as a hero. Use content-shaped skeletons (warm `surfaceAlt` blocks at 0.5→0.9 opacity pulse, 1s) for the anchor rail and reflection card. In-button spinners are fine for CTAs.
- **Reduced motion:** all loops disabled; transitions collapse to instant cross-fades; the flame holds its static heat shape.

---

## 6. State treatments

**Loading**
- Today: three skeleton anchor cards (glyph square + two shimmer lines) and a dimmed static flame at last-known heat while state hydrates — the flame is never blank.
- Reflection: a skeleton story card with a dimmed ember strip standing in for the real one.
- Never a centered `ActivityIndicator` alone.

**Empty**
- Fresh user who somehow has no anchors (shouldn't happen post-onboarding): `EmptyState` icon `flame-outline`, title *"Nothing to tend yet."*, message *"Pick three tiny things and light your flame."*, action `Set up my three` → onboarding.
- Reflection with a brand-new account (no week yet): title *"Your first week is still burning."*, message *"Come back Sunday for your reflection card."* — no fake data.

**Error**
- Inline and in-voice, never a system alert for expected failures. Purchase error: `danger` caption under the CTA — *"That didn't go through. Nothing was charged — try again."*
- Share failure (web, no Share API): silent fallback to copy-link + toast *"Link copied."*
- State reconcile failure on reopen: a small non-blocking banner *"Couldn't sync your flame. It's safe on this device."* — the flame stays truthful from local storage (offline-first, seeded fixtures in demo mode).
- Destructive confirms (reset habits) use `danger` and require an explicit second tap.

---

## 7. Copywriting voice

**Voice:** a calm friend who's rooting for you and won't shame you. Warm, short, second person. Lowercase-leaning. Fire and warmth metaphors, used lightly. Concrete over motivational-poster. Never guilt, never streak-anxiety language ("you're about to LOSE your streak!"), never exclamation-spam. One idea per line.

**Do:** *"A little smaller today. It comes back."*
**Don't:** *"Oh no! You broke your 12-day streak! 😱 Don't let it happen again!"*

### Real strings (ship these, not lorem)

**Anchor & habit fixtures (seeded, real-sounding — no "John Doe"/lorem):**
- *Morning* — "Drink a full glass of water", "Make the bed", "Two minutes of stretching", "Write one line in a journal"
- *Midday* — "Step outside for five minutes", "Eat something green", "Stand up and roll your shoulders", "Text someone you love"
- *Evening* — "Phone on the charger, across the room", "Read one page", "Three slow breaths", "Lay out tomorrow's clothes"

**Greetings (by window):** "Morning, Maya." · "Midday." · "Winding down."

**Reassurance lines (by flame state):**
- Roaring: "Roaring. Don't look down." · "Twelve days. The room is warm."
- Slipped: "A little smaller today. It comes back." · "One quiet day. The flame held."
- Fresh: "Day one. This is the hard part — you're past it." · "Small fire, real fire."
- Empty day so far: "Nothing kept yet. Start with the easy one."

**Notifications (in-voice, at anchor windows):**
- Morning: "morning anchor — two small things."
- Midday: "midday check — step outside, drink some water."
- Evening: "evening wind-down. phone on the charger, one page."
- Re-engagement (missed a day): "your flame dimmed a little. one small thing brings it back."

**Onboarding:** "Tend a small fire." · "Three moments a day. One or two tiny things each. A flame that dims when you slip — never resets." · counter "2 of 3 chosen" · CTA "Light it".

**Reflection:** "This week." · "18 / 21 anchors kept" · "Three slips. The flame held." · "You showed up midday every single day." · wordmark "Loop · keep the flame".

**Paywall:** "Keep it burning." · "You've kept 3 anchors. Don't let a busy week cost you the whole flame." · CTA "Start free week" · success "You're set. Tend it well."

**Empty/error:** "Nothing to tend yet." · "That didn't go through. Nothing was charged — try again." · "Couldn't sync your flame. It's safe on this device."

**Microcopy rules:** buttons are verbs ("Light it", "Keep it burning", "Share card"), not "Submit"/"OK". Numbers spelled where warm ("Day one"), numeric where stat-like ("18 / 21"). Never say "streak lost" — the flame *dims*.
