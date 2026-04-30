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

    // Email only — no SMS for Full Send submission confirmation
    await sendNotification('full_send_submitted', {
      first_name: youth.first_name,
      last_name: youth.last_name,
      email: youth.email,
      phone: youth.phone,
    });

    console.log(`[process-full-send] ${youth.id}: advanced to full_send_review, confirmation email sent`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] process-full-send:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
