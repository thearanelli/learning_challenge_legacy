// OWNER: video_pending -> accepted | video_resubmit transition
// Triggered by: Supabase database webhook on UPDATE to applications table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

    // Check YouTube oEmbed
    const oEmbedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(record.video_url)}&format=json`
    );

    if (oEmbedRes.ok) {
      console.log('[validate-video] VIDEO VALID — would set accepted and create youth record for:', record.id);
      console.log('[validate-video] would send acceptance comms to:', record.email);
    } else {
      console.log('[validate-video] VIDEO INVALID — would set video_resubmit for:', record.id);
      console.log('[validate-video] would send resubmit comms to:', record.email);
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
