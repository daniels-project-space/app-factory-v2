// ReviewPulse — Smart Reply Templates
// Generates context-aware reply suggestions based on review sentiment
// Templates dynamically insert reviewer name and reference their feedback

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReplyTone = 'professional' | 'friendly' | 'apologetic';

export type ReplySuggestion = {
  tone: ReplyTone;
  toneLabel: string;
  toneDescription: string;
  text: string;
};

export type SentimentCategory = 'positive' | 'neutral' | 'negative';

// ─── Sentiment Detection ──────────────────────────────────────────────────────

export function detectSentiment(rating: number | null, reviewText: string | null): SentimentCategory {
  if (rating !== null) {
    if (rating >= 4) return 'positive';
    if (rating >= 3) return 'neutral';
    return 'negative';
  }

  // Fallback: keyword-based sentiment from text
  if (!reviewText) return 'neutral';
  const lower = reviewText.toLowerCase();

  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'outstanding', 'incredible', 'professional', 'recommend', 'happy', 'pleased', 'perfect', 'thrilled'];
  const negativeWords = ['terrible', 'awful', 'worst', 'disappointed', 'horrible', 'poor', 'never', 'waste', 'rude', 'unprofessional', 'sloppy', 'damaged', 'broken', 'overcharged', 'late', 'mess'];

  const posCount = positiveWords.filter((w) => lower.includes(w)).length;
  const negCount = negativeWords.filter((w) => lower.includes(w)).length;

  if (posCount > negCount + 1) return 'positive';
  if (negCount > posCount + 1) return 'negative';
  return 'neutral';
}

// ─── Extract Key Themes from Review ───────────────────────────────────────────

function extractTheme(reviewText: string | null): string {
  if (!reviewText) return 'your experience';

  const lower = reviewText.toLowerCase();

  // Check for specific topics
  const themeMap: [string[], string][] = [
    [['quality', 'craftsmanship', 'work quality', 'detail', 'attention'], 'the quality of our work'],
    [['price', 'cost', 'expensive', 'pricing', 'charge', 'bill', 'estimate'], 'our pricing'],
    [['time', 'schedule', 'late', 'delay', 'waited', 'timeline', 'on time', 'punctual'], 'our timing and scheduling'],
    [['clean', 'mess', 'tidy', 'cleanup'], 'our cleanup process'],
    [['communicate', 'communication', 'update', 'call', 'response', 'responsive'], 'our communication'],
    [['team', 'crew', 'staff', 'employee', 'worker'], 'our team'],
    [['recommend', 'referral', 'tell friends'], 'recommending us'],
    [['customer service', 'service', 'helpful', 'friendly'], 'our customer service'],
    [['kitchen', 'bathroom', 'remodel', 'renovation', 'project'], 'your project'],
    [['install', 'installation', 'repair', 'fix'], 'the work we did'],
  ];

  for (const [keywords, theme] of themeMap) {
    if (keywords.some((k) => lower.includes(k))) {
      return theme;
    }
  }

  return 'your experience with us';
}

// ─── Template Generation ──────────────────────────────────────────────────────

function generatePositiveReplies(firstName: string, theme: string): ReplySuggestion[] {
  return [
    {
      tone: 'professional',
      toneLabel: 'Professional',
      toneDescription: 'Formal and business-appropriate',
      text: `Thank you for your generous review, ${firstName}. We take great pride in ${theme}, and it's gratifying to know that our commitment to excellence resonated with you. Your feedback motivates our entire team. We look forward to the opportunity to serve you again in the future.`,
    },
    {
      tone: 'friendly',
      toneLabel: 'Friendly',
      toneDescription: 'Warm and personable',
      text: `Wow, thank you so much ${firstName}! Reading your review just made our day. We loved working with you and we're so glad you're happy with ${theme}. If you ever need anything else, you know where to find us. Thanks for being awesome!`,
    },
    {
      tone: 'apologetic',
      toneLabel: 'Grateful',
      toneDescription: 'Deeply thankful and humble',
      text: `${firstName}, we can't tell you how much this review means to us. When we started this business, reviews like yours are exactly what we dreamed of hearing. Thank you for trusting us with ${theme} and for taking the time to share your experience. It truly means the world.`,
    },
  ];
}

function generateNeutralReplies(firstName: string, theme: string): ReplySuggestion[] {
  return [
    {
      tone: 'professional',
      toneLabel: 'Professional',
      toneDescription: 'Acknowledging with improvement focus',
      text: `Thank you for your candid feedback, ${firstName}. We appreciate you sharing your thoughts about ${theme}. Your input is valuable as we continually work to improve our service. We'd welcome the chance to exceed your expectations next time. Please don't hesitate to reach out if there's anything we can do.`,
    },
    {
      tone: 'friendly',
      toneLabel: 'Friendly',
      toneDescription: 'Warm and solution-oriented',
      text: `Thanks for the honest review, ${firstName}! We appreciate you letting us know about ${theme}. We're always looking for ways to get better, and your feedback really helps. We'd love the chance to wow you next time around. Feel free to reach out anytime!`,
    },
    {
      tone: 'apologetic',
      toneLabel: 'Apologetic',
      toneDescription: 'Taking responsibility, offering to improve',
      text: `${firstName}, thank you for your honest feedback. We're sorry we didn't fully meet your expectations regarding ${theme}. We take every review seriously and will use yours to improve. We'd love the opportunity to make it right -- please contact us directly so we can discuss how we can do better for you.`,
    },
  ];
}

function generateNegativeReplies(firstName: string, theme: string): ReplySuggestion[] {
  return [
    {
      tone: 'professional',
      toneLabel: 'Professional',
      toneDescription: 'Composed and resolution-focused',
      text: `${firstName}, thank you for bringing this to our attention. We sincerely apologize that your experience with ${theme} did not meet our standards. This is not representative of the service we strive to provide. We would like to discuss this further and find a resolution. Please contact our office directly so we can address your concerns promptly.`,
    },
    {
      tone: 'friendly',
      toneLabel: 'Empathetic',
      toneDescription: 'Caring and understanding',
      text: `${firstName}, we're really sorry to hear about your experience. You deserved better, and we take full responsibility for the issues with ${theme}. We genuinely care about every customer and want to make this right. Would you be willing to give us a chance to fix things? Please reach out to us directly -- we promise to take care of you.`,
    },
    {
      tone: 'apologetic',
      toneLabel: 'Apologetic',
      toneDescription: 'Deep apology with concrete next steps',
      text: `${firstName}, we owe you a sincere apology. Reading your review about ${theme}, we understand your frustration and you have every right to be disappointed. We've already shared your feedback with our team to prevent this from happening again. I'd like to personally ensure we resolve this for you. Please call me directly at our office, and I'll make sure we take care of everything.`,
    },
  ];
}

// ─── Main API ─────────────────────────────────────────────────────────────────

export function generateReplySuggestions(
  reviewerName: string | null,
  rating: number | null,
  reviewText: string | null,
): ReplySuggestion[] {
  const firstName = reviewerName
    ? reviewerName.split(' ')[0]
    : 'there';

  const sentiment = detectSentiment(rating, reviewText);
  const theme = extractTheme(reviewText);

  switch (sentiment) {
    case 'positive':
      return generatePositiveReplies(firstName, theme);
    case 'neutral':
      return generateNeutralReplies(firstName, theme);
    case 'negative':
      return generateNegativeReplies(firstName, theme);
  }
}

export function getToneColor(tone: ReplyTone): string {
  switch (tone) {
    case 'professional': return '#0F7B7B'; // primary[500]
    case 'friendly': return '#8FAF00';     // accent[500]
    case 'apologetic': return '#D97706';   // warning[500]
  }
}

export function getToneEmoji(tone: ReplyTone): string {
  switch (tone) {
    case 'professional': return 'briefcase';
    case 'friendly': return 'heart';
    case 'apologetic': return 'shield';
  }
}
