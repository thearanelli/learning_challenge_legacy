// WEBHOOK SETUP — configure manually in Supabase Dashboard → Database → Webhooks
// Name:      on_grant_approved
// Table:     public.grant_requests
// Events:    UPDATE
// Filter:    none — function checks staff_approved internally
// URL:       https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/on-grant-approved
//
// Fires when staff sets staff_approved = true on grant_requests.
// Guards on old_record.staff_approved to prevent duplicate fires.
// Calls Tremendous API to create an order and get a redemption link.
// Advances youth status grant_review -> grant_approved.
// Sends redemption link to youth via email + SMS.
// Always returns 200 — uncaught errors are logged, not re-raised.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification, sendStaffNotification } from '../_shared/dispatcher.ts';
import { sendEmail } from '../_shared/email.ts';
import { renderContent, content } from '../_shared/content.ts';
import { config } from '../_shared/config.ts';

const TREMENDOUS_BASE_URL = 'https://testflight.tremendous.com/api/v2';
const TREMENDOUS_CAMPAIGN_ID = 'XI17V0UOF7RX';

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

    // Set staff_approved_at and mailing_address — only if not already set (idempotency)
    await supabase
      .from('grant_requests')
      .update({
        staff_approved_at: new Date().toISOString(),
        updated_at:        new Date().toISOString(),
        mailing_address:   youth.address ?? null,
      })
      .eq('id', record.id)
      .is('staff_approved_at', null);

    // Idempotency guard on youth status
    if (youth.status !== 'grant_review') {
      console.log(`[on-grant-approved] skipping — youth ${youthId} is ${youth.status}`);
      return new Response('ok', { status: 200 });
    }

    // grant_requests fields come from the webhook payload record (the updated row)
    const grantRequest = {
      grant_amount: record.grant_amount,
      legal_name:   record.legal_name   ?? null,
      grant_format: record.grant_format ?? null,
      grant_coding: record.grant_coding ?? null,
    };

    if (!grantRequest.grant_amount) {
      console.error(`[on-grant-approved] grant_amount missing from payload for record ${record.id}`);
      return new Response('ok', { status: 200 });
    }

    // Call Tremendous API — must succeed before we advance status
    const tremendousApiKey = Deno.env.get('TREMENDOUS_API_KEY');
    if (!tremendousApiKey) {
      throw new Error('TREMENDOUS_API_KEY not set');
    }

    const orderPayload = {
      payment: { funding_source_id: 'BALANCE' },
      reward: {
        campaign_id: TREMENDOUS_CAMPAIGN_ID,
        value: {
          denomination: grantRequest.grant_amount,
          currency_code: 'USD',
        },
        recipient: {
          name: `${youth.first_name} ${youth.last_name}`,
          email: youth.email,
        },
        delivery: { method: 'LINK' },
      },
    };

    const tremendousRes = await fetch(`${TREMENDOUS_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tremendousApiKey}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!tremendousRes.ok) {
      const errText = await tremendousRes.text();
      console.error(`[on-grant-approved] Tremendous API error ${tremendousRes.status} for youth ${youthId}`);
      try {
        await supabase.from('agent_log').insert({
          event: 'tremendous_order_failed',
          youth_id: youthId,
          grant_request_id: record.id,
          detail: `HTTP ${tremendousRes.status}`,
        });
      } catch (_) { /* agent_log insert is best-effort */ }
      await sendStaffNotification('tremendous_error', {
        first_name: youth.first_name,
        last_name: youth.last_name,
        youth_id: youthId,
        grant_request_id: record.id,
      });
      return new Response('ok', { status: 200 });
    }

    const tremendousData = await tremendousRes.json();
    const redemptionLink: string = tremendousData?.order?.rewards?.[0]?.delivery?.link ?? '';
    const tremendousRewardId: string = tremendousData?.order?.rewards?.[0]?.id ?? '';

    // Store reward ID for later webhook matching
    if (tremendousRewardId) {
      await supabase
        .from('grant_requests')
        .update({ tremendous_reward_id: tremendousRewardId })
        .eq('id', record.id);
    }

    if (!redemptionLink) {
      console.error(`[on-grant-approved] No redemption_url in Tremendous response for youth ${youthId}`);
      try {
        await supabase.from('agent_log').insert({
          event: 'tremendous_no_redemption_url',
          youth_id: youthId,
          grant_request_id: record.id,
          detail: 'rewards[0].redemption_url missing from response',
        });
      } catch (_) { /* agent_log insert is best-effort */ }
      await sendStaffNotification('tremendous_error', {
        first_name: youth.first_name,
        last_name: youth.last_name,
        youth_id: youthId,
        grant_request_id: record.id,
      });
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

    // Send grant_approved email + SMS to youth with redemption link
    await sendNotification('grant_approved', youth, {
      redemption_link: redemptionLink,
      grant_amount: String(grantRequest.grant_amount),
    });

    // Send disbursement notification to Ryan
    const ryanEmail = config.RYAN_EMAIL;
    if (ryanEmail) {
      const block = (content as Record<string, any>)['ryan_notification'];
      const vars = {
        youth_id:     youth.id,
        grant_amount: String(grantRequest.grant_amount),
        grant_format: grantRequest.grant_format ?? 'Not specified',
        email:        youth.email,
        legal_name:   grantRequest.legal_name   ?? 'Not provided',
        approved_at:  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      await sendEmail({
        to:      ryanEmail,
        subject: renderContent(block.staff_email_subject, vars),
        html:    renderContent(block.staff_email_body, vars),
      });
      console.log(`[on-grant-approved] Ryan notification sent for youth ${youth.id}`);
    }

    // Log success
    try {
      await supabase.from('agent_log').insert({
        event: 'grant_approved',
        youth_id: youthId,
        grant_request_id: record.id,
        detail: 'Tremendous order created, redemption link sent to youth',
      });
    } catch (_) { /* agent_log insert is best-effort */ }

    console.log(`[on-grant-approved] ${youth.id}: Tremendous order created, advanced to grant_approved, redemption link sent to ${youth.email}`);

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('[ERROR] on-grant-approved:', err);
    return new Response('ok', { status: 200 }); // always 200 — prevent Supabase retries on our bugs
  }
});
