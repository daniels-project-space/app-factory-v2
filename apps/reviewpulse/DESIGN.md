# ReviewPulse — Design System

## Aesthetic Direction: "The Job Site Monitor"

Not a SaaS dashboard. Not a startup product. A *professional monitoring instrument* — like the diagnostic tool a mechanic trusts, the appointment book a barber has owned for 10 years, or the thermal scanner a HVAC tech clips to their belt. Authoritative. Direct. Alive.

**The unforgettable element**: A subtle EKG-style pulse motif in loading states, empty state illustrations, and the pull-to-refresh animation — making "monitoring your reputation" feel visceral, not abstract.

**Font pairing**: Barlow Condensed (headings) — the typeface of work truck decals, safety signage, contractor invoices — paired with Source Sans 3 (body) for clean field-readable text. Zero startup energy. Maximum tool energy.

---

## Pass 1: Design System Foundation

---

### 1. COLOR PALETTE

**Brand Philosophy**: Deep teal commands authority (medical monitors, professional equipment). Electric lime (#CAFF47) fires for live events — new reviews, pulse indicators, success. The combination reads "professional system with a heartbeat."

#### Primary — Deep Teal

```
--color-primary-950: #021F1F   /* Near-black teal, text on primary bg */
--color-primary-900: #0A3838   /* Deep authority */
--color-primary-700: #0D5C5C   /* Strong interactive */
--color-primary-500: #0F7B7B   /* Brand primary — buttons, links, icons */
--color-primary-300: #3AACAC   /* Hover states, accents */
--color-primary-100: #B3E5E5   /* Tinted backgrounds, badges */
--color-primary-50:  #E6F7F7   /* Subtle tint, selected states */
```

#### Secondary — Warm Slate

```
--color-slate-950: #0D1820
--color-slate-900: #1A2634
--color-slate-700: #2D3E52
--color-slate-500: #4A6070
--color-slate-300: #8FA8B8
--color-slate-200: #C5D5DE
--color-slate-100: #E2ECF2
--color-slate-50:  #F0F5F8
```

#### Accent — Electric Lime (Pulse Signal)

```
--color-accent-700: #5A7800   /* Dark lime for text on light */
--color-accent-500: #8FAF00   /* Mid lime */
--color-accent-400: #AACC00   /* Main accent */
--color-accent-300: #CAFF47   /* THE pulse color — live badges, success flashes */
--color-accent-100: #EDFABB   /* Soft lime tint */
--color-accent-50:  #F7FDE8   /* Barely-there lime */
```

#### Semantic Colors

```
--color-success-700: #047857
--color-success-500: #059669
--color-success-300: #34D399
--color-success-100: #D1FAE5

--color-warning-700: #B45309
--color-warning-500: #D97706
--color-warning-300: #FCD34D
--color-warning-100: #FEF3C7

--color-error-700: #B91C1C
--color-error-500: #DC2626
--color-error-300: #FCA5A5
--color-error-100: #FEE2E2
```

#### Neutrals (Cool-warm blend — not pure gray)

```
--color-neutral-950: #0C1117
--color-neutral-900: #111827
--color-neutral-800: #1F2937
--color-neutral-700: #374151
--color-neutral-600: #4B5563
--color-neutral-500: #6B7280
--color-neutral-400: #9CA3AF
--color-neutral-300: #D1D5DB
--color-neutral-200: #E5E7EB
--color-neutral-100: #F3F4F6
--color-neutral-50:  #F9FAFB
```

#### Light Mode Semantic Variables

```
--bg-base:      #F4F7F8   /* Warm off-white — never pure white */
--bg-surface:   #FFFFFF   /* Cards, modals */
--bg-surface-2: #F0F5F8   /* Secondary surfaces, bottom sheet bg */
--bg-surface-3: #E2ECF2   /* Tertiary: input backgrounds */

--text-primary:   #1A2634   /* Main body text */
--text-secondary: #4A6070   /* Labels, subtitles */
--text-tertiary:  #8FA8B8   /* Placeholders, metadata */
--text-inverse:   #F0F6FF   /* Text on dark backgrounds */

--border-default: #D0DCE6
--border-strong:  #8FA8B8
--border-focus:   #0F7B7B

--overlay: rgba(10, 30, 45, 0.6)
```

#### Dark Mode Semantic Variables

```
--bg-base:      #0C1117
--bg-surface:   #131D2B
--bg-surface-2: #1A2634
--bg-surface-3: #243446

--text-primary:   #EEF4FA
--text-secondary: #94AABB
--text-tertiary:  #506070
--text-inverse:   #1A2634

--border-default: #243446
--border-strong:  #2D3E52
--border-focus:   #3AACAC

--overlay: rgba(6, 12, 20, 0.75)
```

---

### 2. TYPOGRAPHY SCALE

**Fonts**:
- `"Barlow Condensed"` — headings, stats, labels (weight 600-800)
- `"Source Sans 3"` — body text, forms, descriptions (weight 300-600)

Both available on Google Fonts. Import in `app/_layout.tsx` via `expo-font`.

```typescript
// constants/typography.ts
export const Typography = {
  display:  { fontFamily: 'Barlow-Condensed-ExtraBold', fontSize: 48, lineHeight: 50, letterSpacing: -0.5 },
  h1:       { fontFamily: 'Barlow-Condensed-Bold',      fontSize: 32, lineHeight: 35, letterSpacing: -0.3 },
  h2:       { fontFamily: 'Barlow-Condensed-Bold',      fontSize: 24, lineHeight: 28, letterSpacing: -0.2 },
  h3:       { fontFamily: 'Barlow-Condensed-SemiBold',  fontSize: 20, lineHeight: 24, letterSpacing: 0   },
  h4:       { fontFamily: 'Source-Sans-SemiBold',       fontSize: 17, lineHeight: 22, letterSpacing: 0   },
  body:     { fontFamily: 'Source-Sans-Regular',        fontSize: 16, lineHeight: 24, letterSpacing: 0   },
  bodySm:   { fontFamily: 'Source-Sans-Regular',        fontSize: 14, lineHeight: 21, letterSpacing: 0   },
  caption:  { fontFamily: 'Source-Sans-Regular',        fontSize: 12, lineHeight: 17, letterSpacing: 0.1 },
  label:    { fontFamily: 'Barlow-Condensed-SemiBold',  fontSize: 13, lineHeight: 13, letterSpacing: 0.8 },
  stat:     { fontFamily: 'Barlow-Condensed-ExtraBold', fontSize: 40, lineHeight: 40, letterSpacing: -1  },
} as const;
```

| Token | Font | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|------|--------|-------------|----------------|-------|
| `display` | Barlow Condensed | 48px | ExtraBold (800) | 1.05 | -0.5px | Hero numbers (rating score "4.8") |
| `h1` | Barlow Condensed | 32px | Bold (700) | 1.1 | -0.3px | Screen titles |
| `h2` | Barlow Condensed | 24px | Bold (700) | 1.15 | -0.2px | Section headers |
| `h3` | Barlow Condensed | 20px | SemiBold (600) | 1.2 | 0 | Card titles, subsections |
| `h4` | Source Sans 3 | 17px | SemiBold (600) | 1.3 | 0 | List headers, labels |
| `body` | Source Sans 3 | 16px | Regular (400) | 1.5 | 0 | Review text, descriptions |
| `body-sm` | Source Sans 3 | 14px | Regular (400) | 1.5 | 0 | Secondary content |
| `caption` | Source Sans 3 | 12px | Regular (400) | 1.4 | 0.1px | Timestamps, metadata |
| `label` | Barlow Condensed | 13px | SemiBold (600) | 1 | 0.8px | ALL CAPS badges, tags, status |
| `stat` | Barlow Condensed | 40px | ExtraBold (800) | 1 | -1px | Dashboard stat numbers |

---

### 3. SPACING SYSTEM

**Base unit: 4px**

```typescript
// constants/spacing.ts
export const Spacing = {
  px:    1,
  '0':   0,
  xs:    4,    // Inner padding on compact elements
  sm:    8,    // Gap between related items
  md:    16,   // Standard horizontal padding, card inner padding
  lg:    24,   // Section gaps, button padding vertical
  xl:    32,   // Screen padding top, card gaps
  '2xl': 48,   // Section separations, modal padding
  '3xl': 64,   // Hero areas
  '4xl': 96,   // Full-screen hero padding
} as const;

export const SCREEN_PADDING_H = 20;   // Screen horizontal padding
export const CARD_PADDING = 16;        // Card inner padding all sides
export const LIST_ITEM_HEIGHT = 72;    // Min height for review items
export const LIST_ITEM_HEIGHT_COMPACT = 60; // Min height for customer items
```

---

### 4. BORDER RADIUS SYSTEM

ReviewPulse aesthetic: **rounded but not soft** — cards and buttons use 12px radius. Modern/polished but not childlike. Sharp inputs (4px) for form field precision. Full radius for badges and avatar circles.

```typescript
export const Radius = {
  none: 0,
  xs:   4,    // Inputs, small tags
  sm:   8,    // Inline badges, chips
  md:   12,   // Cards, buttons — the primary radius
  lg:   16,   // Bottom sheets, large cards
  xl:   20,   // Modal containers
  full: 9999, // Badges, avatars, pills
} as const;
```

---

### 5. SHADOW SYSTEM

**Philosophy**: Shadows create depth, not decoration. Use sparingly. Dark mode uses no shadows (color separation does the work instead).

```typescript
export const Shadows = {
  none: {},

  sm: {
    shadowColor: '#1A2634',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },

  md: {
    shadowColor: '#1A2634',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 5,
  },

  lg: {
    shadowColor: '#0F7B7B',   // Teal shadow — brand-tinted depth
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },

  upward: {                   // Bottom sheet shadow (upward)
    shadowColor: '#1A2634',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
} as const;
// Dark mode: cards use border: 1px solid --border-default instead of shadow
```

---

### 6. COMPONENT SPECIFICATIONS

#### Buttons

```typescript
// PRIMARY BUTTON
height: 56, borderRadius: 12
bg: '#0F7B7B', text: white, Barlow Condensed Bold 18px UPPERCASE
pressed: scale(0.97) + bg '#0D5C5C'
disabled: opacity 0.4
loading: background pulse + text "···"

// SECONDARY BUTTON
height: 56, borderRadius: 12
border: 2px solid '#0F7B7B', bg: transparent, text: '#0F7B7B'
pressed: bg fills to '#E6F7F7'

// GHOST BUTTON — text only, no border
text: '#0F7B7B', underline on press
Used for: "Cancel", "Skip", "Not now"

// DESTRUCTIVE BUTTON
height: 56, borderRadius: 12
bg: '#DC2626', text: white
pressed: bg '#B91C1C'

// ICON BUTTON — 44x44 tap target, 36x36 visual
bg: '--bg-surface-2', icon: Lucide 22px
borderRadius: full (circle) or md (square)
pressed: opacity 0.7 + scale 0.94
```

#### Review Card

```typescript
// Most important component — communicates 5 things instantly:
// platform, rating, reviewer name, excerpt, time

container: {
  borderRadius: 12,
  bg: '--bg-surface',
  shadow: sm (light) / border only (dark),
  borderLeftWidth: 4,  // Rating color stripe
  // ≥4 stars: '--color-success-500'
  // 3-3.9: '--color-warning-500'
  // <3: '--color-error-500'
  padding: 16,
}

// Row 1: [Platform icon 20px] [Reviewer name, h4] ... [Time, caption, tertiary]
// Row 2: [Stars display] [Rating "4.8", Barlow Condensed Bold 16px]
// Row 3: [Review excerpt, body-sm, 2 lines max]
// Row 4 conditional: [Status badge] ... [AI Reply button ghost]

// NEW REVIEW indicator: lime dot (10px) top-right
// Animation: pulse scale 1→1.3→1, infinite, 1.5s
```

#### Stat Card

```typescript
// Dashboard summary tiles, 2-column grid
height: 100, borderRadius: 12
bg: '--bg-surface' (light) / '--bg-surface-2' (dark)
shadow: sm

// Layout:
// [Icon top-left, 20px, '--color-primary-300']
// [Stat number, stat typography, '--text-primary'] ← dominant
// [Label, caption, '--text-secondary', UPPERCASE, tracking 0.6px]
// [Trend: ▲ +2 this week, caption, success/error color]
```

#### Action Card

```typescript
// CTAs: "Send review request", "Connect Google", etc.
height: 80, borderRadius: 12
bg: gradient from '--color-primary-50' to '--bg-surface' (light)
border: 1px solid '--color-primary-100' (light) / '--border-default' (dark)

// Layout: [Icon block 48x48] [Title h4] [Subtitle body-sm] [Chevron 20px]
// Icon block: '--color-primary-100' bg, '--color-primary-500' icon, radius md
```

#### Inputs

```typescript
// TEXT INPUT
height: 52, borderRadius: xs (4px)
bg: '--bg-surface-3' (light) / '--bg-surface-2' (dark)
border: 1.5px solid '--border-default'
focus border: 2px solid '--color-primary-500'
error border: 2px solid '--color-error-500'
padding: 0 16px
Label: above, Barlow Condensed SemiBold 13px UPPERCASE tracking 0.6px
Error: caption below, '--color-error-500'

// SEARCH INPUT
height: 48, borderRadius: full (pill)
bg: '--bg-surface-2', no border
Search icon left, clear X button right (appears when text present)

// PHONE INPUT
Split: [Country code 70px] | [Number field]
Country code: flag emoji + code, tappable → picker modal
Number: auto-formats as typed (555) 123-4567
Keyboard type: phone-pad
```

#### Modals

```typescript
// BOTTOM SHEET
bg: '--bg-surface', borderRadius top: 20/20/0/0
Handle: 4px × 36px, '--border-strong', centered, mt 12
Content padding: 0 20 32
Animation: translateY 100%→0, spring { damping: 30, stiffness: 300, mass: 0.8 }
Backdrop: '--overlay', tap to dismiss
Max height: 85% of screen

// CENTER MODAL (alerts + confirmations only)
width: screenWidth - 40, borderRadius: 16
bg: '--bg-surface'
Animation: scale 0.92→1 + fade, 250ms ease-out
Buttons: stacked vertical (destructive top, ghost cancel below)
```

#### List Items

```typescript
// REVIEW LIST ITEM
minHeight: 72, bg: transparent
Left: Rating badge circle 42px, Barlow Condensed Bold 18px
  ≥4.5: success bg | 3.5-4.4: warning bg | <3.5: error bg | text: white
Center: [Name h4] [Platform icon] ... [Time caption]
        [Excerpt body-sm, 1 line]
Right: Chevron or reply indicator
Swipe LEFT: Delete (red, 80px zone, trash icon)
Swipe RIGHT: Mark Replied (green, check icon)
Long press: Context menu (Copy, Flag, Open in browser)

// CUSTOMER LIST ITEM
height: 60
Left: Avatar circle 40px (initials, hashed bg color)
Center: [Name h4] / [Phone body-sm secondary]
Right: [Send Request button small] OR [Sent X ago caption]
Swipe LEFT: Delete from list
```

#### Rating Display Component

```typescript
// STAR RATING — sizes: sm(14), md(18), lg(24)
// Full star: warning-500 (#D97706) OR primary-500 (#0F7B7B)
// Empty: neutral-300
// Half: supported via clip

// BIG RATING DISPLAY
rating number: display typography (48px)
Stars: lg size, below number
Total reviews: body-sm, secondary ("from 47 reviews")
Platform icon: 20px beside number

// PLATFORM RATING ROW (multi-platform)
[Platform icon 20px] [Name h4] ... [★ 4.8 bold body-sm] [Count caption]
```

#### Empty States

```typescript
// Pattern: centered, padding 48 top/bottom
// Visual: SVG icon composition, 120px height
//   Reviews empty: EKG flatline (pulse metaphor — dead monitor)
//   Customers empty: Phone with plus sign
//   Templates empty: Message bubble with sparkle

// Title: h2, Barlow Condensed Bold, centered, text-primary
// Subtitle: body, centered, text-secondary, max-width 260px
// CTA: primary button, centered, 280px wide

// Example copy:
//   "Your pulse is quiet" / "Connect your Google Business Profile to start monitoring"
//   "No customers yet" / "Add your first customer to start sending review requests"
```

#### Loading Skeletons

```typescript
// Shimmer: gradient sweep left→right, 1.5s infinite
// Light: transparent → rgba(255,255,255,0.6) → transparent
// Dark:  transparent → rgba(255,255,255,0.08) → transparent
// Implementation: Reanimated useSharedValue → withRepeat(withTiming) on translateX

// Review card skeleton:
//   [Circle 42px] [Line 60%, 16px tall] [Line 30%]
//   [Line 100%, 12px] [Line 80%]
//   Gap: 12px between items

// Stat card skeleton:
//   [Square 24px] [Line 40%, 32px] [Line 60%, 12px]
```

---

### 7. ICON SET

**Lucide React Native** — only icon library, consistent 2px stroke weight.

```typescript
export const IconSizes = {
  xs:   14,   // Inline with caption text
  sm:   16,   // List item metadata
  md:   20,   // Standard UI icons (buttons, nav)
  lg:   24,   // Feature icons, tab bar
  xl:   32,   // Empty state icons
  '2xl': 48,  // Onboarding illustrations (icon compositions)
} as const;

// Key icons: Star, StarHalf, MessageSquare, Reply, Send, Bell, BellOff,
// TrendingUp, TrendingDown, Users, UserPlus, Phone, AlertTriangle,
// CheckCircle, ChevronRight, Plus, Search, Settings, MoreVertical,
// RefreshCw, Wifi, WifiOff, ExternalLink, Flag, Copy, Trash2, Activity
```

---

### 8. ANIMATION PRINCIPLES

#### Duration Tokens

```typescript
export const Duration = {
  instant:  100,   // Visual feedback only (button press color)
  fast:     150,   // Haptic accompaniment, icon switches
  normal:   250,   // Most UI transitions (modal open, tab switch)
  slow:     350,   // Screen entrance, bottom sheet rise
  crawl:    500,   // Skeleton shimmer cycle, progress fills
  pulse:   1500,   // Idle pulse animation (live indicator dot)
} as const;
```

#### Easing Curves

```typescript
export const EasingCurves = {
  standard:   Easing.bezier(0.4, 0.0, 0.2, 1),  // Most transitions
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),  // Elements entering screen
  accelerate: Easing.bezier(0.4, 0.0, 1.0, 1),  // Elements leaving screen
  spring:     { damping: 30, stiffness: 300, mass: 0.8 },  // Interactive feedback
  bouncy:     { damping: 18, stiffness: 200, mass: 0.7 },  // Success confirmations
} as const;
```

#### Animation Map

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Screen entrance | Fade + slide up 8px | 350ms | decelerate |
| Bottom sheet open | Slide up from bottom | 350ms | decelerate |
| Bottom sheet close | Slide down | 250ms | accelerate |
| Tab switch | Cross-fade (no slide) | 150ms | standard |
| Button press | scale(0.97) | 100ms | standard |
| Button release | scale(1.0) spring | 150ms | spring |
| Review card entrance | FadeIn + translateY(12) | 350ms | decelerate |
| Staggered list | 50ms delay between items | 350ms | decelerate |
| New review badge | Pulse scale 1→1.25→1 | 1500ms | standard, infinite |
| Modal alert | Scale 0.94→1 + fade | 250ms | bouncy |
| Skeleton shimmer | translateX loop | 1500ms | linear, infinite |
| Pull-to-refresh | EKG flatline draw animation | 500ms | — |
| Success checkmark | Path draw + scale | 250ms | bouncy |
| Rating number update | CountUp animation | 600ms | decelerate |

#### What Does NOT Animate

- Text content changes
- Color theme switches
- Background color changes
- Layout shifts during scroll
- Input cursor / keyboard appearance

---

### 9. HAPTIC FEEDBACK MAP

```typescript
import * as Haptics from 'expo-haptics';

export const HapticMap = {
  // Light — standard taps
  buttonPress:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  listItemTap:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  tabSwitch:         () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  toggleSwitch:      () => Haptics.selectionAsync(),
  starRatingChange:  () => Haptics.selectionAsync(),

  // Medium — meaningful actions
  sendReviewRequest: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  submitReply:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  connectPlatform:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  pullToRefresh:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  modalOpen:         () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Heavy — destructive, serious
  deleteAction:      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  flagReview:        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  swipeDelete:       () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Success notification — completions
  reviewSent:        () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  replySaved:        () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  platformConnected: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  subscriptionPro:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Warning — destructive confirmation
  deleteConfirm:     () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  // Error — failed actions
  requestFailed:     () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  authError:         () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} as const;
```

---

## Pass 2: Screen-by-Screen Design Specifications

---

### Screen 1: Onboarding — Welcome

**Purpose**: Convert first-time visitors in <10 seconds. Show what the app does and for whom.

**Layout**:
```
[Safe area top]
[Skip button — ghost, top-right, caption size]

[Hero area — 45% of screen]
  Background: --color-primary-500 (#0F7B7B)
  EKG pulse line animation: white line sweeps left→right, then flatlines, then pulses
  Rating numbers float in: "★ 4.8" "★ 3.2" "★ 5.0" appear at random positions, fade in/out
  Central icon: Activity (Lucide 64px, white)

[Content area — 55%]
  Background: --bg-base

  [Progress dots: 4 dots, active = teal filled, inactive = neutral-200]

  "YOUR REPUTATION"         ← h1 Barlow Condensed Bold, --text-primary
  "IS ALWAYS ON."           ← display size 48px, --color-primary-500

  body text:
  "ReviewPulse monitors your Google reviews 24/7, sends SMS requests after every job,
   and drafts AI replies — all from your phone."
  Source Sans 3, 16px, --text-secondary

  [Primary Button: "GET STARTED FREE" full-width]
  [Ghost button: "Already have an account? Sign in"]
```

**Dark mode**: Hero area darkens to --color-primary-900. Content area: --bg-base dark.

**Transitions**: Entrance → slide up from bottom. Exit → slide left (to screen 2).

**States**: Loading (skeleton hidden by hero animation). No empty/error states.

---

### Screen 2: Onboarding — Feature Reveal (3 slides)

**Purpose**: Show the 3 core value props before paywall.

**Slide A — Monitor**:
```
Hero: Dark teal bg (#0A3838)
  Animated mockup: Review list with 3 items, new ★1 review slides in top with red left border
  NEW badge (lime) pulses in corner

"NEW REVIEW ALERTS"       ← label, --color-accent-300, UPPERCASE
"Know the moment         ← h1
 someone talks
 about your business."
"See every Google, Yelp, and Trustpilot review the moment it lands." ← body-sm secondary
```

**Slide B — Request**:
```
Hero: Deep teal gradient
  Animated: Phone with SMS bubble floating out
  Text in bubble: "Hi Sarah! Thanks for choosing us. Mind leaving a quick Google review?"

"ONE TAP REQUESTS"
"Get reviews while
 the job is still
 fresh."
"Text your customers a direct link — they tap once and they're on Google."
```

**Slide C — Reply**:
```
Hero: Slate dark bg
  Animated: Review with ★2, then AI reply drafts in below with typing animation

"AI WRITES THE REPLY"
"Respond to every review
 in seconds, not hours."
"Claude drafts a professional response. You review and send."
```

**Navigation**: Swipe left/right + progress dots. Auto-advance every 4s if no interaction.

---

### Screen 3: Onboarding — Paywall

**Purpose**: Convert to Pro trial. Shown after 2nd feature slide.

**Layout**:
```
[Close X — top right, 44x44]

[Header — --color-primary-950 bg, 200px tall]
  "REVIEWPULSE PRO"  ← h1, white, Barlow Condensed ExtraBold
  "14-day free trial, cancel anytime"  ← body-sm, --color-accent-300

[Feature list]
  Each row: [CheckCircle 20px, --color-primary-500] [Feature text, body]
  ✓ Unlimited SMS review requests
  ✓ AI-drafted reply suggestions
  ✓ Yelp + Trustpilot monitoring
  ✓ Full analytics with trends
  ✓ Instant push notifications

[Price toggle: Monthly | Annual (SAVE 25%)]
  Active tab: --color-primary-500 bg, white text
  Inactive: --bg-surface-3, --text-secondary

[Price display]
  "$14.99 / month"  ← stat typography (40px), --text-primary
  "Billed monthly — cancel anytime"  ← caption, --text-tertiary

[Primary button: "START FREE TRIAL"]
  Full width, 56px, --color-primary-500

[Ghost: "Continue with Free (5 requests/month)"]

[Legal: caption, centered, --text-tertiary]
  "By subscribing you agree to our Terms. Cancel anytime before trial ends."
```

**States**: Loading (when fetching RevenueCat offerings — show skeleton), Error (network fail — show retry).

---

### Screen 4: Auth — Sign Up

**Layout**:
```
[Back chevron top-left]

"CREATE ACCOUNT"  ← h1, --text-primary
"Start monitoring your reputation"  ← body, --text-secondary

[Business Name input] ← text input, placeholder "Mike's Plumbing"
[Email input]          ← email keyboard
[Password input]       ← with show/hide eye icon

[Primary button: "CREATE ACCOUNT"]

[Divider: "— or —" with lines]

[Google Sign In button]
  [Google logo 20px] "Continue with Google"
  Border: 1.5px --border-default, bg: --bg-surface

[Footer ghost link: "Already have an account? Sign in"]
```

**Inline validation**:
- Email: shows ✓ green when valid format
- Password: strength indicator bar (4 segments, fills left→right)
- Error messages: caption, --color-error-500, appear on blur

**States**: Loading (button shows "···" + disabled). Error (toast: "Email already in use"). Success (automatic nav to Connect screen).

---

### Screen 5: Onboarding — Connect Google

**Purpose**: Critical activation step. Must feel easy, not scary.

**Layout**:
```
[Progress bar at top: step 1 of 2, teal fill]

"CONNECT YOUR              ← h1, Barlow Condensed Bold
 GOOGLE BUSINESS"

"We'll only read your reviews and let you reply.
 We never post without your permission."  ← body, --text-secondary

[Illustration: Google "G" logo (40px) + lock icon, connected by dotted line, teal accents]

[Permission bullets]
  [Eye icon 16px] "Read your reviews"
  [Reply icon 16px] "Post replies when you approve"
  [X icon 16px, --color-error-300] "Never access contacts or other data"

[Large Google button — special style]
  height: 60, borderRadius: 12
  White bg (light) / dark bg (dark), border 1.5px --border-default
  [Google logo 24px] "Connect with Google"  ← Source Sans SemiBold 18px

[Ghost: "Skip for now (limited features)"]
```

**States**: Loading (after OAuth tap — spinner in button). Error (OAuth failed — show error modal with retry). Success (green checkmark animation + auto-navigate to next step).

---

### Screen 6: Onboarding — Find Your Business

**Purpose**: Auto-detect the Place ID so future links work correctly.

**Layout**:
```
"FIND YOUR            ← h1
 BUSINESS"

"We'll use your business name to find your Google listing
 and generate your review link."  ← body-sm secondary

[Search input — pill shape]
  Placeholder: "Search for your business..."
  Search icon left, loading spinner right when searching

[Results list]
  Each result: [Business name h4] [Address body-sm secondary]
  Selected: teal left border 4px, primary-50 bg

[Confirm button: "THIS IS MY BUSINESS" — disabled until selection]
```

**States**: Searching (spinner in search, skeleton list items), No Results ("Can't find it? Enter Place ID manually" → link opens modal), Error (retry button).

---

### Screen 7: Home / Dashboard

**Purpose**: The main screen. At a glance: rating score, recent activity, quick actions.

**Layout**:
```
[Status bar]
[Header]
  "Good morning, Mike"  ← h4, --text-secondary (greeting auto-updates)
  "REVIEWPULSE"  ← h2, Barlow Condensed Bold, --text-primary
  [Bell icon button, right — shows badge if unread notifications]

[Hero Rating Block — --bg-surface, borderRadius 16, shadow md, margin 20]
  Left:
    [Google icon 16px + "GOOGLE" label caption]
    "4.8"  ← display typography (48px) --text-primary
    [★ ★ ★ ★ ★]  ← lg stars
    "from 47 reviews"  ← caption --text-secondary

  Right: vertical divider

  Right:
    [Trend chart — small sparkline, 60px wide, --color-primary-300 line]
    "▲ +2"  ← h3 --color-success-500
    "this month"  ← caption --text-secondary

[Quick Stats — 2x2 grid, gap 12, margin horizontal 20]
  [Total Reviews stat card: "47"]
  [Response Rate stat card: "68%"]
  [SMS Sent stat card: "23"]
  [Avg Response Time stat card: "2.4h"]

[Section: "RECENT REVIEWS" — label + "See all" ghost right]
  [Latest 3 Review Cards, no separator between cards, gap 8]

[Section: "QUICK ACTIONS"]
  [Action Card: Send icon → "SEND REVIEW REQUEST" / "Get a review from your last customer"]
  [Action Card: Reply icon → "DRAFT A REPLY" / "3 reviews need your response"]  ← shows count badge

[Bottom tab bar]
```

**Pull to refresh**: EKG flatline animation in header → pulse → data refreshes.

**States**:
- Loading: Skeleton for hero block + stat cards + 2 review card skeletons
- Empty (new user): Large empty state "Your pulse is quiet" with setup CTA
- Error: Banner at top "Couldn't refresh — tap to retry"

**Dark mode**: Hero block gets --bg-surface-2 bg. Stat cards get --bg-surface-2. Overall feels like a diagnostic monitor at night.

---

### Screen 8: Reviews Tab

**Purpose**: Full review feed. All platforms. Sort, filter, reply.

**Layout**:
```
[Large title header: "REVIEWS" — Barlow Condensed ExtraBold 32px]
  Right: [Filter icon button]

[Platform filter chips — horizontal scroll]
  [All] [Google] [Yelp] [Trustpilot]
  Active chip: --color-primary-500 bg, white text, Barlow Condensed SemiBold 13px
  Inactive: --bg-surface-2, --text-secondary

[Sort bar — compact, caption size]
  "Sorted by: Newest" → tappable, opens bottom sheet picker

[Review list — FlatList]
  Each item: Review Card (with left color border)
  Swipe gestures on each
  Pull to refresh

[FAB — bottom right]
  Circle 56px, --color-primary-500 bg
  Plus icon, white
  Tap → opens "Send Review Request" bottom sheet
  [Floating, 20px from bottom of content, above tab bar]
```

**Filter bottom sheet**: Platforms (multi-select), Star rating (1-5 checkboxes), Date range (this week / this month / all time), Status (needs reply / replied / all).

**States**: Loading (3 skeleton cards), Empty (per-filter: "No 1-star reviews. Your customers love you."), Error (retry banner), Refreshing (EKG animation).

---

### Screen 9: Review Detail

**Purpose**: Full review text, post a reply, flag if suspicious.

**Layout**:
```
[Nav bar: back chevron + "REVIEW DETAIL" h2]

[Review Header Card — --bg-surface, shadow md]
  [Platform icon 24px + name + "VERIFIED" badge if GBP]
  [Reviewer avatar circle 48px + name h3]
  [★ ★ ★ ★ ☆  "4.0"  body-sm]
  [Date: caption --text-tertiary "March 8, 2026"]

[Review text — body, --text-primary, full text, no truncation]

[Divider]

[Reply section]
  Label: "YOUR REPLY" — label uppercase

  IF no reply:
    [Empty state: small, 60px height]
    "Draft a reply with AI"  h4
    [Secondary button: "GENERATE AI DRAFT"]
    [Ghost: "Write manually"]

  IF AI draft ready:
    [Yellow "AI DRAFT" badge top-right of text box]
    [Editable text area — 120px min height]
    [Character count: caption "285 / 4000"]
    [Primary button: "POST REPLY"]
    [Ghost: "Regenerate"]

  IF replied:
    [Green badge "REPLIED ✓"]
    [Reply text — body, --text-secondary, non-editable]
    [Caption: "Posted March 9, 2026"]

[Danger zone — at bottom]
  [Ghost destructive: "Flag as Suspicious Review →"]
```

**States**: Loading (skeleton for header + body + reply area), Error (toast), Reply posting (button shows "POSTING...").

---

### Screen 10: Send Review Request

**Purpose**: The primary action. Fast, 3-tap flow.

**Layout** (as bottom sheet, opened from FAB or Action Card):
```
[Handle bar]
"SEND REVIEW REQUEST"  ← h2, --text-primary
"Customers reply 8x more to texts than emails"  ← caption --text-secondary

[Customer input area]
  Tab: [FROM CONTACTS] [NEW CUSTOMER]

  FROM CONTACTS tab:
    [Search input — pill, "Search customers..."]
    [FlatList of customers — compact list items]
    [Selected: lime checkmark badge on avatar]

  NEW CUSTOMER tab:
    [Name input]
    [Phone input — phone number format]
    [Save to contacts toggle]

[Template selector]
  "MESSAGE TEMPLATE" — label uppercase
  [Selected template preview card — bg --color-primary-50]
  Template text: "Hi [Name], thanks for choosing [Business]! Mind sharing your experience? [Google Link]"
  [Edit template — ghost link]

[Preview]
  "PREVIEW"  ← label
  Rendered SMS bubble (iMessage blue style)

[Primary button: "SEND MESSAGE" — full width]
```

**States**: Sending (button "SENDING..." + disabled), Sent (success animation: checkmark + "Request Sent!" + haptic success), Error (toast).

---

### Screen 11: Analytics

**Purpose**: Show review velocity and response rate trends. Weekly ritual.

**Layout**:
```
[Large title: "ANALYTICS"]
[Date range picker: chips "7D | 30D | 90D | 1Y"]

[Hero chart — Rating Over Time]
  --bg-surface card, shadow md
  Line chart: --color-primary-500 line, fill gradient below
  X axis: dates, caption
  Y axis: 1-5 rating scale

[Stats row — 4 items horizontal scroll]
  New Reviews | Response Rate | Avg Response Time | Review Requests Sent
  Each: stat number + label caption + trend arrow

[Section: "REVIEW BREAKDOWN"]
  Horizontal bar chart: 5★(40) 4★(5) 3★(1) 2★(0) 1★(1)
  Each bar: teal fill, rating count caption right

[Section: "PLATFORM SPLIT"]
  Pie chart: Google 78% / Yelp 15% / Trustpilot 7%
  Legend below with platform icons

[Section: "TOP KEYWORDS"]
  Pill tags of words from reviews: "professional" "fast" "friendly" "clean" "recommend"
  Size = frequency. Color = sentiment (green/red/neutral)
```

**States**: Loading (skeleton charts — animated rectangles), Empty (new user: "No data yet — you'll see trends after your first week"), Error (retry).

**Chart library**: `react-native-gifted-charts` — line + bar + pie. All charts support dark mode via theme prop.

---

### Screen 12: Customers

**Purpose**: Contact list for sending review requests.

**Layout**:
```
[Large title: "CUSTOMERS"]
[Search bar — pill, full width]

[Import CTA banner — shown until dismissed]
  bg: --color-primary-50 (light) / --bg-surface-2 (dark)
  border: 1px --color-primary-100
  "Import from CSV or contacts"
  [Import button — secondary small]
  [X dismiss]

[Section: "RECENT — sent this week"]
  [Compact customer list items]
  Status: "Sent 2 days ago" caption

[Section: "ALL CUSTOMERS — A-Z"]
  [Alpha index sidebar (iOS-style)]
  [Customer list items]
  [Long press: "Send request again" or "Delete"]

[FAB: Plus icon → "Add Customer" bottom sheet]
```

**States**: Loading (skeleton), Empty ("No customers yet" + import/add CTAs), Search empty ("No matches for 'John'").

---

### Screen 13: Settings

**Layout**:
```
[Large title: "SETTINGS"]

[Profile card — --bg-surface, shadow sm]
  [Avatar 56px] [Business name h3] [Email caption --text-secondary]
  [Edit profile → ChevronRight]

[Section: "SUBSCRIPTION"]
  [Pro badge if Pro: lime "PRO" label]
  [Plan: "$14.99 / month" body]
  [Manage subscription → opens RevenueCat portal]

[Section: "NOTIFICATIONS"]
  [New reviews toggle]
  [New ratings below 3★ urgent alerts toggle]
  [Weekly summary toggle]
  Each: row with icon + label + Switch component

[Section: "CONNECTED PLATFORMS"]
  [Google Business: green "Connected" badge OR "Connect" button]
  [Yelp: "Connected" or "Add Yelp"]
  [Trustpilot: "Connected" or "Add Trustpilot"]

[Section: "REVIEW TEMPLATES"]
  [View templates →]

[Section: "ACCOUNT"]
  [Privacy Policy →]
  [Terms of Service →]
  [Export My Data →]
  [Delete Account → destructive color]

[Sign Out button — ghost destructive, bottom]
```

**Dark mode**: All section backgrounds use --bg-surface-2. Section headers are label uppercase.

---

## Pass 3: Polish & Interaction Refinement

### Micro-interactions

| Trigger | Response | Haptic |
|---------|----------|--------|
| Button press | scale(0.97) + color darken | Light impact |
| Review card tap | Highlight flash (#0F7B7B at 0.05 opacity) | Light impact |
| Swipe left on review | Red "Delete" zone slides in from right | Medium at threshold |
| Swipe right on review | Green "Replied" zone | Medium at threshold |
| Send request tap | Button → loading → success checkmark draw | Success notification |
| AI draft generated | Text types in char by char (40ms intervals) | Light impact on first char |
| Pull to refresh | EKG flatline → pulse spike → normalize | Medium impact |
| New review arrives | Push notification + lime badge pulse | System notification |
| Platform connected | Checkmark draws over Google logo | Success notification |
| 5-star review arrives | Lime flash across screen (300ms, fades) | Success notification |

### Gesture Map

| Gesture | Screen/Element | Action |
|---------|----------------|--------|
| Swipe left | Review list item | Delete review (local), or Archive |
| Swipe right | Review list item | Mark as replied |
| Long press | Review list item | Context menu: Copy text / Flag / Open in browser |
| Swipe down | Any modal/bottom sheet | Dismiss |
| Double tap | Rating number | Copy to clipboard |
| Long press | Customer list item | "Send request again" or "Delete" |
| Swipe left | Customer list item | Delete from list |

### Loading Experience

- **Skeleton screens everywhere** — no spinners on list screens
- **Optimistic updates**: mark as replied shows immediately, syncs in background
- **Progressive enhancement**: app loads cached reviews instantly, fetches fresh in background
- **Offline banner**: slim 4px teal→red bar at top when offline (not a modal)

### Onboarding Flow Final Spec

4 screens total, swipe-to-advance:
1. Welcome hero (EKG animation, main CTA)
2. Feature A: Monitor (animated review list)
3. Feature B: Request (SMS bubble animation)
4. Feature C + Paywall (AI reply + trial CTA)

Transitions: horizontal slide with 12px parallax on hero illustration.
Progress: 4 dots, active dot expands to pill shape (20px → 48px, spring animation).
Skip: always visible top-right. Takes to sign up screen.

### Design Review Checklist — Pass 3

- [x] Every button has a pressed state (scale + color)
- [x] Every touchable element has haptic feedback (mapped above)
- [x] Every screen has a loading skeleton (specified per screen)
- [x] Every list has an empty state with copy + CTA
- [x] Every form has inline validation (email/password/phone)
- [x] Every destructive action has confirmation (delete review modal, delete customer)
- [x] Dark mode designed intentionally per screen (not inverted)
- [x] No animation exceeds 350ms (except skeleton shimmer 1500ms loop)
- [x] Typography hierarchy clear on every screen (one dominant element per section)
- [x] Consistent 20px horizontal padding on all screens
- [x] Bottom safe area respected on all screens (SafeAreaView)
- [x] EKG pulse motif used in: empty state (flatline), pull-to-refresh, onboarding hero

---

## Design Identity Summary

ReviewPulse looks like the tool a master tradesperson **trusts**, not a product a startup **built**. Barlow Condensed headings have the authority of a work invoice. The teal-to-lime color system moves from calm authority (monitoring) to electric signal (alert). Every review card is bordered on the left with a rating-colored stripe — diagnostic, immediate, informative. The EKG pulse motif in empty states and pull-to-refresh means "your reputation is being monitored" even when nothing is happening.

This system passes the "would a plumber pay $14.99/month for this?" test — it feels like professional equipment, not startup SaaS.

**Font**: Barlow Condensed + Source Sans 3 (not Inter, not Roboto)
**Primary color**: #0F7B7B (deep teal, not startup blue)
**Accent**: #CAFF47 (electric lime — the pulse signal)
**Radius**: 12px cards, 4px inputs, full for badges
**Empty state copy**: "Your pulse is quiet" — alive, not generic
