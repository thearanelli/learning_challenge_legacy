// OWNER: submitted -> flagged transition (AI reviews but does not decide)
// Triggered by: Supabase database webhook on applications INSERT
// Does NOT handle deadline removal — that is owned by daily-scheduler

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendStaffNotification } from '../_shared/dispatcher.ts';
import { config } from '../_shared/config.ts';
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
  try {
    const payload = await req.json();
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

    // Call Claude for recommendation only — does not affect routing
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

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Claude returned invalid JSON: ${rawText}`);
    }
    const aiResult = JSON.parse(jsonMatch[0]);

    const { decision, reasoning, failed_criteria, passion } = aiResult;
    console.log(`[SCREEN] ${application.id}: AI decision = ${decision}`);

    const notify_after = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    if (decision === 'accepted') {
      const { error: advanceError } = await supabase.rpc('advance_status', {
        record_id: application.id,
        table_name: 'applications',
        expected_current_status: config.STATUS.SUBMITTED,
        next_status: config.STATUS.DECLARATION_PENDING,
        additional_fields: {
          ai_decision: decision,
          ai_reasoning: reasoning,
          passion: passion ?? null,
          notify_after,
          stage_entered_at: new Date().toISOString(),
        },
      });
      if (advanceError) {
        if (advanceError.message?.includes('StatusConflictError')) {
          console.log(`[SKIP] ${application.id} — already processed`);
          return new Response('Already processed', { status: 200 });
        }
        throw new Error(`advance_status error: ${advanceError.message}`);
      }
      await sendStaffNotification(
        'application_accepted',
        {
          first_name: application.first_name as string,
          last_name: application.last_name as string,
          email: application.email as string,
          passion: passion ?? '',
          referred_by: (application.referred_by as string) ?? 'none',
          reasoning,
        },
        { application_id: application.id },
      );

    } else if (decision === 'rejected') {
      const { error: advanceError } = await supabase.rpc('advance_status', {
        record_id: application.id,
        table_name: 'applications',
        expected_current_status: config.STATUS.SUBMITTED,
        next_status: config.STATUS.REJECTED,
        additional_fields: {
          ai_decision: decision,
          ai_reasoning: reasoning,
          failed_criteria: failed_criteria ?? null,
          notify_after,
          stage_entered_at: new Date().toISOString(),
        },
      });
      if (advanceError) {
        if (advanceError.message?.includes('StatusConflictError')) {
          console.log(`[SKIP] ${application.id} — already processed`);
          return new Response('Already processed', { status: 200 });
        }
        throw new Error(`advance_status error: ${advanceError.message}`);
      }
      await sendStaffNotification(
        'application_rejected',
        {
          first_name: application.first_name as string,
          last_name: application.last_name as string,
          email: application.email as string,
          failed_criteria: failed_criteria ?? '',
          reasoning,
        },
        { application_id: application.id },
      );

    } else {
      // flagged
      const { error: advanceError } = await supabase.rpc('advance_status', {
        record_id: application.id,
        table_name: 'applications',
        expected_current_status: config.STATUS.SUBMITTED,
        next_status: config.STATUS.FLAGGED,
        additional_fields: {
          ai_decision: decision,
          ai_reasoning: reasoning,
          failed_criteria: failed_criteria ?? null,
          passion: passion ?? null,
          stage_entered_at: new Date().toISOString(),
        },
      });
      if (advanceError) {
        if (advanceError.message?.includes('StatusConflictError')) {
          console.log(`[SKIP] ${application.id} — already processed`);
          return new Response('Already processed', { status: 200 });
        }
        throw new Error(`advance_status error: ${advanceError.message}`);
      }
      await sendStaffNotification(
        'flagged',
        {
          first_name: application.first_name as string,
          last_name: application.last_name as string,
          ai_decision: decision,
          reasoning,
          failed_criteria: failed_criteria ?? '',
        },
        { application_id: application.id },
      );
    }

    return new Response(
      JSON.stringify({ success: true, ai_decision: decision }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[ERROR] screen-application:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
