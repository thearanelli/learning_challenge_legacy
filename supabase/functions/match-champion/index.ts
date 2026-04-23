// WEBHOOK SETUP — configure manually in Supabase Dashboard → Database → Webhooks
// Name:      on_youth_insert
// Table:     public.youth
// Events:    INSERT
// URL:       https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/match-champion
//
// Fires on every INSERT to youth. Matches youth with the best available
// champion using Claude AI, advances status to mentor_pending, and
// increments the champion's active_youth_count.
//
// The intro email is NOT sent here. The onboarding → mentor_pending status
// transition triggers the on_youth_mentor_pending webhook which calls
// send-champion-intro to send it. This means the same email path fires for
// both automated matching and manual staff assignment.
//
// Idempotency: advance_status() raises StatusConflictError if youth is
// not in 'onboarding' — subsequent invocations skip cleanly.
//
// Staff alert path: if no champions are available or Claude fails,
// sends alert to config.STAFF_EMAIL and returns 200 without advancing status.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { sendEmail } from '../_shared/email.ts';
import { systemPrompt, buildUserPrompt } from '../../../prompts/matchChampion.ts';

// next stage: config.STAGES.onboarding.next = 'mentor_pending'
const NEXT_STATUS = 'mentor_pending';

async function sendStaffAlert(subject: string, body: string): Promise<void> {
  if (!config.STAFF_EMAIL) {
    console.error('[match-champion] STAFF_EMAIL not set — cannot send alert');
    return;
  }
  await sendEmail({ to: config.STAFF_EMAIL, subject, html: `<p>${body}</p>` });
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const youthRecord = payload.record;

    if (!youthRecord?.id) {
      return new Response('No record in payload', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('DB_SERVICE_KEY')!,
    );

    // Step 1 — Load full youth record and source application
    const { data: youth, error: youthErr } = await supabase
      .from('youth')
      .select('*')
      .eq('id', youthRecord.id)
      .single();

    if (youthErr || !youth) {
      throw new Error(`Failed to load youth: ${youthErr?.message}`);
    }

    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select('application_responses')
      .eq('id', youth.application_id)
      .single();

    if (appErr || !application) {
      throw new Error(`Failed to load application: ${appErr?.message}`);
    }

    const responses = application.application_responses as Record<string, string>;

    // Step 2 — Load available champions (available = true, not at capacity)
    const { data: allChampions, error: champErr } = await supabase
      .from('champions')
      .select('id, first_name, last_name, email, bio, max_youth, active_youth_count')
      .eq('available', true);

    if (champErr) {
      throw new Error(`Failed to load champions: ${champErr.message}`);
    }

    const champions = (allChampions ?? []).filter(
      (c) => c.active_youth_count < c.max_youth,
    );

    if (champions.length === 0) {
      console.log(`[match-champion] No champions available for youth ${youth.id}`);
      await sendStaffAlert(
        `Action needed: no champions available for ${youth.first_name} ${youth.last_name}`,
        `No champions are currently available for matching. Manual assignment required.\n\n` +
        `Youth: ${youth.first_name} ${youth.last_name} (${youth.email})\n` +
        `Youth ID: ${youth.id}\n\n` +
        `Passion: ${responses.passion ?? '(not provided)'}\n\n` +
        `Why join: ${responses.why_join ?? '(not provided)'}\n\n` +
        `Once you have chosen a champion, run the following SQL in Supabase → SQL Editor:\n\n` +
        `UPDATE youth\n` +
        `SET champion_id      = '&lt;champion_id&gt;',\n` +
        `    status           = 'mentor_pending',\n` +
        `    access_token     = gen_random_uuid(),\n` +
        `    token_expires_at = now() + interval '16 days'\n` +
        `WHERE id = '${youth.id}'\n` +
        `  AND status = 'onboarding';\n\n` +
        `This will trigger the send-champion-intro webhook and send the intro email automatically.`,
      );
      return new Response(JSON.stringify({ no_champions: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Step 3 — Claude champion matching
    let selectedChampion: typeof champions[0];
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: buildUserPrompt({
              passion:  responses.passion  ?? '',
              why_join: responses.why_join ?? '',
              champions: champions.map((c) => ({
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                bio: c.bio,
              })),
            }),
          }],
        }),
      });

      if (!claudeRes.ok) {
        throw new Error(`Claude API error: ${await claudeRes.text()}`);
      }

      const claudeData = await claudeRes.json();
      const raw = claudeData.content[0]?.text ?? '';
      const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      console.log('[match-champion] Claude raw response:', JSON.stringify(raw));
      console.log('[match-champion] Claude cleaned response:', JSON.stringify(cleaned));
      let aiResult: { champion_id: string; reasoning: string };
      try {
        aiResult = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error(`Failed to parse Claude response. cleaned=${JSON.stringify(cleaned)} parseErr=${parseErr}`);
      }

      const matched = champions.find((c) => c.id === aiResult.champion_id);
      if (!matched) {
        throw new Error(`Claude returned unknown champion_id: ${aiResult.champion_id}`);
      }
      selectedChampion = matched;
      console.log(`[match-champion] Claude selected ${selectedChampion.first_name} ${selectedChampion.last_name} — ${aiResult.reasoning}`);

    } catch (claudeErr) {
      console.error('[match-champion] Claude matching failed:', claudeErr);
      await sendStaffAlert(
        `Action needed: champion matching failed for ${youth.first_name} ${youth.last_name}`,
        `Claude champion matching failed. Manual assignment required.\n\n` +
        `Youth: ${youth.first_name} ${youth.last_name} (${youth.email})\n\n` +
        `Error: ${claudeErr instanceof Error ? claudeErr.message : String(claudeErr)}`,
      );
      return new Response(JSON.stringify({ claude_error: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Step 4 — Advance status: onboarding -> mentor_pending
    const deadlineDays = config.STAGES.mentor_pending.deadline_days!;
    const bufferHours  = config.TOKEN_BUFFER_HOURS;
    const expiresAt    = new Date(
      Date.now() + (deadlineDays * 24 + bufferHours) * 60 * 60 * 1000,
    ).toISOString();
    const accessToken = crypto.randomUUID();

    const { error: advanceError } = await supabase.rpc('advance_status', {
      record_id:               youth.id,
      table_name:              'youth',
      expected_current_status: config.STATUS.ONBOARDING,
      next_status:             NEXT_STATUS,
      additional_fields: {
        champion_id:      selectedChampion.id,
        access_token:     accessToken,
        token_expires_at: expiresAt,
      },
    });

    if (advanceError) {
      if (advanceError.message?.includes('StatusConflictError')) {
        console.log(`[match-champion] StatusConflictError for youth ${youth.id} — already processed`);
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw new Error(`advance_status error: ${advanceError.message}`);
    }

    // Step 5 — Increment champion's active_youth_count
    await supabase
      .from('champions')
      .update({ active_youth_count: selectedChampion.active_youth_count + 1 })
      .eq('id', selectedChampion.id);

    // Intro email is handled by send-champion-intro, triggered by the
    // on_youth_mentor_pending DB webhook on the onboarding → mentor_pending transition.
    console.log(
      `[match-champion] youth ${youth.id} matched to champion ${selectedChampion.id}, status → ${NEXT_STATUS}`,
    );

    return new Response(
      JSON.stringify({ success: true, champion_id: selectedChampion.id }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    console.error('[match-champion] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
