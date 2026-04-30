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
    email_subject: "You've been matched with your Champion",
    email_body: `Placeholder — replace before launch. Variables available: {{youth_first_name}}, {{champion_first_name}}, {{champion_name}}, {{deadline_date}}, {{program_name}}
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    sms: "Hey {{first_name}}, you've been matched with your GripTape Champion! Check your email for next steps.",
    nudge_email_subject: 'Placeholder — replace before launch',
    nudge_email_body: `Placeholder — replace before launch
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    removal_email_subject: 'Placeholder — replace before launch',
    removal_email_body: `Placeholder — replace before launch
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
  },

  grant_pending: {
    email_subject: 'Complete your grant paperwork to unlock your $250',
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
    email_subject: 'Your GripTape grant is approved',
    email_body: `<p>Hi {{first_name}},</p>
<p>GripTape is sending you \${{grant_amount}} to put toward your passion. This grant is yours — use it to learn, build, and go after what lights you up. Choose how you want to receive it below and let's get you funded. — The GripTape Team</p>
<p><a href="{{redemption_link}}">Claim your grant →</a></p>
<p>One important thing: as you spend your stipend, keep your receipts and upload them here — it helps GripTape track how funds are being used. Upload as you go, no deadline.</p>
<p><a href="{{receipt_link}}">Upload your receipts →</a></p>
<p>Questions? Visit <a href="https://learning-challenge-legacy.vercel.app/help">https://learning-challenge-legacy.vercel.app/help</a></p>`,
    sms: `GripTape: Your \${{grant_amount}} grant is approved! Claim it here: {{redemption_link}}`,
  },

  tremendous_error: {
    staff_email_subject: 'ACTION REQUIRED — Tremendous payout failed for {{first_name}} {{last_name}}',
    staff_email_body: `<p>The Tremendous API call failed for youth <strong>{{first_name}} {{last_name}}</strong> (ID: {{youth_id}}).</p>
<p>Grant request ID: {{grant_request_id}}</p>
<p>The youth's status has NOT been advanced. Investigate and retry manually.</p>`,
  },

  ryan_notification: {
    staff_email_subject: 'Challenger Grant, {{legal_name}}',
    staff_email_body: `<p>• Challenger Progress ID: {{youth_id}}</p>
<p>• Preferred name: {{preferred_name}}</p>
<p>• Grant amount: \${{grant_amount}}</p>
<p>• Grant format: {{grant_format}}</p>
<p>• Youth email: {{email}}</p>
<p>• Youth legal name: {{legal_name}}</p>
<p>• Grant coding: {{grant_coding}}</p>
<p>• Date sent to finance: {{approved_at}}</p>`,
  },

  full_send_submitted: {
    email_subject: "Your Full Send is in 🎉",
    email_body: `<p>Hi {{first_name}},</p>
<p>Let's go. Your Full Send video is officially submitted.</p>
<p>You just did something real — you built something, learned something, and put it out into the world. That's what GripTape is about.</p>
<p>The GripTape team will review your video and be in touch soon. Sit tight — you've earned it.</p>
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
  },

  // ── Nudges ────────────────────────────────────────────────────────────────

  nudge_declaration: {
    email_subject: "Don't forget — complete your declaration",
    email_body: `<p>Hey {{first_name}}, just a reminder to complete your declaration form. You have a few days left. {{link}}</p>`,
    sms: "Hey {{first_name}}, don't forget to complete your GripTape declaration: {{link}}",
  },

  nudge_first_drop_1: {
    email_subject: 'Reminder — submit your First Drop video',
    email_body: `<p>Hey {{first_name}}, your First Drop video is due soon. Submit your YouTube link here: {{link}}</p>`,
    sms: 'Hey {{first_name}}, your First Drop video is due soon: {{link}}',
  },

  nudge_first_drop_2: {
    email_subject: 'Last chance — First Drop due tomorrow',
    email_body: `<p>Hey {{first_name}}, your First Drop deadline is almost here. Submit now: {{link}}</p>`,
    sms: 'Hey {{first_name}}, last chance to submit your First Drop: {{link}}',
  },

  nudge_orientation_1: {
    email_subject: 'Schedule your orientation call',
    email_body: `<p>Hey {{first_name}}, don't forget to connect with your Champion for your orientation call. Reach out to {{champion_name}} to get it scheduled.</p>`,
    sms: 'Hey {{first_name}}, reach out to your Champion {{champion_name}} to schedule your orientation call.',
  },

  nudge_orientation_2: {
    email_subject: 'Orientation call — deadline coming up',
    email_body: `<p>Hey {{first_name}}, your orientation call deadline is coming up fast. Connect with {{champion_name}} today.</p>`,
    sms: 'Hey {{first_name}}, your orientation call is due soon — connect with {{champion_name}} today.',
  },

  nudge_grant: {
    email_subject: 'Complete your grant paperwork',
    email_body: `<p>Hey {{first_name}}, your grant paperwork is still waiting. Complete it to unlock your $250 stipend: {{link}}</p>`,
    sms: "Hey {{first_name}}, don't forget your grant paperwork — unlock your $250 here: {{link}}",
  },

  nudge_full_send_1: {
    email_subject: 'Your Full Send is due in one week',
    email_body: `<p>Hey {{first_name}}, one week left to submit your Full Send video. Submit your YouTube link here: {{link}}</p>`,
    sms: 'Hey {{first_name}}, one week left to submit your Full Send: {{link}}',
  },

  nudge_full_send_2: {
    email_subject: 'Final reminder — Full Send due in 2 days',
    email_body: `<p>Hey {{first_name}}, your Full Send deadline is almost here. Submit now: {{link}}</p>`,
    sms: 'Hey {{first_name}}, last chance — your Full Send is due soon: {{link}}',
  },

  // ── Removals ──────────────────────────────────────────────────────────────

  removed_declaration: {
    email_subject: 'Your GripTape application has expired',
    email_body: `<p>Hey {{first_name}}, unfortunately your declaration deadline has passed and your spot has been released. We hope to see you apply again in the future.</p>`,
    sms: 'Hey {{first_name}}, your GripTape declaration deadline passed. Your spot has been released.',
  },

  removed_first_drop: {
    email_subject: 'Your GripTape application has expired',
    email_body: `<p>Hey {{first_name}}, unfortunately your First Drop deadline has passed and your spot has been released. We hope to see you apply again in the future.</p>`,
    sms: 'Hey {{first_name}}, your First Drop deadline passed. Your spot has been released.',
  },

  removed_orientation: {
    email_subject: 'Your GripTape spot has been released',
    email_body: `<p>Hey {{first_name}}, unfortunately your orientation call deadline has passed and your spot has been released. We hope to see you apply again.</p>`,
    sms: 'Hey {{first_name}}, your orientation deadline passed. Your spot has been released.',
  },

  removed_full_send: {
    email_subject: 'Your GripTape program has ended',
    email_body: `<p>Hey {{first_name}}, unfortunately your Full Send deadline has passed. Your program has ended. We hope you had a great experience.</p>`,
    sms: 'Hey {{first_name}}, your Full Send deadline passed. Your GripTape program has ended.',
  },

  // ── Full Send link dispatch ───────────────────────────────────────────────

  full_send_link: {
    email_subject: "It's time — submit your Full Send",
    email_body: `<p>Hey {{first_name}}, you've made it to the final step. Submit your Full Send video — a YouTube link showing what you built, learned, or created during the program: {{link}}</p>`,
    sms: 'Hey {{first_name}}, time to submit your Full Send! Submit your video here: {{link}}',
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
