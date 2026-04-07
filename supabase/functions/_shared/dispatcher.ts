import { sendEmail } from './email.ts';
import { sendSMS } from './sms.ts';
import { content, renderContent } from './content.ts';

export async function sendNotification(
  stageKey: string,
  recipient: { first_name: string; last_name?: string; email: string; phone: string },
  vars: Record<string, string> = {}
): Promise<void> {
  const block = (content as Record<string, unknown>)[stageKey];
  if (!block) {
    console.error(`[dispatcher] No content block for stage: ${stageKey}`);
    return;
  }
  const b = block as Record<string, string>;
  const allVars = {
    first_name: recipient.first_name,
    last_name: recipient.last_name ?? '',
    ...vars,
  };
  if (b.email_subject && b.email_body) {
    await sendEmail({
      to: recipient.email,
      subject: renderContent(b.email_subject, allVars),
      html: renderContent(b.email_body, allVars),
    });
  }
  if (b.sms) {
    await sendSMS({
      to: recipient.phone,
      body: renderContent(b.sms, allVars),
    });
  }
  console.log(`[dispatcher] Sent ${stageKey} comms to ${recipient.email}`);
}

export async function sendStaffNotification(
  stageKey: string,
  vars: Record<string, string> = {}
): Promise<void> {
  const block = (content as Record<string, unknown>)[stageKey];
  if (!block) {
    console.error(`[dispatcher] No content block for stage: ${stageKey}`);
    return;
  }
  const b = block as Record<string, string>;
  if (!b.staff_sms) return;
  const staffPhone = Deno.env.get('STAFF_PHONE') || '';
  if (!staffPhone) {
    console.error('[dispatcher] STAFF_PHONE not set');
    return;
  }
  await sendSMS({
    to: staffPhone,
    body: renderContent(b.staff_sms, vars),
  });
  console.log(`[dispatcher] Sent staff notification for: ${stageKey}`);
}
