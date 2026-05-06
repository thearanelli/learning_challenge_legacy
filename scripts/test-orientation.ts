#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for the process-orientation Edge Function.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     deno run --allow-net --allow-env scripts/test-orientation.ts
//
// What it does:
//   1. Finds the most recent mentor_pending youth
//   2. Calls process-orientation directly via HTTP with { youth_id }
//   3. Verifies youth.status advances to grant_pending
//   4. Verifies orientation_call_completed_at is set
//   5. Verifies comms_log has a grant_pending entry for this youth
//   6. Prompts before cleanup
//   7. Cleanup: resets status to mentor_pending, clears orientation_call_completed_at

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../supabase/functions/_shared/config.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/process-orientation`;

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

async function invokeFunction(youth_id: string): Promise<Response> {
  return fetch(FUNCTION_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ youth_id }),
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    log('FAIL', 'SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_ANON_KEY must be set');
    Deno.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const testStartTime = new Date().toISOString();

  // ── Step 1: Find most recent mentor_pending youth ───────────────────────────
  console.log('\n── SETUP ──────────────────────────────────────────────────────');

  log('INFO', `Looking for most recent ${config.STATUS.MENTOR_PENDING} youth...`);

  const { data: youth, error: findErr } = await supabase
    .from('youth')
    .select('id, first_name, last_name, status, orientation_call_completed_at, stage_entered_at')
    .eq('status', config.STATUS.MENTOR_PENDING)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single();

  if (findErr || !youth) {
    log('INFO', `No ${config.STATUS.MENTOR_PENDING} youth found. Run test-champion-match.ts first.`);
    Deno.exit(0);
  }

  const youthId                = youth.id;
  const origEnteredAt          = youth.stage_entered_at;
  const origOrientationAt      = youth.orientation_call_completed_at;
  log('PASS', `Found youth ${youthId} — ${youth.first_name} ${youth.last_name}`);
  log('INFO', `orientation_call_completed_at before test: ${origOrientationAt ?? 'null'}`);

  // ── Step 2: Call process-orientation ───────────────────────────────────────
  console.log('\n── INVOKE ─────────────────────────────────────────────────────');

  log('INFO', `Calling process-orientation for youth ${youthId}...`);
  const res = await invokeFunction(youthId);

  if (!res.ok) {
    const body = await res.text();
    log('FAIL', `process-orientation returned ${res.status}: ${body}`);
    Deno.exit(1);
  }

  log('PASS', `process-orientation returned ${res.status}`);
  log('INFO', 'Waiting 5 seconds for DB to settle...');
  await sleep(5000);

  // ── Step 3: Verify youth ────────────────────────────────────────────────────
  console.log('\n── VERIFY: youth ──────────────────────────────────────────────');

  const { data: updated, error: fetchErr } = await supabase
    .from('youth')
    .select('id, status, orientation_call_completed_at')
    .eq('id', youthId)
    .single();

  if (fetchErr || !updated) {
    log('FAIL', `Could not fetch updated youth: ${fetchErr?.message}`);
    Deno.exit(1);
  }

  check(`youth.status = ${config.STATUS.GRANT_PENDING}`,
    updated.status === config.STATUS.GRANT_PENDING,
    `got: ${updated.status}`);

  check('orientation_call_completed_at is set',
    !!updated.orientation_call_completed_at,
    updated.orientation_call_completed_at ?? 'NULL');

  // ── Step 4: Verify comms_log ────────────────────────────────────────────────
  console.log('\n── VERIFY: comms_log ──────────────────────────────────────────');

  const { data: comms } = await supabase
    .from('comms_log')
    .select('id, stage_key, channel')
    .eq('youth_id', youthId)
    .eq('stage_key', config.STATUS.GRANT_PENDING)
    .gte('sent_at', testStartTime);

  check('comms_log has grant_pending entry for youth',
    (comms?.length ?? 0) > 0,
    `found: ${comms?.length ?? 0} row(s)`);

  for (const row of (comms ?? [])) {
    log('INFO', `  → stage_key=${row.stage_key} channel=${row.channel}`);
  }

  // ── Step 5: Cleanup ─────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ────────────────────────────────────────────────────');
  log('INFO', `Youth id: ${youthId}`);

  const answer = await prompt('Reset youth back to mentor_pending? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('INFO', 'Skipping cleanup. Record left in place for inspection.');
    return;
  }

  const { error: resetErr } = await supabase
    .from('youth')
    .update({
      status:                       config.STATUS.MENTOR_PENDING,
      orientation_call_completed_at: null,
      stage_entered_at:             origEnteredAt ?? null,
      updated_at:                   null,
    })
    .eq('id', youthId);

  if (resetErr) {
    log('FAIL', `Reset youth: ${resetErr.message}`);
  } else {
    log('PASS', 'Youth reset to mentor_pending');
  }

  const { error: commsDeleteErr } = await supabase
    .from('comms_log')
    .delete()
    .eq('youth_id', youthId)
    .eq('stage_key', config.STATUS.GRANT_PENDING)
    .gte('sent_at', testStartTime);

  if (commsDeleteErr) {
    log('FAIL', `Delete comms_log: ${commsDeleteErr.message}`);
  } else {
    log('PASS', 'comms_log test rows deleted');
  }

  log('INFO', 'Done.');
}

main();
