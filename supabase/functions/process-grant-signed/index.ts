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
import { driveFileName, driveViewUrl, fetchGrantPdf, toBase64 } from '../_shared/gdrive.ts';

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

    // Review email: PDFs sourced from Drive (BoldSign fallback), Approve button.
    const approveLink = `${config.BASE_URL}/grant-review?gr=${grantRequest.id}&t=${grantRequest.review_token}&action=approve`;
    const docs = [
      { label: 'W9' as const, display: 'W-9', driveId: grantRequest.w9_drive_file_id, bsId: grantRequest.boldsign_w9_id },
      { label: 'Agreement' as const, display: 'Agreement', driveId: grantRequest.agreement_drive_file_id, bsId: grantRequest.boldsign_agreement_id },
    ];
    const attachments: Array<{ filename: string; content: string; content_type: string }> = [];
    const driveLinks: string[] = [];
    const missingDocs: string[] = [];
    for (const d of docs) {
      const fileName = driveFileName(youth.first_name, youth.last_name, d.label);
      const got = await fetchGrantPdf({ driveFileId: d.driveId, fileName, boldsignDocumentId: d.bsId });
      if (got) {
        attachments.push({ filename: fileName, content: toBase64(got.bytes), content_type: 'application/pdf' });
        if (got.driveFileId) driveLinks.push(`<a href="${driveViewUrl(got.driveFileId)}">${d.display}</a>`);
      } else {
        missingDocs.push(d.display);
      }
    }
    const driveLine = driveLinks.length
      ? `filed in Drive: ${driveLinks.join(' · ')}`
      : `<strong>Drive filing failed — will retry on approve.</strong>`;
    const missingLine = missingDocs.length
      ? `<p><strong>Could not attach: ${missingDocs.join(', ')} — check BoldSign.</strong></p>`
      : '';
    await sendEmail({
      to: [...new Set([config.STAFF_EMAIL, 'team@griptape.org'].filter(Boolean))],
      subject: `Grant review — ${youth.first_name} ${youth.last_name} ($${grantRequest.grant_amount})`,
      html: `<p><strong>${youth.first_name} ${youth.last_name}</strong> signed both grant documents.</p>
<p>Amount: <strong>$${grantRequest.grant_amount}</strong> · Topic: ${grantRequest.challenge_topic ?? '—'}<br>
Legal name on file: ${grantRequest.legal_name ?? '—'} · Age: ${grantRequest.age ?? '—'}</p>
<p>Signed PDFs attached, and ${driveLine}</p>
${missingLine}
<a class="cta" href="${approveLink}">Approve &amp; notify Catherine</a>
<div class="notice"><strong>Signed something wrong?</strong> Fix manually: 1) delete the doc in BoldSign and re-send it from the template, 2) once re-signed, replace the Drive file via Manage versions &rarr; Upload new version (don't delete + re-upload), 3) click Approve above &mdash; Catherine receives whatever's in Drive.</div>`,
      attachments: attachments.length ? attachments : undefined,
    });

    // Staff SMS ping (grant_review content block is now SMS-only)
    await sendStaffNotification('grant_review', {
      first_name: youth.first_name,
      last_name: youth.last_name,
    }, { youth_id: youth.id });

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
