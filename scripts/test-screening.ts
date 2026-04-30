#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for screen-application Edge Function.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     deno run --allow-net --allow-env scripts/test-screening.ts
//
// What it does:
//   1. Inserts 2 test applications (accepted / rejected)
//   2. Directly invokes screen-application for each
//   3. Verifies screening_status, notify_after, access_token, and comms_log
//   4. Prompts before cleanup
//
// notify_after expectation:
//   Set for accepted and rejected (now + 48h).
//   Scheduler will handle delayed sends — not screen-application.
//   If comms_log has rows for accepted/rejected, that means screen-application
//   is still sending immediately and has not yet been migrated to the
//   scheduler pattern. The test flags this so it can be tracked.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const FUNCTION_URL = `${SUPABASE_URL.replace('https://', 'https://')}`.replace(
  /\.supabase\.co.*$/,
  '.supabase.co/functions/v1/screen-application',
);

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

async function invokeFunction(application: Record<string, unknown>): Promise<void> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ record: application }),
  });
  if (!res.ok) {
    const body = await res.text();
    log('FAIL', `Function invocation failed (${res.status}): ${body}`);
  }
}

// ─── 48h window helpers ──────────────────────────────────────────────────────

function isApprox48hFromNow(ts: string | null): boolean {
  if (!ts) return false;
  const diffMs = new Date(ts).getTime() - Date.now();
  const diffHrs = diffMs / (1000 * 60 * 60);
  return diffHrs >= 47 && diffHrs <= 49;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    log('FAIL', 'SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_ANON_KEY must be set');
    Deno.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const testStartTime = new Date().toISOString();

  let acceptedId: string | null = null;
  let rejectedId: string | null = null;

  // ── Step 1: Insert test applications ───────────────────────────────────────
  console.log('\n── SETUP ──────────────────────────────────────────────────────');

  log('INFO', 'Inserting ACCEPTED application (valid NYC youth, age 16, strong passion)...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:        'Jordan',
        last_name:         'Rivera',
        email:             'thea@griptape.org',
        phone:             '555-000-0001',
        birthdate:         '01/15/2010',     // age 16 in 2026
        address:           '123 Atlantic Ave, Brooklyn, NY',
        screening_status:  'submitted',
        application_responses: {
          passion:  'I have been making beats and writing lyrics since I was twelve years old. Music is how I process everything happening around me — school stress, family stuff, my neighborhood. I want to build a real home studio, learn music production, and eventually release my own project. I have the drive but I need resources and guidance to make it real.',
          why_join: 'I want support and funding to take my music seriously.',
        },
      })
      .select('id')
      .single();

    if (error || !data) {
      log('FAIL', `Insert ACCEPTED application: ${error?.message}`);
      Deno.exit(1);
    }
    acceptedId = data.id;
    log('PASS', `ACCEPTED application created — id: ${acceptedId}`);
  }

  log('INFO', 'Inserting REJECTED application (wrong location — Los Angeles)...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:        'Marcus',
        last_name:         'Thompson',
        email:             'thea@griptape.org',
        phone:             '555-000-0002',
        birthdate:         '03/10/2009',     // age 17 in 2026, valid
        address:           '456 Sunset Blvd, Los Angeles, CA',  // ineligible location
        screening_status:  'submitted',
        application_responses: {
          passion:  'I love making short films and telling stories through video. I have been creating YouTube content for two years and I want to invest in better equipment and editing software so I can grow my channel and tell more meaningful stories about my city and the people in it.',
          why_join: 'I want funding to upgrade my filming equipment.',
        },
      })
      .select('id')
      .single();

    if (error || !data) {
      log('FAIL', `Insert REJECTED application: ${error?.message}`);
      Deno.exit(1);
    }
    rejectedId = data.id;
    log('PASS', `REJECTED application created — id: ${rejectedId}`);
  }

// ── Step 2: Invoke Edge Function for each ──────────────────────────────────
  console.log('\n── INVOKE ─────────────────────────────────────────────────────');

  for (const [label, id] of [['ACCEPTED', acceptedId], ['REJECTED', rejectedId]] as const) {
    // Fetch the full row so the function gets the real DB record
    const { data: row } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id!)
      .single();

    log('INFO', `Invoking screen-application for ${label} (id: ${id})...`);
    await invokeFunction(row!);
    log('INFO', `Waiting 5 seconds...`);
    await sleep(5000);
  }

  log('INFO', 'Both invocations complete. Waiting 3 more seconds...');
  await sleep(3000);

  // ── Step 3: Verify applications ────────────────────────────────────────────
  console.log('\n── VERIFY: applications ───────────────────────────────────────');

  const { data: apps, error: appsError } = await supabase
    .from('applications')
    .select('id, first_name, screening_status, notify_after, ai_decision, access_token, stage_deadline_at')
    .in('id', [acceptedId!, rejectedId!]);

  if (appsError || !apps) {
    log('FAIL', `Could not fetch applications: ${appsError?.message}`);
    Deno.exit(1);
  }

  const byId = Object.fromEntries(apps.map(a => [a.id, a]));
  const accepted = byId[acceptedId!];
  const rejected = byId[rejectedId!];

  // Accepted checks
  check('accepted: screening_status = declaration_pending',
    accepted?.screening_status === 'declaration_pending',
    `got: ${accepted?.screening_status}`);
  check('accepted: ai_decision = accepted',
    accepted?.ai_decision === 'accepted',
    `got: ${accepted?.ai_decision}`);
  check('accepted: access_token is set',
    !!accepted?.access_token,
    accepted?.access_token ? 'present' : 'MISSING');
  check('accepted: notify_after is set',
    !!accepted?.notify_after,
    accepted?.notify_after ?? 'NULL');
  check('accepted: notify_after is ~48h from now',
    isApprox48hFromNow(accepted?.notify_after),
    accepted?.notify_after ?? 'NULL');

  // Rejected checks
  check('rejected: screening_status = rejected',
    rejected?.screening_status === 'rejected',
    `got: ${rejected?.screening_status}`);
  check('rejected: ai_decision = rejected',
    rejected?.ai_decision === 'rejected',
    `got: ${rejected?.ai_decision}`);
  check('rejected: notify_after is set',
    !!rejected?.notify_after,
    rejected?.notify_after ?? 'NULL');
  check('rejected: notify_after is ~48h from now',
    isApprox48hFromNow(rejected?.notify_after),
    rejected?.notify_after ?? 'NULL');
  check('rejected: access_token is NULL',
    !rejected?.access_token,
    rejected?.access_token ? `unexpectedly set: ${rejected.access_token}` : 'correctly NULL');

  // ── Step 4: Verify comms_log ────────────────────────────────────────────────
  console.log('\n── VERIFY: comms_log ──────────────────────────────────────────');

  // Check accepted/rejected comms_log rows — should be empty if scheduler pattern is in place
  const { data: earlyComms } = await supabase
    .from('comms_log')
    .select('id, stage_key, channel')
    .in('stage_key', ['declaration_pending', 'rejected'])
    .gte('sent_at', testStartTime);

  if ((earlyComms?.length ?? 0) === 0) {
    check('accepted/rejected: no immediate comms_log rows (scheduler-delayed)', true,
      'sends deferred to scheduler via notify_after');
  } else {
    log('FAIL', `accepted/rejected: ${earlyComms!.length} comms_log row(s) already written — screen-application is still sending immediately. Migrate to scheduler pattern.`);
    for (const row of earlyComms!) {
      log('INFO', `  → stage_key=${row.stage_key} channel=${row.channel}`);
    }
  }

  // ── Step 5: Cleanup ────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ────────────────────────────────────────────────────');
  log('INFO', `Test record IDs: ${acceptedId}, ${rejectedId}`);

  const answer = await prompt('Delete test records? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('INFO', 'Skipping cleanup. Records left in place for inspection.');
    return;
  }

  // Delete comms_log rows from this test run (no application_id column — use stage_key + time window)
  const { error: commsDeleteError } = await supabase
    .from('comms_log')
    .delete()
    .in('stage_key', ['declaration_pending', 'rejected'])
    .gte('sent_at', testStartTime);

  if (commsDeleteError) {
    log('FAIL', `Delete comms_log: ${commsDeleteError.message}`);
  } else {
    log('PASS', 'comms_log test rows deleted');
  }

  // Delete test applications
  const { error: appDeleteError } = await supabase
    .from('applications')
    .delete()
    .in('id', [acceptedId!, rejectedId!]);

  if (appDeleteError) {
    log('FAIL', `Delete applications: ${appDeleteError.message}`);
  } else {
    log('PASS', 'Test applications deleted');
  }

  log('INFO', 'Done.');
}

main();
