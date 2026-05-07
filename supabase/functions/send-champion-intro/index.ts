// WEBHOOK SETUP — configure manually in Supabase Dashboard → Database → Webhooks
// Name:      on_youth_mentor_pending
// Table:     public.youth
// Event:     UPDATE
// Condition: OLD.status = 'onboarding' AND NEW.status = 'mentor_pending'
// URL:       https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/send-champion-intro
//
// Fires whenever a youth row transitions from onboarding → mentor_pending.
// This covers both paths:
//   - Automated: advance_status() in match-champion triggers the status change
//   - Manual staff: direct SQL UPDATE setting champion_id + status + token fields
//
// This function only sends the intro email. It does NOT call advance_status()
// and does NOT set champion_id — those are already done before this fires.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { sendNotification } from '../_shared/dispatcher.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const youthRecord = payload.record;

    if (!youthRecord?.id) {
      return new Response('No record in payload', { status: 400 });
    }

    // Guard: only fire on onboarding → mentor_pending transition.
    // Prevents duplicate fires when other fields on a mentor_pending
    // youth row are updated (e.g. orientation_responses PATCH).
    const oldStatus = payload.old_record?.status;
    const newStatus = youthRecord.status;
    if (oldStatus !== config.STATUS.ONBOARDING || newStatus !== config.STATUS.MENTOR_PENDING) {
      console.log(
        `[send-champion-intro] skipping — transition was ${oldStatus} → ${newStatus}`,
      );
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Step 1 — Load full youth record; exit cleanly if not mentor_pending
    const { data: youth, error: youthErr } = await supabase
      .from('youth')
      .select('*')
      .eq('id', youthRecord.id)
      .single();

    if (youthErr || !youth) {
      throw new Error(`Failed to load youth: ${youthErr?.message}`);
    }

    if (youth.status !== config.STATUS.MENTOR_PENDING) {
      console.log(
        `[send-champion-intro] youth ${youth.id} status is '${youth.status}', not mentor_pending — skipping`,
      );
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Step 2 — Load champion via youth.champion_id
    if (!youth.champion_id) {
      throw new Error(`youth ${youth.id} has no champion_id — cannot send intro email`);
    }

    const { data: champion, error: champErr } = await supabase
      .from('champions')
      .select('id, first_name, last_name, email, phone, bio')
      .eq('id', youth.champion_id)
      .single();

    if (champErr || !champion) {
      throw new Error(`Failed to load champion ${youth.champion_id}: ${champErr?.message}`);
    }

    // Step 3 — Send intro comms: email + SMS to youth, email only to champion
    const deadlineDays = config.STAGES.mentor_pending.deadline_days!;
    const deadlineDate = new Date(Date.now() + deadlineDays * 86400000).toLocaleDateString(
      'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    );

    const vars = {
      youth_first_name:    youth.first_name,
      champion_first_name: champion.first_name,
      champion_name:       `${champion.first_name} ${champion.last_name}`,
      champion_bio:        champion.bio ?? '',
      champion_phone:      champion.phone ?? '',
      deadline_date:       deadlineDate,
      program_name:        'GripTape Learning Challenge',
      base_url:            config.BASE_URL,
    };

    // Youth: email + SMS
    await sendNotification(
      'mentor_pending',
      { first_name: youth.first_name, last_name: youth.last_name, email: youth.email, phone: youth.phone },
      vars,
      { youth_id: youth.id },
    );

    // Champion: email only, no SMS
    await sendNotification(
      'mentor_pending',
      { first_name: champion.first_name, last_name: champion.last_name, email: champion.email, phone: '' },
      vars,
      { youth_id: youth.id },
      { skipSms: true },
    );

    console.log(
      `[send-champion-intro] intro comms sent — youth ${youth.id}, champion ${champion.id}`,
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[send-champion-intro] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
