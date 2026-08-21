// OWNER: grant_pending -> grant_review transition
// Invoked directly by: boldsign-webhook/index.ts via fetch
// NOT triggered by webhook — direct invocation only.
// Called when both BoldSign documents are signed.
// Advances status to grant_review, notifies staff via email + SMS.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendStaffNotification } from '../_shared/dispatcher.ts';
import { sendEmail } from '../_shared/email.ts';
import { config } from '../_shared/config.ts';

serve(async (req) => {
  let youth_id: string | null = null;
  try {
    const parsed = await req.json();
    youth_id = parsed.youth_id ?? null;

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
    if (youth.status !== 'grant_pending') {
      console.log(`[process-grant-signed] skipping — youth ${youth_id} is ${youth.status}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Load grant_requests row
    const { data: grantRequest, error: grantFetchError } = await supabase
      .from('grant_requests')
      .select('*')
      .eq('youth_id', youth.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (grantFetchError || !grantRequest) {
      throw new Error(`No grant_requests row found for youth ${youth.id}`);
    }

    // advance_status: grant_pending -> grant_review
    const { error: updateError } = await supabase.rpc('advance_status', {
      record_id: youth.id,
      table_name: 'youth',
      expected_current_status: 'grant_pending',
      next_status: 'grant_review',
      additional_fields: {},
    });

    if (updateError) {
      if (updateError.message?.includes('StatusConflictError')) {
        console.log(`[process-grant-signed] StatusConflictError for ${youth_id} — already processed`);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw new Error(`advance_status error: ${updateError.message}`);
    }

    await sendEmail({
      to: ['catherine@griptape.org', 'team@griptape.org'],
      subject: `Grant docs ready for review — ${youth.first_name} ${youth.last_name}`,
      html: `<p>Grant paperwork has been submitted and signed by <strong>${youth.first_name} ${youth.last_name}</strong>.</p><p>Please review in Supabase and toggle <code>staff_approved</code> on the grant_requests row when ready. Download the signed PDFs from BoldSign on the same day and save to <a href="https://drive.google.com/drive/folders/13Lu0W7Dn3ltv2r5KYPmYvnKsI9qugJPI">Google Drive</a>.</p>`,
    });

    // Notify staff via dispatcher (email + SMS)
    // Uses grant_review content block: staff_email_subject, staff_email_body, staff_sms
    await sendStaffNotification('grant_review', {
      first_name: youth.first_name,
      last_name: youth.last_name,
      email: youth.email,
      phone: youth.phone,
      w9_doc_url: grantRequest.w9_doc_url ?? '',
      agreement_doc_url: grantRequest.agreement_doc_url ?? '',
      base_url: config.BASE_URL,
      youth_id: youth.id,
    });

    console.log(`[process-grant-signed] ${youth.id}: advanced to grant_review, staff notified`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] process-grant-signed:', err);
    const staffEmail = Deno.env.get('STAFF_EMAIL');
    if (staffEmail) {
      await sendEmail({
        to: staffEmail,
        subject: `Grant flow error — process-grant-signed failed`,
        html: `<p>The <strong>process-grant-signed</strong> function threw an error.</p>
<p><strong>youth_id:</strong> ${youth_id ?? 'unknown (parsing failed)'}<br>
<strong>error:</strong> ${(err as Error).message}</p>
<p>Please check the function logs and manually advance the youth to grant_review if needed.</p>`,
      });
    }
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
