// OWNER: mentor_pending -> grant_pending transition
// Invoked directly by: api/orientation-submit.js via fetch
// NOT triggered by webhook — direct invocation ensures exactly
// one call per orientation submission.
// Advances status to grant_pending, creates grant_requests row,
// calls send-grant-docs to send BoldSign signing links to youth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { generateToken } from '../_shared/tokens.ts';

serve(async (req) => {
  try {
    const { youth_id, challenge_topic, grant_amount, grant_format, legal_name } = await req.json();

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
        token_expires_at: tokenData.stage_deadline_at,
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

    const { error: grantError } = await supabase
      .from('grant_requests')
      .insert({
        program_id: youth.program_id,
        youth_id: youth.id,
      });

    if (grantError) {
      console.error(
        '[process-orientation] failed to create grant_requests:',
        grantError.message
      );
      // Non-fatal — status already advanced. Log and continue.
    }

    await supabase
      .from('grant_requests')
      .update({
        grant_format:    grant_format,
        grant_amount:    grant_amount,
        challenge_topic: challenge_topic,
        legal_name:      legal_name,
        updated_at:      new Date().toISOString(),
      })
      .eq('youth_id', youth.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseProjectRef = supabaseUrl
      .replace('https://', '')
      .replace('.supabase.co', '');

    const sendDocsRes = await fetch(
      `https://${supabaseProjectRef}.supabase.co/functions/v1/send-grant-docs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ youth_id: youth.id }),
      }
    );

    if (!sendDocsRes.ok) {
      console.error(
        '[process-orientation] send-grant-docs call failed:',
        await sendDocsRes.text()
      );
      // Non-fatal — grant_requests row exists, staff can
      // manually trigger send-grant-docs if needed
    }

    console.log(`[process-orientation] ${youth.id}: advanced to grant_pending, grant_requests created, send-grant-docs called`);

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
