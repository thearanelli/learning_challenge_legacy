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
    email_subject: 'Your first official 7 days',
    email_body: `<p>Hey {{first_name}},</p>
<p>You're in — your challenge starts now. Here's the whole plan:</p>
<p><strong>Days 1–3:</strong> Work on your passion project. Maybe you're writing your first song or sketching your first design. Just start!</p>
<p><strong>Day 3:</strong> We send your First Drop submission link. The First Drop is just a 90-second phone video where you tell us about you and your progress so far. It's not a test. It's how your mentor gets to know you before you meet — and your introduction to the NYC Learning Challenge community.</p>
<p><strong>By day 7:</strong> Submit. Film it whenever you're ready! It doesn't have to be perfect — just make sure it's in by day 7.</p>
<p>After you submit, you get matched with your mentor. Your orientation call then unlocks your grant funding. It's all on the other side of this video.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `You're in, {{first_name}} — your challenge starts now. Start working toward your goals and filming your progress. By {{deadline_date}} you'll need to submit your First Drop video. We'll send you the link to submit in a few days. In the meantime, here's an example of a First Drop:`,
    sms_link: 'https://www.youtube.com/shorts/6PDZfb7kuNE',
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
    sms: "Great news {{first_name}}: your NYC Learning Challenge video is approved. You've been matched with your Champion (your mentor for the Challenge)! Check your email ASAP for next steps.",
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
<p>Big congrats — your orientation call with {{champion_first_name}} is done, and it unlocked two things at once:</p>
<p><strong>Your funding.</strong> Your learning stipend is officially in motion.<br>
<strong>Your invites.</strong> You get 2 spots to bring friends into your cohort with you.</p>
<h2 style="margin:28px 0 12px;font-size:18px;font-weight:bold;color:#001722;font-family:Arial,Helvetica,sans-serif;">First: release your funding</h2>
<p>Two quick signatures and your stipend is on its way:</p>
<p><strong>Your W-9</strong> — the standard tax form nonprofits collect before sending any payment. We're a 501(c)(3), so we're required to have it on file. Takes about 2 minutes.</p>
<a class="cta" href="{{w9_link}}">Sign your W-9 →</a>
<p><strong>Your Participation Agreement</strong> — confirms what you're committing to as a NYC Learning Challenger.</p>
<a class="cta" href="{{agreement_link}}">Sign your Participation Agreement →</a>
<div class="notice">You have <strong>10 days</strong> to sign both. After that, the funding window closes. (You could continue the Challenge unfunded — but sign the forms.)</div>
<h2 style="margin:28px 0 12px;font-size:18px;font-weight:bold;color:#001722;font-family:Arial,Helvetica,sans-serif;">Then: bring {{invite_header_names}} into your cohort</h2>
<p>Honestly, the Challenge is more fun with your people in it — trading ideas, hyping each other's videos, finishing together. You've got <strong>2 invites</strong>, and anyone you invite is guaranteed a spot: their own project, their own funding, their own Champion.</p>
<p>{{invite_called_line}}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #EA5329;border-radius:8px;border-collapse:separate;overflow:hidden;">
<tr><td style="background:#FFF4EF;padding:18px 22px;">
<p style="font-size:13px;font-weight:700;color:#993C1D;margin:0 0 6px;">Send them this text:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="background:#ffffff;border:1px solid #F0997B;border-radius:12px;padding:12px 16px;">
<p style="font-size:14px;line-height:1.5;color:#1a1a1a;margin:0;">Hey! I'm doing the NYC Learning Challenge — you get funding + a mentor to build whatever you're passionate about. I get to invite 2 people into my cohort and I picked you. Grab your spot with my link: {{referral_link}}</p>
</td></tr></table>
<p style="font-size:13px;line-height:1.5;color:#993C1D;margin:0 0 14px;">Add a line about why you picked them — it works.</p>
<p style="margin:0;"><a href="{{sms_invite_href}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:700;padding:12px 26px;border-radius:6px;text-decoration:none;">Text your invite →</a></p>
</td></tr></table>
<p>We'll text you the moment they're in.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `Congrats on completing your NYC Learning Challenge orientation call! Check your email to unlock your funding and grab your invite link.`,
  },

  grant_review: {
    // Email is sent directly from process-grant-signed (needs attachments);
    // only the staff SMS ping lives here.
    staff_sms: `NYC Learning Challenge: Grant docs ready for {{first_name}} {{last_name}}. Check email to review + approve.`,
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
<p style="font-size:17px;font-weight:700;color:#4A1B0C;margin:0 0 8px;">{{perk_title}}</p>
<p style="font-size:14px;line-height:1.6;color:#712B13;margin:0 0 14px;">Only Challengers can do this. Anyone you invite skips the line: their own Champion, their own \${{grant_amount}}, their own project. {{perk_picks_line}} After 5 days we offer your spots to other Challengers.</p>
<p style="font-size:13px;font-weight:700;color:#993C1D;margin:0 0 6px;">Send your friends this text:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="background:#ffffff;border:1px solid #F0997B;border-radius:12px;padding:12px 16px;">
<p style="font-size:14px;line-height:1.5;color:#1a1a1a;margin:0;">Hey! I'm doing the NYC Learning Challenge (\${{grant_amount}} + a mentor to build whatever you're into for 6 weeks). I get to invite 2 people and I picked you. Grab your spot: {{referral_link}}</p>
</td></tr></table>
<p style="font-size:13px;line-height:1.5;color:#993C1D;margin:0 0 14px;">Add a line about why you picked them — it works.</p>
<p style="margin:0;"><a href="{{sms_invite_href}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:700;padding:12px 26px;border-radius:6px;text-decoration:none;">Text your invite →</a></p>
</td></tr></table>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `Your NYC Learning Challenge funding is approved 🎉 Check your email to claim it (can't find it? thelearningchallenge.org/help). One more thing: your 2 invites are live — {{invites_clause}} for 5 more days. Forward them the next text 👇`,
  },

  grant_approved_invite_sms: {
    email_subject: null,
    email_body: null,
    sms: `Hey! I'm doing the NYC Learning Challenge (\${{grant_amount}} + a mentor to build whatever you're into for 6 weeks). I get to invite 2 people and I picked you. Grab your spot: {{referral_link}}`,
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
<strong>Age:</strong> {{age}}<br>
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
    email_subject: 'Reminder — your NYC Learning Challenge spot',
    email_body: `<p>Hey {{first_name}},</p>
<p>Quick reminder: you earned a spot in the NYC Learning Challenge, and it's still waiting for you.</p>
<p><a href="{{link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Lock in my spot →</a></p>
<p>Takes 2 minutes, right from your phone. You have 3 days — after that we have to give your spot to someone else.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `Hey {{first_name}}, quick reminder — you earned a NYC Learning Challenge spot and it's still waiting. Takes 2 min to lock in. You have 3 days: {{link_sms}}`,
  },

  nudge_first_drop_1: {
    email_subject: 'Your First Drop video submission link',
    email_body: `<p>Hey {{first_name}},</p>
<p>Time for your First Drop — the 90-second video your future mentor watches to get to know you. It's due {{deadline_date}}.</p>
<p>It's simple. One take on your phone, covering three things:</p>
<p>1) Who you are and what your passion is<br>
2) Your progress so far — showing beats telling: your drawings, your music, your website, whatever you've worked on<br>
3) What's next — your future goals</p>
<p><a class="cta" href="{{link}}">Record my First Drop →</a></p>
<p>Your mentor and grant funds are on the other side.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, your First Drop video link is here. 90 sec on your phone — you, your passion, your progress so far. It\'s how your mentor gets to know you. Due {{deadline_date}}.',
    sms_link: '{{link_sms}}',
  },

  nudge_first_drop_2: {
    email_subject: 'Last chance, {{first_name}}. First Drop due tomorrow.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your First Drop video is due tomorrow — {{deadline_date}}. Don't let your spot go: your mentor match starts once you submit. 90 seconds, one take, now.</p>
<p><a class="cta" href="{{link}}">Submit my First Drop →</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, your First Drop video is due tomorrow. Submit now before your spot in the NYC Learning Challenge is released.',
    sms_link: '{{link_sms}}',
  },

  nudge_first_drop_3: {
    sms: 'Hey {{first_name}}, your NYC Learning Challenge First Drop video is due TODAY. Submit it and you\'ll get matched with a mentor + unlock $150 for your passion project. If you don\'t, your spot will be released. Submit here:',
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
    email_subject: 'One week left to finish your Challenge',
    email_body: `<p>Hey {{first_name}},</p>
<p>You have until the end of the day on <strong>{{deadline_date}}</strong> to finish your Challenge, and your GripTape membership is waiting on the other side. Two things to do:</p>
<p><strong>1. Make your Full Send.</strong> A simple 90-second video sharing what you accomplished.</p>
<p><strong>2. Book your final call with {{champion_name}}.</strong> Reach out today: {{champion_phone}}. Bring your Full Send with you.</p>
<a class="cta" href="{{link}}">Submit your Full Send →</a>
<p>Finish both and you're a GripTape Member for life: opportunities for paid internships, free NYC events, and unlimited invites for your friends.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, one week left to finish your Challenge and earn your GripTape membership: paid internship opportunities + free NYC events. Make your 90-sec Full Send, book your call with {{champion_name}} ({{champion_phone}}), upload by {{deadline_date}}: {{link}}',
  },

  nudge_full_send_neither_final: {
    email_subject: 'Two days left, {{first_name}}',
    email_body: `<p>Hey {{first_name}},</p>
<p>Two days left, and your Full Send and your final call are both still open.</p>
<p>Record your video today. A rough phone video counts, and nobody grades the editing. Then text {{champion_name}} ({{champion_phone}}) to get your call booked, and bring your Full Send with you.</p>
<a class="cta" href="{{link}}">Submit your Full Send →</a>
<p>Both done by the end of the day on <strong>{{deadline_date}}</strong> and you finish, and you're a GripTape Member for life.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, 2 days left to lock in your GripTape membership: paid internship opportunities and free NYC events for life. Record your Full Send, book your call with {{champion_name}} ({{champion_phone}}), upload by {{deadline_date}}: {{link}}',
  },

  nudge_full_send_no_video: {
    email_subject: 'Your call is done. Your membership is one upload away.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your final call is done. Nice work.</p>
<p>One thing left: upload your Full Send by the end of the day on <strong>{{deadline_date}}</strong> and you're officially a GripTape Member for life. That means:</p>
<p>• Opportunities for paid internships (GripTape has paid 90+ young people for real work)<br>• Free NYC events every month — roller skating, escape rooms, pasta making, and more<br>• Unlimited invites for your friends</p>
<p>Your Full Send is just a simple 90-second video of what you accomplished. Rough phone video is perfect.</p>
<a class="cta" href="{{link}}">Submit your Full Send →</a>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, your call is done! Upload your Full Send by {{deadline_date}} and you're a GripTape Member: opportunities for paid internships, free NYC events, and more. {{link}}",
  },

  nudge_full_send_no_video_final: {
    email_subject: 'Two days left. Your membership is waiting.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your final call is done. Your Full Send is the only thing between you and your GripTape membership: opportunities for paid internships, free NYC events every month, and unlimited invites for your friends.</p>
<p>Upload it by the end of the day on <strong>{{deadline_date}}</strong>. A rough phone video counts. You're this close.</p>
<a class="cta" href="{{link}}">Submit your Full Send →</a>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, 2 days left. Upload your Full Send by {{deadline_date}} to claim your GripTape membership: paid internship opportunities, free NYC events for life. {{link}}',
  },

  nudge_full_send_no_eoc: {
    email_subject: 'Your Full Send is in. One call left.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send is in. One thing left: your final call with {{champion_name}}.</p>
<p>Reach out today to get it booked: {{champion_phone}}. Finish the call by the end of the day on <strong>{{deadline_date}}</strong> and you're a GripTape Member for life.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, your Full Send is in! Book your final call with {{champion_name}} ({{champion_phone}}) by {{deadline_date}} and you're a GripTape Member: paid internship opportunities, free NYC events, and more.",
  },

  nudge_full_send_no_eoc_final: {
    email_subject: 'Two days left. Book your final call.',
    email_body: `<p>Hey {{first_name}},</p>
<p>Your Full Send is in. You're almost a GripTape Member.</p>
<p>Reach out to {{champion_name}} today to get your final call on the calendar: {{champion_phone}}. It has to happen by the end of the day on <strong>{{deadline_date}}</strong>.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: 'Hey {{first_name}}, 2 days left. Book your final call with {{champion_name}} ({{champion_phone}}) by {{deadline_date}} to lock in your GripTape membership: paid internship opportunities + free NYC events.',
  },

  nudge_full_send_champion_no_eoc: {
    email_subject: '{{youth_name}} still needs their End of Challenge call',
    email_body: `<p>Hey {{first_name}},</p>
<p>{{youth_name}} has not completed their End of Challenge call yet. Their deadline is the end of the day on {{deadline_date}}.</p>
<p>Reach out to them and get it scheduled. Ask them to bring their Full Send so you can watch it together. Use the form below to guide the call.</p>
<p><a href="{{eoc_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Open End of Challenge Form</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, {{youth_name}} still needs their EOC call. Ask them to bring their Full Send so you can watch it together. Form: {{eoc_link}}",
  },

  nudge_full_send_champion_no_eoc_final: {
    email_subject: 'Two days left — {{youth_name}} EOC call',
    email_body: `<p>Hey {{first_name}},</p>
<p>Two days left. {{youth_name}} has not completed their End of Challenge call.</p>
<p>Reach out today: {{youth_phone}}. Ask them to bring their Full Send so you can watch it together.</p>
<p>Submit the form during or after your call.</p>
<p><a href="{{eoc_link}}" style="display:inline-block;background:#EA5329;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;padding:14px 32px;border-radius:6px;text-decoration:none;">Open End of Challenge Form</a></p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, 2 days left — {{youth_name}}'s EOC call is due {{deadline_date}}. Ask them to bring their Full Send to watch together. Form: {{eoc_link}}",
  },

  challenge_midpoint: {
    email_subject: 'NYC Challenge Check In',
    email_body: `<p>Hey {{first_name}},</p>
<p>Just a reminder: your NYC Learning Challenge ends <strong>{{challenge_end_date}}</strong>.</p>
<p>So here's a question worth asking yourself today: am I on track to finish what I said I'd do? If yes, keep pushing. If not, you still have time to fix it — but only if you start now.</p>
<p>You've got this.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: `Hey {{first_name}} — just a reminder: your NYC Learning Challenge ends {{challenge_end_date}}. Still time to do everything you wanted, but not unlimited time. This week counts. Get after it.`,
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
    email_subject: "The Challenge ends. The membership doesn't.",
    email_body: `<p>Hey {{first_name}},</p>
<p>You're in the home stretch. Finishing is what this whole Challenge has been building to: share what you accomplished, talk it through with {{champion_name}}, and you've done it.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 22px"><tr><td style="background:#fff4ef;border-left:4px solid #EA5329;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222222"><span style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#EA5329;text-transform:uppercase">Your deadline</span><br><span style="font-size:17px;font-weight:bold;color:#001722">End of day, {{deadline_date}}</span></td></tr></table>
<p style="margin:0 0 6px;font-size:15px;line-height:1.65;color:#222222"><strong style="color:#001722">Finishing gets you a GripTape membership. For life.</strong></p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 26px;background:#001722;border-radius:10px">
<tr><td style="padding:24px 24px 6px;font-family:Arial,Helvetica,sans-serif"><span style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#F79227;text-transform:uppercase">What your membership includes</span></td></tr>
<tr><td style="padding:10px 24px 0;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-top:1px solid rgba(255,255,255,0.12);padding:14px 0 0"><span style="font-size:15px;font-weight:bold;color:#EA5329">Opportunities for paid internships.</span><br><span style="font-size:14px;line-height:1.55;color:rgba(255,255,255,0.88)">GripTape has paid 90+ young people for real work — photography, video, social media, event hosting, consulting. When a paid internship opens, Members hear first.</span></td></tr></table></td></tr>
<tr><td style="padding:14px 24px 0;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-top:1px solid rgba(255,255,255,0.12);padding:14px 0 0"><span style="font-size:15px;font-weight:bold;color:#EA5329">GripTape Members succeed.</span><br><span style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.88)"><strong style="color:#ffffff">Leah</strong> — <a href="https://www.instagram.com/littlesbyleah" style="color:#F79227;text-decoration:underline">brand deals and her own online store</a><br><strong style="color:#ffffff">Alphina</strong> — <a href="https://www.youtube.com/watch?v=ETOqLrfGnnI" style="color:#F79227;text-decoration:underline">produced a TED talk</a><br><strong style="color:#ffffff">Nana</strong> — <a href="https://www.youtube.com/shorts/k_a6-73ub2k" style="color:#F79227;text-decoration:underline">a clothing line with H&amp;M</a></span></td></tr></table></td></tr>
<tr><td style="padding:14px 24px 0;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-top:1px solid rgba(255,255,255,0.12);padding:14px 0 0"><span style="font-size:15px;font-weight:bold;color:#EA5329">Free NYC events every month.</span><br><span style="font-size:14px;line-height:1.55;color:rgba(255,255,255,0.88)">Roller skating, escape rooms, pasta making, and more. Bring a friend.</span></td></tr></table></td></tr>
<tr><td style="padding:14px 24px 24px;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-top:1px solid rgba(255,255,255,0.12);padding:14px 0 0"><span style="font-size:15px;font-weight:bold;color:#EA5329">Unlimited invites for your friends.</span><br><span style="font-size:14px;line-height:1.55;color:rgba(255,255,255,0.88)">Your own invite link fast-tracks their application.</span></td></tr></table></td></tr>
</table>
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#001722;font-family:Arial,Helvetica,sans-serif">Here's how to finish</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 6px">
<tr><td width="44" valign="top" style="padding:0 0 16px"><table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td width="32" height="32" align="center" valign="middle" style="background:#EA5329;border-radius:16px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:32px">1</td></tr></table></td><td valign="top" style="padding:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222222"><strong style="color:#001722">Finish your Full Send video.</strong><br>Similar to your first video — a simple 90-second video sharing what you accomplished this Challenge.</td></tr>
<tr><td width="44" valign="top" style="padding:0 0 16px"><table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td width="32" height="32" align="center" valign="middle" style="background:#EA5329;border-radius:16px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:32px">2</td></tr></table></td><td valign="top" style="padding:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222222"><strong style="color:#001722">Book your final call with {{champion_name}}.</strong><br>30–45 minutes to look back at what you built. Reach out this week: <strong style="color:#EA5329">{{champion_phone}}</strong></td></tr>
<tr><td width="44" valign="top" style="padding:0 0 4px"><table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td width="32" height="32" align="center" valign="middle" style="background:#EA5329;border-radius:16px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:32px">3</td></tr></table></td><td valign="top" style="padding:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222222"><strong style="color:#001722">Show up with your Full Send ready.</strong><br>Play it for {{champion_name}} on the call, then upload it below.</td></tr>
</table>
<a class="cta" href="{{link}}">Submit your Full Send →</a>
<p>Call done and video in by the end of the day on <strong>{{deadline_date}}</strong> means you finished, and you're a Member. Every time. Nobody grades the editing.</p>
<p>— The NYC Learning Challenge Team</p>`,
    sms: "Hey {{first_name}}, time to finish your Challenge. Make a simple 90-second Full Send, bring it to your call with {{champion_name}}, then upload by {{deadline_date}}: {{link}} Finishing gets you a GripTape membership for life: paid internship opportunities, free NYC events, and more.",
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

// Personalized invite variables from the two referral names captured on the
// orientation call (youth.orientation_responses.referral_1_name / _2_name).
// All name-fallback copy lives here so it stays in one place. Every key always
// has a complete generic fallback — blank names can never block a send.
export function inviteNameVars(orientationResponses: Record<string, unknown>): Record<string, string> {
  const names = [orientationResponses?.referral_1_name, orientationResponses?.referral_2_name]
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
    .map((n) => n.trim());
  const [n1, n2] = names;
  return {
    invite_header_names: n2 ? `${n1} and ${n2}` : (n1 ?? 'your friends'),
    invite_called_line: n2
      ? `You already called it on your orientation call — ${n1} and ${n2}. All that's left is actually sending it.`
      : n1
        ? `You already called it on your orientation call — ${n1}. All that's left is actually sending it.`
        : `Your Champion's probably already asked you who you'd pick. All that's left is actually sending it.`,
    perk_title: n2
      ? `Bring 2 friends (${n1} and ${n2}). They're guaranteed in.`
      : n1
        ? `Bring 2 friends (${n1} + 1 more). They're guaranteed in.`
        : `Bring 2 friends. They're guaranteed in.`,
    perk_picks_line: n2
      ? `${n1} and ${n2} were your picks on the call — but it's your invite, so if someone else comes to mind, send it to them instead.`
      : n1
        ? `${n1} was your pick on the call — but they're your invites, so if someone else comes to mind, send it to them instead.`
        : `It's your invite — whoever comes to mind, send it to them.`,
    invites_clause: n2
      ? `${n1} and ${n2} (or whoever you pick) are guaranteed in`
      : n1
        ? `${n1} (or whoever you pick) is guaranteed in`
        : `your friends are guaranteed in`,
  };
}

// Safe defaults so a missing PERSONALIZATION var degrades the message to its
// generic version instead of blocking the send. Functional vars (w9_link,
// agreement_link, redemption_link, receipt_link, grant_amount, etc.) are
// deliberately NOT defaulted — a send with a broken link should still block
// and alert staff rather than fire.
export function withCommsDefaults(vars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...inviteNameVars({}), ...vars };
  if (!out.sms_invite_href && out.referral_link) {
    const genericInvite = `Hey! I'm doing the NYC Learning Challenge — you get funding + a mentor to build whatever you're passionate about. Grab a spot with my link: ${out.referral_link}`;
    out.sms_invite_href = `sms:?&body=${encodeURIComponent(genericInvite)}`;
  }
  return out;
}
