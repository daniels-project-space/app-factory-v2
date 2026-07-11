import { getTodayDate } from './state/journal-store';

// ============================================================================
// "THOUGHTS FROM OTHERS" — 50 anonymous, pre-written journal-style entries
// Real-feeling one-sentence reflections that inspire and create atmosphere.
// One is shown per day on the main screen.
// ============================================================================

export const SHARED_THOUGHTS: string[] = [
  "Today I realized I've been carrying resentment I don't need anymore.",
  "My daughter said I was her hero. I cried in the kitchen.",
  "I finally said no to something that didn't serve me.",
  "For the first time in months, I sat in silence and it felt like enough.",
  "I forgave someone today who never apologized. It was for me, not them.",
  "The sunset stopped me mid-step. I just stood there, breathing.",
  "I told my best friend what I've been too proud to say. They already knew.",
  "I ate breakfast slowly this morning. No phone. Just the sound of birds.",
  "Someone smiled at me on the bus and I remembered that strangers can be kind.",
  "I reread a letter my grandmother wrote me. I wish I'd asked her more questions.",
  "I chose sleep over scrolling tonight. Small victory.",
  "I walked through my old neighborhood and saw how much I've changed.",
  "My therapist said something today that I'll carry for years.",
  "I noticed I've stopped comparing my life to everyone else's. When did that happen?",
  "I finished the book I started six months ago. Felt like closing a chapter of my own life.",
  "The rain felt personal today. Like the sky was washing something away for me.",
  "I told someone I was struggling. They didn't try to fix it. They just listened.",
  "I planted something today. It feels like planting hope.",
  "I caught myself laughing alone in the car. It's been a while since I've done that.",
  "I deleted a draft message that would have started a fight. Growth.",
  "My child fell asleep on my chest. I stayed still even though my arm was numb.",
  "I looked in the mirror today and didn't criticize what I saw. Just looked.",
  "Someone at work noticed I was quiet and checked in. That mattered more than they know.",
  "I went for a run not to lose weight but because my mind needed the space.",
  "I cooked my mother's recipe and the kitchen smelled like childhood.",
  "Today I chose peace over being right. It was harder than I expected.",
  "I woke up grateful. No particular reason. Just grateful.",
  "I wrote a letter I'll never send. It still helped.",
  "The dog leaned against my leg while I worked. Quiet companionship.",
  "I admitted I was wrong about something I've defended for years.",
  "I drove home the long way. The fields were golden.",
  "My friend is going through something hard. I just sat with them. No advice. Just presence.",
  "I noticed a tree I pass every day. It's been blooming and I never looked up.",
  "I set a boundary today and the world didn't end.",
  "I received a compliment and let myself believe it instead of deflecting.",
  "Today I realized the version of myself I was trying to become already exists.",
  "I danced in my living room like nobody was watching. Because nobody was.",
  "I said 'I love you' first. It was terrifying and worth it.",
  "I spent the afternoon doing nothing and didn't feel guilty about it.",
  "I realized that healing isn't linear when I had a bad day after a good week.",
  "Someone I haven't spoken to in years reached out. It felt like a sign.",
  "I journaled for the first time. I didn't know I had so much inside me.",
  "The barista remembered my name. Small things build a life worth living.",
  "I let myself cry today. Not out of sadness, but out of relief.",
  "I watched my partner sleep and felt the kind of peace that doesn't need words.",
  "I picked up a hobby I abandoned years ago. My hands remembered.",
  "I said goodbye to a chapter that was beautiful but over.",
  "Today I learned that rest is not the same as quitting.",
  "I looked at old photos and realized how brave I was, even when I felt afraid.",
  "I'm learning that being gentle with myself is not the same as being soft on myself.",
];

/**
 * Get today's shared thought. Deterministic based on the date so it stays
 * consistent if the user opens the app multiple times in a day.
 */
export function getTodaySharedThought(): string {
  const today = getTodayDate();
  const dateNum = parseInt(today.replace(/-/g, ''), 10);
  // Use a prime multiplier for a less predictable feeling rotation
  const index = (dateNum * 7) % SHARED_THOUGHTS.length;
  return SHARED_THOUGHTS[index];
}

/**
 * Get a shared thought for a specific date.
 */
export function getSharedThoughtForDate(date: string): string {
  const dateNum = parseInt(date.replace(/-/g, ''), 10);
  const index = (dateNum * 7) % SHARED_THOUGHTS.length;
  return SHARED_THOUGHTS[index];
}
