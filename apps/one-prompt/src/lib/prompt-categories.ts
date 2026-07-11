// 7 Prompt Categories with 200 prompts each for premium users (1,400 total)
// Categories: Gratitude, Self-Discovery, Relationships, Growth, Mindfulness, Creativity, Reflection

import {
  GRATITUDE_PROMPTS,
  SELF_DISCOVERY_PROMPTS,
  RELATIONSHIPS_PROMPTS,
  GROWTH_PROMPTS,
  MINDFULNESS_PROMPTS,
  CREATIVITY_PROMPTS,
  REFLECTION_PROMPTS,
} from './prompts';

export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  prompts: string[];
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'gratitude',
    name: 'Gratitude',
    description: "Cultivate appreciation for life's blessings",
    icon: 'Heart',
    prompts: GRATITUDE_PROMPTS,
  },
  {
    id: 'self-discovery',
    name: 'Self-Discovery',
    description: 'Explore your inner world and identity',
    icon: 'Search',
    prompts: SELF_DISCOVERY_PROMPTS,
  },
  {
    id: 'relationships',
    name: 'Relationships',
    description: 'Nurture connections with others',
    icon: 'Users',
    prompts: RELATIONSHIPS_PROMPTS,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Embrace learning and personal development',
    icon: 'TrendingUp',
    prompts: GROWTH_PROMPTS,
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    description: 'Be present in the moment',
    icon: 'Leaf',
    prompts: MINDFULNESS_PROMPTS,
  },
  {
    id: 'creativity',
    name: 'Creativity',
    description: 'Spark imagination and innovation',
    icon: 'Sparkles',
    prompts: CREATIVITY_PROMPTS,
  },
  {
    id: 'reflection',
    name: 'Reflection',
    description: 'Look back and learn from experience',
    icon: 'Clock',
    prompts: REFLECTION_PROMPTS,
  },
];

// Get all prompts from selected categories
export const getPromptsFromCategories = (categoryIds: string[]): string[] => {
  if (categoryIds.length === 0) {
    // If no categories selected, return all prompts
    return PROMPT_CATEGORIES.flatMap((cat) => cat.prompts);
  }
  return PROMPT_CATEGORIES.filter((cat) => categoryIds.includes(cat.id)).flatMap(
    (cat) => cat.prompts
  );
};

// Get a random prompt from selected categories for a specific date
export const getCategoryPromptForDate = (
  date: string,
  categoryIds: string[],
  customPrompts: string[] = []
): string => {
  const categoryPrompts = getPromptsFromCategories(categoryIds);
  const allPrompts = [...categoryPrompts, ...customPrompts];

  if (allPrompts.length === 0) {
    return "What's on your mind today?";
  }

  // Use date to create a deterministic but seemingly random index
  const dateNum = parseInt(date.replace(/-/g, ''), 10);
  const index = dateNum % allPrompts.length;
  return allPrompts[index];
};

// Get multiple prompts from selected categories for a specific date (up to 5 options)
export const getCategoryPromptsForDate = (
  date: string,
  categoryIds: string[],
  customPrompts: string[] = [],
  count: number = 5
): string[] => {
  const categoryPrompts = getPromptsFromCategories(categoryIds);
  const allPrompts = [...categoryPrompts, ...customPrompts];

  if (allPrompts.length === 0) {
    return ["What's on your mind today?"];
  }

  const dateNum = parseInt(date.replace(/-/g, ''), 10);
  const prompts: string[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < count && prompts.length < allPrompts.length; i++) {
    // Use different seeds for each prompt slot to get variety
    const seed = (dateNum * 31 + i * 17) % allPrompts.length;
    let index = seed;

    // Find next unused index
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

// Get category by ID
export const getCategoryById = (id: string): PromptCategory | undefined => {
  return PROMPT_CATEGORIES.find((cat) => cat.id === id);
};
