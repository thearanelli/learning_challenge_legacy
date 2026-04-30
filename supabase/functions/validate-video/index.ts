// OWNER: video_pending -> video_review transition
// Triggered by: Supabase database webhook on UPDATE to applications table
//
// Policy: confirm video_url is present, advance status to video_review,
// write video_submitted_at. Stops here — staff approves via pending_videos view.
// Idempotency: advance_status() RPC ensures only one invocation
// proceeds per transition. All others skip cleanly.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record?.id) {
      return new Response('No record in payload', { status: 400 });
    }

    if (record.screening_status !== config.STATUS.VIDEO_PENDING) {
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

    const { data: advanced, error: advanceError } = await supabase
      .rpc('advance_status', {
        record_id: record.id,
        table_name: 'applications',
        expected_current_status: config.STATUS.VIDEO_PENDING,
        next_status: config.STATUS.VIDEO_REVIEW,
        additional_fields: {
          stage_entered_at: new Date().toISOString(),
        },
      });

    if (advanceError) {
      throw new Error(`advance_status error: ${advanceError.message}`);
    }
    if (!advanced) {
      console.log(`[validate-video] SKIP — already claimed: ${record.id}`);
      return new Response('Already processing', { status: 200 });
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({ video_submitted_at: new Date().toISOString() })
      .eq('id', record.id);

    if (updateError) {
      throw new Error(`video_submitted_at update error: ${updateError.message}`);
    }

    console.log('[validate-video] advanced to video_review:', record.id);
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
