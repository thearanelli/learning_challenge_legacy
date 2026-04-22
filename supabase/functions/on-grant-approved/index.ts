// WEBHOOK SETUP — configure manually in Supabase Dashboard → Database → Webhooks
// Name:      on_grant_approved
// Table:     public.grant_requests
// Events:    UPDATE
// Filter:    none — function checks staff_approved internally
// URL:       https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/on-grant-approved
//
// Fires when staff sets staff_approved = true on grant_requests.
// Guards on old_record.staff_approved to prevent duplicate fires.
// Advances youth status grant_review -> grant_approved.
// Sends deposit link notification to youth.
// Always returns 200 — uncaught errors are logged, not re-raised.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const oldRecord = payload.old_record;

    // Guard — only act on staff_approved transitioning to true
    if (record?.staff_approved !== true) {
      console.log('[on-grant-approved] ignoring — staff_approved is not true');
      return new Response('ok', { status: 200 });
    }
    if (oldRecord?.staff_approved === true) {
      console.log('[on-grant-approved] ignoring — staff_approved was already true');
      return new Response('ok', { status: 200 });
    }

    const youthId = record?.youth_id;
    if (!youthId) {
      console.error('[on-grant-approved] missing youth_id in payload');
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Load youth record
    const { data: youth, error: fetchError } = await supabase
      .from('youth')
      .select('*')
      .eq('id', youthId)
      .single();

    if (fetchError || !youth) {
      console.error(`[on-grant-approved] youth not found: ${youthId}`);
      return new Response('ok', { status: 200 });
    }

    // Set staff_approved_at — only if not already set (idempotency)
    await supabase
      .from('grant_requests')
      .update({ staff_approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', record.id)
      .is('staff_approved_at', null);

    // Idempotency guard on youth status
    if (youth.status !== 'grant_review') {
      console.log(`[on-grant-approved] skipping — youth ${youthId} is ${youth.status}`);
      return new Response('ok', { status: 200 });
    }

    // advance_status: grant_review -> grant_approved
    const { error: updateError } = await supabase.rpc('advance_status', {
      record_id: youth.id,
      table_name: 'youth',
      expected_current_status: 'grant_review',
      next_status: 'grant_approved',
      additional_fields: {},
    });

    if (updateError) {
      if (updateError.message?.includes('StatusConflictError')) {
        console.log(`[on-grant-approved] StatusConflictError for ${youthId} — already processed`);
        return new Response('ok', { status: 200 });
      }
      throw new Error(`advance_status error: ${updateError.message}`);
    }

    // Send deposit link notification to youth
    // Uses grant_approved content block: email_subject, email_body, sms
    await sendNotification('grant_approved', youth, {
      deposit_link: 'PLACEHOLDER_DEPOSIT_LINK',
    });

    console.log(`[on-grant-approved] ${youth.id}: advanced to grant_approved, deposit link sent to ${youth.email}`);

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('[ERROR] on-grant-approved:', err);
    return new Response('ok', { status: 200 }); // always 200 — prevent Supabase retries on our bugs
  }
});
