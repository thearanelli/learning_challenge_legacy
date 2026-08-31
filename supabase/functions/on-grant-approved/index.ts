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
import { generateToken } from '../_shared/tokens.ts';

const TREMENDOUS_CAMPAIGN_ID = Deno.env.get('TREMENDOUS_CAMPAIGN_ID') ?? 'NHJKHB0YT1OD';

serve(async (req) => {
  try {
    const ALLOW_REAL_GRANTS = Deno.env.get('ALLOW_REAL_GRANTS') === 'true';
    const TREMENDOUS_BASE_URL = Deno.env.get('TREMENDOUS_BASE_URL') ?? '';

    // Safety: refuse to run if sandbox URL is active with real grants enabled
    if (ALLOW_REAL_GRANTS && TREMENDOUS_BASE_URL.includes('testflight')) {
      console.error('[on-grant-approved] CRITICAL: ALLOW_REAL_GRANTS is true but Tremendous URL is testflight — refusing to run');
      return new Response('Sandbox/production mismatch — refusing to process', { status: 500 });
    }

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

    // Layer 2: skip Tremendous for test emails
    const isTestEmail = youth.email.includes('thea@') || youth.email.toLowerCase().includes('test');

    if (!youth.orientation_call_completed_at) {
      console.error(`[on-grant-approved] blocking — youth ${youth.id} has no orientation call on record`);
      const staffEmail = Deno.env.get('STAFF_EMAIL');
      if (staffEmail) {
        await sendEmail({
          to: staffEmail,
          subject: `Grant blocked — no orientation call on record for ${youth.first_name} ${youth.last_name}`,
          html: `<p>A grant approval was blocked because no orientation call is on record for this youth.</p>
<p><strong>youth_id:</strong> ${youth.id}<br>
<strong>grant_request_id:</strong> ${record.id}</p>
<p>Please verify the orientation was completed and manually unblock if needed.</p>`,
        });
      }
      return new Response('Youth has no orientation call — blocking grant', { status: 400 });
    }
    if (!youth.first_drop_url) {
      console.error(`[on-grant-approved] blocking — youth ${youth.id} has no First Drop on record`);
      const staffEmail = Deno.env.get('STAFF_EMAIL');
      if (staffEmail) {
        await sendEmail({
          to: staffEmail,
          subject: `Grant blocked — no First Drop on record for ${youth.first_name} ${youth.last_name}`,
          html: `<p>A grant approval was blocked because no First Drop video is on record for this youth.</p>
<p><strong>youth_id:</strong> ${youth.id}<br>
<strong>grant_request_id:</strong> ${record.id}</p>
<p>Please verify the First Drop was submitted and manually unblock if needed.</p>`,
        });
      }
      return new Response('Youth has no First Drop — blocking grant', { status: 400 });
    }

    // Set staff_approved_at and mailing_address — only if not already set (idempotency)
    await supabase
      .from('grant_requests')
      .update({
        staff_approved_at: new Date().toISOString(),
        updated_at:        new Date().toISOString(),
        mailing_address:   [youth.street_address, youth.city, youth.state, youth.zip].filter(Boolean).join(', ') || null,
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

    const { data: alreadySent } = await supabase
      .from('comms_log')
      .select('id')
      .eq('youth_id', youth.id)
      .eq('stage_key', 'grant_approved')
      .limit(1);

    if (alreadySent && alreadySent.length > 0) {
      console.log(`[on-grant-approved] grant_approved already in comms_log for youth ${youth.id} — skipping`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const MAX_GRANT_AMOUNT = 250;
    if (grantRequest.grant_amount > MAX_GRANT_AMOUNT) {
      console.error(`[on-grant-approved] blocking — grant amount ${grantRequest.grant_amount} exceeds max ${MAX_GRANT_AMOUNT}`);
      return new Response('Grant amount exceeds maximum — blocked', { status: 400 });
    }

    // Call Tremendous API — must succeed before we advance status
    const isSandbox = TREMENDOUS_BASE_URL.includes('testflight');

    // Block production disbursements unless explicitly enabled
    if (!isSandbox && !ALLOW_REAL_GRANTS) {
      console.error('[on-grant-approved] CRITICAL: production Tremendous URL but ALLOW_REAL_GRANTS is false — blocking');
      return new Response('ALLOW_REAL_GRANTS must be true for production grants', { status: 500 });
    }

    let redemptionLink = '';
    let tremendousRewardId = '';
    let reward: any = null;

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
        'User-Agent': 'GripTape-LearningChallenge/1.0',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!tremendousRes.ok) {
      const errText = await tremendousRes.text();
      console.error(`[on-grant-approved] Tremendous API error ${tremendousRes.status} for youth ${youthId}`);
      console.error('[on-grant-approved] Tremendous error body:', errText);
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
    redemptionLink = tremendousData?.order?.rewards?.[0]?.delivery?.link ?? '';
    tremendousRewardId = tremendousData?.order?.rewards?.[0]?.id ?? '';

    if (!redemptionLink) {
      console.error(`[on-grant-approved] redemption URL missing for youth ${youth.id} — not sending youth email`);
      await sendNotification(
        'tremendous_error',
        { first_name: 'NYC Learning Challenge', last_name: 'Staff', email: Deno.env.get('STAFF_EMAIL')!, phone: '' },
        {
          first_name: youth.first_name,
          last_name: youth.last_name,
          youth_id: youth.id,
          grant_request_id: record.id,
        },
        { youth_id: youth.id },
        { skipSms: true },
      );
      return new Response(JSON.stringify({ ok: false, error: 'No redemption URL' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

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

    reward = tremendousData?.order?.rewards?.[0];
    if (!reward?.id || !reward?.delivery?.link) {
      throw new Error('Tremendous order created but reward missing — not advancing status');
    }

    // advance_status: grant_review -> grant_approved
    const { error: updateError } = await supabase.rpc('advance_status', {
      record_id: youth.id,
      table_name: 'youth',
      expected_current_status: 'grant_review',
      next_status: 'grant_approved',
      additional_fields: {
        stage_entered_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      if (updateError.message?.includes('StatusConflictError')) {
        console.log(`[on-grant-approved] StatusConflictError for ${youthId} — already processed`);
        return new Response('ok', { status: 200 });
      }
      throw new Error(`advance_status error: ${updateError.message}`);
    }

    // Generate receipt upload token (365-day window, no hard deadline)
    // Stored in dedicated receipt_token column so S4 Full Send dispatch
    // can overwrite access_token without killing the receipt link.
    const receiptTokenData = generateToken(365);
    await supabase
      .from('youth')
      .update({
        receipt_token:            receiptTokenData.access_token,
        receipt_token_expires_at: receiptTokenData.stage_deadline_at,
        updated_at:               new Date().toISOString(),
      })
      .eq('id', youth.id);

    const receiptLink = `${config.BASE_URL}/receipts?token=${receiptTokenData.access_token}`;
    const referralLink = `${config.BASE_URL}/?ref=${youth.first_name.toLowerCase()}-${youth.last_name.toLowerCase()}`;

    // Send grant_approved email + SMS to youth with redemption link, receipt upload link, and referral link
    await sendNotification('grant_approved', youth, {
      redemption_link: redemptionLink,
      grant_amount:    String(grantRequest.grant_amount),
      receipt_link:    receiptLink,
      referral_link:   referralLink,
      base_url:        config.BASE_URL,
    }, { youth_id: youth.id }, { skipSms: !youth.sms_consent });

    // Send disbursement notification to Ryan
    const ryanEmail = config.RYAN_EMAIL;
    if (ryanEmail) {
      const block = (content as Record<string, any>)['ryan_notification'];
      const vars = {
        youth_id:       youth.id,
        preferred_name: youth.first_name,
        last_name:      youth.last_name,
        grant_amount:   String(grantRequest.grant_amount),
        grant_format:   grantRequest.grant_format ?? 'Not specified',
        email:          youth.email,
        legal_name:     grantRequest.legal_name  ?? 'Not provided',
        grant_coding:   grantRequest.grant_coding ?? 'GS_NYLC',
        approved_at:    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      await sendEmail({
        to:      [ryanEmail, 'ryanalex@gmail.com'],
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
