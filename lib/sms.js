// Twilio implementation — replace when TWILIO_ACCOUNT_SID is configured

export async function sendSMS({ to, body }) {
  console.log(`[SMS STUB] To: ${to} | Body: ${body}`)
  return { stub: true }
}
