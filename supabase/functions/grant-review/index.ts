// OWNER: grant approval actions — Thea approve -> Catherine approve.
// The *.supabase.co gateway refuses to render HTML (content-type rewritten to
// text/plain + sandbox CSP), so this function serves no pages:
//   GET  (no format param) -> 302 redirect to the confirm page on BASE_URL
//   GET  ?format=json      -> JSON state for that page to render
//   POST (JSON)            -> executes approve / staff_approve, returns JSON
// UI lives at forms/grant-review/index.html (Vercel, route /grant-review).
// Auth: grant_requests.review_token. Every action is state-guarded, so stale
// emails, double clicks, and scanner prefetches are harmless.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';
import { config } from '../_shared/config.ts';
import { driveFileName, driveViewUrl, fetchGrantPdf, uploadPdf } from '../_shared/gdrive.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('DB_SERVICE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': config.BASE_URL,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(req.url);
    let gr = url.searchParams.get('gr') ?? '';
    let t = url.searchParams.get('t') ?? '';
    let action = url.searchParams.get('action') ?? '';

    // Browser GET from an email button -> hand off to the Vercel page.
    if (req.method === 'GET' && url.searchParams.get('format') !== 'json') {
      const dest = `${config.BASE_URL}/grant-review?gr=${encodeURIComponent(gr)}&t=${encodeURIComponent(t)}&action=${encodeURIComponent(action)}`;
      return new Response(null, { status: 302, headers: { 'Location': dest, ...CORS } });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      gr = String(body.gr ?? gr);
      t = String(body.t ?? t);
      action = String(body.action ?? action);
    }
    if (!gr || !t || !['approve', 'staff_approve'].includes(action)) {
      return json({ state: 'invalid' });
    }

    const { data: grant } = await supabase
      .from('grant_requests').select('*').eq('id', gr).single();
    if (!grant || grant.review_token !== t) {
      return json({ state: 'invalid' });
    }
    const { data: youth } = await supabase
      .from('youth').select('id, first_name, last_name').eq('id', grant.youth_id).single();
    const name = youth ? `${youth.first_name} ${youth.last_name}` : (grant.legal_name ?? 'this Challenger');

    // State guards — identical semantics to the previous version
    if (grant.staff_approved) {
      const approvedOn = grant.staff_approved_at
        ? new Date(grant.staff_approved_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })
        : '';
      return json({ state: 'already_approved', approved_on: approvedOn });
    }
    if (action === 'approve' && (!grant.w9_signed_at || !grant.agreement_signed_at)) {
      return json({ state: 'waiting_signature', name });
    }
    if (action === 'staff_approve' && !grant.thea_approved) {
      return json({ state: 'not_ready' });
    }

    if (req.method === 'GET') {
      return json({
        state: action === 'approve' && grant.thea_approved ? 'resend' : 'confirm',
        action,
        name,
        amount: grant.grant_amount,
      });
    }

    // ---- POST: execute ----
    if (action === 'approve') {
      if (!grant.thea_approved) {
        await supabase.from('grant_requests')
          .update({ thea_approved: true, thea_approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', grant.id).eq('thea_approved', false);
      }

      // Gather PDFs — Drive first, BoldSign fallback; heal missing Drive ids
      const docs = [
        { label: 'W9' as const, driveId: grant.w9_drive_file_id, bsId: grant.boldsign_w9_id, col: 'w9_drive_file_id' },
        { label: 'Agreement' as const, driveId: grant.agreement_drive_file_id, bsId: grant.boldsign_agreement_id, col: 'agreement_drive_file_id' },
      ];
      const heal: Record<string, string> = {};
      const missingDocs: string[] = [];
      const driveLinks: string[] = [];
      for (const d of docs) {
        const fileName = driveFileName(youth?.first_name ?? 'Unknown', youth?.last_name ?? '', d.label);
        const got = await fetchGrantPdf({ driveFileId: d.driveId, fileName, boldsignDocumentId: d.bsId });
        if (!got) { missingDocs.push(d.label === 'W9' ? 'W-9' : 'Agreement'); continue; }
        let driveId = got.driveFileId;
        if (!driveId) {
          try { driveId = await uploadPdf({ fileId: null, name: fileName, bytes: got.bytes }); }
          catch (e) { console.error('[grant-review] Drive heal failed (non-fatal):', e); }
        }
        if (driveId && driveId !== d.driveId) heal[d.col] = driveId;
        if (driveId) driveLinks.push(`<a href="${driveViewUrl(driveId)}">${d.label === 'W9' ? 'W-9' : 'Agreement'}</a>`);
      }
      if (Object.keys(heal).length) {
        await supabase.from('grant_requests').update(heal).eq('id', grant.id);
      }

      const catherineEmail = Deno.env.get('CATHERINE_EMAIL');
      if (!catherineEmail) {
        return json({ state: 'error', message: 'Approved, but CATHERINE_EMAIL is not set in Supabase secrets, so her email could not be sent. Set it and click Approve again to resend.' });
      }
      const staffApproveLink = `${config.BASE_URL}/grant-review?gr=${grant.id}&t=${grant.review_token}&action=staff_approve`;
      const driveLine = driveLinks.length
        ? `Signed docs in Drive: ${driveLinks.join(' · ')}`
        : `<strong>Drive links unavailable — check with Thea before approving.</strong>`;
      const missingLine = missingDocs.length
        ? `<p><strong>Note: ${missingDocs.join(', ')} could not be located — check with Thea before approving.</strong></p>`
        : '';
      await sendEmail({
        to: catherineEmail,
        subject: `Grant approval needed — ${name} ($${grant.grant_amount})`,
        html: `<p><strong>${name}</strong> signed both grant documents. Reviewed and approved by Thea.</p>
<p>Amount: <strong>$${grant.grant_amount}</strong> · Topic: ${grant.challenge_topic ?? '—'}<br>
Legal name on file: ${grant.legal_name ?? '—'} · Age: ${grant.age ?? '—'}</p>
<p>${driveLine}</p>
${missingLine}
<a class="cta" href="${staffApproveLink}">Approve grant</a>
<p>Approving releases the $${grant.grant_amount} grant to ${youth?.first_name ?? name} via Tremendous. Questions? Reach Thea directly.</p>`,
      });
      console.log(`[grant-review] thea approved grant ${grant.id}, Catherine notified`);
      return json({ state: 'done', message: 'Approved — Catherine has been notified.' });
    }

    // staff_approve — conditional update; the existing on_grant_approved DB
    // webhook fires on this transition and handles Tremendous + youth comms.
    await supabase.from('grant_requests')
      .update({ staff_approved: true, staff_approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', grant.id).eq('staff_approved', false);
    console.log(`[grant-review] staff approved grant ${grant.id}`);
    return json({ state: 'done', message: `Done — $${grant.grant_amount} is on its way to ${youth?.first_name ?? name} via Tremendous.` });
  } catch (err) {
    console.error('[ERROR] grant-review:', err);
    return json({ state: 'error', message: 'Something went wrong — this action was not completed. Check the grant-review function logs.' }, 500);
  }
});
