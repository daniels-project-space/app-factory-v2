/**
 * Local calendar-day helpers.
 *
 * The flame's whole thesis lives and dies on "what day is it" — streak and
 * reconciliation logic must key off the device's local calendar day, never
 * UTC, or a user near a day boundary sees their flame flicker for the wrong
 * reason.
 */

/** `YYYY-MM-DD` for the device's local calendar day (not UTC). */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Whole calendar days between two `YYYY-MM-DD` keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = Date.UTC(ay, am - 1, ad);
  const end = Date.UTC(by, bm - 1, bd);
  return Math.round((end - start) / 86_400_000);
}

/** The `YYYY-MM-DD` key `n` days before `key`. */
export function keyMinusDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d - n);
  return dateKey(date);
}

/** Monday-first week (Mon..Sun) containing `key`. */
export function weekKeys(key: string): string[] {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = Sunday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(y, m - 1, d + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return dateKey(day);
  });
}
