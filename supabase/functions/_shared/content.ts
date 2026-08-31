export const content = {
  application_received: {
    email_subject: 'We got your application, {{first_name}}!',
    email_body: `<p>Hey {{first_name}},</p>
<p>We got your NYC Learning Challenge application! You'll hear back from us within 2 days.</p>
<p>Check us out in the meantime: <a href="https://www.instagram.com/griptapeorg/">@griptapeorg on Instagram</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, we got your NYC Learning Challenge application! You\'ll hear back within 2 days. Check us out in the meantime:',
    sms_link: 'https://www.instagram.com/griptapeorg/',
  },

  declaration_pending: {
    email_subject: 'Congratulations, {{first_name}}. You\'re in.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Congratulations! Your NYC Learning Challenge application made it through. Your passion for {{passion}} stood out.</p>
<p>You have 5 days to begin. If you don't, we'll have to give your spot to someone else.</p>
<p><a class="cta" href="{{link}}">Begin your Challenge →</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Congrats {{first_name}} — your application for the NYC Learning Challenge made it through. Tap below to begin.',
    sms_link: '{{link_sms}}',
  },
  declaration_confirmed: {
    email_subject: 'Your 10 days start now, {{first_name}}.',
    email_body: `<p>Hey {{first_name}},</p>
<p>You're in. Your first 10 days have started — now go work on your goal.</p>
<p>We'll send you your First Drop submission link in 5 days. Until then, head down and build.</p>
<p>We're so excited to have you in Cohort 01. You're building alongside a group of NYC teens who earned their spot just like you did. We can't wait to see what you make.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },
  rejected: {
    email_subject: 'Your NYC Learning Challenge registration',
    email_body: `<p>Hey {{first_name}},</p>
<p>Thank you for registering for the NYC Learning Challenge. Unfortunately you are ineligible. If you think this is a mistake or would like more information reply here.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },
  flagged: {
    staff_sms: '[NEW APP] {{first_name}} {{last_name}} submitted. AI rec: {{ai_decision}}. {{reasoning}}',
    staff_email_subject: 'Flagged for review — {{first_name}} {{last_name}}',
    staff_email_body: `<p>A new application was flagged for manual review.</p>
<p><strong>Applicant:</strong> {{first_name}} {{last_name}}<br>
<strong>AI decision:</strong> {{ai_decision}}<br>
<strong>Reasoning:</strong> {{reasoning}}<br>
<strong>Failed criteria:</strong> {{failed_criteria}}</p>
<p>Review in Supabase and update <code>screening_status</code> manually.</p>`,
  },

  application_accepted: {
    staff_email_subject: 'Auto-accepted — {{first_name}} {{last_name}}',
    staff_email_body: `<p>An application was automatically accepted.</p>
<p><strong>Applicant:</strong> {{first_name}} {{last_name}}<br>
<strong>Email:</strong> {{email}}<br>
<strong>Passion:</strong> {{passion}}<br>
<strong>Referred by:</strong> {{referred_by}}<br>
<strong>Reasoning:</strong> {{reasoning}}</p>
<p>The applicant will be notified in 48 hours.</p>`,
  },

  application_rejected: {
    staff_email_subject: 'Auto-rejected — {{first_name}} {{last_name}}',
    staff_email_body: `<p>An application was automatically rejected.</p>
<p><strong>Applicant:</strong> {{first_name}} {{last_name}}<br>
<strong>Email:</strong> {{email}}<br>
<strong>Failed criteria:</strong> {{failed_criteria}}<br>
<strong>Reasoning:</strong> {{reasoning}}</p>
<p>The applicant will be notified in 48 hours.</p>`,
  },

  mentor_pending: {
    email_subject: "You're in. Meet your Champion.",
    email_body: `<p>Hey {{first_name}},</p>
<p>You made it. Your First Drop video was impressive. You're officially a NYC Learning Challenger.</p>
<p>This is real — you've earned up to $150 to invest in your passion project, and someone in your corner the whole way.</p>
<p>That someone is {{champion_first_name}} — your Champion.</p>
<p>{{champion_bio}}</p>
<p>To kick off your NYC Learning Challenge, you and {{champion_first_name}} will have a 1-hour orientation call. You'll map out your goals, plan your project, and go over next steps. That includes accessing your funding and joining the NYC Learning Challenge community.</p>
<p>Reach out to {{champion_first_name}} to schedule that call as soon as possible. Their number is {{champion_phone}} and their email is {{champion_email}}.</p>
<p>You have 7 days to complete your orientation. After that we have to give your spot to someone else.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Congrats {{first_name}}, you're officially a NYC Learning Challenger! Check your email for next steps ASAP.",
  },

  champion_intro: {
    email_subject: 'You have a new Challenger — {{youth_name}}',
    email_body: `<p>Hey {{first_name}},</p>
<p>You have been matched with a new NYC Learning Challenger. Here is everything you need to get started.</p>
<p><strong>Your Challenger:</strong> {{youth_name}}<br>
<strong>Their passion:</strong> {{passion}}<br>
<strong>Their email:</strong> {{youth_email}}<br>
<strong>Their cell:</strong> {{youth_phone}}</p>
<p><strong>Watch their First Drop video first:</strong><br>
<a href="{{first_drop_url}}">{{first_drop_url}}</a></p>
<p>Watch it before you reach out. Then contact {{youth_name}} directly and let them know you watched their video and are excited to start the journey together. That first message sets the tone for everything.</p>
<p>Fill out the orientation form below DURING your call together. That is what unlocks their funding. You have 7 days from today to complete the call and submit the form.</p>
<p><a href="{{orientation_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit orientation form</a></p>
<p>Questions? Reply to this email.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, you have a new NYC Learning Challenger — {{youth_name}}. Check your email for their First Drop video and next steps.',
  },

  grant_pending: {
    email_subject: "You just unlocked your funding, {{first_name}} 🎉",
    email_body: `<p>Hey {{first_name}},</p>
<p>Big congrats. You just finished your orientation call with {{champion_first_name}} — and that call unlocked two things at once:</p>
<p><strong>Your funding.</strong> Your learning stipend is officially in motion.<br>
<strong>Your invites.</strong> You can now bring people into your cohort.</p>
<p>Here are your next two steps to release your funding.</p>
<p><strong>1. Invite your people</strong><br>
{{invite_paragraph}}</p>
<p><a href="{{referral_link}}">{{referral_link}}</a></p>
<p><strong>2. Lock in your funding</strong><br>
To release your funding, you need to sign two quick documents:</p>
<p><strong>Your W-9</strong> — the standard tax form nonprofits collect before sending any payment. NYC Learning Challenge is a 501(c)(3), so we're required to have this on file. Takes about 2 minutes.<br>
<a href="{{w9_link}}">Sign your W-9 →</a></p>
<p><strong>Your Participation Agreement</strong> — this confirms what you're committing to as a NYC Learning Challenger.<br>
<a href="{{agreement_link}}">Sign your Participation Agreement →</a></p>
<p>You have 10 days to sign both. After that, the funding window closes. But if you want, you can continue the Learning Challenge unfunded.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `Congrats on completing your NYC Learning Challenge orientation call! Check your email to unlock your funding and grab your invite link.`,
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
    staff_sms: `NYC Learning Challenge: Grant docs ready for {{first_name}} {{last_name}}. Check email to approve.`,
  },

  grant_approved: {
    email_subject: 'Your \${{grant_amount}} is approved — claim it now',
    email_body: `<p>Hey {{first_name}},</p>
<p style="font-size:22px;font-weight:600;margin:0 0 14px;">Your \${{grant_amount}} is approved. It's yours.</p>
<p>Use it to build something real. Click below and choose how you want to receive it.</p>
<p><a href="{{redemption_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Claim your \${{grant_amount}} →</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #EA5329;border-radius:8px;border-collapse:separate;overflow:hidden;">
<tr><td style="background:#EA5329;padding:12px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:14px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">⏰ CHALLENGER PERK</td>
<td align="right"><span style="background:#ffffff;color:#D85A30;font-size:12px;font-weight:700;padding:4px 12px;border-radius:12px;">5 DAYS LEFT</span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFF4EF;padding:18px 22px;">
<p style="font-size:17px;font-weight:700;color:#4A1B0C;margin:0 0 8px;">Bring 2 friends. They're guaranteed in.</p>
<p style="font-size:14px;line-height:1.6;color:#712B13;margin:0 0 14px;">Only Challengers can do this. Anyone you invite skips the line: their own Champion, their own \${{grant_amount}}, their own project. After 5 days we offer your spots to other Challengers.</p>
<p style="font-size:13px;font-weight:700;color:#993C1D;margin:0 0 6px;">Send your friends this text:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="background:#ffffff;border:1px solid #F0997B;border-radius:12px;padding:12px 16px;">
<p style="font-size:14px;line-height:1.5;color:#1a1a1a;margin:0;">Hey! I'm doing the NYC Learning Challenge (you get \${{grant_amount}} + a mentor to build whatever you're passionate about for 6 weeks). I'm in the current cohort and get to invite 2 people. Apply with my link: {{referral_link}}</p>
</td></tr></table>
<p style="font-size:13px;line-height:1.5;color:#993C1D;margin:0 0 14px;">Add a line about why you picked them — it works.</p>
<p style="margin:0;"><a href="{{referral_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:700;padding:12px 26px;border-radius:6px;text-decoration:none;">Or grab your invite link →</a></p>
</td></tr></table>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `NYC Learning Challenge: Your \${{grant_amount}} grant is approved! Claim it here: {{redemption_link}}`,
  },

  receipt_reminder: {
    email_subject: 'Quick one — save your receipts',
    email_body: `<p>Hey {{first_name}},</p>
<p>You've had your \${{grant_amount}} for a week — hope it's already turning into something. One piece of homework: <strong>upload your receipts as you spend.</strong> It takes 30 seconds and keeps your funding squeaky clean.</p>
<p><a href="{{receipt_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Upload receipts →</a></p>
<p>Snap a photo the moment you buy something and you'll never have to think about it again.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `NYC Learning Challenge: quick reminder to upload receipts for anything you've bought with your grant: {{receipt_link}}`,
  },

  referral_sms: {
    sms: `Hey {{first_name}}, 2 days left to send your 2 Challenger invites — your friends get guaranteed acceptance. Your link: {{referral_link}}`,
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

  full_send_received: {
    email_subject: 'Your Full Send is in.',
    email_body: `<p>Hey {{first_name}},</p>
<p>We got your video. The NYC Learning Challenge team will review it and be in touch.</p>
<p>If you have not already had your End of Challenge call with {{champion_name}} — reach out to them now. That is the last step to completing your Challenge: {{champion_phone}}.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },

  first_drop_review: {
    staff_email_subject: 'First Drop ready for review — {{first_name}} {{last_name}}',
    staff_email_body: `<p>{{first_name}} {{last_name}} submitted their First Drop video.</p>
<p><strong>Video:</strong> <a href="{{video_url}}">{{video_url}}</a><br>
<strong>Passion:</strong> {{passion}}<br>
<strong>Email:</strong> {{email}}<br>
<strong>Application ID:</strong> {{application_id}}</p>
<p>To accept, update their status to <code>accepted</code> in Supabase.</p>`,
  },

  full_send_staff_notification: {
    staff_email_subject: 'Full Send submitted — {{first_name}} {{last_name}}',
    staff_email_body: `<p>{{first_name}} {{last_name}} submitted their Full Send video.</p>
<p><strong>Video:</strong> <a href="{{full_send_url}}">{{full_send_url}}</a></p>
<p><strong>EOC call completed:</strong> {{eoc_status}}</p>
<p>When ready to approve, update their status to completed in Supabase. That will trigger the alum email automatically.</p>
<p><strong>Youth ID:</strong> {{youth_id}}<br>
<strong>Email:</strong> {{email}}</p>`,
  },

  full_send_submitted: {
    email_subject: "You did it. Welcome to the NYC Learning Challenge Alumni family.",
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send is approved. You are officially a NYC Learning Challenge Alum.</p>
<p>Six weeks ago you made a commitment. You showed up, did the work, and finished something real. That is not nothing. Most people never do.</p>
<p>Now pay it forward.</p>
<p>Know someone who has a passion and the drive to do something with it? Send them to the NYC Learning Challenge. One registration could change everything for them the way this Challenge changed things for you.</p>
<p>Share this link with them: <a href="{{base_url}}">{{base_url}}</a></p>
<p>Welcome to the community. We are proud of you.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },

  // ── Nudges ────────────────────────────────────────────────────────────────

  nudge_declaration: {
    email_subject: 'Tomorrow is your last day, {{first_name}}.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Tomorrow is your last day to commit to your NYC Learning Challenge. We'll have to release your spot otherwise. You don't need a perfect plan — just show up for your passion. We believe in you.</p>
<p><a class="cta" href="{{link}}">Begin your Challenge →</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, tomorrow is your last day to commit to your NYC Learning Challenge. We\'ll have to release your spot otherwise.',
    sms_link: '{{link_sms}}',
  },

  nudge_declaration_early: {
    email_subject: 'Your spot is waiting — takes a couple of minutes',
    email_body: `<p>Hey {{first_name}},</p>
<p>You're in — your spot in the NYC Learning Challenge is reserved. One thing left to lock it: sign your declaration. It takes a couple of minutes, right from your phone.</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Lock in my spot →</a></p>
<p>Your deadline is {{deadline_date}} — but why wait?</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `Hey {{first_name}}, your NYC Learning Challenge spot is reserved — lock it in here (takes 2 min): {{link_sms}}`,
  },

  nudge_first_drop_1: {
    email_subject: 'Time to film your First Drop, {{first_name}} — here\'s your link.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Five days in. Time to show what you've been building.</p>
<p>Your First Drop is a 90-second video. Keep it real, keep it simple. Cover three things:</p>
<p>Who you are and what your passion is.<br>
What you've accomplished so far.<br>
Where you're taking it next.</p>
<p>Shoot vertical. Show your work. No script needed — just be honest.</p>
<p><a class="cta" href="{{link}}">Submit your First Drop →</a></p>
<p>You have until {{deadline_date}}.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, time to film your NYC Learning Challenge First Drop. Show us what you\'ve built so far and submit before {{deadline_date}}.',
    sms_link: '{{link_sms}}',
  },

  nudge_first_drop_2: {
    email_subject: 'Last chance, {{first_name}}. First Drop due tomorrow.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your First Drop deadline is tomorrow — {{deadline_date}}. Don't let 10 days of work go to waste. Submit your video now.</p>
<p><a class="cta" href="{{link}}">Submit your First Drop →</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, your First Drop is due tomorrow. Submit now before your spot is released.',
    sms_link: '{{link_sms}}',
  },

  nudge_orientation_1: {
    email_subject: 'Have you scheduled your orientation call yet?',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Champion {{champion_name}} is ready to connect — have you reached out yet?</p>
<p>Your orientation call needs to happen by {{deadline_date}}. That's where you'll map out your goals, plan your project, and unlock your funding.</p>
<p>Don't wait. Reach out to {{champion_name}} today and get it on the calendar. Their number is {{champion_phone}}.</p>`,
  },

  nudge_orientation_2: {
    email_subject: 'Your orientation deadline is almost here',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your orientation call must be completed by {{deadline_date}} — that's tomorrow.</p>
<p>If you haven't connected with {{champion_name}} yet, reach out right now. Their number is {{champion_phone}}. After the deadline we have to give your spot to someone else.</p>`,
    sms: 'Hey {{first_name}}, your orientation call is due soon — connect with {{champion_name}} today.',
  },

  nudge_orientation_champion: {
    email_subject: '{{youth_name}} is waiting to hear from you',
    email_body: `<p>Hey {{first_name}},</p>
<p>{{youth_name}} has been matched with you as their NYC Learning Challenge Champion and is still waiting to schedule their orientation call.</p>
<p>They have until {{deadline_date}} to complete the call. Reach out to them directly and get it on the calendar.</p>
<p><strong>{{youth_name}}'s cell:</strong> {{youth_phone}}</p>
<p>Use the orientation form below to guide your call.</p>
<p><a href="{{orientation_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit orientation form</a></p>
<p>Questions? Reply to this email.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, your NYC Learning Challenger {{youth_name}} is still waiting to schedule their orientation call. Their number: {{youth_phone}}',
  },

  nudge_grant_final: {
    email_subject: null,
    email_body: null,
    sms: `Hey {{first_name}}, your grant paperwork is due tomorrow. Sign your W-9 and Participation Agreement now or you won't be able to receive your funding. Check your email for the links.`,
  },

  nudge_grant: {
    email_subject: "Your funding is waiting — don't let it expire",
    email_body: `<p>Hey {{first_name}},</p>
<p>Your NYC Learning Challenge funding is sitting there waiting for you. But it won't wait forever.</p>
<p>You have until {{deadline_date}} to sign both documents. After that the funding window closes. Your spot in the program stays safe but the money doesn't.</p>
<p><strong>Your W-9 form</strong> — takes 2 minutes. Required before we can send payment.<br>
<a href="{{w9_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;margin-top:8px;">Sign your W-9</a></p>
<p><strong>Your Participation Agreement</strong> — outlines your commitment as a NYC Learning Challenger.<br>
<a href="{{agreement_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;margin-top:8px;">Sign your Agreement</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, your grant documents are waiting. Check your email to sign your W-9 and Participation Agreement before {{deadline_date}}.",
  },

  nudge_full_send_neither: {
    email_subject: 'Two things left to complete your Challenge',
    email_body: `<p>Hey {{first_name}},</p>
<p>You have until {{deadline_date}} to finish your Challenge. Two things still need to happen.</p>
<p>Submit your Full Send video — your 90-second video showing what you built, what you learned, and where you are headed next.</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit your Full Send</a></p>
<p>Schedule your End of Challenge call with {{champion_name}}. Reach out today: {{champion_phone}}.</p>
<p>Both need to happen to become a NYC Learning Challenge Alum.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, two things left before {{deadline_date}}: your Full Send {{link}} and your EOC call with {{champion_name}} ({{champion_phone}}).',
  },

  nudge_full_send_neither_final: {
    email_subject: 'Last chance. Two things still needed.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Two days left. Neither your Full Send nor your End of Challenge call has happened yet.</p>
<p>Submit your Full Send now:</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit your Full Send</a></p>
<p>And reach out to {{champion_name}} today to schedule your call: {{champion_phone}}.</p>
<p>Both need to happen by {{deadline_date}}. Do not let this slip.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, last chance — two things due {{deadline_date}}: Full Send {{link}} and EOC call with {{champion_name}} ({{champion_phone}}).',
  },

  nudge_full_send_no_video: {
    email_subject: 'Your EOC call is done. One thing left.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your End of Challenge call is complete. Nice work.</p>
<p>One thing left — submit your Full Send video before {{deadline_date}}. That is what officially makes you a NYC Learning Challenge Alum.</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit your Full Send</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, EOC call done. One thing left — submit your Full Send before {{deadline_date}}: {{link}}',
  },

  nudge_full_send_no_video_final: {
    email_subject: 'Last chance. Submit your Full Send today.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your End of Challenge call is done. The only thing standing between you and becoming a NYC Learning Challenge Alum is your Full Send video.</p>
<p>Submit it before {{deadline_date}}. You are this close.</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit your Full Send</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, last chance — submit your Full Send before {{deadline_date}}: {{link}}',
  },

  nudge_full_send_no_eoc: {
    email_subject: 'One more thing — your End of Challenge call',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send is in. One thing left before you officially complete your Challenge.</p>
<p>Schedule your End of Challenge call with {{champion_name}}. Reach out today: {{champion_phone}}.</p>
<p>That call is the last step to becoming a NYC Learning Challenge Alum.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, Full Send received. One thing left — schedule your EOC call with {{champion_name}}: {{champion_phone}}',
  },

  nudge_full_send_no_eoc_final: {
    email_subject: 'Last chance. Schedule your EOC call today.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send is submitted. You are almost done.</p>
<p>Reach out to {{champion_name}} right now to schedule your End of Challenge call: {{champion_phone}}.</p>
<p>This needs to happen by {{deadline_date}}. It is the last step.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, last chance — schedule your EOC call with {{champion_name}} ({{champion_phone}}) by {{deadline_date}}.',
  },

  nudge_full_send_champion_no_eoc: {
    email_subject: '{{youth_name}} still needs their End of Challenge call',
    email_body: `<p>Hey {{first_name}},</p>
<p>{{youth_name}} has not completed their End of Challenge call yet. Their deadline is {{deadline_date}}.</p>
<p>Reach out to them and get it scheduled. Use the form below to guide the call.</p>
<p><a href="{{eoc_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Open End of Challenge Form</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, {{youth_name}} still needs their EOC call. Reach out and submit the form: {{eoc_link}}',
  },

  nudge_full_send_champion_no_eoc_final: {
    email_subject: 'Last chance — {{youth_name}} EOC call',
    email_body: `<p>Hey {{first_name}},</p>
<p>Two days left. {{youth_name}} has not completed their End of Challenge call.</p>
<p>Reach out today: {{youth_phone}}.</p>
<p>Submit the form during or after your call.</p>
<p><a href="{{eoc_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Open End of Challenge Form</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, last chance — {{youth_name}} EOC call due {{deadline_date}}. Form: {{eoc_link}}',
  },

  // ── Removals ──────────────────────────────────────────────────────────────

  removed_declaration: {
    email_subject: 'Your NYC Learning Challenge spot has been released',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your deadline to complete Step 2 passed on {{deadline_date}} and your spot has been released.</p>
<p>Whatever is going on, don't stop. The work you care about is still worth doing.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },

  removed_first_drop: {
    email_subject: 'Your NYC Learning Challenge spot has been released',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your deadline to submit your First Drop passed on {{deadline_date}} and your spot has been released.</p>
<p>Life gets in the way — we get it. Don't let it stop you from the thing you were building.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },

  removed_orientation: {
    email_subject: 'Your NYC Learning Challenge spot has been released',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your deadline to complete your orientation call passed on {{deadline_date}} and your spot has been released.</p>
<p>We hope you keep going. Whatever brought you here in the first place is still real.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },

  removed_full_send: {
    email_subject: 'Your NYC Learning Challenge has ended',
    email_body: `<p>Hey {{first_name}},</p>
<p>We never received your Full Send video by {{deadline_date}} so you won't be joining the official NYC Learning Challenge Alumni community — but that doesn't take away from what you did.</p>
<p>You showed up. You committed. You spent weeks working on something you care about. That's real — and most people never do it.</p>
<p>We hope you keep going. Whatever you built, keep building it.</p>
<p>If you think we missed something, email <a href="mailto:thea@griptape.org">thea@griptape.org</a>.</p>
<p>— The NYC Learning Challenge Team</p>`,
  },

  // ── Full Send link dispatch ───────────────────────────────────────────────

  full_send_link: {
    email_subject: "Your Challenge is almost complete",
    email_body: `<p>Hey {{first_name}},</p>
<p>Six weeks ago you committed to building something real. You showed up, did the work, and didn't quit. You're almost done.</p>
<p>Two things left to officially complete your Challenge:</p>
<p><strong>1. Schedule your End of Challenge call with {{champion_name}}</strong> — a 30-45 minute conversation to reflect on everything you built and celebrate how far you've come. Reach out to {{champion_name}} to get it on the calendar: {{champion_phone}}.</p>
<p><strong>2. Submit your Full Send video</strong> — a 90-second video showing your work, your growth, and where you're headed next.</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Submit your Full Send</a></p>
<p>Both need to happen by {{deadline_date}}.</p>
<p>Pro tip: try to have a draft of your Full Send ready before your End of Challenge call. Showing your Champion what you built makes for a better conversation — and their feedback will make your video better.</p>
<p>Last call on receipts too — <a href="{{receipt_link}}">upload anything you haven't yet</a>.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, your Challenge is almost complete. Two things left: your End of Challenge call with {{champion_name}} and your Full Send submission. Submit here: {{link}}',
  },

  // ── End of Challenge ─────────────────────────────────────────────────────

  end_of_challenge_champion: {
    email_subject: "Time to schedule {{youth_name}}'s End of Challenge call",
    email_body: `<p>Hey {{first_name}},</p>
<p>{{youth_name}} just received their Full Send link. They're in the home stretch — two things need to happen before they officially complete their Challenge: your End of Challenge call and their Full Send video submission.</p>
<p>Reach out to {{youth_name}} to schedule the call. When you do, let them know you'd love to watch their Full Send video together — it's a great way to celebrate what they built and give them feedback before they submit.</p>
<p>{{youth_name}}'s cell: {{youth_phone}}</p>
<p>Use the form below to guide your conversation and record their reflections during the call. It takes 30-45 minutes.</p>
<p><a href="{{eoc_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Open End of Challenge Form</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, time to schedule {{youth_name}}'s End of Challenge call. Their number: {{youth_phone}}. Open the form: {{eoc_link}}",
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

  vendor_import_email: {
    subject: 'Bill.com Vendor Import — {{date}}',
    body: 'Please find attached the vendor import CSV for {{count}} Challenger(s) approved on {{date}}. Import this file into Bill.com to create the vendor records.',
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
