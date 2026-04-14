// OWNER: declaration_pending -> video_pending transition
// Invoked directly by: api/declare-submit.js via fetch
// NOT triggered by webhook — direct invocation ensures exactly
// one call per declaration. No idempotency guard needed.
// Generates video token, advances status to video_pending,
// sends declaration_confirmed email + SMS.
// NOTE: For production, move video link send to daily-scheduler
// to fire on day 7 instead of immediately.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';
import { generateToken } from '../_shared/tokens.ts';

serve(async (req) => {
  try {
    const { application_id } = await req.json();

    if (!application_id) {
      return new Response('Missing application_id', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (fetchError || !application) {
      throw new Error(`Failed to fetch application: ${fetchError?.message}`);
    }

    if (application.screening_status !== config.STATUS.DECLARATION_PENDING) {
      console.log(`[SKIP] ${application_id} is ${application.screening_status}`);
      return new Response('Not declaration_pending', { status: 200 });
    }

    const tokenData = generateToken(config.STAGES.video_pending.deadline_days);

    const { error: updateError } = await supabase
      .from('applications')
      .update({
        screening_status: config.STATUS.VIDEO_PENDING,
        access_token: tokenData.access_token,
        stage_deadline_at: tokenData.stage_deadline_at,
      })
      .eq('id', application.id)
      .eq('screening_status', config.STATUS.DECLARATION_PENDING);

    if (updateError) {
      throw new Error(`Failed to update token: ${updateError.message}`);
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
