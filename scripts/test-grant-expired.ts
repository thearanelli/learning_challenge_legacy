#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for grant_pending → grant_expired removal via daily-scheduler.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     deno run --allow-net --allow-env scripts/test-grant-expired.ts
//
// What it does:
//   1. Finds the most recent grant_pending youth
//   2. Backdates stage_entered_at by 25 minutes so test_mode cutoff (21 min) is met
//   3. POSTs to daily-scheduler with { test_mode: true }
//   4. Waits 5 seconds, then verifies youth.status = grant_expired
//   5. Verifies no 'removed' comms_log entry exists for this youth
//   6. Verifies youth record is not status = removed
//   7. Prompts before cleanup
//   8. Cleanup: resets status to grant_pending, restores original stage_entered_at
//
// WARNING: test_mode POSTs the full scheduler. Other records past their
// (now compressed) deadlines may also advance. Use in a dev/test environment.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../supabase/functions/_shared/config.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const SCHEDULER_URL = `${SUPABASE_URL}/functions/v1/daily-scheduler`;

function log(level: 'INFO' | 'PASS' | 'FAIL', msg: string) {
  const prefix = level === 'PASS' ? '\x1b[32m✓\x1b[0m'
               : level === 'FAIL' ? '\x1b[31m✗\x1b[0m'
               : '  ';
  console.log(`${prefix} ${msg}`);
}

function check(label: string, pass: boolean, detail?: string) {
  if (pass) {
    log('PASS', detail ? `${label} — ${detail}` : label);
  } else {
    log('FAIL', detail ? `${label} — ${detail}` : label);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function prompt(msg: string): Promise<string> {
  const buf = new Uint8Array(1024);
  await Deno.stdout.write(new TextEncoder().encode(msg));
  const n = await Deno.stdin.read(buf);
  return new TextDecoder().decode(buf.subarray(0, n ?? 0)).trim();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    log('FAIL', 'SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_ANON_KEY must be set');
    Deno.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Step 1: Find most recent grant_pending youth ────────────────────────────
  console.log('\n── SETUP ──────────────────────────────────────────────────────');

  log('INFO', `Looking for most recent ${config.STATUS.GRANT_PENDING} youth...`);

  const { data: youth, error: findErr } = await supabase
    .from('youth')
    .select('id, first_name, last_name, status, stage_entered_at')
    .eq('status', config.STATUS.GRANT_PENDING)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single();

  if (findErr || !youth) {
    log('INFO', `No ${config.STATUS.GRANT_PENDING} youth found. Run test-orientation.ts first.`);
    Deno.exit(0);
  }

  const youthId       = youth.id;
  const origEnteredAt = youth.stage_entered_at;
  log('PASS', `Found youth ${youthId} — ${youth.first_name} ${youth.last_name}`);
  log('INFO', `Original stage_entered_at: ${origEnteredAt}`);

  // ── Step 2: Backdate stage_entered_at so test_mode cutoff is met ────────────
  // In test_mode: 1 minute = 1 day. deadline_days = 21 → cutoff = 21 minutes ago.
  // Backdate to 25 minutes ago to ensure the scheduler picks this youth up.
  const backdatedAt = new Date(Date.now() - 25 * 60 * 1000).toISOString();

  log('INFO', `Backdating stage_entered_at to ${backdatedAt} (25 min ago) so test_mode cutoff is met...`);
  const { error: backdateErr } = await supabase
    .from('youth')
    .update({ stage_entered_at: backdatedAt })
    .eq('id', youthId);

  if (backdateErr) {
    log('FAIL', `Backdate stage_entered_at: ${backdateErr.message}`);
    Deno.exit(1);
  }
  log('PASS', 'stage_entered_at backdated');

  // ── Step 3: POST to daily-scheduler with test_mode: true ────────────────────
  console.log('\n── INVOKE ─────────────────────────────────────────────────────');

  log('INFO', 'POSTing to daily-scheduler with { test_mode: true }...');
  const res = await fetch(SCHEDULER_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ test_mode: true }),
  });

  if (!res.ok) {
    const body = await res.text();
    log('FAIL', `daily-scheduler returned ${res.status}: ${body}`);
    Deno.exit(1);
  }

  log('PASS', `daily-scheduler returned ${res.status}`);
  log('INFO', 'Waiting 5 seconds for scheduler to complete...');
  await sleep(5000);

  // ── Step 4: Verify youth status ─────────────────────────────────────────────
  console.log('\n── VERIFY: youth ──────────────────────────────────────────────');

  const { data: updated, error: fetchErr } = await supabase
    .from('youth')
    .select('id, status')
    .eq('id', youthId)
    .single();

  if (fetchErr || !updated) {
    log('FAIL', `Could not fetch youth: ${fetchErr?.message}`);
    Deno.exit(1);
  }

  check(`youth.status = ${config.STATUS.GRANT_EXPIRED}`,
    updated.status === config.STATUS.GRANT_EXPIRED,
    `got: ${updated.status}`);

  check('youth record is not removed',
    updated.status !== config.STATUS.REMOVED,
    `status: ${updated.status}`);

  check('youth record still exists', !!updated, 'present');

  // ── Step 5: Verify no 'removed' comms_log entry ─────────────────────────────
  console.log('\n── VERIFY: comms_log ──────────────────────────────────────────');

  const { data: removedComms } = await supabase
    .from('comms_log')
    .select('id, stage_key, channel')
    .eq('youth_id', youthId)
    .like('stage_key', '%removed%');

  check('no "removed" comms_log entry for youth',
    (removedComms?.length ?? 0) === 0,
    `found: ${removedComms?.length ?? 0} row(s) — expected 0`);

  if (removedComms && removedComms.length > 0) {
    for (const row of removedComms) {
      log('INFO', `  → stage_key=${row.stage_key} channel=${row.channel}`);
    }
  }

  // ── Step 6: Cleanup ─────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ────────────────────────────────────────────────────');
  log('INFO', `Youth id: ${youthId}`);

  const answer = await prompt('Reset youth back to grant_pending? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('INFO', 'Skipping cleanup. Record left in place for inspection.');
    return;
  }

  const { error: resetErr } = await supabase
    .from('youth')
    .update({
      status:          config.STATUS.GRANT_PENDING,
      stage_entered_at: origEnteredAt ?? null,
      updated_at:       null,
    })
    .eq('id', youthId);

  if (resetErr) {
    log('FAIL', `Reset youth: ${resetErr.message}`);
  } else {
    log('PASS', 'Youth reset to grant_pending');
  }

  log('INFO', 'Done.');
}

main();
