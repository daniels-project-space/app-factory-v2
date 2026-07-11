import AsyncStorage from '@react-native-async-storage/async-storage';
import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist, type PersistOptions } from 'zustand/middleware';

/**
 * Zustand + AsyncStorage persistence helper.
 *
 * AsyncStorage is used (not MMKV) because it works on iOS, Android AND
 * react-native-web — web export is a hard requirement for this template.
 *
 * Usage:
 * ```ts
 * interface CounterState { count: number; increment: () => void }
 * export const useCounter = createPersistedStore<CounterState>('counter', (set) => ({
 *   count: 0,
 *   increment: () => set((s) => ({ count: s.count + 1 })),
 * }));
 * ```
 *
 * Persistence is async: gate anything that must not flash a default value
 * on a `hasHydrated` flag set via the `onRehydrateStorage` option
 * (see store/settings.ts for the pattern).
 */

const STORAGE_PREFIX = 'app:';

export function createPersistedStore<T, Persisted = T>(
  name: string,
  initializer: StateCreator<T, [['zustand/persist', unknown]], []>,
  options?: Omit<PersistOptions<T, Persisted>, 'name' | 'storage'>,
) {
  return create<T>()(
    persist(initializer, {
      name: `${STORAGE_PREFIX}${name}`,
      storage: createJSONStorage(() => AsyncStorage),
      ...options,
    }),
  );
}
