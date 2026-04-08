export const content = {
  video_pending: {
    email_subject: 'You\'re accepted — submit your intro video',
    email_body: `<p>Hi {{first_name}},</p>
      <p>You've been accepted to the GripTape Learning Challenge!</p>
      <p>Submit your intro video within 10 days to secure your spot.</p>
      <p><a href="{{link}}">Click here to submit your video</a></p>
      <p><a href="{{profile_link}}">See your builder profile</a></p>
      <p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>`,
    sms: 'Hi {{first_name}}! You\'re accepted to GripTape. Submit your video: {{link}} (placeholder)',
  },
  rejected: {
    email_subject: 'Your GripTape Learning Challenge application',
    email_body: `<p>Hi {{first_name}},</p>
      <p>Thank you for applying. Unfortunately we\'re unable to move forward at this time.</p>
      <p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>`,
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
      <p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>`,
    sms: 'Hi {{first_name}}, your video is confirmed! You are officially in GripTape. Stay tuned for next steps.',
  },
};

export function renderContent(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replaceAll(`{{${key}}}`, val ?? ''),
    template
  );
}
