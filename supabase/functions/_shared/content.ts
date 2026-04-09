export const content = {
  declaration_pending: {
    email_subject: 'You\'re in — now let\'s see what you\'re made of',
    email_body: `<p>Hi {{first_name}},</p>
<p>Your application made it through. That already puts you ahead of most.</p>
<p>Before we go further, we want you to understand exactly what you\'re
stepping into — and make sure you\'re ready to commit.</p>
<p><a href="{{link}}">Read about the program and declare your intent →</a></p>
<p>Your builder profile is live:<br>
<a href="{{profile_link}}">{{profile_link}}</a></p>
<p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>`,
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
<p><strong>Placeholder — replace with real copy before pilot launch.</strong></p>`,
    sms: 'Hi {{first_name}}, you\'re in. Submit your video: {{video_link}} Your profile: {{profile_link}}',
  },
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
