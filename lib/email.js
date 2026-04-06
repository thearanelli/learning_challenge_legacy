import { config } from '../config.js'

export async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Resend error: ${data.message || JSON.stringify(data)}`)
  }

  console.log(`[EMAIL] Sent to ${to} | Subject: ${subject}`)
  return data
}
