// OWNER: BoldSign document completion webhook handler
// Triggered by: BoldSign webhook on document.Completed event
// No JWT verification — deployed with --no-verify-jwt
// No signature verification for MVP — V2 hardening item
//
// BoldSign webhook payload shape (confirmed 2026-04-22):
//   event.eventType = "Completed" for document completion
//   data.documentId = the completed document's ID
//   Ref: https://developers.boldsign.com/webhooks/sample-event-data/

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';
import { driveFileName, uploadPdf } from '../_shared/gdrive.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    const eventType = body?.event?.eventType;
    if (eventType !== 'Completed') {
      console.log(`[boldsign-webhook] ignoring event: ${eventType}`);
      return new Response('ok', { status: 200 });
    }

    const documentId: string = body?.data?.documentId;
    if (!documentId) {
      console.error('[boldsign-webhook] missing documentId in payload');
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Look up grant_requests row by either document ID
    const { data: grantRequest, error: fetchError } = await supabase
      .from('grant_requests')
      .select('*')
      .or(`boldsign_w9_id.eq.${documentId},boldsign_agreement_id.eq.${documentId}`)
      .limit(1)
      .single();

    if (fetchError || !grantRequest) {
      console.log(`[boldsign-webhook] unrecognized documentId: ${documentId}`);
      return new Response('ok', { status: 200 });
    }

    const docType = grantRequest.boldsign_w9_id === documentId ? 'w9' : 'agreement';

    // Was this doc already stamped signed? (BoldSign webhook retries.)
    // Gates Drive filing and the process-grant-signed call to fire once.
    const alreadySigned = docType === 'w9'
      ? !!grantRequest.w9_signed_at
      : !!grantRequest.agreement_signed_at;

    // Construct BoldSign dashboard URL from documentId — no extra API fetch needed.
    // Opens document overview in BoldSign dashboard — requires login.
    const documentUrl = `https://app.boldsign.com/documents/mydocuments/overview/?documentId=${documentId}`;

    // File the signed PDF to Google Drive. Non-fatal: nothing downstream
    // depends on this succeeding — the Approve action self-heals missing files.
    let driveFields: Record<string, string> = {};
    if (!alreadySigned) {
      try {
        const { data: youthRow } = await supabase
          .from('youth')
          .select('first_name, last_name')
          .eq('id', grantRequest.youth_id)
          .single();
        const pdfRes = await fetch(
          `https://api.boldsign.com/v1/document/download?documentId=${documentId}`,
          { headers: { 'X-API-KEY': Deno.env.get('BOLDSIGN_API_KEY')! } },
        );
        if (!pdfRes.ok) throw new Error(`BoldSign download failed: ${pdfRes.status}`);
        const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
        const fileName = driveFileName(
          youthRow?.first_name ?? 'Unknown',
          youthRow?.last_name ?? '',
          docType === 'w9' ? 'W9' : 'Agreement',
        );
        const existingId = docType === 'w9'
          ? grantRequest.w9_drive_file_id
          : grantRequest.agreement_drive_file_id;
        const driveId = await uploadPdf({ fileId: existingId, name: fileName, bytes: pdfBytes });
        driveFields = docType === 'w9'
          ? { w9_drive_file_id: driveId }
          : { agreement_drive_file_id: driveId };
        console.log(`[boldsign-webhook] filed ${fileName} to Drive (${driveId})`);
      } catch (err) {
        console.error('[boldsign-webhook] Drive filing failed (non-fatal):', err);
      }
    }

    // Write signed_at timestamp, doc URL, and Drive file id to grant_requests
    const updateFields = docType === 'w9'
      ? { w9_signed_at: new Date().toISOString(), w9_doc_url: documentUrl, ...driveFields, updated_at: new Date().toISOString() }
      : { agreement_signed_at: new Date().toISOString(), agreement_doc_url: documentUrl, ...driveFields, updated_at: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('grant_requests')
      .update(updateFields)
      .eq('id', grantRequest.id);

    if (updateError) {
      throw new Error(`Failed to update grant_requests: ${updateError.message}`);
    }

    // Re-fetch to check if both docs are now signed
    const { data: updated, error: refetchError } = await supabase
      .from('grant_requests')
      .select('*')
      .eq('id', grantRequest.id)
      .single();

    if (refetchError || !updated) {
      throw new Error(`Failed to re-fetch grant_requests: ${refetchError?.message}`);
    }

    if (updated.w9_signed_at && updated.agreement_signed_at && !alreadySigned) {
      console.log(`[boldsign-webhook] both docs signed, calling process-grant-signed for youth ${updated.youth_id}`);

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseProjectRef = supabaseUrl
        .replace('https://', '')
        .replace('.supabase.co', '');

      const grantSignedRes = await fetch(
        `https://${supabaseProjectRef}.supabase.co/functions/v1/process-grant-signed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({ youth_id: updated.youth_id }),
        }
      );

      if (!grantSignedRes.ok) {
        console.error(
          '[boldsign-webhook] process-grant-signed call failed:',
          await grantSignedRes.text()
        );
        // Non-fatal — grant_requests row is fully updated.
        const staffEmail = Deno.env.get('STAFF_EMAIL');
        if (staffEmail) {
          await sendEmail({
            to: staffEmail,
            subject: `Grant flow error — process-grant-signed failed for grant ${grantRequest.id}`,
            html: `<p>Both BoldSign documents are signed, but the <strong>process-grant-signed</strong> function failed to execute.</p>
<p><strong>youth_id:</strong> ${updated.youth_id}<br>
<strong>grant_request_id:</strong> ${grantRequest.id}<br>
<strong>HTTP status:</strong> ${grantSignedRes.status}</p>
<p>Please check the function logs and manually trigger process-grant-signed for this youth.</p>`,
          });
        }
      }
    }

    console.log(`[boldsign-webhook] processed ${docType} completion for grant_request ${grantRequest.id}`);

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('[ERROR] boldsign-webhook:', err);
    return new Response('ok', { status: 200 }); // always 200 to BoldSign to prevent retries on our bugs
  }
});
