#!/usr/bin/env -S deno run --allow-net --allow-env
//
// Test script for the on-grant-approved edge function.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... deno run --allow-net --allow-env scripts/test-grant-approved.ts
//
// What it does:
//   1. Inserts a test application, youth, and grant_requests row
//   2. Flips staff_approved = true to trigger the on-grant-approved webhook
//   3. Waits 15 seconds, then checks DB state
//   4. Leaves all test records in place for inspection
//
// Note: this will fire the real webhook against the sandbox Tremendous API
// and send an email to thea@griptape.org. Check edge function logs with:
//   supabase functions logs on-grant-approved

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

function log(level: 'INFO' | 'PASS' | 'FAIL', msg: string) {
  const prefix = level === 'PASS' ? '\x1b[32m[PASS]\x1b[0m'
               : level === 'FAIL' ? '\x1b[31m[FAIL]\x1b[0m'
               : '[INFO]';
  console.log(`${prefix} ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('FAIL', 'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    Deno.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let appId: string | null = null;
  let youthId: string | null = null;
  let grantRequestId: string | null = null;

  try {
    // ── Step 1: Insert test application ────────────────────────────────────
    log('INFO', 'Inserting test application...');
    const { data: app, error: appError } = await supabase
      .from('applications')
      .insert({
        first_name:       'Teadora',
        last_name:        'Ranelli',
        email:            'thea@griptape.org',
        phone:            '555-000-0001',
        birthdate:        '2008-01-01',
        address:          '123 Test St, New York, NY',
        screening_status: 'accepted',
      })
      .select('id')
      .single();

    if (appError || !app) {
      log('FAIL', `Insert application: ${appError?.message}`);
      Deno.exit(1);
    }
    appId = app.id;
    log('PASS', `Application created — id: ${appId}`);

    // ── Step 2: Insert test youth ───────────────────────────────────────────
    log('INFO', 'Inserting test youth...');
    const { data: youth, error: youthError } = await supabase
      .from('youth')
      .insert({
        application_id: appId,
        first_name:     'Teadora',
        last_name:      'Ranelli',
        email:          'thea@griptape.org',
        phone:          '555-000-0001',
        birthdate:      '2008-01-01',
        address:        '123 Test St, New York, NY',
        status:         'grant_review',
      })
      .select('id')
      .single();

    if (youthError || !youth) {
      log('FAIL', `Insert youth: ${youthError?.message}`);
      Deno.exit(1);
    }
    youthId = youth.id;
    log('PASS', `Youth created — id: ${youthId}`);

    // ── Step 3: Insert test grant_requests ─────────────────────────────────
    log('INFO', 'Inserting test grant_requests row...');
    const { data: grantRequest, error: grantError } = await supabase
      .from('grant_requests')
      .insert({
        youth_id:       youthId,
        grant_amount:   150,
        staff_approved: false,
      })
      .select('id')
      .single();

    if (grantError || !grantRequest) {
      log('FAIL', `Insert grant_requests: ${grantError?.message}`);
      Deno.exit(1);
    }
    grantRequestId = grantRequest.id;
    log('PASS', `grant_requests created — id: ${grantRequestId}`);

    // ── Step 4: Flip staff_approved = true ─────────────────────────────────
    log('INFO', 'Flipping staff_approved = true to trigger on-grant-approved webhook...');
    const { error: approveError } = await supabase
      .from('grant_requests')
      .update({ staff_approved: true, updated_at: new Date().toISOString() })
      .eq('id', grantRequestId);

    if (approveError) {
      log('FAIL', `Flip staff_approved: ${approveError.message}`);
      Deno.exit(1);
    }
    log('PASS', 'staff_approved flipped — webhook should be firing');

    // ── Step 5: Wait ────────────────────────────────────────────────────────
    log('INFO', 'Waiting 15 seconds for webhook to complete...');
    await sleep(15000);

    // ── Step 6a: Check grant_requests row ──────────────────────────────────
    log('INFO', 'Checking grant_requests row...');
    const { data: grCheck, error: grCheckError } = await supabase
      .from('grant_requests')
      .select('staff_approved, staff_approved_at')
      .eq('id', grantRequestId)
      .single();

    if (grCheckError || !grCheck) {
      log('FAIL', `Fetch grant_requests: ${grCheckError?.message}`);
    } else if (grCheck.staff_approved === true) {
      log('PASS', `grant_requests.staff_approved = true, staff_approved_at = ${grCheck.staff_approved_at ?? 'not set'}`);
    } else {
      log('FAIL', `grant_requests.staff_approved is not true`);
    }

    // ── Step 6b: Check youth status advanced ───────────────────────────────
    log('INFO', 'Checking youth status...');
    const { data: youthCheck, error: youthCheckError } = await supabase
      .from('youth')
      .select('status')
      .eq('id', youthId)
      .single();

    if (youthCheckError || !youthCheck) {
      log('FAIL', `Fetch youth: ${youthCheckError?.message}`);
    } else if (youthCheck.status === 'grant_approved') {
      log('PASS', `youth.status = grant_approved`);
    } else {
      log('FAIL', `youth.status = ${youthCheck.status} (expected grant_approved) — check edge function logs`);
    }

    log('INFO', 'View edge function logs: supabase functions logs on-grant-approved');
    log('INFO', 'Done');
  } catch (err) {
    log('FAIL', `Unexpected error: ${err}`);
  }
}

main();
