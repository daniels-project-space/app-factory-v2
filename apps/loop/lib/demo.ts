import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Demo mode: when true, screens seed realistic fixture data on first run
 * so the app never launches into a wall of empty states. The factory
 * flips this off (or removes seeds) for production builds.
 */
export const DEMO_MODE = true;

const SEED_PREFIX = 'demo:seed:';

/**
 * Runs `seedFn` exactly once per storage key and persists the result.
 * Subsequent calls return the stored value, so user edits made on top of
 * seeded data survive restarts (store the evolving data under the same
 * key in your own store; this helper only guards the initial fixture).
 *
 * ```ts
 * const items = await seedOnce('activities', () => buildFixtures());
 * ```
 */
export async function seedOnce<T>(key: string, seedFn: () => T | Promise<T>): Promise<T> {
  const storageKey = `${SEED_PREFIX}${key}`;
  try {
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing !== null) {
      return JSON.parse(existing) as T;
    }
  } catch {
    // Corrupt or unreadable seed — fall through and re-seed.
  }
  const seeded = await seedFn();
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(seeded));
  } catch {
    // Persistence is best-effort; the seed is still usable in memory.
  }
  return seeded;
}

/** Clears a single seed (or all seeds) so `seedOnce` runs again. */
export async function resetSeed(key?: string): Promise<void> {
  if (key) {
    await AsyncStorage.removeItem(`${SEED_PREFIX}${key}`);
    return;
  }
  const all = await AsyncStorage.getAllKeys();
  const seedKeys = all.filter((k) => k.startsWith(SEED_PREFIX));
  if (seedKeys.length > 0) {
    await AsyncStorage.multiRemove(seedKeys);
  }
}
