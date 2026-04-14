// WEBHOOK SETUP — configure manually in Supabase Dashboard → Database → Webhooks
// Name:      on_application_accepted
// Table:     public.applications
// Events:    UPDATE
// Filter:    none — function checks screening_status internally
// URL:       https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/on-acceptance
//
// This function fires on every UPDATE to applications.
// It proceeds only when screening_status = 'accepted' (set manually by staff).
// Idempotency: skips if a youth row already exists for this application_id.
//
// No comms. No status transitions. Just creates the youth row.
// match-champion fires automatically on INSERT to youth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// next stage: config.STAGES.video_review.next = 'onboarding'
// youth row is created with initial status 'onboarding'
const INITIAL_STATUS = 'onboarding';

serve(async (req) => {
  try {
    const payload = await req.json();
    const application = payload.record;

    if (!application?.id) {
      return new Response('No record in payload', { status: 400 });
    }

    if (application.screening_status !== 'accepted') {
      console.log(`[on-acceptance] SKIP — status is ${application.screening_status} for ${application.id}`);
      return new Response('Not accepted status', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Idempotency: skip if youth row already exists for this application
    const { data: existing } = await supabase
      .from('youth')
      .select('id')
      .eq('application_id', application.id)
      .maybeSingle();

    if (existing) {
      console.log(`[on-acceptance] SKIP — youth row already exists for application ${application.id}`);
      return new Response(
        JSON.stringify({ skipped: true, youth_id: existing.id }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // Create youth row from application data
    const { data: youth, error: insertError } = await supabase
      .from('youth')
      .insert({
        program_id:     application.program_id,
        application_id: application.id,
        first_name:     application.first_name,
        last_name:      application.last_name,
        email:          application.email,
        phone:          application.phone,
        address:        application.address,
        birthdate:      application.birthdate,
        status:         INITIAL_STATUS,
        first_drop_url: application.video_url ?? null,
        accepted_at:    new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to insert youth row: ${insertError.message}`);
    }

    console.log(`[on-acceptance] Created youth ${youth.id} for application ${application.id}`);

    return new Response(
      JSON.stringify({ success: true, youth_id: youth.id }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[on-acceptance] error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
