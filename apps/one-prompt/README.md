# One Thought a Day

A minimal micro-journaling app that prompts you once per day to write exactly one sentence. Focused on consistency, calm, and reflection — no overwhelm.

## Features

### Free Features
- **Daily Prompt System**: Rotating prompts that inspire reflection (Gentle, Neutral, Deep styles)
- **Prompt Selection**: Double-tap the prompt to shuffle through 5 different options for the day
- **Single Text Input**: Limited to 150 characters for focused thoughts
- **Time Capsule**: Send thoughts to your future self with configurable reveal delays (tomorrow, next week, next month, or instant)
- **Entry Locking**: Once submitted, entries cannot be edited
- **Streak Tracking**: Current and longest streak displayed
- **Calendar View**: Visual overview with dots for completed days - swipe down on the main screen to reveal the full calendar, history, and weekly AI insights panel seamlessly from the top
- **Settings Panel**: Full settings accessible by swiping left on the main screen - slides in from the right
- **History Screen**: Browse past entries with glassmorphism cards (sealed entries show countdown)
- **6 Color Themes**: Classic Blue, Mint Calm, Lavender Focus, Sunset Warm, Mono Minimal, Midnight Blue
- **Light & Dark Mode**: System, Light, or Dark appearance modes
- **Particle Background**: Subtle floating star particles effect (toggleable)
- **Particle Pulse Effect**: Radiating particles burst when sending thoughts
- **Haptic Feedback**: Configurable subtle vibrations on toggles and interactions
- **Daily Reminders**: Customizable notification time with evening nudge option
- **Widget Settings**: Configure home screen widget display

### Premium Features (One Thought+)
- **Weekly AI Reflections**: AI-powered insights from your weekly entries with theme detection and mood analysis (uses OpenAI GPT-5.2)
- **Philosopher Guide**: Choose from 5 philosophers (Nietzsche, Marcus Aurelius, Plato, Schiller, Albert Camus) to guide your AI insights with their unique voice and perspective - they challenge you and help you grow
- **Photo Prompts Mode**: When enabled, replaces the text writing screen entirely with a daily photo challenge - capture moments that match the daily photo prompt and save them to your journal as time capsules. Photo prompts have their own category-based prompts (40 per category, 280 total) separate from text prompts.
- **Daily Mood Tracking**: Track your mood alongside each journal entry
- **Custom Prompts**: Create and use your own personal daily prompts (separate lists for text mode and photo mode)
- **Prompt Categories**: Choose from 7 categories (Gratitude, Self-Discovery, Relationships, Growth, Mindfulness, Creativity, Reflection) - each category has 200 text prompts AND 40 photo-specific prompts
- **Fireplace Glow**: Calm blue flame effect with rising ember particles
- **Background Music**: Ambient looping background music that plays while using the app (auto-pauses when app goes to background)
- **PDF Export with Insights**: Beautiful PDF export with stats, themes, and all entries

## Tech Stack

- Expo SDK 53 / React Native 0.76.7
- NativeWind (Tailwind CSS) for styling
- Zustand for state management with Secure Storage for sensitive data
- React Query for server/async state management
- React Native Reanimated for smooth animations
- Expo Blur for glassmorphism effects
- Expo Print & Sharing for PDF export
- OpenAI API (GPT-4o-mini) for AI reflections
- RevenueCat for subscription management
- Zod for API response validation
- DM Sans typography

## Screens

1. **Onboarding**: 7-screen calm intro flow (Welcome, Terms & Conditions Accept, How It Works, Theme Selection, Time Capsule, Daily Reminder, Sign In)
2. **Home**: Daily prompt with text input OR photo-only mode (when Photo Prompts is enabled), streak badge, Energy Bubble send animation, sealed state display
3. **History**: Calendar view, stats (current/longest streak), weekly reflection button, recent entries list with photo indicators (with sealed/revealed states)
4. **Entry Detail**: View individual past entries with prompt, thought, and photo if captured (or sealed countdown if not revealed yet)
5. **Settings**: Premium status, Account, Appearance, Notifications, Widget, Preferences, Time Capsule, Data management, Legal & About, Testing tools
6. **Paywall**: Premium subscription purchase screen with monthly/yearly options, clean feature checklist
7. **Weekly Reflection**: AI-powered weekly insights (premium only) with refresh capability
8. **Legal**: Terms of Service, Privacy Policy, and Disclaimer screens
9. **Custom Prompts**: Manage custom prompts that get added to the daily rotation (premium only)
10. **Prompt Categories**: Select from 7 prompt categories with 200 prompts each (premium only)
11. **Photo Prompt**: Full-screen camera to capture daily photo challenges (premium only)
12. **Philosopher Guide**: Select a philosopher (Nietzsche, Aurelius, Plato, Schiller, Camus) to guide AI insights (premium only)

## Onboarding Flow

A calm, 30-45 second onboarding experience for first-time users:

1. **Welcome**: App name, tagline, and emotional intro
2. **Terms & Conditions**: Accept Terms of Service and Privacy Policy with checkboxes (required before continuing)
3. **Your Goals**: 9-tile selection screen to choose up to 3 journaling goals (Self-Awareness, Gratitude, Stress Relief, Creativity, Goal Tracking, Emotional Processing, Mindfulness, Personal Growth, Memory Keeping) - these personalize AI insights
4. **Choose Your Look**: Select from 6 color themes with live preview
5. **Time Capsule**: Choose when thoughts become readable (Tomorrow, Next week, Next month, or Right away)
6. **Daily Reminder**: Set up notification time with permission request
7. **Sign In** (optional): Apple/Google sign-in for backup & sync

Key principles:
- No walls of text or forms
- Haptic feedback on every action
- Respects Reduce Motion accessibility setting
- Never repeats unless app is reset
- Smooth fade and slide animations

## Settings

### One Thought+ (Premium)
- View subscription status
- Upgrade to premium
- Restore purchases

### Account
- Sign in with Apple (iOS)
- Sign in with Google
- Used for backup & sync only

### Appearance
- 6 color themes with live preview
- System/Light/Dark mode toggle
- Particle background toggle (subtle floating stars)
- **Pro Effects** (premium only):
  - Fireplace glow - blue flames with rising embers
  - Background music - ambient looping music while using the app
  - Neon effect - animated shifting gradient background with neon edge lines on the main card (cyan/magenta glow)
  - Photo prompts mode - when enabled, replaces text writing with daily photo challenges
  - Mood tracking - track your mood with each entry (can be toggled off)
  - Custom prompts - opens dedicated page to manage your own prompts
  - Prompt categories - choose from 7 themed prompt categories
  - Philosopher guide - choose a philosopher to guide your AI insights

### Notifications
Notification behavior adapts based on Time Capsule settings:

**Instant Mode (Right away):**
- Daily reminder toggle with time picker
- Evening reminder option (gentle nudge if not completed)
- Traditional daily push notifications to remind you to journal

**Time Capsule Mode (Tomorrow/Next week/Next month):**
- Daily reminders are replaced with reveal notifications
- When you submit an entry, a notification is scheduled for when it becomes readable
- Example: "Your thought has been revealed" notification when your entry unlocks
- Evening reminders are disabled in time capsule mode

### Widget
- Show/hide today's prompt
- Show/hide streak count
- Auto-matches selected theme

### Preferences
- Prompt style (Gentle/Neutral/Deep)
- Prompt shuffle toggle
- Haptic feedback toggle

### Time Capsule
- Reveal delay selection: Tomorrow (24h), Next week (7 days), Next month (30 days), or Right away
- Show/hide countdown labels on sealed entries

### Data
- Cloud sync toggle
- **Export PDF with insights**: Beautiful PDF with stats, themes, and all entries
- Delete all data

### Legal & About
- Terms of Service
- Privacy Policy
- Disclaimer
- App permissions information (Notifications, Storage)
- App version display

### Testing
- **Load test data**: Fills the past week with sample journal entries
- **Reset purchases**: Resets local premium status for testing
- **Replay onboarding**: Run the onboarding flow again without losing data
- **Reset app**: Clears all data and replays onboarding

## PDF Export

The PDF export includes:
- Journal header with export date
- **Insights section**: Total entries, current streak, longest streak, journaling days
- **Theme detection**: Automatically identifies themes (Gratitude, Growth, Relationships, etc.)
- **All entries**: Chronologically sorted with date, prompt, and thought

## Time Capsule

The Time Capsule feature transforms journaling into "sending to your future self":

### How It Works
1. Write your daily thought as usual
2. Tap the send button to trigger the Energy Bubble animation
3. Your thought gets sealed with a reveal timestamp
4. It becomes readable after the configured delay period

### Reveal Delays
- **Tomorrow**: Entry reveals after 24 hours
- **Next week**: Entry reveals after 7 days
- **Next month**: Entry reveals after 30 days
- **Right away**: No waiting period (instant reveal)

### Energy Bubble Send Animation
When you submit an entry, a beautiful 2-second animation plays:
1. Card compresses with haptic feedback
2. Energy bubble appears and starts charging
3. Bubble fills with your theme's accent color
4. Gentle pulse effect while charging
5. **Particle pulse**: Particles radiate outward from center
6. Bubble lifts and dissolves with shimmer
7. "Sent" confirmation with lock icon appears
8. Shows when your thought will be available

### Sealed Entries
- Sealed entries appear in History with a lock icon
- Content is hidden, showing "Sealed — available in X days"
- Entry detail screen shows sealed state with countdown
- "Revealed" badge appears when entries become readable
- All respects the "Show countdown labels" setting

## Weekly Reflection (AI-Powered)

When OpenAI API is configured, the Weekly Reflection uses GPT-4o-mini to:
- Generate personalized summaries referencing specific entries
- Detect the primary theme of the week
- Analyze overall emotional mood
- Provide a personalized encouragement message

**Note**: When using AI reflections, your journal entries are sent to OpenAI for processing. See Privacy Policy for details.

### Photo Mode Analysis
When the user is in photo prompt mode (no text entries), the AI uses GPT-4o vision to:
- Analyze the captured photos from the week
- Identify visual themes and patterns across images
- Provide photo-specific insights about what the user noticed or valued
- The mood chart is hidden since mood cannot be analyzed from photos
- A dedicated "Photo Insights" card appears instead

### Mood Analytics Chart
The Mood tile is now expandable! Tap it to reveal:
- **Bar chart visualization**: Day-by-day mood progression for the week
- **Color-coded bars**: Green (high), lime, yellow, orange, red (low)
- **Week navigation**: Swipe left/right or tap arrows to view previous weeks' mood history
- **Average mood score**: Weekly average on a 1-5 scale
- **Daily breakdown**: Each day's mood label and score
- **Enhanced sentiment analysis**: Advanced algorithm that accurately differentiates between mood levels 1-5 based on:
  - Weighted sentiment words across 9 emotional categories (ecstatic to crisis)
  - Intensity modifiers (very, extremely, slightly, etc.)
  - Negation detection (not happy → negative)
  - Phrase patterns for specific emotional states
  - Contextual signals like exclamation marks
- **Toggle in Settings**: Can be turned on/off via Settings > Appearance > Pro Effects > Mood tracking
- **Note**: Mood chart is hidden when user only has photo entries (no text to analyze)

Falls back to intelligent keyword-based analysis if API is unavailable.

## Fireplace Glow (Premium)

A premium visual effect that adds a calming ambiance to the home screen:

### Visual Elements
- **Blue flame gradient**: Subtle gradient at the bottom of the screen
- **Flickering flames**: Multiple flame elements with randomized flicker animations
- **Rising embers**: 15 ember particles that rise slowly from the bottom
- Embers sway gently side-to-side as they rise
- Each ember has a soft glow effect matching the blue theme

### Animation Details
- Embers rise over 10-18 seconds for a calm, gentle pace
- Flames flicker at varied intervals for natural movement
- All animations use eased sine curves for smooth motion
- Embers fade in at bottom, stay visible during rise, fade out at top

### Toggle
- Located in Settings > Appearance > Pro Effects
- Requires premium subscription
- Non-premium users see a lock icon and are redirected to paywall

## Neon Effect (Premium)

A premium visual effect that adds a vibrant cyberpunk-style ambiance with animated neon elements:

### Visual Elements
- **Shifting dark gradient background**: Slowly animating layers of cyan, magenta, and purple gradients
- **Animated neon edge lines**: Two lines (cyan and magenta) that travel along opposite edges of the main prompt card
- **Glow effects**: Subtle neon glow on the traveling edge lines

### Animation Details
- Background gradient layers shift and rotate slowly over 15-20 second cycles
- Edge lines travel around the card perimeter in 8 seconds, one clockwise and one counter-clockwise
- Lines have soft glow that pulses subtly every 2 seconds
- All animations use smooth easing for a fluid, hypnotic effect

### Toggle
- Located in Settings > Appearance > Pro Effects > Neon effect
- Requires premium subscription
- Non-premium users see a lock icon and are redirected to paywall

## Custom Prompts (Premium)

A dedicated settings page where premium users can create their own daily prompts that get added to the rotation.

### Features
- **Add new prompts**: Write your own reflective questions (min 10 characters, max 200)
- **Inspiration examples**: 10 built-in example prompts to use or modify
- **Manage prompts**: View and delete your saved prompts
- **Tips section**: Guidance on writing effective prompts

### How It Works
- Custom prompts are combined with the 30 default prompts
- The daily prompt is determined by the date, so the same prompt shows all day
- More custom prompts = higher chance your prompts appear
- Prompts persist across app sessions

### Access
- Navigate via Settings > Appearance > Pro Effects > Custom prompts
- Requires premium subscription
- Non-premium users are redirected to paywall

## Prompt Categories (Premium)

A premium feature allowing users to select from 7 themed prompt categories, each containing 50 refined, thoughtful prompts (350 total prompts).

### Categories
1. **Gratitude** - Cultivate appreciation for life's blessings (50 refined prompts)
2. **Self-Discovery** - Explore your inner world and identity (50 refined prompts)
3. **Relationships** - Nurture connections with others (50 refined prompts)
4. **Growth** - Embrace learning and personal development (50 refined prompts)
5. **Mindfulness** - Be present in the moment (50 refined prompts)
6. **Creativity** - Spark imagination and innovation (50 refined prompts)
7. **Reflection** - Look back and learn from experience (50 refined prompts)

### Features
- **Multi-select**: Choose any combination of categories
- **Select All/Clear All**: Quickly toggle all categories
- **Stats display**: See how many categories and prompts are active
- **Tips section**: Explains how the system works

### How It Works
- Select one or more categories that resonate with you
- Your daily prompt will come from your selected categories
- If no categories are selected, all 350 prompts are available
- Custom prompts are always included in the rotation
- The daily prompt is deterministic based on the date

### Access
- Navigate via Settings > Appearance > Pro Effects > Prompt categories
- Requires premium subscription
- Non-premium users are redirected to paywall

## Philosopher Guide (Premium)

A premium feature allowing users to select a philosophical mentor who shapes the voice and perspective of their Weekly AI Reflections.

### Philosophers

1. **Default** - A gentle, supportive companion with warm encouragement
2. **Nietzsche** (The Challenger) - Bold and transformative, challenges you to overcome and create your own values
3. **Marcus Aurelius** (The Stoic Emperor) - Calm and disciplined, focuses on what you can control
4. **Plato** (The Seeker of Truth) - Questioning and illuminating, guides through philosophical inquiry
5. **Schiller** (The Aesthetic Spirit) - Artistic and harmonious, sees life as a work of art
6. **Albert Camus** (The Absurd Hero) - Rebellious and life-affirming, finds joy despite meaninglessness

### How It Works
- Select a philosopher from the dedicated settings page
- Your chosen philosopher speaks through your Weekly AI Reflection
- Each philosopher offers unique perspectives on your entries
- They challenge your thinking and encourage growth in different ways

### Access
- Navigate via Settings > Appearance > Pro Effects > Philosopher guide
- Requires premium subscription
- Non-premium users are redirected to paywall

## Journaling Goals

Users select up to 3 journaling goals during onboarding to personalize their AI insights.

### Available Goals

1. **Self-Awareness** - Understand myself better
2. **Gratitude** - Appreciate the good things
3. **Stress Relief** - Process and release stress
4. **Creativity** - Spark new ideas
5. **Goal Tracking** - Stay focused on my goals
6. **Emotional Processing** - Work through feelings
7. **Mindfulness** - Be present in the moment
8. **Personal Growth** - Become a better person
9. **Memory Keeping** - Preserve special moments

### How It Works
- Selected during onboarding in a beautiful 3x3 tile grid
- Goals are included in AI prompts for Weekly Reflections
- AI tailors insights and encouragement to help achieve specific goals
- Can select 1-3 goals (at least 1 required)

## Subscription (RevenueCat)

### Pricing
- Monthly: £2.99/month
- Yearly: £19.99/year (best value)

### Entitlements
- `premium`: Unlocks all premium features

### Products
- Test Store products configured for development testing
- App Store and Play Store products ready for production

## Design

- Apple-style minimalism with iOS Human Interface Guidelines
- Premium glassmorphism cards with inner highlights and depth shadows
- **Ultra-dark glass aesthetic**: Very low blur intensity (18 dark / 45 light) with highly transparent backgrounds (`rgba(10,10,12,0.75)`) allowing starlight/particle background to show through
- **Side glow accents**: Subtle blue/purple edge glows (`rgba(120,180,255,0.06)` and `rgba(180,120,255,0.06)`) for modern depth
- **Consistent glass styling**: All cards across Settings, Weekly Reflection, and AI Insights use the same modern dark glass treatment
- Custom SVG icons with radial gradients and glow effects
- Enhanced buttons with press animations and accent glow
- Calm, neutral color palette with 6 theme options
- Frosted glass cards with blur and subtle borders
- Smooth fade and slide transitions
- DM Sans typography
- Refined stat tiles with icon containers
- Modern segmented controls with shadow states

## UX Principles

- No feeds, no likes, no social features
- One screen, one action per day
- Entries lock after submission to encourage authentic expression

## App Store Readiness

### Legal Documents
All required legal documents are included and accessible:
- **Terms of Service**: Full terms available in-app
- **Privacy Policy**: Comprehensive privacy policy with GDPR/CCPA compliance
- **Disclaimer**: Mental health disclaimer and liability information

### Permissions Used
- **Notifications**: Optional - for daily reminders (explicitly requested)
- **Storage**: Implicit - for saving journal entries locally via AsyncStorage

### Data Privacy & Security
- Journal entries stored locally on device using AsyncStorage (plaintext; not encrypted at rest)
- Premium status stored securely using Expo SecureStore
- No server-side storage of personal content
- Optional cloud sync with encryption
- No tracking or analytics of journal content
- User can export all data as PDF
- User can delete all data at any time
- API responses validated using Zod schema validation
- Input sanitization for custom prompts (max 500 chars, max 50 prompts)
- Testing features hidden in production builds
- Console logs gated to development mode only

### AI Data Processing
- AI reflections feature sends journal content to OpenAI
- Photos may be analyzed using GPT-4o vision model
- Data transmission uses HTTPS encryption
- Users consent to this when using AI features
- Full disclosure in Privacy Policy

### Subscription
- Clear pricing displayed before purchase
- Auto-renewal terms disclosed
- Restore purchases functionality
- Managed through RevenueCat/App Store
