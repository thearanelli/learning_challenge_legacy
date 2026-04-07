// Token and deadline utilities for stage management.
// Edge Functions import from here directly.
// Vercel API routes inline isTokenValid — they cannot import this file.

export function generateToken(durationDays: number | null): {
  access_token: string;
  stage_deadline_at: string | null;
} {
  const token = crypto.randomUUID();
  const deadline = durationDays
    ? new Date(Date.now() + durationDays * 86400000).toISOString()
    : null;
  return { access_token: token, stage_deadline_at: deadline };
}

export function isTokenValid(
  record: { access_token: string | null; stage_deadline_at: string | null },
  token: string
): boolean {
  if (!record.access_token || record.access_token !== token) return false;
  if (!record.stage_deadline_at) return false;
  return new Date(record.stage_deadline_at) > new Date();
}
