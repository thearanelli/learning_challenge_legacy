import { config } from './config.ts';

export function styledEmailBody(html: string): string {
  return html
    // <p> tags without existing style
    .replace(/<p(?!\s+style=)>/g, '<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#222222;font-family:Arial,Helvetica,sans-serif">')
    // <a class="cta"> CTA buttons
    .replace(/<a class="cta"/g, '<a class="cta" style="display:block;background:#EA5329;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;font-size:15px;text-align:center;margin:20px 0;font-family:Arial,Helvetica,sans-serif"')
    // <strong> deadline/emphasis text
    .replace(/<strong(?!\s+style=)>/g, '<strong style="font-weight:bold;color:#EA5329">')
    // <blockquote> champion bio
    .replace(/<blockquote(?!\s+style=)>/g, '<blockquote style="background:#f9f9f9;border-left:3px solid #EA5329;padding:12px 16px;margin:14px 0;font-style:italic;font-size:14px;color:#555;font-family:Arial,Helvetica,sans-serif">')
    // <div class="notice"> important notice blocks
    .replace(/<div class="notice">/g, '<div class="notice" style="background:#fff8e1;border-left:3px solid #F79227;padding:12px 16px;margin:14px 0;font-size:14px;color:#333;font-family:Arial,Helvetica,sans-serif">');
}

export function wrapEmailHtml(body: string, helpUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>GripTape</title>
<style type="text/css">
  body { margin: 0 !important; padding: 0 !important; background-color: #ffffff !important; }
  table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  td { padding: 0; }
  img { border: 0; display: block; }
  @media screen and (max-width: 600px) {
    .email-wrapper { width: 100% !important; min-width: 100% !important; }
    .email-body { padding: 24px 20px !important; }
    .email-header { padding: 20px 20px 16px !important; }
    .email-footer { padding: 16px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff">
<!--[if mso]>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td>
<![endif]-->
<table class="email-wrapper" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse">

  <tr>
    <td class="email-header" style="background:#001722;padding:28px 40px 22px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
      <img src="https://cdn.prod.website-files.com/640b7fef2e2b16effc0a7b1e/644b0baddf9bc8c57b2514ca_GripTape_wordmark_white.png" alt="GripTape" width="160" style="height:32px;width:auto;display:block;margin:0 auto">
    </td>
  </tr>

  <tr>
    <td class="email-body" style="background:#ffffff;padding:36px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#222222">
      ${body}
    </td>
  </tr>

  <tr>
    <td class="email-footer" style="background:#001722;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.1)">
      <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.9);font-weight:bold;font-family:Arial,Helvetica,sans-serif">Questions or need help?</p>
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px"><a href="${helpUrl}" style="color:#EA5329;text-decoration:none;font-weight:bold">${helpUrl}</a></p>
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);font-family:Arial,Helvetica,sans-serif">Do not reply to this email — it won't reach anyone.</p>
    </td>
  </tr>

</table>
<!--[if mso]>
</td></tr></table>
</td></tr></table>
<![endif]-->
</body>
</html>`;
}

export async function sendEmail({
  to,
  subject,
  html,
  skipWrapper = false,
}: {
  to: string | string[];
  subject: string;
  html: string;
  skipWrapper?: boolean;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to,
      subject,
      html: skipWrapper ? html : wrapEmailHtml(styledEmailBody(html), `${config.BASE_URL}/help`),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log(`[EMAIL] Sent "${subject}" to ${to}`);
  return data;
}
