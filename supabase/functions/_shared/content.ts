import { config } from './config.ts';

export const content = {
  declaration_pending: {
    email_subject: 'Step 1 done. You\'re invited to Step 2.',
    email_body: `<p>Hi {{first_name}},</p>
<p>It takes guts to put your passion into words. You did that — and that was Step 1.</p>
<p>Now you\'re invited to Step 2: see what GripTape is really about, straight from the 4,000+ teens who\'ve been exactly where you are. Builders who got real funding, a mentor, and the support to actually finish what they started.</p>
<p>See what they made. Then tell us if you\'re ready to do the same.</p>
<p><a href="{{link}}">Your spot isn\'t secured yet — Step 2 is how you get there →</a></p>
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    sms: 'Hi {{first_name}}, your GripTape app made it through. Read what\'s next and declare: {{link}}',
  },
  declaration_confirmed: {
    email_subject: 'Your 10 days start now',
    email_body: `<p>Hi {{first_name}},</p>
<p>You\'ve declared. Your 10 days have started.</p>
<p>Work on your passion project. Your video submission link is below.</p>
<p><a href="{{video_link}}">Submit your first drop video →</a></p>
<p>Your builder profile:<br>
<a href="{{profile_link}}">{{profile_link}}</a></p>
<p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    sms: 'Hi {{first_name}}, you\'re in. Submit your video: {{video_link}} Your profile: {{profile_link}}',
  },
  video_pending: {
    email_subject: 'You\'re accepted — submit your intro video',
    email_body: `<p>Hi {{first_name}},</p>
      <p>You've been accepted to the GripTape Learning Challenge!</p>
      <p>Submit your intro video within 10 days to secure your spot.</p>
      <p><a href="{{link}}">Click here to submit your video</a></p>
      <p><a href="{{profile_link}}">See your builder profile</a></p>
      <p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>
      <p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    sms: 'Hi {{first_name}}! You\'re accepted to GripTape. Submit your video: {{link}} (placeholder)',
  },
  rejected: {
    email_subject: 'Your GripTape Learning Challenge application',
    email_body: `<p>Hi {{first_name}},</p>
      <p>Thank you for applying. Unfortunately we\'re unable to move forward at this time.</p>
      <p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>
      <p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    sms: 'Hi {{first_name}}, thanks for applying to GripTape. We\'re unable to move forward at this time.',
  },
  flagged: {
    staff_sms: '[CONTENT FLAG] {{first_name}} {{last_name}} needs review. {{reasoning}}',
  },

  video_accepted: {
    email_subject: 'Your video is in — welcome to GripTape!',
    email_body: `<p>Hi {{first_name}},</p>
      <p>We received your intro video and you are officially in the GripTape Learning Challenge.</p>
      <p>Next steps coming soon.</p>
      <p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>
      <p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    sms: 'Hi {{first_name}}, your video is confirmed! You are officially in GripTape. Stay tuned for next steps.',
  },

  mentor_pending: {
    email_subject: 'Placeholder — replace before launch',
    email_body: `Placeholder — replace before launch. Variables available: {{youth_first_name}}, {{champion_first_name}}, {{champion_name}}, {{deadline_date}}, {{program_name}}
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    nudge_email_subject: 'Placeholder — replace before launch',
    nudge_email_body: `Placeholder — replace before launch
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    removal_email_subject: 'Placeholder — replace before launch',
    removal_email_body: `Placeholder — replace before launch
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
  },

  grant_pending: {
    email_subject: 'PLACEHOLDER — Sign your documents to unlock your stipend',
    email_body: `<p>PLACEHOLDER — Hi {{first_name}},</p>
<p>Your orientation call is complete. You are one step away from unlocking your $250 GripTape Learning Challenge stipend.</p>
<p>You need to sign two documents:</p>
<p>Sign your W-9 form:<br>
<a href="{{w9_link}}">{{w9_link}}</a></p>
<p>Sign your participation agreement:<br>
<a href="{{agreement_link}}">{{agreement_link}}</a></p>
<p>Both documents must be signed within 14 days.</p>
<p>Questions? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`,
    sms: `PLACEHOLDER — GripTape: Sign your documents to unlock your stipend. W-9: {{w9_link}} Agreement: {{agreement_link}}`,
  },

  grant_review: {
    staff_email_subject: 'Grant docs ready for review — {{first_name}} {{last_name}}',
    staff_email_body: `Grant documents signed and ready for review.

Youth: {{first_name}} {{last_name}}
Email: {{email}}
Phone: {{phone}}

Documents in BoldSign:
W-9: {{w9_doc_url}}
Participation agreement: {{agreement_doc_url}}

Approve: {{base_url}}/api/grant-approve?youth_id={{youth_id}}
Reject: {{base_url}}/api/grant-reject?youth_id={{youth_id}}

Note: approve/reject routes not built yet — coming next session.`,
    staff_sms: `GripTape: Grant docs ready for {{first_name}} {{last_name}}. Check email to approve.`,
  },

  grant_approved: {
    email_subject: 'PLACEHOLDER — Your GripTape grant is approved!',
    email_body: `<p>PLACEHOLDER — Hi {{first_name}},</p>
<p>Great news — your grant has been approved by the GripTape team!</p>
<p>To receive your $250 learning stipend, please complete your direct deposit information using the link below:</p>
<p><a href="{{deposit_link}}">Set up direct deposit →</a></p>
<p>Questions? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`,
    sms: `PLACEHOLDER — GripTape: Your grant is approved! Set up direct deposit to receive your $250: {{deposit_link}}`,
  },

  ryan_notification: {
    staff_email_subject: 'Grant disbursement — {{legal_name}}',
    staff_email_body: `<p>A grant has been approved and is ready for disbursement.</p>

<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Challenger name</td>
    <td style="padding:8px;border:1px solid #ddd;">{{first_name}} {{last_name}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Legal name</td>
    <td style="padding:8px;border:1px solid #ddd;">{{legal_name}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>
    <td style="padding:8px;border:1px solid #ddd;">{{email}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Phone</td>
    <td style="padding:8px;border:1px solid #ddd;">{{phone}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Grant amount</td>
    <td style="padding:8px;border:1px solid #ddd;">\${{grant_amount}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Payment format</td>
    <td style="padding:8px;border:1px solid #ddd;">{{grant_format}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Grant coding</td>
    <td style="padding:8px;border:1px solid #ddd;">{{grant_coding}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Challenger Progress ID</td>
    <td style="padding:8px;border:1px solid #ddd;">{{youth_id}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Approved on</td>
    <td style="padding:8px;border:1px solid #ddd;">{{approved_at}}</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">W-9</td>
    <td style="padding:8px;border:1px solid #ddd;"><a href="{{w9_doc_url}}">View in BoldSign</a></td>
  </tr>
</table>

<p style="margin-top:16px;color:#666;font-size:12px;">Tremendous disbursement pending — deposit link will be sent to challenger directly once wired.</p>`,
  },

  // Frontend form copy — canonical source; mirrored inline in forms/video/index.html
  forms: {
    video_oembed_error: "That doesn't appear to be a public YouTube video. Please check the link and try again.",
  },
};

export function renderContent(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replaceAll(`{{${key}}}`, val ?? ''),
    template
  );
}
