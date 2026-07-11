/**
 * Copywriting constants — Loop's voice in one place.
 *
 * A calm friend who's rooting for you and won't shame you. Warm, short,
 * second person. Fire and warmth metaphors, used lightly. Never guilt,
 * never streak-anxiety language. See DESIGN.md §7.
 *
 * Screens import from here rather than inlining strings, so the off-ramp
 * tone (the whole point of the loss-aversion mechanic, DESIGN.md §6) stays
 * consistent everywhere the flame's state is described.
 */

/** Reassurance lines on Home, keyed by how today (and the streak) is going. */
export const REASSURANCE_COPY = {
  roaringLong: 'Roaring. Don’t look down.',
  roaringShort: 'Small fire, real fire.',
  fresh: 'Day one. This is the hard part — you’re past it.',
  slipped: 'A little smaller today. It comes back.',
  emptyToday: 'Nothing kept yet. Start with the easy one.',
} as const;

/**
 * The off-ramp message shown in the UI itself (not just a push notification)
 * whenever the flame has just dimmed from a missed day. Supportive, never a
 * failure/shame framing — this is the exact loss-aversion tuning the brief
 * calls out as a churn risk if it reads as nagging.
 */
export const FLAME_DIMMED_MESSAGE = 'Your flame dimmed a little — one small thing brings it back.';

/**
 * The comeback prompt — a one-time Sheet after 3+ consecutive fully-missed
 * days (a genuinely bad week, not just a slipped day). Same off-ramp tone as
 * the dimmed-flame banner: an invitation back in, never a scolding for the
 * gap. Offers to restart with a single tiny habit rather than the full
 * three-anchor routine, so the re-entry bar stays low.
 */
export const COMEBACK_PROMPT = {
  title: 'The ember is still here.',
  message:
    'A few days got away from you. That happens — the flame just waits, smaller but lit. Pick one tiny thing to bring it back.',
  skip: 'Not today',
} as const;

/** "How the flame works" explainer sheet, opened from Settings → The Flame. */
export const FLAME_EXPLAINER = {
  title: 'How the flame works',
  paragraphs: [
    'Every anchor you keep feeds it. Every day you miss dims it — a little, never to nothing.',
    'A bad week costs you warmth, not the whole fire. There’s always an ember left to build back from.',
    'Missed a day? Don’t chase yesterday — just light the next anchor.',
  ],
} as const;

/** Paywall copy — arrives right after a win, so it reads as protecting progress. */
export const PAYWALL_COPY = {
  hook: 'Keep it burning.',
  sub: 'You’ve kept 3 anchors. Don’t let a busy week cost you the whole flame.',
  ctaIdle: 'Start free week',
  restore: 'Restore purchases',
  error: 'That didn’t go through. Nothing was charged — try again.',
  successTitle: 'You’re set.',
  successBody: 'Tend it well.',
} as const;

export const PAYWALL_FEATURES = [
  { icon: 'add-circle-outline', label: 'Unlimited habits in every anchor' },
  { icon: 'sunny-outline', label: 'All three anchors, always' },
  { icon: 'time-outline', label: 'Custom anchor times' },
  { icon: 'albums-outline', label: 'The full reflection archive' },
] as const;

/** Legal copy for Settings → Legal — real, in-voice, written for this app. */
export const LEGAL_COPY = {
  privacy: {
    title: 'Privacy policy',
    paragraphs: [
      'Loop keeps your flame on your device. There’s no server behind this app, so there’s no account of yours sitting on one — your habits, your streak, and your reflection history live in local storage here, and nowhere else.',
      'If you turn on anchor notifications, your phone schedules and delivers them locally. Nothing about your habits has to leave this device for that to work.',
      'Uninstalling Loop removes everything with it. We don’t sell it, share it, or see it — there isn’t a "we" watching, just this app and this phone.',
      'Questions about any of this: hello@loophabits.app.',
    ],
  },
  terms: {
    title: 'Terms of use',
    paragraphs: [
      'Short version: be good to yourself, and know this is a habit app, not a doctor.',
      'Loop helps you keep three small daily anchors. It isn’t medical, therapeutic, or professional advice — for anything health-related, talk to someone qualified.',
      'A Pro subscription, if you choose one, renews automatically at the price shown until you cancel it from your device’s subscription settings.',
      'We may update the app over time. We won’t change the one promise that matters: your data stays local, and it stays yours.',
      'That’s it. Go tend your fire.',
    ],
  },
} as const;
