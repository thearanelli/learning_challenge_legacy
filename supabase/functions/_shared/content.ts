import { config } from './config.ts';

export const content = {
  declaration_pending: {
    email_subject: "Step 1 done. You're invited to Step 2.",
    email_body: `<p>Hey {{first_name}},</p>
<p>Your passion for {{passion}} stood out. We want to see where you take it.</p>
<p>You've completed Step 1. Now it's time to earn your spot.</p>
<p>You're invited to Step 2: see what GripTape is really about, straight from the 4,000+ teens who've been exactly where you are. Builders who got real funding, a mentor, and the support to actually finish what they started.</p>
<p>See what they made. Then tell us if you're ready to do the same.</p>
<p><a href="{{link}}">Your spot isn't secured yet — Step 2 is how you get there →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hi {{first_name}}, your GripTape app made it through. Read what\'s next and declare: {{link}}',
  },
  declaration_confirmed: {
    email_subject: 'Your 10 days start now.',
    email_body: `<p>Hey {{first_name}},</p>
<p>You've committed. Your 10 days have started.</p>
<p>Starting is sometimes the hardest part. Don't overthink it — pick something small, make it happen, and build from there.</p>
<p>Head down. No excuses. We'll send you your First Drop submission link in 7 days. Until then, just go build something.</p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
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

  mentor_pending: {
    email_subject: "You're in. Meet your Champion.",
    email_body: `<p>Hey {{first_name}},</p>
<p>You made it. Your First Drop video was impressive. You're officially a GripTape Challenger.</p>
<p>This is real — you've earned up to $250 to invest in your passion project, and someone in your corner the whole way.</p>
<p>That someone is {{champion_first_name}} {{champion_last_name}} — your Champion.</p>
<p>{{champion_bio}}</p>
<p>To kick off your GripTape Challenge, you and {{champion_first_name}} will have a 1-hour orientation call. You'll map out your goals, plan your project, and go over next steps — including accessing your funding and joining the GripTape community.</p>
<p>Reach out to {{champion_first_name}} to schedule that call as soon as possible: {{champion_phone}}</p>
<p>You have 7 days to complete your orientation — after that we have to give your spot to someone else.</p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: "You're officially a GripTape Challenger! Meet your Champion: {{champion_name}}. They'll be in touch soon. Let's build something real.",
    nudge_email_subject: 'Placeholder — replace before launch',
    nudge_email_body: `Placeholder — replace before launch
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
    removal_email_subject: 'Placeholder — replace before launch',
    removal_email_body: `Placeholder — replace before launch
<p>Need help? Visit <a href="${config.BASE_URL}/help">${config.BASE_URL}/help</a></p>`, // help footer
  },

  grant_pending: {
    email_subject: "You've unlocked your GripTape funding — action required",
    email_body: `<p>Hey {{first_name}},</p>
<p>Big congrats {{first_name}} — you just completed your orientation call with {{champion_first_name}}. GripTape alumni consistently say their Champion was the most valuable part of the whole experience. We think you'll see why.</p>
<p>You can now officially unlock your funding.</p>
<p>To release your $250 GripTape Learning Challenge stipend, you need to sign two documents:</p>
<p><strong>Your W-9 form</strong> — this is a standard IRS tax form that nonprofits are required to collect before sending any payment. GripTape is a registered 501(c)(3) nonprofit, which means we're legally required to have this on file before we can send you money. It takes 2 minutes to complete.<br>
<a href="{{w9_link}}">Sign your W-9 →</a></p>
<p><strong>Your Participation Agreement</strong> — this outlines what you're committing to as a GripTape Challenger.<br>
<a href="{{agreement_link}}">Sign your Participation Agreement →</a></p>
<p>You have 21 days to sign both documents. After that, the funding window closes — but your spot in the program is safe.</p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: `GripTape: Sign your documents to unlock your stipend. W-9: {{w9_link}} Agreement: {{agreement_link}}`,
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
    email_subject: 'Your GripTape funding is approved — claim it now',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your \${{grant_amount}} GripTape funding is approved and ready to claim. This money is yours — use it to build something real.</p>
<p>Click below to claim your funding. You'll choose how you want to receive it on the next screen.</p>
<p><a href="{{redemption_link}}">Claim your \${{grant_amount}} →</a></p>
<p><strong>Important: keep your receipts and upload them as you spend!</strong><br>
<a href="{{receipt_link}}">Upload your receipts here →</a></p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
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
    staff_email_body: `<p>• Youth ID: {{youth_id}}</p>
<p>• Youth legal name: {{legal_name}}</p>
<p>• Youth preferred name: {{preferred_name}} {{last_name}}</p>
<p>• Youth email: {{email}}</p>
<p>• Grant amount: \${{grant_amount}}</p>
<p>• Grant format: {{grant_format}}</p>
<p>• Grant coding: {{grant_coding}}</p>
<p>• Date sent to finance: {{approved_at}}</p>`,
  },

  full_send_submitted: {
    email_subject: "You did it. Welcome to the GripTape Alumni family.",
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send is in. You're officially a GripTape Alum.</p>
<p>Six weeks ago you made a commitment. You showed up, did the work, and finished something real. That's not nothing — most people never do.</p>
<p>Now pay it forward.</p>
<p>Know someone who has a passion and the drive to do something with it? Send them to GripTape. One registration could change everything for them the way this Challenge changed things for you.</p>
<p>Share this link with them: <a href="{{base_url}}">{{base_url}}</a></p>
<p>Welcome to the community. We're proud of you.</p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
  },

  // ── Nudges ────────────────────────────────────────────────────────────────

  nudge_declaration: {
    email_subject: "Your spot expires in 4 days — complete your commitment",
    email_body: `<p>Hey {{first_name}},</p>
<p>You started something. Don't let it slip.</p>
<p>You have until {{deadline_date}} to commit to your GripTape Challenge. It takes 5 minutes — declare what you want to pursue and earn your spot.</p>
<p><a href="{{link}}">Complete your commitment →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: "Hey {{first_name}}, don't forget to complete your GripTape declaration: {{link}}",
  },

  nudge_first_drop_1: {
    email_subject: "7 days in — here's your First Drop submission link",
    email_body: `<p>Hey {{first_name}},</p>
<p>You've had 7 days to work on your project. Now it's time to show us what you built.</p>
<p>Your First Drop submission link is below. You have until {{deadline_date}} to submit — that's 3 days from now.</p>
<p>Film a 90-second video showing what you accomplished. Real work only. Then submit the YouTube link below.</p>
<p><a href="{{link}}">Submit your First Drop →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, your First Drop video is due soon: {{link}}',
  },

  nudge_first_drop_2: {
    email_subject: 'Last chance — First Drop due tomorrow',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your First Drop deadline is tomorrow — {{deadline_date}}.</p>
<p>If you haven't submitted yet, do it now. Don't let 10 days of work go to waste.</p>
<p><a href="{{link}}">Submit your First Drop →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, last chance to submit your First Drop: {{link}}',
  },

  nudge_orientation_1: {
    email_subject: 'Have you scheduled your orientation call yet?',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Champion {{champion_name}} is ready to connect — have you reached out yet?</p>
<p>Your orientation call needs to happen by {{deadline_date}}. That's where you'll map out your goals, plan your project, and unlock your funding.</p>
<p>Don't wait — reach out to {{champion_name}} today and get it on the calendar.</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, reach out to your Champion {{champion_name}} to schedule your orientation call.',
  },

  nudge_orientation_2: {
    email_subject: 'Your orientation deadline is almost here',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your orientation call must be completed by {{deadline_date}} — that's tomorrow.</p>
<p>If you haven't connected with {{champion_name}} yet, reach out right now. After the deadline we have to give your spot to someone else.</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, your orientation call is due soon — connect with {{champion_name}} today.',
  },

  nudge_grant: {
    email_subject: "Your funding is waiting — don't let it expire",
    email_body: `<p>Hey {{first_name}},</p>
<p>Your GripTape funding is sitting there waiting for you. But it won't wait forever.</p>
<p>You have until {{deadline_date}} to sign your grant documents. After that the funding window closes — your spot in the program stays safe but the money doesn't.</p>
<p><a href="{{link}}">Sign your documents →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: "Hey {{first_name}}, don't forget your grant paperwork — unlock your $250 here: {{link}}",
  },

  nudge_full_send_1: {
    email_subject: 'One week left — your Full Send is due {{deadline_date}}',
    email_body: `<p>Hey {{first_name}},</p>
<p>One week left to submit your Full Send.</p>
<p>This is your final video — show us everything you built, learned, and accomplished over the last 6 weeks. Submit by {{deadline_date}} to officially complete your GripTape Challenge and become an Alum.</p>
<p><a href="{{link}}">Submit your Full Send →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, one week left to submit your Full Send: {{link}}',
  },

  nudge_full_send_2: {
    email_subject: '2 days left — submit your Full Send now',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send deadline is {{deadline_date}} — 2 days from now.</p>
<p>Don't let 6 weeks of work go unrecognized. Submit your video, complete your Challenge, and earn your place in the GripTape Alumni community.</p>
<p><a href="{{link}}">Submit your Full Send →</a></p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, last chance — your Full Send is due soon: {{link}}',
  },

  // ── Removals ──────────────────────────────────────────────────────────────

  removed_declaration: {
    email_subject: 'Your GripTape spot has been released',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your deadline to complete Step 2 passed on {{deadline_date}} and your spot has been released.</p>
<p>Don't let that be the end of your story. If you're still serious about your passion, you can start fresh — register again at the link below and earn your spot from the beginning.</p>
<p><a href="{{base_url}}">Register again →</a></p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, your GripTape declaration deadline passed. Your spot has been released.',
  },

  removed_first_drop: {
    email_subject: 'Your GripTape spot has been released',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your deadline to submit your First Drop passed on {{deadline_date}} and your spot has been released.</p>
<p>Life gets in the way — we get it. But if you're still serious about your passion, you can start fresh. Register again at the link below.</p>
<p><a href="{{base_url}}">Register again →</a></p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, your First Drop deadline passed. Your spot has been released.',
  },

  removed_orientation: {
    email_subject: 'Your GripTape spot has been released',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your deadline to complete your orientation call passed on {{deadline_date}} and your spot has been released.</p>
<p>If you're still serious about your passion, you can start fresh — register again at the link below and earn your spot from the beginning.</p>
<p><a href="{{base_url}}">Register again →</a></p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, your orientation deadline passed. Your spot has been released.',
  },

  removed_full_send: {
    email_subject: 'Your GripTape Challenge has ended',
    email_body: `<p>Hey {{first_name}},</p>
<p>We never received your Full Send video by {{deadline_date}} so you won't be joining the official GripTape Alumni community — but that doesn't take away from what you did.</p>
<p>You showed up. You committed. You spent weeks working on something you care about. That's real — and most people never do it.</p>
<p>We hope you keep going. Whatever you built, keep building it.</p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, your Full Send deadline passed. Your GripTape program has ended.',
  },

  // ── Full Send link dispatch ───────────────────────────────────────────────

  full_send_link: {
    email_subject: "It's time for your Full Send. You've earned this.",
    email_body: `<p>Hey {{first_name}},</p>
<p>Six weeks ago you committed to building something real. You showed up, put in the work, and didn't quit.</p>
<p>Now it's time to show the world what you made.</p>
<p>This is your Full Send — your final video submission and the last step of your GripTape Challenge. Think of it like your First Drop, but bigger. This is your whole story.</p>
<p><strong>You must submit by {{deadline_date}} to officially complete your GripTape Learning Challenge and become a GripTape Alum — with access to future programs, events, and the broader GripTape community.</strong></p>
<p><strong>How to film it:</strong><br>
🎥 Shoot vertical. Good lighting. Clear audio. Clean background. Show your face and your work.</p>
<p><strong>Your video should cover:</strong></p>
<p>🎯 Who are you and what's your passion?<br>
<em>e.g. My name is Taylor, and I am passionate about amplifying restaurant owners because I want to help people in my community tell their stories.</em></p>
<p>🎯 What did you create or accomplish?<br>
Show us what you made — screenshots, video clips, photos, designs, whatever you built.</p>
<p>🎯 Where did you start vs. where are you now?<br>
Any personal growth? Confidence? New skills? What did this Challenge unlock in you?</p>
<p>🎯 What's next?<br>
What are you chasing after this? A next step, a new project, a big dream.</p>
<p><strong>Keep it under 90 seconds. Make it count.</strong></p>
<p><a href="{{link}}">Submit your Full Send →</a></p>
<p>— The GripTape Team</p>
<p>For questions or help visit <a href="{{base_url}}/help">{{base_url}}/help</a> (do not reply to this email)</p>`,
    sms: 'Hey {{first_name}}, time to submit your Full Send! Submit your video here: {{link}}',
  },

  // ── Match-champion staff alerts ───────────────────────────────────────────

  match_no_champions: {
    staff_email_subject: 'Action needed: no champions available for {{first_name}} {{last_name}}',
    staff_email_body: `<p>No champions are currently available for matching. Manual assignment required.</p>
<p>Youth: {{first_name}} {{last_name}} ({{email}})<br>
Youth ID: {{youth_id}}</p>
<p>Passion: {{passion}}</p>
<p>Why join: {{why_join}}</p>
<p>Once you have chosen a champion, run the following SQL in Supabase → SQL Editor:</p>
<pre>UPDATE youth
SET champion_id      = '&lt;champion_id&gt;',
    status           = 'mentor_pending',
    access_token     = gen_random_uuid(),
    token_expires_at = now() + interval '16 days'
WHERE id = '{{youth_id}}'
  AND status = 'onboarding';</pre>
<p>This will trigger the send-champion-intro webhook and send the intro email automatically.</p>`,
  },

  match_claude_failed: {
    staff_email_subject: 'Action needed: champion matching failed for {{first_name}} {{last_name}}',
    staff_email_body: `<p>Claude champion matching failed. Manual assignment required.</p>
<p>Youth: {{first_name}} {{last_name}} ({{email}})</p>
<p>Error: {{error}}</p>`,
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
