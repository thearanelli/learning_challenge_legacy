// OWNER: declaration_pending -> video_pending transition
// Triggered by: Supabase webhook on applications UPDATE
// where screening_status = 'video_pending' (set by declare-submit.js)
// Generates video token and sends declaration_confirmed email + SMS.
// NOTE: For production, move video link send to daily-scheduler
// to fire on day 7 instead of immediately.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';
import { generateToken } from '../_shared/tokens.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const application = payload.record;

    if (!application?.id) {
      return new Response('No application record in payload', { status: 400 });
    }

    if (application.screening_status !== 'video_pending') {
      console.log(`[SKIP] ${application.id} is ${application.screening_status}`);
      return new Response('Not video_pending status', { status: 200 });
    }

    if (application.access_token) {
      console.log(`[SKIP] ${application.id} already has access_token set`);
      return new Response('Already processed', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const tokenData = generateToken(config.STAGES.video_pending.deadline_days);

    const { error: updateError } = await supabase
      .from('applications')
      .update({
        access_token: tokenData.access_token,
        stage_deadline_at: tokenData.stage_deadline_at,
      })
      .eq('id', application.id);

    if (updateError) {
      throw new Error(`Failed to update application: ${updateError.message}`);
    }

    const videoLink = `${config.BASE_URL}/video?token=${tokenData.access_token}`;
    const profileLink = `${config.BASE_URL}/profile?token=${application.profile_token}`;
    await sendNotification('declaration_confirmed', application, {
      video_link: videoLink,
      profile_link: profileLink,
    });

    console.log(`[PROCESS-DECLARATION] ${application.id}: video link sent`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] process-declaration:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
