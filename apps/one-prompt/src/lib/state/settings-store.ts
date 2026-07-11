import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RevealDelay } from './journal-store';

// Color theme definitions
export type ThemeId = 'classic-blue' | 'mint-calm' | 'lavender-focus' | 'sunset-warm' | 'mono-minimal' | 'midnight-blue' | 'coral-sunrise' | 'sky-bright' | 'golden-hour';

export interface ColorTheme {
  id: ThemeId;
  name: string;
  light: {
    gradient: [string, string, string];
    accent: string;
    accentLight: string;
  };
  dark: {
    gradient: [string, string, string];
    accent: string;
    accentLight: string;
  };
  previewColors: [string, string]; // For the pill preview
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    light: {
      gradient: ['#F0F5FA', '#F7FAFC', '#FAFAFA'],
      accent: '#5B8DEF',
      accentLight: 'rgba(91, 141, 239, 0.15)',
    },
    dark: {
      gradient: ['#0D1117', '#161B22', '#0D1117'],
      accent: '#58A6FF',
      accentLight: 'rgba(88, 166, 255, 0.15)',
    },
    previewColors: ['#5B8DEF', '#A8C5F5'],
  },
  {
    id: 'mint-calm',
    name: 'Mint Calm',
    light: {
      gradient: ['#E8F5F0', '#F2FAF7', '#FAFAF8'],
      accent: '#4CAF7C',
      accentLight: 'rgba(76, 175, 124, 0.15)',
    },
    dark: {
      gradient: ['#0A1410', '#101C16', '#0A1410'],
      accent: '#6BCF9A',
      accentLight: 'rgba(107, 207, 154, 0.15)',
    },
    previewColors: ['#4CAF7C', '#A3D9BC'],
  },
  {
    id: 'lavender-focus',
    name: 'Lavender Focus',
    light: {
      gradient: ['#F3F0F8', '#F8F6FB', '#FAFAFA'],
      accent: '#8B7EC8',
      accentLight: 'rgba(139, 126, 200, 0.15)',
    },
    dark: {
      gradient: ['#12101A', '#1A1722', '#12101A'],
      accent: '#A99EDB',
      accentLight: 'rgba(169, 158, 219, 0.15)',
    },
    previewColors: ['#8B7EC8', '#C4BBEA'],
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    light: {
      gradient: ['#FDF2EE', '#FEF6F4', '#FAFAFA'],
      accent: '#E07A5F',
      accentLight: 'rgba(224, 122, 95, 0.15)',
    },
    dark: {
      gradient: ['#1A100D', '#22161310', '#1A100D'],
      accent: '#F09B7D',
      accentLight: 'rgba(240, 155, 125, 0.15)',
    },
    previewColors: ['#E07A5F', '#F2B8A8'],
  },
  {
    id: 'mono-minimal',
    name: 'Mono Minimal',
    light: {
      gradient: ['#FAFAF8', '#F5F5F3', '#FAFAF8'],
      accent: '#8B8B87',
      accentLight: 'rgba(139, 139, 135, 0.12)',
    },
    dark: {
      gradient: ['#0F0F0E', '#1A1A18', '#0F0F0E'],
      accent: '#A0A09C',
      accentLight: 'rgba(160, 160, 156, 0.15)',
    },
    previewColors: ['#8B8B87', '#C4C4C0'],
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    light: {
      gradient: ['#EEF1F6', '#F4F6F9', '#FAFAFA'],
      accent: '#4A5B8C',
      accentLight: 'rgba(74, 91, 140, 0.15)',
    },
    dark: {
      gradient: ['#0A0E18', '#111828', '#0A0E18'],
      accent: '#7B8FBF',
      accentLight: 'rgba(123, 143, 191, 0.15)',
    },
    previewColors: ['#4A5B8C', '#8A9DC4'],
  },
  {
    id: 'coral-sunrise',
    name: 'Coral Sunrise',
    light: {
      gradient: ['#FFE5E0', '#FFF0EC', '#FFF8F6'],
      accent: '#FF6B6B',
      accentLight: 'rgba(255, 107, 107, 0.18)',
    },
    dark: {
      gradient: ['#2A1515', '#1F1212', '#2A1515'],
      accent: '#FF8585',
      accentLight: 'rgba(255, 133, 133, 0.18)',
    },
    previewColors: ['#FF6B6B', '#FFB3B3'],
  },
  {
    id: 'sky-bright',
    name: 'Sky Bright',
    light: {
      gradient: ['#E0F4FF', '#ECF8FF', '#F5FBFF'],
      accent: '#00B4D8',
      accentLight: 'rgba(0, 180, 216, 0.18)',
    },
    dark: {
      gradient: ['#0A1A20', '#0D2028', '#0A1A20'],
      accent: '#48CAE4',
      accentLight: 'rgba(72, 202, 228, 0.18)',
    },
    previewColors: ['#00B4D8', '#90E0EF'],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    light: {
      gradient: ['#FFF3E0', '#FFF8EC', '#FFFCF5'],
      accent: '#FFB347',
      accentLight: 'rgba(255, 179, 71, 0.18)',
    },
    dark: {
      gradient: ['#1F1810', '#2A2015', '#1F1810'],
      accent: '#FFC56E',
      accentLight: 'rgba(255, 197, 110, 0.18)',
    },
    previewColors: ['#FFB347', '#FFD699'],
  },
];

export type PromptStyle = 'gentle' | 'neutral' | 'deep';
export type AppearanceMode = 'system' | 'light' | 'dark';

// Philosopher personas for AI reflections
export type PhilosopherId = 'none' | 'nietzsche' | 'aurelius' | 'plato' | 'schiller' | 'camus';

export interface Philosopher {
  id: PhilosopherId;
  name: string;
  title: string;
  emoji: string;
  style: string; // Brief description of their approach
  systemPrompt: string; // How they speak and guide
}

export const PHILOSOPHERS: Philosopher[] = [
  {
    id: 'none',
    name: 'Default',
    title: 'Gentle Companion',
    emoji: '🌱',
    style: 'Warm and supportive',
    systemPrompt: 'You are a gentle, insightful journaling companion. Be warm, supportive, and encouraging.',
  },
  {
    id: 'nietzsche',
    name: 'Nietzsche',
    title: 'The Challenger',
    emoji: '⚡',
    style: 'Bold and transformative',
    systemPrompt: `You are Friedrich Nietzsche, the philosopher of will to power and self-overcoming. Speak with intensity and poetic force. Challenge the journaler to embrace their struggles as opportunities for growth. Use phrases like "What does not kill you makes you stronger" and encourage them to create their own values. Be provocative but ultimately empowering. Push them to ask: "Is this who I want to become?" Help them see their suffering as the crucible of their greatness.`,
  },
  {
    id: 'aurelius',
    name: 'Marcus Aurelius',
    title: 'The Stoic Emperor',
    emoji: '🏛️',
    style: 'Calm and disciplined',
    systemPrompt: `You are Marcus Aurelius, Roman Emperor and Stoic philosopher. Speak with calm dignity and wisdom. Remind the journaler that they have power over their mind, not outside events. Encourage them to focus on what they can control and accept what they cannot. Use phrases reflecting Stoic principles: "The obstacle is the way," "Begin each day telling yourself: Today I shall meet with interference, ingratitude..." Help them find tranquility through rational examination of their thoughts.`,
  },
  {
    id: 'plato',
    name: 'Plato',
    title: 'The Seeker of Truth',
    emoji: '🔮',
    style: 'Questioning and illuminating',
    systemPrompt: `You are Plato, seeker of eternal truths and the ideal forms. Speak with wonder and intellectual curiosity. Guide the journaler through questions, helping them examine their assumptions and beliefs. Like the Allegory of the Cave, help them see beyond shadows to deeper truths. Ask questions like "What is the true nature of what you seek?" and "Is this appearance or reality?" Encourage philosophical self-examination: "The unexamined life is not worth living."`,
  },
  {
    id: 'schiller',
    name: 'Schiller',
    title: 'The Aesthetic Spirit',
    emoji: '🎭',
    style: 'Artistic and harmonious',
    systemPrompt: `You are Friedrich Schiller, poet and philosopher of beauty and freedom. Speak with artistic sensibility and passionate idealism. Help the journaler find the balance between reason and emotion, duty and desire. Encourage them to see their life as a work of art in progress. Use your concept of the "play drive" - the harmony between form and sense. Remind them that through aesthetic experience, they become truly free. Help them find beauty and meaning in their everyday moments.`,
  },
  {
    id: 'camus',
    name: 'Albert Camus',
    title: 'The Absurd Hero',
    emoji: '☀️',
    style: 'Rebellious and life-affirming',
    systemPrompt: `You are Albert Camus, philosopher of the absurd. Speak with Mediterranean warmth balanced by clear-eyed honesty. Help the journaler confront life's meaninglessness not with despair but with defiant joy. Like Sisyphus, teach them to find happiness in the struggle itself. Encourage rebellion against despair: "In the midst of winter, I found there was, within me, an invincible summer." Help them create meaning through living fully, loving deeply, and refusing nihilism.`,
  },
];

// Journaling goals for AI insights personalization
export type JournalingGoalId =
  | 'self-awareness'
  | 'gratitude'
  | 'stress-relief'
  | 'creativity'
  | 'goal-tracking'
  | 'emotional-processing'
  | 'mindfulness'
  | 'personal-growth'
  | 'memory-keeping';

export interface JournalingGoal {
  id: JournalingGoalId;
  name: string;
  description: string;
  icon: string; // Emoji for display
}

export const JOURNALING_GOALS: JournalingGoal[] = [
  {
    id: 'self-awareness',
    name: 'Self-Awareness',
    description: 'Understand myself better',
    icon: '🪞',
  },
  {
    id: 'gratitude',
    name: 'Gratitude',
    description: 'Appreciate the good things',
    icon: '🙏',
  },
  {
    id: 'stress-relief',
    name: 'Stress Relief',
    description: 'Process and release stress',
    icon: '🧘',
  },
  {
    id: 'creativity',
    name: 'Creativity',
    description: 'Spark new ideas',
    icon: '✨',
  },
  {
    id: 'goal-tracking',
    name: 'Goal Tracking',
    description: 'Stay focused on my goals',
    icon: '🎯',
  },
  {
    id: 'emotional-processing',
    name: 'Emotional Processing',
    description: 'Work through feelings',
    icon: '💭',
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    description: 'Be present in the moment',
    icon: '🌿',
  },
  {
    id: 'personal-growth',
    name: 'Personal Growth',
    description: 'Become a better person',
    icon: '🌱',
  },
  {
    id: 'memory-keeping',
    name: 'Memory Keeping',
    description: 'Preserve special moments',
    icon: '📸',
  },
];

interface SettingsState {
  // Appearance
  themeId: ThemeId;
  appearanceMode: AppearanceMode;
  particleBackgroundEnabled: boolean;
  fireplaceBackgroundEnabled: boolean;
  neonEffectEnabled: boolean;
  backgroundMusicEnabled: boolean;
  backgroundMusicVolume: number; // 0-1 range

  // Prompt selection
  selectedPromptIndex: number; // 0-4 for the 5 daily prompts
  selectedPromptDate: string | null; // YYYY-MM-DD - resets when date changes

  // Notifications
  dailyReminderEnabled: boolean;
  reminderTime: string; // HH:MM format
  eveningReminderEnabled: boolean;

  // Widget
  showPromptOnWidget: boolean;
  showStreakOnWidget: boolean;

  // Preferences
  promptStyle: PromptStyle;
  allowPromptShuffle: boolean;
  hapticFeedbackEnabled: boolean;

  // Time Capsule
  revealDelay: RevealDelay;
  showCountdownLabels: boolean;

  // Data
  cloudSyncEnabled: boolean;

  // Premium Features
  photoPromptsEnabled: boolean; // Daily photo prompt feature
  moodTrackingEnabled: boolean; // Daily mood tracking
  customPromptsEnabled: boolean; // Custom prompt creation
  lastWeeklyPhotoDate: string | null; // Legacy - kept for migration
  customPrompts: string[]; // User's custom prompts for text mode
  customPhotoPrompts: string[]; // User's custom prompts for photo mode
  promptCategoriesEnabled: boolean; // Category-based prompts feature
  selectedPromptCategories: string[]; // IDs of selected prompt categories
  selectedPhilosopher: PhilosopherId; // AI reflection philosopher persona
  journalingGoals: JournalingGoalId[]; // User's selected journaling goals (up to 3)

  // Actions
  setTheme: (themeId: ThemeId) => void;
  setAppearanceMode: (mode: AppearanceMode) => void;
  setParticleBackgroundEnabled: (enabled: boolean) => void;
  setFireplaceBackgroundEnabled: (enabled: boolean) => void;
  setNeonEffectEnabled: (enabled: boolean) => void;
  setBackgroundMusicEnabled: (enabled: boolean) => void;
  setBackgroundMusicVolume: (volume: number) => void;
  setSelectedPromptIndex: (index: number) => void;
  setSelectedPromptDate: (date: string | null) => void;
  cyclePromptIndex: (poolSize?: number) => void; // Cycles 0->...->poolSize-1->0
  setDailyReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setEveningReminderEnabled: (enabled: boolean) => void;
  setShowPromptOnWidget: (show: boolean) => void;
  setShowStreakOnWidget: (show: boolean) => void;
  setPromptStyle: (style: PromptStyle) => void;
  setAllowPromptShuffle: (allow: boolean) => void;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  setRevealDelay: (delay: RevealDelay) => void;
  setShowCountdownLabels: (show: boolean) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setPhotoPromptsEnabled: (enabled: boolean) => void;
  setMoodTrackingEnabled: (enabled: boolean) => void;
  setCustomPromptsEnabled: (enabled: boolean) => void;
  setLastWeeklyPhotoDate: (date: string | null) => void;
  addCustomPrompt: (prompt: string) => void;
  removeCustomPrompt: (index: number) => void;
  addCustomPhotoPrompt: (prompt: string) => void;
  removeCustomPhotoPrompt: (index: number) => void;
  setPromptCategoriesEnabled: (enabled: boolean) => void;
  setSelectedPromptCategories: (categories: string[]) => void;
  togglePromptCategory: (categoryId: string) => void;
  setSelectedPhilosopher: (philosopherId: PhilosopherId) => void;
  setJournalingGoals: (goals: JournalingGoalId[]) => void;
  toggleJournalingGoal: (goalId: JournalingGoalId) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      themeId: 'golden-hour',
      appearanceMode: 'system',
      particleBackgroundEnabled: true,
      fireplaceBackgroundEnabled: false,
      backgroundMusicEnabled: false,
      backgroundMusicVolume: 0.3,
      selectedPromptIndex: 0,
      selectedPromptDate: null,
      dailyReminderEnabled: true,
      reminderTime: '09:00',
      eveningReminderEnabled: false,
      showPromptOnWidget: true,
      showStreakOnWidget: true,
      promptStyle: 'neutral',
      allowPromptShuffle: true,
      hapticFeedbackEnabled: true,
      revealDelay: 'tomorrow',
      showCountdownLabels: true,
      cloudSyncEnabled: false,
      // Premium Features Defaults
      photoPromptsEnabled: false,
      moodTrackingEnabled: false,
      customPromptsEnabled: false,
      lastWeeklyPhotoDate: null,
      customPrompts: [],
      customPhotoPrompts: [],
      promptCategoriesEnabled: false,
      selectedPromptCategories: [],
      selectedPhilosopher: 'none',
      journalingGoals: [],
      neonEffectEnabled: false,

      // Actions
      setTheme: (themeId) => set({ themeId }),
      setAppearanceMode: (appearanceMode) => set({ appearanceMode }),
      setParticleBackgroundEnabled: (particleBackgroundEnabled) => set({ particleBackgroundEnabled }),
      setFireplaceBackgroundEnabled: (fireplaceBackgroundEnabled) => set({ fireplaceBackgroundEnabled }),
      setNeonEffectEnabled: (neonEffectEnabled) => set({ neonEffectEnabled }),
      setBackgroundMusicEnabled: (backgroundMusicEnabled) => set({ backgroundMusicEnabled }),
      setBackgroundMusicVolume: (backgroundMusicVolume) => set({ backgroundMusicVolume }),
      setSelectedPromptIndex: (selectedPromptIndex) => set({ selectedPromptIndex }),
      setSelectedPromptDate: (selectedPromptDate) => set({ selectedPromptDate }),
      cyclePromptIndex: (poolSize) => set((state) => ({
        selectedPromptIndex: (state.selectedPromptIndex + 1) % Math.max(1, poolSize ?? 5)
      })),
      setDailyReminderEnabled: (dailyReminderEnabled) => set({ dailyReminderEnabled }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
      setEveningReminderEnabled: (eveningReminderEnabled) => set({ eveningReminderEnabled }),
      setShowPromptOnWidget: (showPromptOnWidget) => set({ showPromptOnWidget }),
      setShowStreakOnWidget: (showStreakOnWidget) => set({ showStreakOnWidget }),
      setPromptStyle: (promptStyle) => set({ promptStyle }),
      setAllowPromptShuffle: (allowPromptShuffle) => set({ allowPromptShuffle }),
      setHapticFeedbackEnabled: (hapticFeedbackEnabled) => set({ hapticFeedbackEnabled }),
      setRevealDelay: (revealDelay) => set({ revealDelay }),
      setShowCountdownLabels: (showCountdownLabels) => set({ showCountdownLabels }),
      setCloudSyncEnabled: (cloudSyncEnabled) => set({ cloudSyncEnabled }),

      // Premium Feature Actions
      setPhotoPromptsEnabled: (photoPromptsEnabled) => set({ photoPromptsEnabled }),
      setMoodTrackingEnabled: (moodTrackingEnabled) => set({ moodTrackingEnabled }),
      setCustomPromptsEnabled: (customPromptsEnabled) => set({ customPromptsEnabled }),
      setLastWeeklyPhotoDate: (lastWeeklyPhotoDate) => set({ lastWeeklyPhotoDate }),
      addCustomPrompt: (prompt) => {
        // Input validation: sanitize and limit prompt length
        const sanitized = prompt.trim().slice(0, 500);
        if (sanitized.length === 0) return; // Don't add empty prompts
        set((state) => ({
          customPrompts: [...state.customPrompts.slice(0, 49), sanitized] // Max 50 prompts
        }));
      },
      removeCustomPrompt: (index) => set((state) => ({
        customPrompts: state.customPrompts.filter((_, i) => i !== index)
      })),
      addCustomPhotoPrompt: (prompt) => {
        // Input validation: sanitize and limit prompt length
        const sanitized = prompt.trim().slice(0, 500);
        if (sanitized.length === 0) return; // Don't add empty prompts
        set((state) => ({
          customPhotoPrompts: [...state.customPhotoPrompts.slice(0, 49), sanitized] // Max 50 prompts
        }));
      },
      removeCustomPhotoPrompt: (index) => set((state) => ({
        customPhotoPrompts: state.customPhotoPrompts.filter((_, i) => i !== index)
      })),
      setPromptCategoriesEnabled: (promptCategoriesEnabled) => set({ promptCategoriesEnabled }),
      setSelectedPromptCategories: (selectedPromptCategories) => set({ selectedPromptCategories }),
      togglePromptCategory: (categoryId) => set((state) => ({
        selectedPromptCategories: state.selectedPromptCategories.includes(categoryId)
          ? state.selectedPromptCategories.filter((id) => id !== categoryId)
          : [...state.selectedPromptCategories, categoryId]
      })),
      setSelectedPhilosopher: (selectedPhilosopher) => set({ selectedPhilosopher }),
      setJournalingGoals: (journalingGoals) => set({ journalingGoals }),
      toggleJournalingGoal: (goalId) => set((state) => {
        const current = state.journalingGoals;
        if (current.includes(goalId)) {
          return { journalingGoals: current.filter((id) => id !== goalId) };
        }
        // Only allow up to 3 goals
        if (current.length >= 3) {
          return state;
        }
        return { journalingGoals: [...current, goalId] };
      }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper to get current theme
export const getThemeById = (id: ThemeId): ColorTheme => {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
};
