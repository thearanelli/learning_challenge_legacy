// Token and deadline utilities for stage management.
// Edge Functions import from here directly.
// Vercel API routes inline isTokenValid — they cannot import this file.

export function generateToken(durationDays: number | null): {
  access_token: string;
  stage_deadline_at: string | null;
} {
  const token = crypto.randomUUID();
  let deadline: string | null = null;
  if (durationDays) {
    deadline = endOfDayEastern(new Date(Date.now() + durationDays * 86400000)).toISOString();
  }
  return { access_token: token, stage_deadline_at: deadline };
}

// Returns the instant of 23:59:59 America/New_York on the given date's
// New York calendar day. Handles EST/EDT automatically via Intl.
function endOfDayEastern(d: Date): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  const [y, m, day] = ymd.split('-').map(Number);
  // Guess EST (UTC-5): 23:59:59 ET = 04:59:59 UTC the next day
  const guess = new Date(Date.UTC(y, m - 1, day + 1, 4, 59, 59));
  const hourInNY = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', hour12: false,
  }).format(guess));
  // During EDT (UTC-4) the guess lands at 00:59 ET next day — pull back one hour
  if (hourInNY !== 23) guess.setUTCHours(guess.getUTCHours() - 1);
  return guess;
}

export function isTokenValid(
  record: { access_token: string | null; stage_deadline_at: string | null },
  token: string
): boolean {
  if (!record.access_token || record.access_token !== token) return false;
  if (!record.stage_deadline_at) return false;
  return new Date(record.stage_deadline_at).getTime() + 86400000 > Date.now();
}
