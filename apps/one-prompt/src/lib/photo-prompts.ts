// Daily photo prompts - creative photography challenges
// Each prompt encourages mindful observation and capturing moments

export const PHOTO_PROMPTS: string[] = [
  "What made you pause and really look today?",
  "Where did you find unexpected beauty?",
  "What does your world look like right now?",
  "How is the light touching things near you?",
  "What would you hate to lose?",
  "What pattern did you notice you'd never seen before?",
  "Where is the stillness hiding?",
  "What single image tells today's story?",
  "What color keeps catching your attention?",
  "What surface begs to be touched?",
  "What can only be seen from where you're standing?",
  "What tiny thing holds enormous meaning?",
  "What shadows are drawing your eye?",
  "What tool has become invisible through daily use?",
  "Where is life persisting despite everything?",
  "What just stopped—or just started—moving?",
  "What wraps around you like comfort?",
  "What angles and lines surround you?",
  "What makes this place yours?",
  "What has aged beautifully?",
  "What were you blind to yesterday?",
  "What's the sky doing right now?",
  "What does your mood look like in physical form?",
  "Where is warmth radiating from?",
  "What was made by human hands?",
  "What ritual marks your morning?",
  "What peace exists within the chaos?",
  "What object always settles your mind?",
  "What's standing out against its background?",
  "What's caught between light and shadow?",
  "What's quietly becoming something new?",
  "What surrounds you as you work?",
  "What ordinary thing deserves celebration?",
  "What makes today unlike any other day?",
  "What world exists on the other side of glass?",
  "What flows instead of angles?",
  "What does afternoon feel like, captured?",
  "What blue calls to you?",
  "What keeps you tethered when you feel adrift?",
  "What detail reveals the whole?",
  "What beauty lives in imperfection?",
  "What is there more than enough of?",
  "What fills you with purpose today?",
  "How does the day's last light fall?",
  "What object could start a conversation?",
  "What corner of your world is truly yours?",
  "What green thing is thriving near you?",
  "What arrangement brings you calm?",
  "What looks like freedom to you?",
  "What takes you back in time?",
  "What vibrates with energy around you?",
  "What absolute stillness can you find?",
  "What are your hands doing right now?",
  "What makes tomorrow feel possible?",
  "What is the weather asking you to notice?",
  "What did you bring into existence?",
  "What has layers you hadn't noticed?",
  "What does rest look like in your world?",
  "What path are you on right now?",
  "What yields to your touch?",
  "What pulls you forward?",
  "What are you in the middle of learning?",
  "What holds two opposite things in balance?",
  "What makes you feel safe?",
  "What connects you to someone else?",
  "What will you want to remember?",
  "What's happening between moments?",
  "What sustains you?",
  "What refuses to be tamed?",
  "Where do you retreat to be yourself?",
  "What's glowing or gleaming?",
  "What's the pulse of your day?",
  "What makes you feel less alone?",
  "What could break with careless handling?",
  "What feels unshakable?",
  "What teaches the art of waiting?",
  "What does first light touch?",
  "What made you wonder why?",
  "What color dominates your vision right now?",
  "What exists because you made it?",
  "What reminds you you're alive?",
  "What generosity did you witness?",
  "What direction are you headed?",
  "What has survived the test of time?",
  "What invites you to play?",
  "What does silence look like?",
  "What object holds a thousand memories?",
  "What's the texture of this moment?",
  "What do you love fiercely?",
  "What ordinary miracle are you overlooking?",
];

// Photo prompts organized by category (matching the text prompt categories)
export interface PhotoPromptCategory {
  id: string;
  name: string;
  prompts: string[];
}

export const PHOTO_PROMPT_CATEGORIES: PhotoPromptCategory[] = [
  {
    id: 'gratitude',
    name: 'Gratitude',
    prompts: [
      "Capture something you're deeply grateful for",
      "Photograph a person who brightens your life",
      "Find and capture a simple pleasure",
      "Take a photo of something you often overlook",
      "Capture a skill or talent in action",
      "Photograph a treasured memory trigger",
      "Find beauty in something ordinary",
      "Capture someone who shaped who you are",
      "Photograph a modern convenience you rely on",
      "Find and capture a lesson learned",
      "Take a photo of something free that brings joy",
      "Capture a sign of good health",
      "Photograph your favorite home comfort",
      "Capture an act of kindness you witnessed",
      "Take a photo of an opportunity you have",
      "Photograph technology that helps you",
      "Capture a sound source that comforts you",
      "Take a photo of comfort food",
      "Capture something with a happy scent",
      "Photograph a soothing texture",
      "Find and capture nature's gift",
      "Photograph a meaningful tradition",
      "Capture something that entertained you",
      "Take a photo of what lifts your mood",
      "Photograph a place that feels like home",
      "Capture a small victory",
      "Take a photo of a valuable lesson",
      "Photograph a friendship symbol",
      "Capture family love",
      "Take a photo honoring a mentor",
      "Photograph an animal that brings joy",
      "Capture your favorite weather",
      "Take a photo celebrating the season",
      "Photograph your favorite time of day",
      "Capture a peaceful ritual",
      "Take a photo of a helpful tool",
      "Photograph your enriching hobby",
      "Capture a delicious meal",
      "Take a photo of a comforting drink",
      "Photograph clothing that makes you confident",
    ],
  },
  {
    id: 'self-discovery',
    name: 'Self-Discovery',
    prompts: [
      "Capture something that represents who you are",
      "Photograph your current mood in color",
      "Find and capture your inner strength",
      "Take a photo of what drives you",
      "Capture a fear you're overcoming",
      "Photograph what makes you unique",
      "Find your authentic self in an image",
      "Capture a childhood memory trigger",
      "Take a photo of your values in action",
      "Photograph what you believe in",
      "Capture your comfort zone boundaries",
      "Take a photo of unexplored territory",
      "Photograph your growth edge",
      "Capture what challenges you",
      "Take a photo of your resilience",
      "Photograph your healing journey",
      "Capture self-care in action",
      "Take a photo of self-love",
      "Photograph your boundaries",
      "Capture your energy source",
      "Take a photo of what drains you",
      "Photograph what restores you",
      "Capture your true north",
      "Take a photo of your compass",
      "Photograph your guiding light",
      "Capture your shadow side",
      "Take a photo of integration",
      "Photograph wholeness",
      "Capture your essence",
      "Take a photo of your soul's expression",
      "Photograph your heart's desire",
      "Capture what your gut says",
      "Take a photo of intuition",
      "Photograph your inner wisdom",
      "Capture your inner child",
      "Take a photo of your wild side",
      "Photograph your calm center",
      "Capture your passionate fire",
      "Take a photo of your flowing water",
      "Photograph your grounded earth",
    ],
  },
  {
    id: 'relationships',
    name: 'Relationships',
    prompts: [
      "Capture a symbol of connection",
      "Photograph someone you cherish",
      "Find and capture love in action",
      "Take a photo of friendship",
      "Capture family bonds",
      "Photograph a shared moment",
      "Find togetherness in your frame",
      "Capture communication happening",
      "Take a photo of listening",
      "Photograph understanding",
      "Capture empathy in action",
      "Take a photo of support",
      "Photograph encouragement",
      "Capture celebration together",
      "Take a photo of shared joy",
      "Photograph comfort given",
      "Capture healing presence",
      "Take a photo of safe space",
      "Photograph trust symbols",
      "Capture loyalty in action",
      "Take a photo of commitment",
      "Photograph partnership",
      "Capture collaboration",
      "Take a photo of teamwork",
      "Photograph community",
      "Capture belonging",
      "Take a photo of inclusion",
      "Photograph acceptance",
      "Capture forgiveness symbols",
      "Take a photo of reconciliation",
      "Photograph new beginnings together",
      "Capture shared dreams",
      "Take a photo of mutual growth",
      "Photograph learning together",
      "Capture teaching moments",
      "Take a photo of mentorship",
      "Photograph guidance received",
      "Capture wisdom shared",
      "Take a photo of legacy",
      "Photograph generational love",
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    prompts: [
      "Capture something representing progress",
      "Photograph your learning edge",
      "Find and capture a breakthrough",
      "Take a photo of potential",
      "Capture seeds of change",
      "Photograph transformation in progress",
      "Find growth in your surroundings",
      "Capture evolution happening",
      "Take a photo of improvement",
      "Photograph skill development",
      "Capture mastery in progress",
      "Take a photo of practice",
      "Photograph discipline in action",
      "Capture consistency",
      "Take a photo of habits forming",
      "Photograph routine strength",
      "Capture foundation building",
      "Take a photo of scaffolding",
      "Photograph support structures",
      "Capture resources for growth",
      "Take a photo of tools for learning",
      "Photograph knowledge gathering",
      "Capture wisdom accumulating",
      "Take a photo of experience gained",
      "Photograph lessons integrated",
      "Capture mistakes as teachers",
      "Take a photo of failure transformed",
      "Photograph resilience born",
      "Capture strength developed",
      "Take a photo of confidence growing",
      "Photograph courage building",
      "Capture fear faced",
      "Take a photo of comfort zone expanding",
      "Photograph horizons widening",
      "Capture perspective shifting",
      "Take a photo of mindset changing",
      "Photograph beliefs evolving",
      "Capture identity forming",
      "Take a photo of becoming",
      "Photograph the journey ahead",
    ],
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    prompts: [
      "Capture this present moment",
      "Photograph stillness around you",
      "Find and capture peace",
      "Take a photo of calm",
      "Capture serenity in your view",
      "Photograph tranquility",
      "Find quiet in your frame",
      "Capture silence visually",
      "Take a photo of breath (wind, air)",
      "Photograph grounding elements",
      "Capture earth beneath you",
      "Take a photo of flowing water",
      "Photograph fire or warmth",
      "Capture air and space",
      "Take a photo of the elements",
      "Photograph natural cycles",
      "Capture impermanence",
      "Take a photo of change happening",
      "Photograph seasons transitioning",
      "Capture time passing",
      "Take a photo of now",
      "Photograph here",
      "Capture awareness",
      "Take a photo of attention",
      "Photograph focus",
      "Capture concentration",
      "Take a photo of meditation space",
      "Photograph contemplation",
      "Capture reflection (literal or figurative)",
      "Take a photo of introspection",
      "Photograph inner landscape",
      "Capture outer world mindfully",
      "Take a photo with fresh eyes",
      "Photograph beginner's mind",
      "Capture wonder",
      "Take a photo of awe",
      "Photograph amazement",
      "Capture curiosity",
      "Take a photo of openness",
      "Photograph receptivity",
    ],
  },
  {
    id: 'creativity',
    name: 'Creativity',
    prompts: [
      "Capture creativity in action",
      "Photograph something you made",
      "Find and capture inspiration",
      "Take a photo of imagination",
      "Capture innovation around you",
      "Photograph original expression",
      "Find artistic beauty",
      "Capture design elements",
      "Take a photo of color harmony",
      "Photograph interesting composition",
      "Capture visual rhythm",
      "Take a photo of pattern play",
      "Photograph texture contrast",
      "Capture light artistry",
      "Take a photo of shadow drama",
      "Photograph reflection art",
      "Capture symmetry or asymmetry",
      "Take a photo of balance",
      "Photograph tension and release",
      "Capture movement frozen",
      "Take a photo of flow",
      "Photograph energy visible",
      "Capture emotion in objects",
      "Take a photo telling a story",
      "Photograph narrative elements",
      "Capture character in things",
      "Take a photo of personality",
      "Photograph mood setting",
      "Capture atmosphere",
      "Take a photo of ambiance",
      "Photograph vibe",
      "Capture feeling in form",
      "Take a photo of meaning",
      "Photograph symbolism",
      "Capture metaphor visually",
      "Take a photo of abstraction",
      "Photograph the unconventional",
      "Capture unexpected beauty",
      "Take a photo breaking rules",
      "Photograph your unique vision",
    ],
  },
  {
    id: 'reflection',
    name: 'Reflection',
    prompts: [
      "Capture today's highlight",
      "Photograph a meaningful moment",
      "Find and capture a lesson learned",
      "Take a photo of wisdom gained",
      "Capture insight visually",
      "Photograph clarity",
      "Find understanding in your frame",
      "Capture realization",
      "Take a photo of awakening",
      "Photograph enlightenment symbols",
      "Capture truth as you see it",
      "Take a photo of authenticity",
      "Photograph genuine expression",
      "Capture real moments",
      "Take a photo of honesty",
      "Photograph vulnerability",
      "Capture courage shown",
      "Take a photo of strength revealed",
      "Photograph character",
      "Capture integrity in action",
      "Take a photo of values lived",
      "Photograph principles upheld",
      "Capture purpose",
      "Take a photo of meaning",
      "Photograph significance",
      "Capture importance",
      "Take a photo of priority",
      "Photograph what matters most",
      "Capture the essential",
      "Take a photo of simplicity",
      "Photograph clarity achieved",
      "Capture focus found",
      "Take a photo of direction",
      "Photograph the path taken",
      "Capture journey markers",
      "Take a photo of milestones",
      "Photograph achievements",
      "Capture accomplishments",
      "Take a photo of success (your definition)",
      "Photograph fulfillment",
    ],
  },
];

// Get today's photo prompt based on date
export const getTodayPhotoPrompt = (): string => {
  const today = new Date();
  const dateNum = parseInt(today.toISOString().split('T')[0].replace(/-/g, ''), 10);
  const index = dateNum % PHOTO_PROMPTS.length;
  return PHOTO_PROMPTS[index];
};

// Get photo prompt for a specific date
export const getPhotoPromptForDate = (date: string): string => {
  const dateNum = parseInt(date.replace(/-/g, ''), 10);
  const index = dateNum % PHOTO_PROMPTS.length;
  return PHOTO_PROMPTS[index];
};

// Get all photo prompts from selected categories
export const getPhotoPromptsFromCategories = (categoryIds: string[]): string[] => {
  if (categoryIds.length === 0) {
    // Return all prompts from all categories
    return PHOTO_PROMPT_CATEGORIES.flatMap(cat => cat.prompts);
  }
  return PHOTO_PROMPT_CATEGORIES
    .filter(cat => categoryIds.includes(cat.id))
    .flatMap(cat => cat.prompts);
};

// Get photo prompt for a specific date from selected categories
export const getCategoryPhotoPromptForDate = (
  date: string,
  categoryIds: string[],
  customPhotoPrompts: string[] = []
): string => {
  const allPrompts = [...getPhotoPromptsFromCategories(categoryIds), ...customPhotoPrompts];

  if (allPrompts.length === 0) {
    return getPhotoPromptForDate(date);
  }

  const dateNum = parseInt(date.replace(/-/g, ''), 10);
  const index = dateNum % allPrompts.length;
  return allPrompts[index];
};

// Get multiple photo prompts for today (up to 5 options)
export const getTodayPhotoPrompts = (count: number = 5): string[] => {
  const today = new Date();
  const dateNum = parseInt(today.toISOString().split('T')[0].replace(/-/g, ''), 10);

  const prompts: string[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < count && prompts.length < PHOTO_PROMPTS.length; i++) {
    const seed = (dateNum * 31 + i * 17) % PHOTO_PROMPTS.length;
    let index = seed;

    let attempts = 0;
    while (usedIndices.has(index) && attempts < PHOTO_PROMPTS.length) {
      index = (index + 1) % PHOTO_PROMPTS.length;
      attempts++;
    }

    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      prompts.push(PHOTO_PROMPTS[index]);
    }
  }

  return prompts;
};

// Get multiple photo prompts from selected categories for a specific date (up to 5 options)
export const getCategoryPhotoPromptsForDate = (
  date: string,
  categoryIds: string[],
  customPhotoPrompts: string[] = [],
  count: number = 5
): string[] => {
  const allPrompts = [...getPhotoPromptsFromCategories(categoryIds), ...customPhotoPrompts];

  if (allPrompts.length === 0) {
    return getTodayPhotoPrompts(count);
  }

  const dateNum = parseInt(date.replace(/-/g, ''), 10);
  const prompts: string[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < count && prompts.length < allPrompts.length; i++) {
    const seed = (dateNum * 31 + i * 17) % allPrompts.length;
    let index = seed;

    let attempts = 0;
    while (usedIndices.has(index) && attempts < allPrompts.length) {
      index = (index + 1) % allPrompts.length;
      attempts++;
    }

    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      prompts.push(allPrompts[index]);
    }
  }

  return prompts;
};
