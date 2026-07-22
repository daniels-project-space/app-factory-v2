# OnePrompt

One thought a day, sealed for later. OnePrompt is a micro-journal with daily prompts, time capsules, photo journaling, mood tracking, and optional cloud sync.

## Weekly reflections

Premium members can open a weekly reflection with a summary, theme, mood, encouragement, and photo count. The reflection engine is deterministic and runs entirely on the device:

- Journal text, entry dates, selected goals, and selected philosopher guide are used locally.
- Text-only, photo-only, mixed, and empty weeks all produce a valid result.
- Photo reflections count recorded photos; they do not inspect image content.
- Refresh selects another curated local variant. Results are cached with an engine version and invalidated when inputs change.
- No journal content is sent to a reflection provider.

## Premium features

One Thought+ includes weekly reflections, philosopher-guide variants, photo journaling, mood tracking, custom prompts, visual themes, ambient music, and PDF export. Subscription status is managed through RevenueCat.

## Data and privacy

Entries remain on-device unless a user signs in and enables optional cloud sync. Weekly reflections remain on-device whether or not cloud sync is enabled. See the in-app Privacy Policy for the complete current disclosure.

## Development

```sh
npm run typecheck
npm run lint
npx expo export --platform web
```

The app is an Expo project. Use `npm run web` for local browser development.
