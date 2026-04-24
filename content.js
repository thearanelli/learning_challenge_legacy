// Placeholder — replace before launch.
// Template variables: {{first_name}}, {{last_name}}, {{link}}, {{deadline_date}},
// {{program_name}}, {{support_number}}, {{stipend_amount}}

import { config } from './config.js';

export const content = {

  video_pending: {
    email_subject: 'Placeholder — replace before launch. Action required: Submit your video for {{program_name}}',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

Congratulations — you've been accepted to the next stage of {{program_name}}!

Your next step is to submit a short video. Please submit by {{deadline_date}}.

Submit here: {{link}}

Questions? Text or call us at {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Hi {{first_name}}, submit your video by {{deadline_date}}: {{link}}',
    nudge_sms: 'Placeholder — replace before launch. Reminder {{first_name}}: your video is due {{deadline_date}}. Submit now: {{link}}',
    removal_sms: 'Placeholder — replace before launch. Hi {{first_name}}, your spot in {{program_name}} has been released. Text {{support_number}} if this is a mistake.',
    removal_email: {
      subject: 'Placeholder — replace before launch. Your {{program_name}} application',
      body: `Placeholder — replace before launch.

Hi {{first_name}},

We didn't receive your video by the deadline, so your spot has been released.

If you believe this is a mistake, reply to this email or text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    },
  },

  rejected: {
    email_subject: 'Placeholder — replace before launch. Your {{program_name}} application',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

Thank you for applying to {{program_name}}. After review, we're unable to move your application forward at this time.

We appreciate you taking the time to apply.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Hi {{first_name}}, we reviewed your application and are unable to move forward. Questions? {{support_number}}',
  },

  flagged: {
    // Sent to staff, not to youth
    staff_sms: 'Placeholder — replace before launch. [FLAGGED] Application from {{first_name}} {{last_name}} needs manual review. Check the dashboard.',
  },

  onboarding: {
    email_subject: 'Placeholder — replace before launch. Welcome to {{program_name}} — next steps inside',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

Welcome to {{program_name}}! We're excited to have you.

Here's what happens next: {{link}}

Questions? Text or call {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Welcome {{first_name}}! You\'re in {{program_name}}. Check your email for next steps or visit: {{link}}',
  },

  mentor_pending: {
    email_subject: 'Placeholder — replace before launch. One more step: connect with your Champion',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

You're almost there! Your next step is to connect with your Champion by {{deadline_date}}.

Complete this step here: {{link}}

Questions? Text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Hi {{first_name}}, connect with your Champion by {{deadline_date}}: {{link}}',
    nudge_sms: 'Placeholder — replace before launch. Reminder {{first_name}}: connect with your Champion by {{deadline_date}}: {{link}}',
    removal_sms: 'Placeholder — replace before launch. Hi {{first_name}}, your spot in {{program_name}} has been released. Text {{support_number}} if this is a mistake.',
    removal_email: {
      subject: 'Placeholder — replace before launch. Your {{program_name}} status',
      body: `Placeholder — replace before launch.

Hi {{first_name}},

We didn't hear from you by the deadline, so your spot has been released.

Questions? Reply here or text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    },
  },

  grant_pending: {
    email_subject: 'PLACEHOLDER — Sign your documents to unlock your stipend',
    email_body: `PLACEHOLDER — Hi {{first_name}},

Your orientation call is complete. You are one step away from unlocking your $250 GripTape Learning Challenge stipend.

You need to sign two documents:

Sign your W-9 form:
{{w9_link}}

Sign your participation agreement:
{{agreement_link}}

Both documents must be signed within 14 days.

Questions? Visit ${config.BASE_URL}/help`,
    sms: `PLACEHOLDER — GripTape: Sign your documents to unlock your stipend. W-9: {{w9_link}} Agreement: {{agreement_link}}`,
    nudge_sms: 'Placeholder — replace before launch. Reminder {{first_name}}: grant proposal due {{deadline_date}}: {{link}}',
    removal_sms: 'Placeholder — replace before launch. Hi {{first_name}}, your spot in {{program_name}} has been released. Text {{support_number}} with questions.',
    removal_email: {
      subject: 'Placeholder — replace before launch. Your {{program_name}} grant proposal',
      body: `Placeholder — replace before launch.

Hi {{first_name}},

We didn't receive your grant proposal by {{deadline_date}}, so your spot has been released.

Reply to this email or text {{support_number}} if you have questions.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`,
    },
  },

  grant_review: {
    email_subject: 'Placeholder — replace before launch. Your grant proposal is under review',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

We've received your grant proposal and it's currently under review. We'll be in touch soon.

Questions? Text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Hi {{first_name}}, your grant proposal is under review. We\'ll be in touch. Questions? {{support_number}}',
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
    email_body: `PLACEHOLDER — Hi {{first_name}},

Great news — your grant has been approved by the GripTape team!

To receive your $250 learning stipend, please complete your direct deposit information using the link below:

{{deposit_link}}

Questions? Visit ${config.BASE_URL}/help`,
    sms: `PLACEHOLDER — GripTape: Your grant is approved! Set up direct deposit to receive your $250: {{deposit_link}}`,
  },

  active: {
    email_subject: 'Placeholder — replace before launch. Your {{program_name}} grant is approved — you\'re active!',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

Great news — your grant has been approved and you're officially active in {{program_name}}!

Your stipend of ${{stipend_amount}} will be processed according to program guidelines.

Visit your dashboard: {{link}}

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Congrats {{first_name}}! Your grant is approved. You\'re active in {{program_name}}. Dashboard: {{link}}',
  },

  final_video_pending: {
    email_subject: 'Placeholder — replace before launch. Submit your final video for {{program_name}}',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

You're near the finish line! Submit your final video by {{deadline_date}}.

Submit here: {{link}}

Questions? Text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Hi {{first_name}}, submit your final video by {{deadline_date}}: {{link}}',
    nudge_sms: 'Placeholder — replace before launch. Reminder {{first_name}}: final video due {{deadline_date}}: {{link}}',
  },

  showcase_invited: {
    email_subject: 'Placeholder — replace before launch. You\'re invited to the {{program_name}} Showcase!',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

You're invited to present at the {{program_name}} Showcase!

Details and RSVP: {{link}}

Questions? Text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. {{first_name}}, you\'re invited to the {{program_name}} Showcase! RSVP: {{link}}',
  },

  completed: {
    email_subject: 'Placeholder — replace before launch. Congratulations — you completed {{program_name}}!',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

Congratulations on completing {{program_name}}! This is a huge accomplishment.

We're proud of you and can't wait to see what you do next.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Congrats {{first_name}}! You completed {{program_name}}. We\'re so proud of you.',
  },

  ryan_notification: {
    staff_email_subject: 'Grant disbursement — {{legal_name}}',
    staff_email_body: `Grant disbursement ready.

Challenger: {{first_name}} {{last_name}}
Legal name: {{legal_name}}
Email: {{email}}
Phone: {{phone}}
Grant amount: ${{grant_amount}}
Payment format: {{grant_format}}
Grant coding: {{grant_coding}}
Challenger Progress ID: {{youth_id}}
Approved on: {{approved_at}}
W-9: {{w9_doc_url}}

Tremendous disbursement pending — deposit link will be sent to challenger directly once wired.`,
  },

  removed: {
    email_subject: 'Placeholder — replace before launch. Your {{program_name}} status',
    email_body: `Placeholder — replace before launch.

Hi {{first_name}},

Your participation in {{program_name}} has ended.

If you have questions or believe this is a mistake, reply to this email or text {{support_number}}.

— The GripTape Team

Need help? Visit ${config.BASE_URL}/help`, // help footer
    sms: 'Placeholder — replace before launch. Hi {{first_name}}, your participation in {{program_name}} has ended. Questions? Text {{support_number}}.',
  },

}
