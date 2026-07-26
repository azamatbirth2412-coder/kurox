// ── Competition time helpers ────────────────────────────────────────────────
// The weekly leaderboard resets Mondays 00:00 MSK and daily quests reset
// 00:00 MSK. MSK is a fixed UTC+3 offset (no DST since 2014), so we can shift
// the wall clock by a constant and never worry about the server's own timezone.

const MSK_OFFSET_MIN = 180; // UTC+3
const MSK_OFFSET_MS = MSK_OFFSET_MIN * 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** A Date whose UTC fields read as the current MSK wall-clock time. */
function toMskClock(now: Date): Date {
  return new Date(now.getTime() + MSK_OFFSET_MS);
}

/**
 * The UTC instant of Monday 00:00 MSK for the week containing `now`.
 * Used as the stable `weekStart` key on WeeklyScore rows.
 */
export function weekStart(now: Date = new Date()): Date {
  const msk = toMskClock(now);
  const dow = msk.getUTCDay();          // 0=Sun … 1=Mon … 6=Sat
  const sinceMonday = (dow + 6) % 7;    // days since Monday
  const mondayMidnightMsk = Date.UTC(
    msk.getUTCFullYear(),
    msk.getUTCMonth(),
    msk.getUTCDate() - sinceMonday,
  );
  return new Date(mondayMidnightMsk - MSK_OFFSET_MS);
}

/** The UTC instant when the current competition week ends (next Monday 00:00 MSK). */
export function weekEnd(now: Date = new Date()): Date {
  return new Date(weekStart(now).getTime() + WEEK_MS);
}

/** The previous week's start (for awarding the just-closed week's champion). */
export function previousWeekStart(now: Date = new Date()): Date {
  return new Date(weekStart(now).getTime() - WEEK_MS);
}

/**
 * The UTC instant of 00:00 MSK for the day containing `now`.
 * Used as the daily bucket key on UserQuestProgress rows.
 */
export function dayBucket(now: Date = new Date()): Date {
  const msk = toMskClock(now);
  const midnightMsk = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate());
  return new Date(midnightMsk - MSK_OFFSET_MS);
}

/** The UTC instant when the current MSK day ends (next 00:00 MSK). */
export function dayEnd(now: Date = new Date()): Date {
  return new Date(dayBucket(now).getTime() + DAY_MS);
}

/** True when two day buckets are exactly one MSK day apart (for streak logic). */
export function isConsecutiveDay(earlier: Date, later: Date): boolean {
  return later.getTime() - earlier.getTime() === DAY_MS;
}
