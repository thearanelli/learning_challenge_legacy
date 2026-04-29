import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from './email.ts';
import { sendSMS } from './sms.ts';
import { content, renderContent } from './content.ts';
import { config } from './config.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('DB_SERVICE_KEY')!,
);

async function logComms(row: {
  channel: string;
  stage_key: string;
  message_body: string;
  youth_id?: string;
  champion_id?: string;
}): Promise<void> {
  try {
    await supabase.from('comms_log').insert({
      program_id:      config.PROGRAM_ID,
      youth_id:        row.youth_id ?? null,
      champion_id:     row.champion_id ?? null,
      direction:       'outbound',
      channel:         row.channel,
      stage_key:       row.stage_key,
      message_body:    row.message_body,
      sent_at:         new Date().toISOString(),
      delivery_status: 'sent',
    });
  } catch (err) {
    console.error('[dispatcher] comms_log insert failed:', err);
  }
}

export async function sendNotification(
  stageKey: string,
  recipient: { first_name: string; last_name?: string; email: string; phone: string },
  vars: Record<string, string> = {},
  meta: { youth_id?: string; champion_id?: string } = {}
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
    const subject = renderContent(b.email_subject, allVars);
    await sendEmail({
      to: recipient.email,
      subject,
      html: renderContent(b.email_body, allVars),
    });
    await logComms({ channel: 'email', stage_key: stageKey, message_body: subject, ...meta });
  }
  if (b.sms) {
    const body = renderContent(b.sms, allVars);
    await sendSMS({
      to: recipient.phone,
      body,
    });
    await logComms({ channel: 'sms', stage_key: stageKey, message_body: body, ...meta });
  }
  console.log(`[dispatcher] Sent ${stageKey} comms to ${recipient.email}`);
}

export async function sendStaffNotification(
  stageKey: string,
  vars: Record<string, string> = {},
  meta: { youth_id?: string; champion_id?: string } = {}
): Promise<void> {
  const block = (content as Record<string, unknown>)[stageKey];
  if (!block) {
    console.error(`[dispatcher] No content block for stage: ${stageKey}`);
    return;
  }
  const b = block as Record<string, string>;

  if (b.staff_email_subject && b.staff_email_body) {
    const staffEmail = config.STAFF_EMAIL;
    if (!staffEmail) {
      console.error('[dispatcher] STAFF_EMAIL not set');
    } else {
      const subject = renderContent(b.staff_email_subject, vars);
      await sendEmail({
        to: staffEmail,
        subject,
        html: renderContent(b.staff_email_body, vars),
      });
      await logComms({ channel: 'email', stage_key: stageKey, message_body: subject, ...meta });
    }
  }

  if (b.staff_sms) {
    const staffPhone = Deno.env.get('STAFF_PHONE') || '';
    if (!staffPhone) {
      console.error('[dispatcher] STAFF_PHONE not set');
    } else {
      await sendSMS({
        to: staffPhone,
        body: renderContent(b.staff_sms, vars),
      });
    }
  }

  console.log(`[dispatcher] Sent staff notification for: ${stageKey}`);
}
