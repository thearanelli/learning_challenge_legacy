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

    // Construct BoldSign dashboard URL from documentId — no extra API fetch needed.
    // Opens document overview in BoldSign dashboard — requires login.
    const documentUrl = `https://app.boldsign.com/documents/mydocuments/overview/?documentId=${documentId}`;

    // Write signed_at timestamp and doc URL to grant_requests
    const updateFields = docType === 'w9'
      ? { w9_signed_at: new Date().toISOString(), w9_doc_url: documentUrl, updated_at: new Date().toISOString() }
      : { agreement_signed_at: new Date().toISOString(), agreement_doc_url: documentUrl, updated_at: new Date().toISOString() };

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

    if (updated.w9_signed_at && updated.agreement_signed_at) {
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
        // Staff can manually trigger process-grant-signed if needed.
      }
    }

    console.log(`[boldsign-webhook] processed ${docType} completion for grant_request ${grantRequest.id}`);

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('[ERROR] boldsign-webhook:', err);
    return new Response('ok', { status: 200 }); // always 200 to BoldSign to prevent retries on our bugs
  }
});
