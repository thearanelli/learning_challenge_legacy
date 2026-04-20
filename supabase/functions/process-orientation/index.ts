// OWNER: mentor_pending -> grant_pending transition
// Invoked directly by: api/orientation-submit.js via fetch
// NOT triggered by webhook — direct invocation ensures exactly
// one call per orientation submission.
// Generates grant token, advances status to grant_pending,
// sends grant_pending email + SMS with grant link.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';
import { generateToken } from '../_shared/tokens.ts';

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

    // Idempotency guard — handles double-calls cleanly
    if (youth.status !== 'mentor_pending') {
      console.log(`[process-orientation] skipping — youth ${youth_id} is ${youth.status}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const tokenData = generateToken(config.STAGES.grant_pending.deadline_days);

    // advance_status: mentor_pending -> grant_pending
    const { error: updateError } = await supabase.rpc('advance_status', {
      record_id: youth.id,
      table_name: 'youth',
      expected_current_status: 'mentor_pending',
      next_status: 'grant_pending',
      additional_fields: {
        access_token: tokenData.access_token,
        stage_deadline_at: tokenData.stage_deadline_at,
      },
    });

    if (updateError) {
      if (updateError.message?.includes('StatusConflictError')) {
        console.log(`[process-orientation] StatusConflictError for ${youth_id} — already processed`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw new Error(`advance_status error: ${updateError.message}`);
    }

    const grantLink = `${config.BASE_URL}/grant?token=${tokenData.access_token}`;
    await sendNotification('grant_pending', youth, {
      grant_link: grantLink,
    });

    console.log(`[process-orientation] ${youth.id}: advanced to grant_pending, grant link sent`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] process-orientation:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
