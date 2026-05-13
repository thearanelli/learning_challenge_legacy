// OWNER: final_video_pending -> full_send_review transition
// Invoked directly by: api/final-video-submit.js via fetch
// NOT triggered by webhook — direct invocation ensures exactly
// one call per Full Send submission.
// Writes full_send_url, advances status to full_send_review,
// sends confirmation email to youth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { sendNotification } from '../_shared/dispatcher.ts';

serve(async (req) => {
  try {
    const { youth_id, full_send_url } = await req.json();

    if (!youth_id || !full_send_url) {
      return new Response('Missing youth_id or full_send_url', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const { data: youth, error: fetchError } = await supabase
      .from('youth')
      .select('*')
      .eq('id', youth_id)
      .single();

    if (fetchError || !youth) {
      return new Response('Youth not found', { status: 400 });
    }

    // Idempotency guard — handles double-calls cleanly
    if (youth.status !== config.STATUS.FINAL_VIDEO_PENDING) {
      console.log(`[process-full-send] skipping — youth ${youth_id} is ${youth.status}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Write full_send_url and advance status in one RPC call
    const { error: updateError } = await supabase.rpc('advance_status', {
      record_id: youth.id,
      table_name: 'youth',
      expected_current_status: config.STATUS.FINAL_VIDEO_PENDING,
      next_status: config.STATUS.FULL_SEND_REVIEW,
      additional_fields: {
        full_send_url,
        stage_entered_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      if (updateError.message?.includes('StatusConflictError')) {
        console.log(`[process-full-send] StatusConflictError for ${youth_id} — already processed`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw new Error(`advance_status error: ${updateError.message}`);
    }

    // Fetch champion name and phone for received email
    let championName = '';
    let championPhone = '';
    if (youth.champion_id) {
      const { data: champ } = await supabase
        .from('champions')
        .select('first_name, last_name, phone')
        .eq('id', youth.champion_id)
        .single();
      if (champ) {
        championName = `${champ.first_name} ${champ.last_name}`;
        championPhone = champ.phone ?? '';
      }
    }

    // EOC status for staff notification
    const eocStatus = youth.end_of_challenge_completed_at ? 'Yes' : 'No';

    // Send received confirmation to youth
    await sendNotification(
      'full_send_received',
      { first_name: youth.first_name, last_name: youth.last_name, email: youth.email, phone: youth.phone },
      {
        champion_name: championName,
        champion_phone: championPhone,
        base_url: config.BASE_URL,
      },
      { youth_id: youth.id },
      { skipSms: !youth.sms_consent },
    );

    // Send staff notification to Thea
    await sendNotification(
      'full_send_staff_notification',
      { first_name: 'GripTape', last_name: 'Staff', email: Deno.env.get('STAFF_EMAIL')!, phone: '' },
      {
        first_name: youth.first_name,
        last_name: youth.last_name,
        full_send_url: full_send_url,
        eoc_status: eocStatus,
        youth_id: youth.id,
        email: youth.email,
        base_url: config.BASE_URL,
      },
      { youth_id: youth.id },
      { skipSms: true },
    );

    console.log(`[process-full-send] ${youth.id}: advanced to full_send_review, confirmation email sent`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] process-full-send:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
