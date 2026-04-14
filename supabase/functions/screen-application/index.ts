// OWNER: submitted -> screening -> declaration_pending transition
// Triggered by: Supabase database webhook on applications INSERT
// Does NOT handle deadline removal — that is owned by daily-scheduler

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendNotification, sendStaffNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';
import { generateToken } from '../_shared/tokens.ts';
import {
  screenApplicationSystemPrompt,
  buildScreenApplicationPrompt,
} from '../_shared/prompts.ts';

async function retryWithBackoff(fn: () => Promise<Response>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fn();
    if (res.ok) return res;
    const text = await res.clone().text();
    const isOverloaded = text.includes('overloaded_error');
    if (!isOverloaded || i === retries - 1) return res;
    const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
    console.log(`[RETRY] Claude overloaded, retrying in ${delay}ms (attempt ${i + 1})`);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('retryWithBackoff exhausted');
}

serve(async (req) => {
  let payload: any;
  try {
    payload = await req.json();
    const application = payload.record;

    if (!application?.id) {
      return new Response('No application record in payload', { status: 400 });
    }

    if (application.screening_status !== config.STATUS.SUBMITTED) {
      console.log(`[SKIP] ${application.id} is ${application.screening_status}`);
      return new Response('Not submitted status', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    const { data: advanced, error: advanceError } = await supabase
      .rpc('advance_status', {
        record_id: application.id,
        table_name: 'applications',
        expected_current_status: config.STATUS.SUBMITTED,
        next_status: config.STATUS.SCREENING,
      });

    if (advanceError) {
      throw new Error(`advance_status error: ${advanceError.message}`);
    }
    if (!advanced) {
      console.log(`[SKIP] ${application.id} — already claimed`);
      return new Response('Already processing', { status: 200 });
    }

    // Call Claude
    const claudeRes = await retryWithBackoff(() => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: screenApplicationSystemPrompt,
        messages: [{ role: 'user', content: buildScreenApplicationPrompt(application) }],
      }),
    }));

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

    // next stage per config.STAGES.screening.next
    const newStatus = decision === 'accepted' ? config.STATUS.DECLARATION_PENDING
      : decision === 'rejected' ? config.STATUS.REJECTED
      : config.STATUS.FLAGGED;

    const tokenData = decision === 'accepted'
      ? generateToken(config.STAGES.declaration_pending.deadline_days)
      : null;

    const additionalFields: Record<string, unknown> = {
      ai_decision: decision,
      ai_reasoning: reasoning,
      failed_criteria: failed_criteria ?? null,
    };
    let profileToken: string | undefined;
    if (tokenData) {
      additionalFields.access_token = tokenData.access_token;
      additionalFields.stage_deadline_at = tokenData.stage_deadline_at;
    }
    if (decision === 'accepted') {
      profileToken = crypto.randomUUID();
      additionalFields.profile_token = profileToken;
    }

    // advance_status: screening -> declaration_pending | rejected | flagged
    const { error: updateError } = await supabase.rpc('advance_status', {
      record_id: application.id,
      table_name: 'applications',
      expected_current_status: config.STATUS.SCREENING,
      next_status: newStatus,
      additional_fields: additionalFields,
    });

    if (updateError) {
      throw new Error(`advance_status (screening → final) error: ${updateError.message}`);
    }

    if (decision === 'accepted') {
      const declareLink = `${config.BASE_URL}/declare?token=${tokenData!.access_token}`;
      const profileLink = `${config.BASE_URL}/profile?token=${profileToken}`;
      await sendNotification(config.STATUS.DECLARATION_PENDING, application, {
        link: declareLink,
        profile_link: profileLink,
      });

    } else if (decision === 'rejected') {
      await sendNotification(config.STATUS.REJECTED, application);

    } else {
      // Flagged — notify staff only, no email to youth
      await sendStaffNotification(config.STATUS.FLAGGED, {
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
    const supabaseForReset = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );
    await supabaseForReset
      .from('applications')
      .update({ screening_status: config.STATUS.SUBMITTED })
      .eq('id', payload?.record?.id)
      .eq('screening_status', config.STATUS.SCREENING); // safety: only reset if still stuck
    console.error('[ERROR] screen-application:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
