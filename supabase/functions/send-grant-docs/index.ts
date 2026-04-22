// OWNER: send BoldSign signing documents to youth at grant_pending
// Invoked directly by: process-orientation/index.ts via fetch
// NOT triggered by webhook — direct invocation only.
// Creates BoldSign documents from templates, updates grant_requests
// with document IDs, sends signing links to youth via dispatcher.
//
// BoldSign template/send response shape (confirmed 2026-04-22):
//   POST /v1/template/send?templateId=... returns 201 on success.
//   Response: { documentId, signingLink, status, createdDate, title }
//   Both documentId and signingLink are top-level fields.
//   Ref: https://developers.boldsign.com/documents/send-document-from-template/

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';

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

    // Load youth record
    const { data: youth, error: fetchError } = await supabase
      .from('youth')
      .select('id, first_name, last_name, email, phone, program_id, status')
      .eq('id', youth_id)
      .single();

    if (fetchError || !youth) {
      return new Response('Youth not found', { status: 400 });
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
      console.log(`[send-grant-docs] no grant_requests row for youth ${youth.id} — cannot proceed`);
      return new Response('No grant_requests row found', { status: 400 });
    }

    // Idempotency guard — skip if BoldSign docs already sent
    if (grantRequest.boldsign_w9_id) {
      console.log(`[send-grant-docs] skipping — already sent for youth ${youth.id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const boldSignApiKey = Deno.env.get('BOLDSIGN_API_KEY')!;
    const signerName = `${youth.first_name} ${youth.last_name}`;

    // Call BoldSign API — W-9
    const w9Res = await fetch(
      `https://api.boldsign.com/v1/template/send?templateId=${encodeURIComponent(Deno.env.get('BOLDSIGN_W9_TEMPLATE_ID')!)}`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': boldSignApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'W-9 Form — GripTape Learning Challenge',
          Roles: [
            {
              roleIndex: 1,
              signerName,
              signerEmail: youth.email,
              signerType: 'Signer',
              redirectUrl: `${config.BASE_URL}/grant-complete?doc=w9`,
            },
          ],
        }),
      }
    );

    if (!w9Res.ok) {
      const errText = await w9Res.text();
      throw new Error(`BoldSign W-9 request failed: ${w9Res.status} ${errText}`);
    }

    // documentId and signingLink are top-level in the 201 response
    const w9Data = await w9Res.json();
    const w9DocumentId: string = w9Data.documentId;
    const w9SigningUrl: string = w9Data.signingLink;

    // NOTE: if agreement call fails after W-9 succeeds, the W-9
    // document exists in BoldSign but grant_requests will not be
    // updated. Manual staff intervention required in that case.
    // V2: wrap both calls or handle partial failure explicitly.

    // Call BoldSign API — Participation Agreement
    const agreementRes = await fetch(
      `https://api.boldsign.com/v1/template/send?templateId=${encodeURIComponent(Deno.env.get('BOLDSIGN_AGREEMENT_TEMPLATE_ID')!)}`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': boldSignApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Participation Agreement — GripTape Learning Challenge',
          Roles: [
            {
              roleIndex: 1,
              signerName,
              signerEmail: youth.email,
              signerType: 'Signer',
              redirectUrl: `${config.BASE_URL}/grant-complete?doc=agreement`,
            },
          ],
        }),
      }
    );

    if (!agreementRes.ok) {
      const errText = await agreementRes.text();
      throw new Error(`BoldSign agreement request failed: ${agreementRes.status} ${errText}`);
    }

    const agreementData = await agreementRes.json();
    const agreementDocumentId: string = agreementData.documentId;
    const agreementSigningUrl: string = agreementData.signingLink;

    // Update grant_requests with both document IDs
    const { error: updateError } = await supabase
      .from('grant_requests')
      .update({
        boldsign_w9_id: w9DocumentId,
        boldsign_agreement_id: agreementDocumentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', grantRequest.id);

    if (updateError) {
      throw new Error(`Failed to update grant_requests: ${updateError.message}`);
    }

    // Send signing links to youth via dispatcher
    // vars map to {{w9_link}} and {{agreement_link}} in content.ts grant_pending block
    await sendNotification('grant_pending', youth, {
      w9_link: w9SigningUrl,
      agreement_link: agreementSigningUrl,
    });

    console.log(`[send-grant-docs] ${youth.id}: BoldSign requests created, signing links sent to ${youth.email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] send-grant-docs:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
