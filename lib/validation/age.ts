/**
 * Age computation for the 18+ onboarding gate (TASK-ONBOARD-2).
 *
 * Day-level correct: someone 17 years 364 days old is UNDER 18. No date is ever
 * hardcoded — the caller passes `now` (typically `new Date()`), so the result is
 * always relative to the real current date.
 */
export const ADULT_AGE = 18;

/**
 * Whole years from `dateOfBirth` ("YYYY-MM-DD") to `now`.
 *
 * The DOB string is parsed into LOCAL date parts rather than via `new Date(str)`,
 * which would parse as UTC midnight and can shift the day across time zones.
 * Returns -1 for an unparseable string so callers never treat garbage as adult.
 */
export function calculateAge(dateOfBirth: string, now: Date): number {
  const parts = dateOfBirth.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return -1;
  }
  const [year, month, day] = parts;

  let age = now.getFullYear() - year;
  // Months are 0-indexed on Date; the DOB month is 1-indexed.
  const monthDiff = now.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age -= 1; // birthday hasn't occurred yet this year
  }
  return age;
}

/** True when the person is at least `ADULT_AGE` on `now`'s date. */
export function isAdult(dateOfBirth: string, now: Date): boolean {
  return calculateAge(dateOfBirth, now) >= ADULT_AGE;
}
