export const content = {
  declaration_pending: {
    email_subject: 'Step 1 done. You\'re invited to Step 2.',
    email_body: `<p>Hi {{first_name}},</p>
<p>It takes guts to put your passion into words. You did that — and that was Step 1.</p>
<p>Now you\'re invited to Step 2: see what GripTape is really about, straight from the 4,000+ teens who\'ve been exactly where you are. Builders who got real funding, a mentor, and the support to actually finish what they started.</p>
<p>See what they made. Then tell us if you\'re ready to do the same.</p>
<p><a href="{{link}}">Your spot isn\'t secured yet — Step 2 is how you get there →</a></p>`,
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

  mentor_pending: {
    email_subject: 'Placeholder — replace before launch',
    email_body: 'Placeholder — replace before launch. Variables available: {{youth_first_name}}, {{champion_first_name}}, {{champion_name}}, {{deadline_date}}, {{program_name}}',
    nudge_email_subject: 'Placeholder — replace before launch',
    nudge_email_body: 'Placeholder — replace before launch',
    removal_email_subject: 'Placeholder — replace before launch',
    removal_email_body: 'Placeholder — replace before launch',
  },

  grant_pending: {
    email_subject: 'PLACEHOLDER — Next step: sign your documents',
    email_body: `<p>PLACEHOLDER — Hi {{first_name}},</p>
<p>Congratulations on completing your orientation call.</p>
<p>Your next step is to sign two documents so we can process your $250 learning stipend.</p>
<p><a href="{{grant_link}}">Click here to get started →</a></p>
<p>You have 14 days to complete this step.</p>`,
    sms: 'PLACEHOLDER — GripTape: Time to sign your documents. {{grant_link}}',
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
