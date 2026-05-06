#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for the on-acceptance → match-champion webhook chain.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     deno run --allow-net --allow-env scripts/test-champion-match.ts
//
// What it does:
//   1. Finds the most recent video_review application
//   2. Sets screening_status = 'accepted' to trigger the on-acceptance webhook
//   3. Polls up to 15 seconds for a youth row to appear (created by on-acceptance)
//   4. Verifies youth.status = onboarding
//   5. Polls up to 15 more seconds for youth.status to advance to mentor_pending
//      (triggered by match-champion on youth INSERT)
//   6. Verifies champion_id, access_token, and comms_log entry
//   7. Prompts before cleanup
//   8. Cleanup: deletes the youth row, resets application to video_review

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../supabase/functions/_shared/config.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

  // ── Step 1: Find most recent video_review application ───────────────────────
  console.log('\n── SETUP ──────────────────────────────────────────────────────');

  log('INFO', `Looking for most recent ${config.STATUS.VIDEO_REVIEW} application...`);

  const { data: app, error: findErr } = await supabase
    .from('applications')
    .select('id, first_name, last_name, screening_status')
    .eq('screening_status', config.STATUS.VIDEO_REVIEW)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  if (findErr || !app) {
    log('INFO', `No ${config.STATUS.VIDEO_REVIEW} application found. An application must be in video_review before running this test.`);
    Deno.exit(0);
  }

  const appId = app.id;
  log('PASS', `Found application ${appId} — ${app.first_name} ${app.last_name}`);

  // ── Step 2: Set screening_status = 'accepted' to trigger on-acceptance ───────
  console.log('\n── INVOKE ─────────────────────────────────────────────────────');

  // 'accepted' is an application-level status; not a youth status constant
  log('INFO', `Setting screening_status = 'accepted' on application ${appId}...`);

  const { error: acceptErr } = await supabase
    .from('applications')
    .update({ screening_status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', appId);

  if (acceptErr) {
    log('FAIL', `Update screening_status: ${acceptErr.message}`);
    Deno.exit(1);
  }
  log('PASS', `screening_status set to 'accepted' — on-acceptance webhook should be firing`);

  // ── Step 3: Poll for youth row ──────────────────────────────────────────────
  console.log('\n── VERIFY: youth created ──────────────────────────────────────');

  log('INFO', 'Polling up to 15 seconds for youth row...');
  let youth: Record<string, unknown> | null = null;

  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const { data } = await supabase
      .from('youth')
      .select('*')
      .eq('application_id', appId)
      .single();
    if (data) {
      youth = data;
      break;
    }
  }

  check('youth row created', !!youth, youth ? `id: ${youth.id}` : 'not found after 15s');

  if (!youth) {
    log('FAIL', 'No youth row found — check on-acceptance webhook logs');
    Deno.exit(1);
  }

  const youthId = youth.id as string;

  check(`youth.status = ${config.STATUS.ONBOARDING} or ${config.STATUS.MENTOR_PENDING}`,
    youth.status === config.STATUS.ONBOARDING || youth.status === config.STATUS.MENTOR_PENDING,
    `got: ${youth.status}`);

  // ── Step 4: Poll for mentor_pending ─────────────────────────────────────────
  console.log('\n── VERIFY: champion matched ───────────────────────────────────');

  log('INFO', 'Polling up to 15 more seconds for youth.status = mentor_pending...');
  let finalYouth: Record<string, unknown> | null = null;

  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const { data } = await supabase
      .from('youth')
      .select('id, status, champion_id, access_token')
      .eq('id', youthId)
      .single();
    if (data?.status === config.STATUS.MENTOR_PENDING) {
      finalYouth = data;
      break;
    }
  }

  check(`youth.status = ${config.STATUS.MENTOR_PENDING}`,
    finalYouth?.status === config.STATUS.MENTOR_PENDING,
    finalYouth ? `got: ${finalYouth.status}` : 'status did not advance after 15s');

  check('champion_id is set',
    !!finalYouth?.champion_id,
    finalYouth?.champion_id ? `${finalYouth.champion_id}` : 'MISSING');

  check('access_token is set',
    !!finalYouth?.access_token,
    finalYouth?.access_token ? 'present' : 'MISSING');

  // ── Step 5: Verify comms_log ────────────────────────────────────────────────
  console.log('\n── VERIFY: comms_log ──────────────────────────────────────────');

  const { data: comms } = await supabase
    .from('comms_log')
    .select('id, stage_key, channel')
    .eq('youth_id', youthId)
    .eq('stage_key', config.STATUS.MENTOR_PENDING)
    .gte('sent_at', testStartTime);

  check('comms_log has mentor_pending entry for youth',
    (comms?.length ?? 0) > 0,
    `found: ${comms?.length ?? 0} row(s)`);

  for (const row of (comms ?? [])) {
    log('INFO', `  → stage_key=${row.stage_key} channel=${row.channel}`);
  }

  // ── Step 6: Cleanup ─────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ────────────────────────────────────────────────────');
  log('INFO', `Application id: ${appId}`);
  log('INFO', `Youth id: ${youthId}`);

  const answer = await prompt('Delete youth row and reset application to video_review? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('INFO', 'Skipping cleanup. Records left in place for inspection.');
    return;
  }

  const { error: commsDeleteErr } = await supabase
    .from('comms_log')
    .delete()
    .eq('youth_id', youthId)
    .gte('sent_at', testStartTime);

  if (commsDeleteErr) {
    log('FAIL', `Delete comms_log: ${commsDeleteErr.message}`);
  } else {
    log('PASS', 'comms_log test rows deleted');
  }

  const { error: youthDeleteErr } = await supabase
    .from('youth')
    .delete()
    .eq('id', youthId);

  if (youthDeleteErr) {
    log('FAIL', `Delete youth: ${youthDeleteErr.message}`);
  } else {
    log('PASS', 'Youth row deleted');
  }

  const { error: resetErr } = await supabase
    .from('applications')
    .update({
      screening_status: config.STATUS.VIDEO_REVIEW,
      updated_at:       null,
    })
    .eq('id', appId);

  if (resetErr) {
    log('FAIL', `Reset application to video_review: ${resetErr.message}`);
  } else {
    log('PASS', 'Application reset to video_review');
  }

  log('INFO', 'Done.');
}

main();
