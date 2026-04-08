// OWNER: video_pending -> accepted | rejected transition
// Triggered by: Supabase database webhook on UPDATE to applications table
// next stage per config.STAGES.video_pending.next
//
// Policy: one chance only.
//   valid video   -> accepted
//   invalid video -> rejected

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record?.id) {
      return new Response('No record in payload', { status: 400 });
    }

    if (record.screening_status !== 'video_pending') {
      console.log(`[validate-video] SKIP — status is ${record.screening_status} for ${record.id}`);
      return new Response('Not video_pending status', { status: 200 });
    }

    if (!record.video_url) {
      console.log(`[validate-video] SKIP — no video_url for ${record.id}`);
      return new Response('No video_url', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const oEmbedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(record.video_url)}&format=json`
    );

    if (oEmbedRes.ok) {
      // Valid video — accept
      await supabase
        .from('applications')
        .update({
          screening_status: 'accepted',
          access_token: null,
          stage_deadline_at: null,
        })
        .eq('id', record.id)
        .eq('screening_status', 'video_pending');

      console.log('[validate-video] accepted:', record.id);
      await sendNotification('video_accepted', record);

    } else {
      // Invalid video — reject immediately, one chance only
      await supabase
        .from('applications')
        .update({
          screening_status: 'rejected',
          access_token: null,
          stage_deadline_at: null,
        })
        .eq('id', record.id)
        .eq('screening_status', 'video_pending');

      console.log('[validate-video] rejected — invalid video:', record.id);
      await sendNotification('rejected', record);
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
