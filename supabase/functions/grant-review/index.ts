// OWNER: grant approval actions — Thea approve -> Catherine approve.
// GET renders a confirm page (mail scanners prefetch GETs, so GET never
// mutates); the POSTed form executes. Deployed with --no-verify-jwt.
// Auth: grant_requests.review_token. Every action is state-guarded, so
// stale emails, double clicks, and prefetches are harmless:
//   approve        requires both signed_at + !staff_approved; if thea_approved
//                  already true it just re-sends Catherine's email (free retry)
//   staff_approve  requires thea_approved + !staff_approved; the update is
//                  conditional on staff_approved=false, and on-grant-approved's
//                  old_record guard makes double Tremendous fires impossible
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';
import { driveFileName, driveViewUrl, fetchGrantPdf, toBase64, uploadPdf } from '../_shared/gdrive.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('DB_SERVICE_KEY')!,
);

function page(title: string, bodyHtml: string): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — NYC Learning Challenge</title></head>
<body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:480px;margin:60px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<div style="background:#001722;padding:20px;text-align:center;color:#ffffff;font-weight:bold;font-size:16px">NYC Learning Challenge</div>
<div style="padding:28px;color:#222222;font-size:15px;line-height:1.6">${bodyHtml}</div>
</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

const BTN_STYLE = 'display:block;width:100%;background:#EA5329;color:#ffffff;border:none;padding:13px 24px;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;margin-top:16px';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    let gr = url.searchParams.get('gr') ?? '';
    let t = url.searchParams.get('t') ?? '';
    let action = url.searchParams.get('action') ?? '';
    if (req.method === 'POST') {
      const form = await req.formData();
      gr = String(form.get('gr') ?? gr);
      t = String(form.get('t') ?? t);
      action = String(form.get('action') ?? action);
    }
    if (!gr || !t || !['approve', 'staff_approve'].includes(action)) {
      return page('Not found', '<p>Invalid link.</p>');
    }

    const { data: grant } = await supabase
      .from('grant_requests').select('*').eq('id', gr).single();
    if (!grant || grant.review_token !== t) {
      return page('Not found', '<p>Invalid or expired link.</p>');
    }
    const { data: youth } = await supabase
      .from('youth').select('id, first_name, last_name').eq('id', grant.youth_id).single();
    const name = youth ? `${youth.first_name} ${youth.last_name}` : (grant.legal_name ?? 'this Challenger');

    // State guards — these make stale emails and double clicks harmless
    if (grant.staff_approved) {
      const when = grant.staff_approved_at
        ? new Date(grant.staff_approved_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })
        : '';
      return page('Already approved', `<p>This grant was approved${when ? ` on ${when}` : ''} — nothing to do.</p>`);
    }
    if (action === 'approve' && (!grant.w9_signed_at || !grant.agreement_signed_at)) {
      return page('Waiting on signature', `<p>A document for ${name} is pending a signature. You'll get a fresh review email once it's in.</p>`);
    }
    if (action === 'staff_approve' && !grant.thea_approved) {
      return page('Not ready', `<p>This grant hasn't completed Thea's review yet. Check with Thea before approving.</p>`);
    }

    if (req.method !== 'POST') {
      const form = (label: string) =>
        `<form method="POST"><input type="hidden" name="gr" value="${gr}"><input type="hidden" name="t" value="${t}"><input type="hidden" name="action" value="${action}"><button type="submit" style="${BTN_STYLE}">${label}</button></form>`;
      if (action === 'approve') {
        const lead = grant.thea_approved
          ? `<p>You already approved this grant. Resend Catherine's approval email?</p>`
          : `<p>Approve the <strong>$${grant.grant_amount}</strong> grant for <strong>${name}</strong> and notify Catherine?</p>`;
        return page('Approve grant', lead + form(grant.thea_approved ? 'Resend to Catherine' : 'Approve & notify Catherine'));
      }
      return page('Approve grant',
        `<p>Approve <strong>${name}</strong>'s <strong>$${grant.grant_amount}</strong> grant? This sends their funds via Tremendous.</p>` +
        form('Approve grant'));
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
      const attachments: Array<{ filename: string; content: string; content_type: string }> = [];
      const heal: Record<string, string> = {};
      const missingDocs: string[] = [];
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
        attachments.push({ filename: fileName, content: toBase64(got.bytes), content_type: 'application/pdf' });
      }
      if (Object.keys(heal).length) {
        await supabase.from('grant_requests').update(heal).eq('id', grant.id);
      }

      const catherineEmail = Deno.env.get('CATHERINE_EMAIL');
      if (!catherineEmail) {
        return page('Approved — action needed', `<p>Approved, but <strong>CATHERINE_EMAIL</strong> is not set in Supabase secrets, so her email could not be sent. Set it and click the Approve button again to resend.</p>`);
      }
      const staffApproveLink = `${Deno.env.get('SUPABASE_URL')}/functions/v1/grant-review?gr=${grant.id}&t=${grant.review_token}&action=staff_approve`;
      const folderLink = `https://drive.google.com/drive/folders/${Deno.env.get('GDRIVE_GRANT_FOLDER_ID')}`;
      const missingLine = missingDocs.length
        ? `<p><strong>Note: ${missingDocs.join(', ')} could not be attached — check with Thea before approving.</strong></p>`
        : '';
      await sendEmail({
        to: catherineEmail,
        subject: `Grant approval needed — ${name} ($${grant.grant_amount})`,
        html: `<p>Thea reviewed and approved grant paperwork for <strong>${name}</strong>.</p>
<p>Amount: <strong>$${grant.grant_amount}</strong> · Topic: ${grant.challenge_topic ?? '—'} · Legal name: ${grant.legal_name ?? '—'}</p>
<p>Signed W-9 and Participation Agreement attached (also in <a href="${folderLink}">Drive</a>).</p>
${missingLine}
<a class="cta" href="${staffApproveLink}">Approve grant</a>
<p>Approving releases the $${grant.grant_amount} grant to ${youth?.first_name ?? name} via Tremendous. Questions? Reach Thea directly.</p>`,
        attachments: attachments.length ? attachments : undefined,
      });
      console.log(`[grant-review] thea approved grant ${grant.id}, Catherine notified`);
      return page('Approved', `<p>Approved — Catherine has been notified.</p>`);
    }

    // staff_approve — conditional update; the existing on_grant_approved DB
    // webhook fires on this transition and handles Tremendous + youth comms.
    await supabase.from('grant_requests')
      .update({ staff_approved: true, staff_approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', grant.id).eq('staff_approved', false);
    console.log(`[grant-review] staff approved grant ${grant.id}`);
    return page('Grant approved', `<p>Done — $${grant.grant_amount} is on its way to ${youth?.first_name ?? name} via Tremendous.</p>`);
  } catch (err) {
    console.error('[ERROR] grant-review:', err);
    return page('Error', `<p>Something went wrong — this action was not completed. Check the grant-review function logs.</p>`);
  }
});
