// OWNER: video_pending -> accepted | video_resubmit transition
//        video_resubmit -> accepted | rejected transition
// Triggered by: Supabase database webhook on UPDATE to applications table
// next stage per config.STAGES.video_pending.next
//
// Policy:
//   video_pending  + valid video   -> accepted
//   video_pending  + invalid video -> video_resubmit (one 48hr chance)
//   video_resubmit + valid video   -> accepted
//   video_resubmit + invalid video -> rejected (no more chances)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { generateToken } from '../_shared/tokens.ts';
import { sendNotification } from '../_shared/dispatcher.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record?.id) {
      return new Response('No record in payload', { status: 400 });
    }

    // Only process records that are awaiting video validation
    const processableStatuses = ['video_pending', 'video_resubmit'];
    if (!processableStatuses.includes(record.screening_status)) {
      console.log(`[validate-video] SKIP — status is ${record.screening_status} for ${record.id}`);
      return new Response('Not processable status', { status: 200 });
    }

    if (!record.video_url) {
      console.log(`[validate-video] SKIP — no video_url for ${record.id}`);
      return new Response('No video_url', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const isResubmit = record.screening_status === 'video_resubmit';

    const oEmbedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(record.video_url)}&format=json`
    );

    if (oEmbedRes.ok) {
      // Valid video — accept regardless of whether this is first or resubmit
      await supabase
        .from('applications')
        .update({
          screening_status: 'accepted',
          access_token: null,
          stage_deadline_at: null,
        })
        .eq('id', record.id)
        .eq('screening_status', record.screening_status);

      console.log('[validate-video] accepted:', record.id);
      await sendNotification('video_accepted', record);

    } else if (isResubmit) {
      // Invalid video on resubmit — no more chances, reject
      await supabase
        .from('applications')
        .update({
          screening_status: 'rejected',
          access_token: null,
          stage_deadline_at: null,
        })
        .eq('id', record.id)
        .eq('screening_status', 'video_resubmit');

      console.log('[validate-video] rejected after resubmit:', record.id);
      await sendNotification('rejected', record);

    } else {
      // Invalid video on first attempt — open 48hr resubmit window
      // duration from config.VIDEO_RESUBMIT_HOURS
      const tokenData = generateToken(config.VIDEO_RESUBMIT_HOURS / 24);
      const resubmitLink = `${config.BASE_URL}/video?token=${tokenData.access_token}`;

      await supabase
        .from('applications')
        .update({
          screening_status: 'video_resubmit',
          access_token: tokenData.access_token,
          stage_deadline_at: tokenData.stage_deadline_at,
        })
        .eq('id', record.id)
        .eq('screening_status', 'video_pending');

      console.log('[validate-video] video_resubmit, new token generated:', record.id);
      await sendNotification('video_resubmit', record, { link: resubmitLink });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('[validate-video] error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
