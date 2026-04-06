// OWNER: submitted -> screening -> video_pending transition
// Triggered by: Supabase database webhook on applications INSERT
// Does NOT handle deadline removal — that is owned by daily-scheduler

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';
import { sendSMS } from '../_shared/sms.ts';
import {
  screenApplicationSystemPrompt,
  buildScreenApplicationPrompt,
} from '../_shared/prompts.ts';

serve(async (req) => {
  try {
    const payload = await req.json();
    const application = payload.record;

    if (!application?.id) {
      return new Response('No application record in payload', { status: 400 });
    }

    if (application.screening_status !== 'submitted') {
      console.log(`[SKIP] ${application.id} is ${application.screening_status}`);
      return new Response('Not submitted status', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Idempotency guard — only update if still submitted
    const { error: screeningError } = await supabase
      .from('applications')
      .update({ screening_status: 'screening' })
      .eq('id', application.id)
      .eq('screening_status', 'submitted');

    if (screeningError) {
      throw new Error(`Failed to set screening: ${screeningError.message}`);
    }

    // Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: screenApplicationSystemPrompt,
        messages: [{ role: 'user', content: buildScreenApplicationPrompt(application) }],
      }),
    });

    if (!claudeRes.ok) {
      throw new Error(`Claude API error: ${await claudeRes.text()}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content[0]?.text || '';

    const cleaned = rawText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();
    let aiResult: { decision: string; reasoning: string; failed_criteria: string | null };
    try {
      aiResult = JSON.parse(cleaned);
    } catch {
      throw new Error(`Claude returned invalid JSON: ${rawText}`);
    }

    const { decision, reasoning, failed_criteria } = aiResult;
    console.log(`[SCREEN] ${application.id}: ${decision}`);

    const newStatus = decision === 'accepted' ? 'video_pending'
      : decision === 'rejected' ? 'rejected'
      : 'flagged';

    const accessToken = decision === 'accepted' ? crypto.randomUUID() : null;

    const updatePayload: Record<string, unknown> = {
      screening_status: newStatus,
      ai_decision: decision,
      ai_reasoning: reasoning,
      failed_criteria: failed_criteria ?? null,
    };
    if (accessToken) {
      updatePayload.access_token = accessToken;
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', application.id);

    if (updateError) {
      throw new Error(`Failed to update application: ${updateError.message}`);
    }

    if (decision === 'accepted') {
      const videoLink = `https://learning-challenge-legacy.vercel.app/video?token=${accessToken}`;
      await sendEmail({
        to: application.email,
        subject: "You're accepted — submit your intro video",
        html: `<p>Hi ${application.first_name},</p>
               <p>You've been accepted to the GripTape Learning Challenge!</p>
               <p>Submit your intro video within 10 days to secure your spot.</p>
               <p><a href="${videoLink}">Click here to submit your video</a></p>`,
      });
      await sendSMS({
        to: application.phone,
        body: `Hi ${application.first_name}! You're accepted to GripTape. Submit your video: ${videoLink}`,
      });

    } else if (decision === 'rejected') {
      await sendEmail({
        to: application.email,
        subject: 'Your GripTape Learning Challenge application',
        html: `<p>Hi ${application.first_name},</p>
               <p>Thank you for applying. Unfortunately we're unable to move forward at this time.</p>
               <p><em>Placeholder — replace with content.js copy before pilot launch.</em></p>`,
      });
      await sendSMS({
        to: application.phone,
        body: `Hi ${application.first_name}, thanks for applying to GripTape. We're unable to move forward at this time.`,
      });

    } else {
      // Flagged — notify staff only, no email to youth
      const staffPhone = Deno.env.get('STAFF_PHONE') || '';
      await sendSMS({
        to: staffPhone,
        body: `[FLAGGED] ${application.first_name} ${application.last_name} needs review. ${reasoning}`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, decision }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] screen-application:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
