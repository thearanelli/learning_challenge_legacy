// OWNER: declaration_pending transition → generates AI goal chips
// Triggered by: Supabase database webhook on applications UPDATE
// Guard: only fires on screening_status transition TO declaration_pending

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function retryWithBackoff(fn: () => Promise<Response>, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fn();
    if (res.ok) return res;
    const text = await res.clone().text();
    const isOverloaded = text.includes('overloaded_error');
    if (!isOverloaded || i === retries - 1) return res;
    const delay = Math.pow(2, i) * 1000;
    console.log(`[RETRY] Claude overloaded, retrying in ${delay}ms (attempt ${i + 1})`);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('retryWithBackoff exhausted');
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const old_record = payload.old_record;

    if (!record?.id) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        headers: { 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // Transition guard: only on acceptance transition
    if (record.screening_status !== 'declaration_pending' || old_record?.screening_status === 'declaration_pending') {
      return new Response(JSON.stringify({ skipped: 'not acceptance transition' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Idempotency guard: chips already generated
    if (record.goal_chips != null) {
      return new Response(JSON.stringify({ skipped: 'chips exist' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Assemble application content (same approach as screen-application)
    const responses = (record.application_responses as Record<string, string>) || {};
    let content = [responses.passion || '', responses.why_join || ''].filter(Boolean).join('\n\n');

    // If payload content is thin (empty responses, backfill invocation), re-query the row
    if (!content || content.trim().length < 20) {
      console.log(`[generate-goal-chips] payload content thin for ${record.id} (${content.trim().length} chars) — re-querying`);
      const { data: app, error: fetchErr } = await supabase
        .from('applications')
        .select('passion, application_responses')
        .eq('id', record.id)
        .single();
      if (fetchErr || !app) {
        console.log(`[generate-goal-chips] re-query failed for ${record.id}: ${fetchErr?.message} — skipping`);
        return new Response(JSON.stringify({ skipped: 'thin content' }), {
          headers: { 'Content-Type': 'application/json' }, status: 200,
        });
      }
      const dbResponses = (app.application_responses as Record<string, string>) || {};
      const parts = [app.passion || '', dbResponses.passion || '', dbResponses.why_join || ''];
      const unique = [...new Set(parts.map((p: string) => p.trim()).filter(Boolean))];
      content = unique.join('\n\n');
    }

    if (!content || content.trim().length < 20) {
      console.log(`[generate-goal-chips] content too thin for ${record.id} after re-query (${content.trim().length} chars) — skipping`);
      return new Response(JSON.stringify({ skipped: 'thin content' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Claude call
    const claudeRes = await retryWithBackoff(() => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `You write goal suggestions for NYC teens (15–19) starting a 7-day passion project. Given their application, return ONLY a JSON array of exactly 3 strings — no preamble, no markdown fences. Each string: a first-person 7-day goal, 30–110 characters, achievable with only a phone and free tools, deliberately modest ('rough demo counts', 'one take is fine' energy). Diversity: one about making something, one about learning something, one about sharing something with a person. If the application is vague or covers many interests, write warm generic starter goals rather than guessing a specific interest. Never reference health conditions, identity, family or financial circumstances, or anything sensitive, even if the application mentions them. Sound like a teen wrote it, not a guidance counselor.`,
        messages: [{ role: 'user', content }],
      }),
    }));

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error(`[generate-goal-chips] Claude API error for ${record.id}: ${errText}`);
      return new Response(JSON.stringify({ skipped: 'claude error' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text || '';

    // Parse defensively: strip fences, extract array
    let chips: string[];
    try {
      let cleaned = rawText.trim();
      // Strip markdown fences
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      // If not starting with [, try to extract first [...] substring
      if (!cleaned.trim().startsWith('[')) {
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (!arrayMatch) throw new Error('no array found');
        cleaned = arrayMatch[0];
      }
      chips = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error(`[generate-goal-chips] parse failed for ${record.id}. Raw: ${rawText}`);
      return new Response(JSON.stringify({ skipped: 'parse error' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Validate: exactly 3 strings, each 10-140 chars after cleanup
    if (!Array.isArray(chips) || chips.length !== 3) {
      console.error(`[generate-goal-chips] validation failed for ${record.id}: expected 3 items, got ${chips?.length}. Raw: ${rawText}`);
      return new Response(JSON.stringify({ skipped: 'validation error' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }

    for (let i = 0; i < chips.length; i++) {
      if (typeof chips[i] !== 'string') {
        console.error(`[generate-goal-chips] item ${i} not a string for ${record.id}. Raw: ${rawText}`);
        return new Response(JSON.stringify({ skipped: 'validation error' }), {
          headers: { 'Content-Type': 'application/json' }, status: 200,
        });
      }
      chips[i] = chips[i].trim().replace(/\n+/g, ' ');
      if (chips[i].length < 10 || chips[i].length > 140) {
        console.error(`[generate-goal-chips] item ${i} length ${chips[i].length} out of range for ${record.id}. Raw: ${rawText}`);
        return new Response(JSON.stringify({ skipped: 'validation error' }), {
          headers: { 'Content-Type': 'application/json' }, status: 200,
        });
      }
    }

    // Write with race guard
    const { error: updateErr } = await supabase
      .from('applications')
      .update({ goal_chips: chips })
      .eq('id', record.id)
      .eq('screening_status', 'declaration_pending');

    if (updateErr) {
      console.error(`[generate-goal-chips] update failed for ${record.id}:`, updateErr.message);
    } else {
      console.log(`[generate-goal-chips] wrote chips for ${record.id}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (err) {
    console.error('[generate-goal-chips] error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    });
  }
});
