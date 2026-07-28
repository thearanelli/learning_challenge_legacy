// OWNER: EOC completion logging — no status transition, no notification
// Invoked directly by: api/end-of-challenge-submit.js via fetch
// NOT triggered by webhook — direct invocation ensures exactly
// one call per EOC submission.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { youth_id } = await req.json();

    if (!youth_id) {
      return new Response('Missing youth_id', { status: 400 });
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

    // Idempotency guard — skip if already processed
    if (youth.end_of_challenge_completed_at) {
      console.log(`[process-end-of-challenge] skipping — already completed for youth ${youth_id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[process-end-of-challenge] completed for youth ${youth_id}`);

    // Decrement champion's active_youth_count on EOC completion
    if (youth.champion_id) {
      const { data: champion } = await supabase
        .from('champions')
        .select('active_youth_count')
        .eq('id', youth.champion_id)
        .single();

      if (champion) {
        await supabase
          .from('champions')
          .update({ active_youth_count: Math.max(0, champion.active_youth_count - 1) })
          .eq('id', youth.champion_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] process-end-of-challenge:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
