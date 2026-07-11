import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDate } from './state/journal-store';

export interface PathDay {
  day: number;
  prompt: string;
  reflection?: string; // Optional guidance for that day
}

export interface JournalingPath {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  duration: number; // number of days
  theme: string; // color hint for UI
  days: PathDay[];
  completionBadge: string; // achievement ID unlocked on completion
}

export interface ActivePathState {
  pathId: string;
  startDate: string; // YYYY-MM-DD
  currentDay: number; // 1-indexed
  completedDays: number[]; // which days have been completed
  isComplete: boolean;
}

interface PathsState {
  activePath: ActivePathState | null;
  completedPaths: string[]; // IDs of completed paths

  // Actions
  startPath: (pathId: string) => void;
  completeDay: (day: number) => void;
  completePath: () => void;
  abandonPath: () => void;
  getActivePathPrompt: () => string | null;
  getCurrentDay: () => number;
  isPathComplete: () => boolean;
}

// ============================================================================
// GUIDED JOURNALING PATHS
// ============================================================================

export const JOURNALING_PATHS: JournalingPath[] = [
  {
    id: 'gratitude-journey',
    title: 'Gratitude Journey',
    description: 'Seven days of recognizing the quiet gifts around you',
    icon: '\u2728',
    duration: 7,
    theme: '#4CAF7C',
    completionBadge: 'path-gratitude',
    days: [
      { day: 1, prompt: 'Name one person who made today better.', reflection: 'Sometimes the smallest gestures carry the most weight.' },
      { day: 2, prompt: "What's a skill you're grateful to have?", reflection: 'Every ability was once something you struggled with.' },
      { day: 3, prompt: 'What ordinary moment felt extraordinary recently?', reflection: 'Beauty hides in the mundane for those willing to look.' },
      { day: 4, prompt: "What difficulty taught you something you wouldn't trade?", reflection: 'Gratitude and growth often share the same root.' },
      { day: 5, prompt: 'What part of your daily routine brings you quiet comfort?', reflection: 'Rituals anchor us when everything else shifts.' },
      { day: 6, prompt: 'What relationship has carried you through hard times?', reflection: 'Connection is the invisible thread that holds us together.' },
      { day: 7, prompt: 'Write a thank-you note to your past self.', reflection: 'You got yourself here. That deserves recognition.' },
    ],
  },
  {
    id: 'self-discovery',
    title: 'Self-Discovery',
    description: 'Fourteen days of honest conversation with yourself',
    icon: '\uD83D\uDD2E',
    duration: 14,
    theme: '#8B7EC8',
    completionBadge: 'path-discovery',
    days: [
      { day: 1, prompt: 'What do you pretend not to know about yourself?', reflection: 'Honesty with yourself is the hardest kind.' },
      { day: 2, prompt: 'What would you pursue if nobody was watching?', reflection: 'Your truest desires live beneath the noise of expectations.' },
      { day: 3, prompt: 'What fear has quietly shaped your choices this year?', reflection: 'Naming a fear is the first step to loosening its grip.' },
      { day: 4, prompt: 'When do you feel most like yourself?', reflection: 'Those moments are your compass.' },
      { day: 5, prompt: 'What story about yourself are you ready to rewrite?', reflection: 'You are not bound by who you were yesterday.' },
      { day: 6, prompt: 'What do you need that you struggle to ask for?', reflection: 'Needing things is not weakness. It is being human.' },
      { day: 7, prompt: 'What would change if you fully trusted yourself?', reflection: 'Trust is a muscle. This question is the exercise.' },
      { day: 8, prompt: 'What emotion do you avoid sitting with?', reflection: 'Avoidance keeps feelings alive. Attention lets them pass.' },
      { day: 9, prompt: "What strength of yours gets mistaken for something else?", reflection: 'Others see the surface. You know the depth.' },
      { day: 10, prompt: 'What pattern keeps repeating in your life?', reflection: 'Patterns persist until they are understood.' },
      { day: 11, prompt: 'What part of your identity have you outgrown?', reflection: 'Growth means leaving some versions of yourself behind.' },
      { day: 12, prompt: 'What boundary would change your life if you held it?', reflection: 'A boundary is a gift to yourself and everyone around you.' },
      { day: 13, prompt: 'What are you becoming that you could not have imagined before?', reflection: 'The person you are becoming does not exist yet. Keep going.' },
      { day: 14, prompt: 'Write a letter to the version of you who started this path.', reflection: 'Look how far you have come in fourteen days of looking inward.' },
    ],
  },
  {
    id: 'stress-relief',
    title: 'Stress Relief',
    description: 'Seven days of identifying and releasing what weighs on you',
    icon: '\uD83C\uDF3F',
    duration: 7,
    theme: '#5B8DEF',
    completionBadge: 'path-stress',
    days: [
      { day: 1, prompt: 'What is the heaviest thing on your mind right now?', reflection: 'Naming the weight is the first step to setting it down.' },
      { day: 2, prompt: 'What are you trying to control that might not be yours to control?', reflection: 'Release is not giving up. It is making space.' },
      { day: 3, prompt: 'What does your body feel like right now? Where are you holding tension?', reflection: 'The body keeps score even when the mind pretends not to notice.' },
      { day: 4, prompt: "What would 'good enough' look like today instead of perfect?", reflection: 'Perfection is a cage disguised as aspiration.' },
      { day: 5, prompt: 'What thought could you let pass through instead of holding onto?', reflection: 'Thoughts are visitors. You do not have to invite every one to stay.' },
      { day: 6, prompt: 'What small act of kindness could you offer yourself today?', reflection: 'You deserve the same gentleness you give others.' },
      { day: 7, prompt: 'What have you survived that once felt impossible?', reflection: 'You have already proven you can handle more than you think.' },
    ],
  },
  {
    id: 'future-vision',
    title: 'Future Vision',
    description: 'Ten days of mapping the life you want to build',
    icon: '\uD83C\uDF1F',
    duration: 10,
    theme: '#FFB347',
    completionBadge: 'path-future',
    days: [
      { day: 1, prompt: 'Describe your ideal ordinary Tuesday, five years from now.', reflection: 'Dreams live in the details of daily life, not just the highlights.' },
      { day: 2, prompt: "What is one thing you want to be known for?", reflection: 'Legacy is built in small, consistent choices.' },
      { day: 3, prompt: "What skill would transform your life if you mastered it?", reflection: 'Mastery begins with a single decision to start.' },
      { day: 4, prompt: "What would you attempt if failure carried no shame?", reflection: 'Shame is the only thing that makes failure permanent.' },
      { day: 5, prompt: "What relationship do you want to deepen or build?", reflection: 'Connection is the infrastructure of a good life.' },
      { day: 6, prompt: "What are you willing to sacrifice for what you want?", reflection: 'Every yes requires a no somewhere else.' },
      { day: 7, prompt: "What is the smallest step you could take this week toward your vision?", reflection: 'Momentum does not require magnitude. Just motion.' },
      { day: 8, prompt: "What old belief is standing between you and your future self?", reflection: 'Beliefs are not facts. You can replace them.' },
      { day: 9, prompt: "Who is someone living the kind of life you admire? What can you learn?", reflection: 'Admiration is a map if you read it carefully.' },
      { day: 10, prompt: "Write a message from your future self to you, right now.", reflection: 'Trust that you are already on your way.' },
    ],
  },
  {
    id: 'relationship-reflection',
    title: 'Relationship Reflection',
    description: 'Seven days exploring the connections that shape your life',
    icon: '\uD83D\uDC9C',
    duration: 7,
    theme: '#E07A5F',
    completionBadge: 'path-relationships',
    days: [
      { day: 1, prompt: 'Who do you think of when you hear the word "home"?', reflection: 'Home is often a person before it is a place.' },
      { day: 2, prompt: 'What conversation changed how you see someone?', reflection: 'Understanding transforms everything it touches.' },
      { day: 3, prompt: 'Who has been patient with you when you did not deserve it?', reflection: 'Patience is one of the purest forms of love.' },
      { day: 4, prompt: 'What do you wish you could tell someone but have not?', reflection: 'Unsaid words have weight. Even writing them here lightens the load.' },
      { day: 5, prompt: 'How have you grown because of someone else?', reflection: 'We are shaped by every meaningful connection.' },
      { day: 6, prompt: 'What does healthy love look like to you now?', reflection: 'Your definition evolves as you do. That is a good thing.' },
      { day: 7, prompt: 'Who deserves to hear "thank you" from you this week?', reflection: 'Gratitude expressed is a bridge. Gratitude withheld is a wall.' },
    ],
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    description: 'Seven days of returning to the present moment',
    icon: '\u{1F9D8}',
    duration: 7,
    theme: '#00B4D8',
    completionBadge: 'path-completer',
    days: [
      { day: 1, prompt: 'What do you hear right now, beyond the obvious sounds?', reflection: 'Listening is the first act of presence.' },
      { day: 2, prompt: 'Describe a physical sensation you are feeling in this moment.', reflection: 'The body is always in the present, even when the mind is not.' },
      { day: 3, prompt: 'What did you eat today, and what did it actually taste like?', reflection: 'Most meals pass without being noticed. That is most of life.' },
      { day: 4, prompt: 'What thought keeps pulling you away from now?', reflection: 'You do not have to follow every thought. You can watch it pass.' },
      { day: 5, prompt: 'What is one thing you did today on autopilot that deserves attention?', reflection: 'Routine is not the enemy. Unconsciousness is.' },
      { day: 6, prompt: 'What emotion is present in your body right now? Where do you feel it?', reflection: 'Emotions live in the body first. The mind names them second.' },
      { day: 7, prompt: 'What does this exact moment contain that you might miss if you looked away?', reflection: 'This moment will never happen again. You chose to be here for it.' },
    ],
  },
  {
    id: 'emotional-processing',
    title: 'Emotional Processing',
    description: 'Ten days of learning the language of your feelings',
    icon: '\u{1F30A}',
    duration: 10,
    theme: '#6BCF9A',
    completionBadge: 'path-completer',
    days: [
      { day: 1, prompt: 'Name the strongest emotion you felt today. When did it arrive?', reflection: 'Recognition is the first step. You cannot process what you will not name.' },
      { day: 2, prompt: 'Where in your body does stress show up first?', reflection: 'Your body has been keeping score. It is time to read it.' },
      { day: 3, prompt: 'What emotion do you most often push away? What are you protecting?', reflection: 'Avoidance is a form of care, but it has a cost.' },
      { day: 4, prompt: 'Think of something that frustrated you recently. What need was underneath?', reflection: 'Anger is often grief in work clothes.' },
      { day: 5, prompt: 'What would you say to a friend feeling what you feel right now?', reflection: 'You already know how to be kind. Start with yourself.' },
      { day: 6, prompt: 'What emotion surprised you this week? What triggered it?', reflection: 'Surprise means something is changing beneath the surface.' },
      { day: 7, prompt: 'Is there a feeling you have outgrown but still carry out of habit?', reflection: 'Old feelings can linger like furniture in a room you have already left.' },
      { day: 8, prompt: 'What brings you relief when emotions feel too heavy?', reflection: 'Knowing your anchors before the storm is wisdom, not weakness.' },
      { day: 9, prompt: 'Write about a time you let yourself feel something fully. What happened after?', reflection: 'Feelings that are felt all the way through tend to leave peacefully.' },
      { day: 10, prompt: 'How has your relationship with your emotions changed over these ten days?', reflection: 'You are not your feelings, but you are someone who can hold them.' },
    ],
  },
  {
    id: 'creativity',
    title: 'Creative Spark',
    description: 'Seven days of seeing the world through a different lens',
    icon: '\u{1F3A8}',
    duration: 7,
    theme: '#FF6B6B',
    completionBadge: 'path-completer',
    days: [
      { day: 1, prompt: 'If your current mood were a weather pattern, what would the forecast be?', reflection: 'Metaphor is how the mind plays. Let it.' },
      { day: 2, prompt: 'Describe your morning routine as if a stranger were watching from another century.', reflection: 'Perspective is the simplest form of creativity.' },
      { day: 3, prompt: 'What is something you used to imagine as a child that you stopped imagining?', reflection: 'Imagination does not disappear. It just gets quieter.' },
      { day: 4, prompt: 'If you could redesign one thing about your daily environment, what would it be?', reflection: 'Creativity starts with noticing what could be different.' },
      { day: 5, prompt: 'Write the opening line of a story about someone who made a choice today that you did not.', reflection: 'Every path not taken is a story waiting to be told.' },
      { day: 6, prompt: 'What sound, smell, or texture unexpectedly moved you recently?', reflection: 'The senses are doors. Creativity walks through whichever one is open.' },
      { day: 7, prompt: 'If you could ask your future self one creative question, what would it be?', reflection: 'Curiosity is not a phase. It is who you are when you stop pretending otherwise.' },
    ],
  },
  {
    id: 'resilience',
    title: 'Building Resilience',
    description: 'Fourteen days of discovering the strength you already have',
    icon: '\u{1F3D4}',
    duration: 14,
    theme: '#A99EDB',
    completionBadge: 'path-completer',
    days: [
      { day: 1, prompt: 'What is one hard thing you got through that you once doubted you could?', reflection: 'You have already survived things you thought would break you.' },
      { day: 2, prompt: 'Who or what helped you last time things fell apart?', reflection: 'Resilience is not solo work. It is knowing who to lean on.' },
      { day: 3, prompt: 'What is a setback that turned out to be a redirection?', reflection: 'Not every closed door is a rejection. Some are rerouting.' },
      { day: 4, prompt: 'What belief about yourself has been tested and survived?', reflection: 'Tested beliefs are stronger than untested ones.' },
      { day: 5, prompt: 'What do you do when you feel like giving up? Does it help?', reflection: 'Noticing your patterns is the beginning of choosing them.' },
      { day: 6, prompt: 'What strength do others see in you that you sometimes doubt?', reflection: 'The things others admire are often the things you take for granted.' },
      { day: 7, prompt: 'Describe a moment when you chose to keep going. What made you stay?', reflection: 'The decision to continue is quiet. But it changes everything.' },
      { day: 8, prompt: 'What is one thing you have learned about yourself from failure?', reflection: 'Failure is not the opposite of success. It is part of the path.' },
      { day: 9, prompt: 'What does rest look like for you when you are recovering from difficulty?', reflection: 'Rest is not giving up. It is how resilience recharges.' },
      { day: 10, prompt: 'What small act of courage did you perform recently, even if nobody noticed?', reflection: 'Courage does not need an audience to count.' },
      { day: 11, prompt: 'What story about your past would you rewrite to be more fair to yourself?', reflection: 'You were doing the best you could with what you had.' },
      { day: 12, prompt: 'What challenge are you currently facing? What part of it can you control?', reflection: 'Focus on what you can shape. Release what you cannot.' },
      { day: 13, prompt: 'Imagine yourself one year from now, having grown through this. What does that person want you to know?', reflection: 'Your future self is cheering for you. Listen.' },
      { day: 14, prompt: 'Write one sentence of encouragement you will carry forward from these fourteen days.', reflection: 'You chose to show up for yourself, day after day. That is resilience.' },
    ],
  },
];

// Helper to get a path by ID
export const getPathById = (id: string): JournalingPath | undefined => {
  return JOURNALING_PATHS.find((p) => p.id === id);
};

// ============================================================================
// PATHS STORE
// ============================================================================

export const usePathsStore = create<PathsState>()(
  persist(
    (set, get) => ({
      activePath: null,
      completedPaths: [],

      startPath: (pathId: string) => {
        const today = getTodayDate();
        set({
          activePath: {
            pathId,
            startDate: today,
            currentDay: 1,
            completedDays: [],
            isComplete: false,
          },
        });
      },

      completeDay: (day: number) => {
        set((state) => {
          if (!state.activePath) return state;
          const completed = state.activePath.completedDays.includes(day)
            ? state.activePath.completedDays
            : [...state.activePath.completedDays, day];

          const path = getPathById(state.activePath.pathId);
          const isComplete = path ? completed.length >= path.duration : false;
          const nextDay = Math.min(day + 1, path?.duration ?? day);

          return {
            activePath: {
              ...state.activePath,
              completedDays: completed,
              currentDay: isComplete ? state.activePath.currentDay : nextDay,
              isComplete,
            },
          };
        });
      },

      completePath: () => {
        set((state) => {
          if (!state.activePath) return state;
          const pathId = state.activePath.pathId;
          return {
            activePath: null,
            completedPaths: state.completedPaths.includes(pathId)
              ? state.completedPaths
              : [...state.completedPaths, pathId],
          };
        });
      },

      abandonPath: () => {
        set({ activePath: null });
      },

      getActivePathPrompt: () => {
        const { activePath } = get();
        if (!activePath) return null;
        const path = getPathById(activePath.pathId);
        if (!path) return null;
        const dayData = path.days.find((d) => d.day === activePath.currentDay);
        return dayData?.prompt ?? null;
      },

      getCurrentDay: () => {
        const { activePath } = get();
        return activePath?.currentDay ?? 0;
      },

      isPathComplete: () => {
        const { activePath } = get();
        return activePath?.isComplete ?? false;
      },
    }),
    {
      name: 'journaling-paths-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
