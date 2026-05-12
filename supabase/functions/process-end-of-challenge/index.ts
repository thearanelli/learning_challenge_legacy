// OWNER: EOC notification send — no status transition
// Invoked directly by: api/end-of-challenge-submit.js via fetch
// NOT triggered by webhook — direct invocation ensures exactly
// one call per EOC submission.
// Sends end_of_challenge_confirmed notification to youth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';

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

    // Idempotency guard — check comms_log to avoid double sends
    const { data: existing } = await supabase
      .from('comms_log')
      .select('id')
      .eq('youth_id', youth.id)
      .eq('stage_key', 'end_of_challenge_confirmed')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[process-end-of-challenge] skipping — already sent for youth ${youth_id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    await sendNotification(
      'end_of_challenge_confirmed',
      {
        first_name: youth.first_name,
        last_name:  youth.last_name,
        email:      youth.email,
        phone:      youth.phone,
      },
      { base_url: Deno.env.get('BASE_URL') ?? 'https://learning-challenge-legacy.vercel.app' },
      { youth_id: youth.id },
      { skipSms: !youth.sms_consent },
    );

    console.log(`[process-end-of-challenge] completed for youth ${youth_id}`);

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
