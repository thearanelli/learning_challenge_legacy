#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for daily-scheduler Edge Function.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... \
//     deno run --allow-net --allow-env scripts/test-scheduler.ts
//
// NOTE: TEST_MODE is read from Deno.env inside the Edge Function, not from this
// script. To enable compressed time (1 min = 1 day), set it as a Supabase secret
// before running: supabase secrets set TEST_MODE=true
// For this script, all records use backdated timestamps — the scheduler will find
// them at real wall clock time regardless of TEST_MODE.
//
// What it tests:
//   Section 1 — 48hr delayed sends (declaration_pending, rejected)
//   Section 2 — Nudges (application nudge + youth/champion nudge)
//   Section 3 — Deadline removals (application + youth, champion decrement)
//   Section 4 — Full Send link dispatch (grant_approved → final_video_pending)
//
// NOTE: program_id on applications and youth is type uuid — cannot be used as a
// string tag. All test records are tracked by ID and cleaned up by ID.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const SCHEDULER_URL = 'https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/daily-scheduler';

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

  // ── Time anchors ───────────────────────────────────────────────────────────
  const now             = Date.now();
  const oneHourAgo      = new Date(now - 1  * 60 * 60 * 1000).toISOString();
  const threeDaysAhead  = new Date(now + 3  * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourAhead = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const fourDaysAgo     = new Date(now - 4  * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo    = new Date(now - 7  * 24 * 60 * 60 * 1000).toISOString();
  const eightDaysAgo    = new Date(now - 8  * 24 * 60 * 60 * 1000).toISOString();
  const elevenDaysAgo   = new Date(now - 11 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo       = new Date(now - 1  * 24 * 60 * 60 * 1000).toISOString();
  const twentySevenDaysAgo = new Date(now - 27 * 24 * 60 * 60 * 1000).toISOString();
  const twentyNineDaysAgo  = new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString();

  // ID tracking
  const appIds: string[]   = [];
  const youthIds: string[] = [];

  let s1DeclDueId!:      string;
  let s1RejectedDueId!:  string;
  let s1DeclNotDueId!:   string;
  let s2NudgeAppId!:     string;
  let s2NudgeYouthId!:   string;
  let s3RemovalAppId!:   string;
  let s3RemovalYouthId!: string;
  let s4DueYouthId!:     string;
  let s4NotDueYouthId!:  string;

  // ── SETUP: Get first available champion ────────────────────────────────────
  console.log('\n── SETUP ──────────────────────────────────────────────────────');

  const { data: champData, error: champErr } = await supabase
    .from('champions')
    .select('id, first_name, last_name, active_youth_count, max_youth')
    .eq('available', true)
    .limit(5);

  if (champErr || !champData || champData.length === 0) {
    log('FAIL', `Could not load champions: ${champErr?.message ?? 'none available'}`);
    Deno.exit(1);
  }

  const availableChampion = champData.find(c => c.active_youth_count < c.max_youth) ?? champData[0];
  const champId = availableChampion.id;
  log('INFO', `Using champion: ${availableChampion.first_name} ${availableChampion.last_name} (id: ${champId})`);

  // Pre-set champion active_youth_count to 1 so the S3 decrement test is meaningful
  await supabase
    .from('champions')
    .update({ active_youth_count: 1 })
    .eq('id', champId);
  const initialChampCount = 1;
  log('INFO', `Set champion active_youth_count = ${initialChampCount} (will expect 0 after S3 removal)`);

  // ── SETUP: Insert test records ─────────────────────────────────────────────
  console.log('\n── INSERT TEST RECORDS ────────────────────────────────────────');

  // ── Section 1: 48hr delayed sends ─────────────────────────────────────────

  log('INFO', 'S1 — Inserting declaration_pending app with past notify_after...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:            'Amara',
        last_name:             'Cole',
        email:                 'thea@griptape.org',
        phone:                 '555-100-0001',
        birthdate:             '03/12/2009',
        address:               '210 Nostrand Ave, Brooklyn, NY',
        screening_status:      'declaration_pending',
        notify_after:          oneHourAgo,
        access_token:          crypto.randomUUID(),
        stage_entered_at:      oneHourAgo,
        application_responses: {},
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S1 decl_due insert: ${error?.message}`); Deno.exit(1); }
    s1DeclDueId = data.id;
    appIds.push(s1DeclDueId);
    log('PASS', `S1 decl_due created — id: ${s1DeclDueId}`);
  }

  log('INFO', 'S1 — Inserting rejected app with past notify_after...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:            'Devon',
        last_name:             'Banks',
        email:                 'thea@griptape.org',
        phone:                 '555-100-0002',
        birthdate:             '07/20/2008',
        address:               '88 Flatbush Ave, Brooklyn, NY',
        screening_status:      'rejected',
        notify_after:          oneHourAgo,
        stage_entered_at:      oneHourAgo,
        application_responses: {},
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S1 rejected_due insert: ${error?.message}`); Deno.exit(1); }
    s1RejectedDueId = data.id;
    appIds.push(s1RejectedDueId);
    log('PASS', `S1 rejected_due created — id: ${s1RejectedDueId}`);
  }

  log('INFO', 'S1 — Inserting declaration_pending app with future notify_after (should NOT send)...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:            'Zoe',
        last_name:             'Reeves',
        email:                 'thea@griptape.org',
        phone:                 '555-100-0003',
        birthdate:             '11/05/2009',
        address:               '45 Atlantic Ave, Brooklyn, NY',
        screening_status:      'declaration_pending',
        notify_after:          twentyFourAhead,
        application_responses: {},
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S1 decl_not_due insert: ${error?.message}`); Deno.exit(1); }
    s1DeclNotDueId = data.id;
    appIds.push(s1DeclNotDueId);
    log('PASS', `S1 decl_not_due created — id: ${s1DeclNotDueId}`);
  }

  // ── Section 2: Nudges ──────────────────────────────────────────────────────

  log('INFO', 'S2 — Inserting declaration_pending app past nudge day 6...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:            'Kenji',
        last_name:             'Flores',
        email:                 'thea@griptape.org',
        phone:                 '555-100-0004',
        birthdate:             '06/18/2010',
        address:               '330 Malcolm X Blvd, Harlem, NY',
        screening_status:      'declaration_pending',
        stage_entered_at:      sevenDaysAgo,
        stage_deadline_at:     threeDaysAhead,
        access_token:          crypto.randomUUID(),
        application_responses: {},
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S2 nudge_app insert: ${error?.message}`); Deno.exit(1); }
    s2NudgeAppId = data.id;
    appIds.push(s2NudgeAppId);
    log('PASS', `S2 nudge_app created — id: ${s2NudgeAppId}`);
  }

  log('INFO', 'S2 — Inserting mentor_pending youth past nudge day 3...');
  {
    const { data, error } = await supabase
      .from('youth')
      .insert({
        first_name:       'Brianna',
        last_name:        'Osei',
        email:            'thea@griptape.org',
        phone:            '555-100-0005',
        address:          '720 Tremont Ave, Bronx, NY',
        birthdate:        '09/02/2009',
        status:           'mentor_pending',
        stage_entered_at: fourDaysAgo,
        token_expires_at: threeDaysAhead,
        champion_id:      champId,
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S2 nudge_youth insert: ${error?.message}`); Deno.exit(1); }
    s2NudgeYouthId = data.id;
    youthIds.push(s2NudgeYouthId);
    log('PASS', `S2 nudge_youth created — id: ${s2NudgeYouthId}`);
  }

  // ── Section 3: Deadline removals ──────────────────────────────────────────

  log('INFO', 'S3 — Inserting declaration_pending app with expired deadline...');
  {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name:            'Marcus',
        last_name:             'Abe',
        email:                 'thea@griptape.org',
        phone:                 '555-100-0006',
        birthdate:             '04/14/2008',
        address:               '1200 Atlantic Ave, Brooklyn, NY',
        screening_status:      'declaration_pending',
        stage_entered_at:      elevenDaysAgo,
        stage_deadline_at:     oneHourAgo,
        application_responses: {},
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S3 removal_app insert: ${error?.message}`); Deno.exit(1); }
    s3RemovalAppId = data.id;
    appIds.push(s3RemovalAppId);
    log('PASS', `S3 removal_app created — id: ${s3RemovalAppId}`);
  }

  log('INFO', 'S3 — Inserting mentor_pending youth past 7-day deadline...');
  {
    const { data, error } = await supabase
      .from('youth')
      .insert({
        first_name:       'Layla',
        last_name:        'Grant',
        email:            'thea@griptape.org',
        phone:            '555-100-0007',
        address:          '500 W 145th St, Harlem, NY',
        birthdate:        '01/30/2010',
        status:           'mentor_pending',
        stage_entered_at: eightDaysAgo,
        token_expires_at: oneDayAgo,
        champion_id:      champId,
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S3 removal_youth insert: ${error?.message}`); Deno.exit(1); }
    s3RemovalYouthId = data.id;
    youthIds.push(s3RemovalYouthId);
    log('PASS', `S3 removal_youth created — id: ${s3RemovalYouthId}`);
  }

  // ── Section 4: Full Send dispatch ─────────────────────────────────────────

  log('INFO', 'S4 — Inserting grant_approved youth past FULL_SEND_TRIGGER_DAYS (29 days)...');
  {
    const { data, error } = await supabase
      .from('youth')
      .insert({
        first_name:  'Dante',
        last_name:   'Vega',
        email:       'thea@griptape.org',
        phone:       '555-100-0008',
        address:     '890 Fulton St, Brooklyn, NY',
        birthdate:   '02/22/2009',
        status:      'grant_approved',
        accepted_at: twentyNineDaysAgo,
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S4 full_send_due insert: ${error?.message}`); Deno.exit(1); }
    s4DueYouthId = data.id;
    youthIds.push(s4DueYouthId);
    log('PASS', `S4 full_send_due created — id: ${s4DueYouthId}`);
  }

  log('INFO', 'S4 — Inserting grant_approved youth NOT yet past trigger (27 days)...');
  {
    const { data, error } = await supabase
      .from('youth')
      .insert({
        first_name:  'Simone',
        last_name:   'Dupont',
        email:       'thea@griptape.org',
        phone:       '555-100-0009',
        address:     '200 Malcolm X Blvd, Harlem, NY',
        birthdate:   '08/10/2008',
        status:      'grant_approved',
        accepted_at: twentySevenDaysAgo,
      })
      .select('id')
      .single();
    if (error || !data) { log('FAIL', `S4 full_send_not_due insert: ${error?.message}`); Deno.exit(1); }
    s4NotDueYouthId = data.id;
    youthIds.push(s4NotDueYouthId);
    log('PASS', `S4 full_send_not_due created — id: ${s4NotDueYouthId}`);
  }

  // ── INVOKE scheduler ───────────────────────────────────────────────────────
  console.log('\n── INVOKE ─────────────────────────────────────────────────────');

  log('INFO', 'Waiting 3 seconds before invoking scheduler...');
  await sleep(3000);

  log('INFO', `Invoking daily-scheduler at ${SCHEDULER_URL}...`);
  const invokeRes = await fetch(SCHEDULER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  if (!invokeRes.ok) {
    const body = await invokeRes.text();
    log('FAIL', `Scheduler invocation failed (${invokeRes.status}): ${body}`);
    Deno.exit(1);
  }

  const invokeBody = await invokeRes.json();
  log('PASS', `Scheduler responded: ${JSON.stringify(invokeBody)}`);

  log('INFO', 'Waiting 5 seconds for scheduler to complete...');
  await sleep(5000);

  // ── VERIFY ─────────────────────────────────────────────────────────────────

  // ── Section 1 ──────────────────────────────────────────────────────────────
  console.log('\n── VERIFY: Section 1 — 48hr delayed sends ─────────────────────');

  // decl_due: expect comms_log row with application_id + stage_key = 'declaration_pending'
  {
    const { data } = await supabase
      .from('comms_log')
      .select('id, channel, stage_key')
      .eq('application_id', s1DeclDueId)
      .eq('stage_key', 'declaration_pending')
      .limit(1);
    check('S1 decl_due: comms_log row written (declaration_pending)', (data?.length ?? 0) > 0,
      data && data.length > 0 ? `channel: ${data[0].channel}` : 'NO ROW FOUND');
  }

  // rejected_due: expect comms_log row with application_id + stage_key = 'rejected'
  {
    const { data } = await supabase
      .from('comms_log')
      .select('id, channel, stage_key')
      .eq('application_id', s1RejectedDueId)
      .eq('stage_key', 'rejected')
      .limit(1);
    check('S1 rejected_due: comms_log row written (rejected)', (data?.length ?? 0) > 0,
      data && data.length > 0 ? `channel: ${data[0].channel}` : 'NO ROW FOUND');
  }

  // decl_not_due: expect NO comms_log row — notify_after is in the future
  {
    const { data } = await supabase
      .from('comms_log')
      .select('id')
      .eq('application_id', s1DeclNotDueId)
      .limit(1);
    check('S1 decl_not_due: no comms_log row (future notify_after)', (data?.length ?? 0) === 0,
      data && data.length > 0 ? `UNEXPECTED: ${data.length} row(s) found` : 'correctly absent');
  }

  // ── Section 2 ──────────────────────────────────────────────────────────────
  console.log('\n── VERIFY: Section 2 — Nudges ─────────────────────────────────');

  // nudge_app: expect comms_log row with application_id + stage_key = 'nudge_declaration'
  {
    const { data } = await supabase
      .from('comms_log')
      .select('id, channel, stage_key')
      .eq('application_id', s2NudgeAppId)
      .eq('stage_key', 'nudge_declaration')
      .limit(1);
    check('S2 nudge_app: comms_log row written (nudge_declaration)', (data?.length ?? 0) > 0,
      data && data.length > 0 ? `channel: ${data[0].channel}` : 'NO ROW FOUND');
  }

  // nudge_youth: expect comms_log row with youth_id + stage_key = 'nudge_orientation_1'
  {
    const { data } = await supabase
      .from('comms_log')
      .select('id, channel, stage_key')
      .eq('youth_id', s2NudgeYouthId)
      .eq('stage_key', 'nudge_orientation_1')
      .limit(1);
    check('S2 nudge_youth: comms_log row written (nudge_orientation_1)', (data?.length ?? 0) > 0,
      data && data.length > 0 ? `channel: ${data[0].channel}` : 'NO ROW FOUND');
  }

  // ── Section 3 ──────────────────────────────────────────────────────────────
  console.log('\n── VERIFY: Section 3 — Deadline removals ──────────────────────');

  // removal_app: screening_status = 'rejected', ai_reasoning = 'deadline_missed',
  //              dropped_off_at_stage = 'declaration_pending'
  {
    const { data, error } = await supabase
      .from('applications')
      .select('screening_status, ai_reasoning, dropped_off_at_stage')
      .eq('id', s3RemovalAppId)
      .single();
    if (error || !data) {
      log('FAIL', `S3 removal_app: could not fetch — ${error?.message}`);
    } else {
      check('S3 removal_app: screening_status = rejected',
        data.screening_status === 'rejected', `got: ${data.screening_status}`);
      check('S3 removal_app: ai_reasoning = deadline_missed',
        data.ai_reasoning === 'deadline_missed', `got: ${data.ai_reasoning}`);
      check('S3 removal_app: dropped_off_at_stage = declaration_pending',
        data.dropped_off_at_stage === 'declaration_pending', `got: ${data.dropped_off_at_stage}`);
    }
  }

  // removal_youth: status = 'removed', dropped_off_at_stage = 'mentor_pending'
  {
    const { data, error } = await supabase
      .from('youth')
      .select('status, dropped_off_at_stage')
      .eq('id', s3RemovalYouthId)
      .single();
    if (error || !data) {
      log('FAIL', `S3 removal_youth: could not fetch — ${error?.message}`);
    } else {
      check('S3 removal_youth: status = removed',
        data.status === 'removed', `got: ${data.status}`);
      check('S3 removal_youth: dropped_off_at_stage = mentor_pending',
        data.dropped_off_at_stage === 'mentor_pending', `got: ${data.dropped_off_at_stage}`);
    }
  }

  // champion active_youth_count decremented by 1 (from 1 → 0)
  {
    const { data, error } = await supabase
      .from('champions')
      .select('active_youth_count')
      .eq('id', champId)
      .single();
    if (error || !data) {
      log('FAIL', `S3 champion: could not fetch — ${error?.message}`);
    } else {
      const expectedCount = initialChampCount - 1;
      check(
        `S3 champion: active_youth_count decremented (${initialChampCount} → ${expectedCount})`,
        data.active_youth_count === expectedCount,
        `got: ${data.active_youth_count}, expected: ${expectedCount}`,
      );
    }
  }

  // ── Section 4 ──────────────────────────────────────────────────────────────
  console.log('\n── VERIFY: Section 4 — Full Send dispatch ─────────────────────');

  // full_send_due: status = 'final_video_pending', access_token set, comms_log row
  {
    const { data, error } = await supabase
      .from('youth')
      .select('status, access_token, token_expires_at')
      .eq('id', s4DueYouthId)
      .single();
    if (error || !data) {
      log('FAIL', `S4 full_send_due: could not fetch — ${error?.message}`);
    } else {
      check('S4 full_send_due: status = final_video_pending',
        data.status === 'final_video_pending', `got: ${data.status}`);
      check('S4 full_send_due: access_token set',
        !!data.access_token, data.access_token ? 'present' : 'MISSING');
      check('S4 full_send_due: token_expires_at set',
        !!data.token_expires_at, data.token_expires_at ?? 'NULL');
    }
  }
  {
    const { data } = await supabase
      .from('comms_log')
      .select('id, channel')
      .eq('youth_id', s4DueYouthId)
      .eq('stage_key', 'full_send_link')
      .limit(1);
    check('S4 full_send_due: comms_log row written (full_send_link)', (data?.length ?? 0) > 0,
      data && data.length > 0 ? `channel: ${data[0].channel}` : 'NO ROW FOUND');
  }

  // full_send_not_due: status still = 'grant_approved'
  {
    const { data, error } = await supabase
      .from('youth')
      .select('status')
      .eq('id', s4NotDueYouthId)
      .single();
    if (error || !data) {
      log('FAIL', `S4 full_send_not_due: could not fetch — ${error?.message}`);
    } else {
      check('S4 full_send_not_due: status still = grant_approved (not yet triggered)',
        data.status === 'grant_approved', `got: ${data.status}`);
    }
  }

  // ── CLEANUP ────────────────────────────────────────────────────────────────
  console.log('\n── CLEANUP ────────────────────────────────────────────────────');
  log('INFO', `Test application IDs: ${appIds.join(', ')}`);
  log('INFO', `Test youth IDs: ${youthIds.join(', ')}`);

  const answer = await prompt('Delete test records? (y/n) ');
  if (answer.toLowerCase() !== 'y') {
    log('INFO', 'Skipping cleanup. Records left in place for inspection.');
    log('INFO', `Champion active_youth_count was set to 1 — reset manually if needed: id=${champId}`);
    return;
  }

  // Delete comms_log rows by application_id
  if (appIds.length > 0) {
    const { error } = await supabase
      .from('comms_log')
      .delete()
      .in('application_id', appIds);
    if (error) {
      log('FAIL', `Delete comms_log (by application_id): ${error.message}`);
    } else {
      log('PASS', 'comms_log rows (application_id) deleted');
    }
  }

  // Delete comms_log rows by youth_id
  if (youthIds.length > 0) {
    const { error } = await supabase
      .from('comms_log')
      .delete()
      .in('youth_id', youthIds);
    if (error) {
      log('FAIL', `Delete comms_log (by youth_id): ${error.message}`);
    } else {
      log('PASS', 'comms_log rows (youth_id) deleted');
    }
  }

  // Delete test youth
  if (youthIds.length > 0) {
    const { error } = await supabase
      .from('youth')
      .delete()
      .in('id', youthIds);
    if (error) {
      log('FAIL', `Delete youth: ${error.message}`);
    } else {
      log('PASS', 'Test youth deleted');
    }
  }

  // Delete test applications
  if (appIds.length > 0) {
    const { error } = await supabase
      .from('applications')
      .delete()
      .in('id', appIds);
    if (error) {
      log('FAIL', `Delete applications: ${error.message}`);
    } else {
      log('PASS', 'Test applications deleted');
    }
  }

  // Reset champion active_youth_count to 0
  await supabase
    .from('champions')
    .update({ active_youth_count: 0 })
    .eq('id', champId);
  log('PASS', `Champion ${champId} active_youth_count reset to 0`);

  log('INFO', 'Done.');
}

main();
