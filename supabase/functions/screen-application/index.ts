// OWNER: submitted -> screening -> video_pending transition
// Triggered by: Supabase database webhook on applications INSERT
// Does NOT handle deadline removal — that is owned by daily-scheduler

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification, sendStaffNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';
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
      const videoLink = `${config.BASE_URL}/video?token=${accessToken}`;
      await sendNotification('video_pending', application, { link: videoLink });

    } else if (decision === 'rejected') {
      await sendNotification('rejected', application);

    } else {
      // Flagged — notify staff only, no email to youth
      await sendStaffNotification('flagged', {
        first_name: application.first_name,
        last_name: application.last_name,
        reasoning,
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
