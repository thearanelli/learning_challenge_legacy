// WEBHOOK SETUP — configure manually in Supabase Dashboard → Database → Webhooks
// Name:      on_youth_completed
// Table:     public.youth
// Event:     UPDATE
// Condition: OLD.status != 'completed' AND NEW.status = 'completed'
// URL:       https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/process-completion
//
// Fires when staff manually sets youth.status = 'completed'.
// Sends the full_send_submitted alum email.
// Idempotency guard via comms_log prevents duplicate sends.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { sendNotification } from '../_shared/dispatcher.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const oldRecord = payload.old_record;
    const record = payload.record;

    // Guard: only fire on transition TO completed
    if (!record || !oldRecord) {
      return new Response('Missing payload', { status: 400 });
    }
    if (oldRecord.status === 'completed' || record.status !== 'completed') {
      console.log(`[process-completion] skipping — transition was ${oldRecord.status} → ${record.status}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const youth = record;

    // Idempotency: check comms_log for existing full_send_submitted
    const { data: existing } = await supabase
      .from('comms_log')
      .select('id')
      .eq('youth_id', youth.id)
      .eq('stage_key', 'full_send_submitted')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[process-completion] alum email already sent for youth ${youth.id} — skipping`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Send alum email
    await sendNotification(
      'full_send_submitted',
      {
        first_name: youth.first_name,
        last_name: youth.last_name,
        email: youth.email,
        phone: youth.phone,
      },
      { base_url: config.BASE_URL },
      { youth_id: youth.id },
      { skipSms: !youth.sms_consent },
    );

    console.log(`[process-completion] alum email sent to youth ${youth.id}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('[ERROR] process-completion:', err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
