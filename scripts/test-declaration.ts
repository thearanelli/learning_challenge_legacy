#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for the /api/declare-submit endpoint.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     deno run --allow-net --allow-env scripts/test-declaration.ts
//
// What it does:
//   1. Finds the most recent declaration_pending application
//   2. Calls /api/declare-submit with the access_token and first_drop_goal
//   3. Verifies screening_status advances to video_pending
//   4. Verifies new access_token (rotated), first_drop_goal, and stage_deadline_at
//   5. Verifies comms_log has a declaration_confirmed entry for this application
//   6. Prompts before cleanup
//   7. Cleanup: resets screening_status to declaration_pending, clears video_pending fields

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../supabase/functions/_shared/config.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const BASE_URL = 'https://learning-challenge-legacy.vercel.app';

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
  const testStartTime = new Date().toISOString();

  // ── Step 1: Find most recent declaration_pending application ────────────────
  console.log('\n── SETUP ──────────────────────────────────────────────────────');

  log('INFO', `Looking for most recent ${config.STATUS.DECLARATION_PENDING} application...`);

  const { data: app, error: findErr } = await supabase
    .from('applications')
    .select('id, first_name, last_name, access_token, stage_entered_at, screening_status')
    .eq('screening_status', config.STATUS.DECLARATION_PENDING)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  if (findErr || !app) {
    log('INFO', `No ${config.STATUS.DECLARATION_PENDING} application found. Run test-screening.ts first to create one, then run the daily-scheduler to trigger the delayed send.`);
    Deno.exit(0);
  }

  const appId           = app.id;
  const origToken       = app.access_token;
  const origEnteredAt   = app.stage_entered_at;
  log('PASS', `Found application ${appId} — ${app.first_name} ${app.last_name}`);
  log('INFO', `access_token: ${origToken}`);

  // ── Step 2: Call /api/declare-submit ────────────────────────────────────────
  console.log('\n── INVOKE ─────────────────────────────────────────────────────');

  const firstDropGoal = 'I will record and mix my first original track from scratch. I have been putting this off for months — this is the 10 days I actually finish something.';

  log('INFO', `Calling ${BASE_URL}/api/declare-submit...`);
  const res = await fetch(`${BASE_URL}/api/declare-submit`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: origToken, first_drop_goal: firstDropGoal }),
  });

  if (!res.ok) {
    const body = await res.text();
    log('FAIL', `declare-submit returned ${res.status}: ${body}`);
    Deno.exit(1);
  }

  log('PASS', `declare-submit returned ${res.status}`);
  log('INFO', 'Waiting 5 seconds for DB to settle...');
  await sleep(5000);

  // ── Step 3: Verify application ──────────────────────────────────────────────
  console.log('\n── VERIFY: application ────────────────────────────────────────');

  const { data: updated, error: fetchErr } = await supabase
    .from('applications')
    .select('id, screening_status, access_token, first_drop_goal, stage_deadline_at, stage_entered_at')
    .eq('id', appId)
    .single();

  if (fetchErr || !updated) {
    log('FAIL', `Could not fetch updated application: ${fetchErr?.message}`);
    Deno.exit(1);
  }

  check(`screening_status = ${config.STATUS.VIDEO_PENDING}`,
    updated.screening_status === config.STATUS.VIDEO_PENDING,
    `got: ${updated.screening_status}`);

  check('access_token is set',
    !!updated.access_token,
    updated.access_token ? 'present' : 'MISSING');

  check('access_token rotated from original',
    !!updated.access_token && updated.access_token !== origToken,
    updated.access_token === origToken ? 'UNCHANGED — not rotated' : 'correctly rotated');

  check('first_drop_goal stored',
    updated.first_drop_goal === firstDropGoal,
    updated.first_drop_goal ? 'present' : 'MISSING');

  check('stage_deadline_at is set',
    !!updated.stage_deadline_at,
    updated.stage_deadline_at ?? 'NULL');

  // ── Step 4: Verify comms_log ────────────────────────────────────────────────
  console.log('\n── VERIFY: comms_log ──────────────────────────────────────────');

  const { data: comms } = await supabase
    .from('comms_log')
    .select('id, stage_key, channel')
    .eq('application_id', appId)
    .eq('stage_key', 'declaration_confirmed')
    .gte('sent_at', testStartTime);

  check('comms_log has declaration_confirmed entry',
    (comms?.length ?? 0) > 0,
    `found: ${comms?.length ?? 0} row(s)`);

  for (const row of (comms ?? [])) {
    log('INFO', `  → stage_key=${row.stage_key} channel=${row.channel}`);
  }

  // ── Step 5: Cleanup ─────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ────────────────────────────────────────────────────');
  log('INFO', `Application id: ${appId}`);

  const answer = await prompt('Reset application back to declaration_pending? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('INFO', 'Skipping cleanup. Record left in place for inspection.');
    return;
  }

  const { error: resetErr } = await supabase
    .from('applications')
    .update({
      screening_status:  config.STATUS.DECLARATION_PENDING,
      access_token:      origToken,
      first_drop_goal:   null,
      stage_deadline_at: null,
      stage_entered_at:  origEnteredAt ?? null,
      updated_at:        null,
    })
    .eq('id', appId);

  if (resetErr) {
    log('FAIL', `Reset application: ${resetErr.message}`);
  } else {
    log('PASS', 'Application reset to declaration_pending');
  }

  const { error: commsDeleteErr } = await supabase
    .from('comms_log')
    .delete()
    .eq('application_id', appId)
    .eq('stage_key', 'declaration_confirmed')
    .gte('sent_at', testStartTime);

  if (commsDeleteErr) {
    log('FAIL', `Delete comms_log: ${commsDeleteErr.message}`);
  } else {
    log('PASS', 'comms_log test rows deleted');
  }

  log('INFO', 'Done.');
}

main();
