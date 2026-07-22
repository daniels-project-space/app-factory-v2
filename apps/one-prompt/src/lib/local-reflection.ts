import type { JournalEntry } from './state/journal-store';
import type { JournalingGoalId, PhilosopherId } from './state/settings-store';

/** Bump when reflection rules change so older on-device results are not reused. */
export const LOCAL_REFLECTION_ENGINE_VERSION = 1;

export interface LocalReflection {
  summary: string;
  theme: string;
  mood: string;
  encouragement: string;
  hasPhotos: boolean;
  photoInsights?: string;
}

type ThemeRule = {
  name: string;
  words: string[];
  goal?: JournalingGoalId;
};

const THEME_RULES: ThemeRule[] = [
  { name: 'Growth & Learning', words: ['learn', 'grow', 'better', 'improve', 'discover', 'realize', 'practice'], goal: 'personal-growth' },
  { name: 'Gratitude', words: ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky', 'joy'], goal: 'gratitude' },
  { name: 'Relationships', words: ['friend', 'family', 'love', 'together', 'connect', 'people', 'partner'], goal: 'self-awareness' },
  { name: 'Work & Goals', words: ['work', 'goal', 'project', 'achieve', 'progress', 'finish', 'complete'], goal: 'goal-tracking' },
  { name: 'Self-Care', words: ['rest', 'relax', 'peace', 'calm', 'quiet', 'health', 'sleep'], goal: 'stress-relief' },
  { name: 'Challenges', words: ['hard', 'difficult', 'challenge', 'struggle', 'tough', 'worry', 'stress'], goal: 'emotional-processing' },
  { name: 'Creativity', words: ['create', 'idea', 'inspire', 'art', 'write', 'make', 'build'], goal: 'creativity' },
  { name: 'Nature & Peace', words: ['nature', 'walk', 'outside', 'sky', 'tree', 'garden', 'mindful'], goal: 'mindfulness' },
];

const GOAL_VARIANTS: Record<JournalingGoalId, { focus: string; encouragement: string[] }> = {
  'self-awareness': { focus: 'what you noticed about yourself', encouragement: ['Keep observing without rushing to judge.', 'Let the patterns you notice guide your next small choice.', 'Curiosity about yourself is useful progress.'] },
  gratitude: { focus: 'the good you made room to notice', encouragement: ['Keep naming the small things that supported you.', 'A brief pause for appreciation can steady the next day.', 'Let gratitude stay specific and close to your real week.'] },
  'stress-relief': { focus: 'where you needed gentleness', encouragement: ['Choose one small way to make tomorrow lighter.', 'Rest is part of sustaining your practice.', 'Keep making room for the pace that helps you recover.'] },
  creativity: { focus: 'the ideas and expression you returned to', encouragement: ['Protect a little space for the work that feels alive.', 'Keep following the thread that made you curious.', 'Small creative acts still count as making something yours.'] },
  'goal-tracking': { focus: 'the steps you took toward what matters', encouragement: ['Name the next workable step and let it be enough.', 'Progress is easier to see when you keep recording it.', 'Keep your next action small, visible, and kind.'] },
  'emotional-processing': { focus: 'the feelings you gave words to', encouragement: ['Giving a feeling a name can make more room around it.', 'Keep meeting difficult moments with honesty and care.', 'You do not need to solve every feeling to acknowledge it.'] },
  mindfulness: { focus: 'the moments that brought you back to the present', encouragement: ['Return to one ordinary detail that helps you arrive.', 'Let one quiet moment be enough for today.', 'Keep noticing what is here before reaching for what is next.'] },
  'personal-growth': { focus: 'the ways you are learning through the week', encouragement: ['Keep the lesson, and leave room for the next attempt.', 'Growth often looks like returning with a little more awareness.', 'Notice the effort you made, not only the result.'] },
  'memory-keeping': { focus: 'the moments worth carrying forward', encouragement: ['Keep saving the details that would otherwise fade.', 'Your ordinary moments are part of your larger story.', 'A small record today can become a meaningful memory later.'] },
};

const GUIDE_VARIANTS: Record<PhilosopherId, { summary: string[]; encouragement: string[] }> = {
  none: { summary: ['This week makes room for', 'Your entries point toward', 'Across the week, you returned to'], encouragement: ['Keep taking one honest note at a time.', 'Let this reflection be a gentle starting point for tomorrow.', 'Your attention to the week is already a meaningful practice.'] },
  nietzsche: { summary: ['This week asks you to meet', 'Your entries trace a path through', 'Across the week, you faced'], encouragement: ['Choose the next challenge that helps you become more fully yourself.', 'Let the difficulty become material for a deliberate next step.', 'Keep shaping a response that is worthy of your own values.'] },
  aurelius: { summary: ['This week highlights', 'Your entries return to', 'Across the week, you observed'], encouragement: ['Put your energy into the next thing within your control.', 'Meet tomorrow with a clear mind and one practical action.', 'Let what you cannot control pass, and tend to what you can.'] },
  plato: { summary: ['This week invites you to examine', 'Your entries raise questions about', 'Across the week, you looked beneath'], encouragement: ['Keep asking what matters beneath the first answer.', 'Carry one useful question into tomorrow.', 'Let careful attention reveal the next truth worth testing.'] },
  schiller: { summary: ['This week brings shape to', 'Your entries find meaning in', 'Across the week, you made room for'], encouragement: ['Keep making a little room for beauty and play.', 'Let feeling and intention work together in your next step.', 'Notice where a small act of care can make the day more whole.'] },
  camus: { summary: ['This week shows your presence within', 'Your entries hold both difficulty and life in', 'Across the week, you kept moving through'], encouragement: ['Choose one life-affirming action, even if the day stays imperfect.', 'Keep making meaning through the next lived moment.', 'Let an ordinary pleasure be a small act of defiance against despair.'] },
};

const POSITIVE_WORDS = ['happy', 'good', 'great', 'love', 'joy', 'excited', 'wonderful', 'amazing', 'grateful', 'calm', 'proud', 'hopeful'];
const NEGATIVE_WORDS = ['sad', 'hard', 'difficult', 'stress', 'worry', 'tired', 'anxious', 'frustrated', 'angry', 'scared', 'overwhelmed'];

function countMatches(text: string, words: string[]): number {
  return words.reduce((count, word) => count + (text.match(new RegExp(`\\b${word}\\b`, 'g'))?.length ?? 0), 0);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function select<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

function entryText(entries: JournalEntry[]): string {
  return entries.map((entry) => entry.content?.trim().toLowerCase() ?? '').filter(Boolean).join(' ');
}

function firstGoal(goals: JournalingGoalId[]): JournalingGoalId | undefined {
  return [...goals].sort()[0];
}

function countTextEntries(entries: JournalEntry[]): number {
  return entries.filter((entry) => entry.content?.trim()).length;
}

function countPhotos(entries: JournalEntry[]): number {
  return entries.filter((entry) => Boolean(entry.photoUri)).length;
}

function detectTheme(text: string, goals: JournalingGoalId[]): string {
  let best = { name: 'Self-reflection', score: 0 };
  for (const rule of THEME_RULES) {
    const score = countMatches(text, rule.words) + (rule.goal && goals.includes(rule.goal) ? 2 : 0);
    if (score > best.score) best = { name: rule.name, score };
  }
  return best.name;
}

function detectMood(text: string, hasText: boolean): string {
  if (!hasText) return 'Creative';
  const balance = countMatches(text, POSITIVE_WORDS) - countMatches(text, NEGATIVE_WORDS);
  if (balance >= 3) return 'Uplifted';
  if (balance <= -3) return 'Contemplative';
  if (balance !== 0) return 'Mixed emotions';
  return 'Reflective';
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function reflectionInputHash(entries: JournalEntry[], philosopher: PhilosopherId, goals: JournalingGoalId[]): string {
  const entrySignature = entries
    .map((entry) => `${entry.date}:${entry.content ?? ''}:${entry.prompt ?? ''}:${entry.updatedAt}:${Boolean(entry.photoUri)}`)
    .sort()
    .join('|');
  return `${LOCAL_REFLECTION_ENGINE_VERSION}:${entrySignature}:${philosopher}:${[...goals].sort().join(',')}`;
}

/**
 * Produces a curated reflection entirely from journal metadata and text already
 * on the device. `variant` makes refreshes feel fresh while remaining stable.
 */
export function generateLocalReflection(
  entries: JournalEntry[],
  philosopher: PhilosopherId = 'none',
  goals: JournalingGoalId[] = [],
  variant = 0,
): LocalReflection {
  const photoCount = countPhotos(entries);
  const textCount = countTextEntries(entries);
  const hasPhotos = photoCount > 0;
  const hasText = textCount > 0;
  const seed = hash(`${reflectionInputHash(entries, philosopher, goals)}:${variant}`);
  const goal = firstGoal(goals);
  const goalVariant = goal ? GOAL_VARIANTS[goal] : undefined;
  const guide = GUIDE_VARIANTS[philosopher];

  if (entries.length === 0) {
    return {
      summary: 'No entries this week yet. Start writing to see your weekly reflection.',
      theme: 'New beginnings',
      mood: 'Neutral',
      encouragement: goalVariant ? select(goalVariant.encouragement, seed) : select(guide.encouragement, seed),
      hasPhotos: false,
    };
  }

  if (hasPhotos && !hasText) {
    return {
      summary: `${plural(photoCount, 'photo')} captured this week. Your visual journal is becoming a record of the moments you chose to notice.`,
      theme: 'Visual Storytelling',
      mood: 'Creative',
      encouragement: goalVariant ? select(goalVariant.encouragement, seed) : select(guide.encouragement, seed),
      hasPhotos: true,
      photoInsights: `You captured ${plural(photoCount, 'photo')} this week. This reflection counts your photo moments; it does not inspect image content.`,
    };
  }

  const text = entryText(entries);
  const theme = detectTheme(text, goals);
  const mood = detectMood(text, hasText);
  const focus = goalVariant?.focus ?? `the theme of ${theme.toLowerCase()}`;
  const summaryLead = select(guide.summary, seed);
  const photoNote = hasPhotos ? ` You also added ${plural(photoCount, 'photo')} to the week.` : '';
  const summary = `${summaryLead} ${focus}. You recorded ${plural(textCount, 'written entry')}${photoNote}`;

  return {
    summary,
    theme,
    mood,
    encouragement: goalVariant ? select(goalVariant.encouragement, seed) : select(guide.encouragement, seed),
    hasPhotos,
    photoInsights: hasPhotos ? `Alongside your words, you captured ${plural(photoCount, 'photo')} this week.` : undefined,
  };
}
