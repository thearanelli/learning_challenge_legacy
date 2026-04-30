// CRON SCHEDULE — configured in supabase/config.toml
// [functions.daily-scheduler]
// schedule = "*/30 * * * *"
//
// Runs every 30 minutes. In TEST_MODE one minute counts as one day.
//
// Section 1 — 48-hour delayed sends (declaration_pending / rejected)
// Section 2 — Nudges (application stages, youth stages)
// Section 3 — Deadline removals (application stages, youth stages)
// Section 4 — Full Send link dispatch (grant_approved → final_video_pending)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { sendNotification } from '../_shared/dispatcher.ts';
import { generateToken } from '../_shared/tokens.ts';

const TEST_MODE = Deno.env.get('TEST_MODE') === 'true';
const dayMs = TEST_MODE ? 60 * 1000 : 24 * 60 * 60 * 1000;

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('DB_SERVICE_KEY')!,
  );

  console.log(`[daily-scheduler] run started TEST_MODE=${TEST_MODE}`);

  // ── Section 1 — 48-hour delayed sends ──────────────────────────────────────
  try {
    const now = new Date().toISOString();

    const { data: pendingSends, error: pendingErr } = await supabase
      .from('applications')
      .select('*')
      .lte('notify_after', now)
      .in('screening_status', ['declaration_pending', 'rejected']);

    if (pendingErr) {
      console.error('[daily-scheduler] S1 query error:', pendingErr.message);
    } else {
      for (const app of (pendingSends ?? [])) {
        try {
          // Idempotency: skip if already sent for this stage
          const { data: existing } = await supabase
            .from('comms_log')
            .select('id')
            .eq('application_id', app.id)
            .in('stage_key', ['declaration_pending', 'rejected'])
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`[daily-scheduler] S1 skip — already sent for app ${app.id}`);
            continue;
          }

          const recipient = {
            first_name: app.first_name,
            last_name: app.last_name,
            email: app.email,
            phone: app.phone,
          };

          if (app.screening_status === 'declaration_pending') {
            const declareLink = `${config.BASE_URL}/declare?token=${app.access_token}`;
            const profileLink = `${config.BASE_URL}/profile?token=${app.profile_token}`;
            await sendNotification(
              'declaration_pending',
              recipient,
              { link: declareLink, profile_link: profileLink },
              {},
            );
            // Write comms_log with application_id (dispatcher cannot do this)
            await supabase.from('comms_log').insert([
              {
                program_id:      config.PROGRAM_ID,
                application_id:  app.id,
                direction:       'outbound',
                channel:         'email',
                stage_key:       'declaration_pending',
                message_body:    'Step 1 done. You\'re invited to Step 2.',
                sent_at:         new Date().toISOString(),
                delivery_status: 'sent',
              },
              {
                program_id:      config.PROGRAM_ID,
                application_id:  app.id,
                direction:       'outbound',
                channel:         'sms',
                stage_key:       'declaration_pending',
                message_body:    'declaration_pending sms',
                sent_at:         new Date().toISOString(),
                delivery_status: 'sent',
              },
            ]);
            console.log(`[daily-scheduler] S1 sent declaration_pending to app ${app.id}`);
          } else if (app.screening_status === 'rejected') {
            await sendNotification('rejected', recipient, {}, {});
            await supabase.from('comms_log').insert([
              {
                program_id:      config.PROGRAM_ID,
                application_id:  app.id,
                direction:       'outbound',
                channel:         'email',
                stage_key:       'rejected',
                message_body:    'Your GripTape Learning Challenge application',
                sent_at:         new Date().toISOString(),
                delivery_status: 'sent',
              },
              {
                program_id:      config.PROGRAM_ID,
                application_id:  app.id,
                direction:       'outbound',
                channel:         'sms',
                stage_key:       'rejected',
                message_body:    'rejected sms',
                sent_at:         new Date().toISOString(),
                delivery_status: 'sent',
              },
            ]);
            console.log(`[daily-scheduler] S1 sent rejected to app ${app.id}`);
          }
        } catch (err) {
          console.error(`[daily-scheduler] S1 error for app ${app.id}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S1 fatal:', err);
  }

  // ── Section 2 — Nudges ─────────────────────────────────────────────────────

  // Application nudges: declaration_pending, video_pending
  const APP_NUDGES: Array<{
    stage: string;
    nudge_day: number;
    content_key: string;
    link_field: string | null;
  }> = [
    { stage: 'declaration_pending', nudge_day: 6,  content_key: 'nudge_declaration',  link_field: 'access_token' },
    { stage: 'video_pending',       nudge_day: 5,  content_key: 'nudge_first_drop_1', link_field: 'access_token' },
    { stage: 'video_pending',       nudge_day: 9,  content_key: 'nudge_first_drop_2', link_field: 'access_token' },
  ];

  try {
    for (const nudge of APP_NUDGES) {
      const cutoff = new Date(Date.now() - nudge.nudge_day * dayMs).toISOString();
      const now = new Date().toISOString();

      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select('*')
        .eq('screening_status', nudge.stage)
        .lte('stage_entered_at', cutoff)
        .gt('stage_deadline_at', now);

      if (appsErr) {
        console.error(`[daily-scheduler] S2 app nudge query error (${nudge.content_key}):`, appsErr.message);
        continue;
      }

      for (const app of (apps ?? [])) {
        try {
          const { data: existing } = await supabase
            .from('comms_log')
            .select('id')
            .eq('application_id', app.id)
            .eq('stage_key', nudge.content_key)
            .limit(1);

          if (existing && existing.length > 0) {
            continue; // already sent
          }

          const link = nudge.link_field === 'access_token' && nudge.stage === 'declaration_pending'
            ? `${config.BASE_URL}/declare?token=${app.access_token}`
            : nudge.link_field === 'access_token'
            ? `${config.BASE_URL}/video?token=${app.access_token}`
            : '';

          const recipient = {
            first_name: app.first_name,
            last_name: app.last_name,
            email: app.email,
            phone: app.phone,
          };

          await sendNotification(nudge.content_key, recipient, { link }, {});

          await supabase.from('comms_log').insert([
            {
              program_id:      config.PROGRAM_ID,
              application_id:  app.id,
              direction:       'outbound',
              channel:         'email',
              stage_key:       nudge.content_key,
              message_body:    nudge.content_key,
              sent_at:         new Date().toISOString(),
              delivery_status: 'sent',
            },
            {
              program_id:      config.PROGRAM_ID,
              application_id:  app.id,
              direction:       'outbound',
              channel:         'sms',
              stage_key:       nudge.content_key,
              message_body:    nudge.content_key,
              sent_at:         new Date().toISOString(),
              delivery_status: 'sent',
            },
          ]);

          console.log(`[daily-scheduler] S2 sent ${nudge.content_key} to app ${app.id}`);
        } catch (err) {
          console.error(`[daily-scheduler] S2 app nudge error (${nudge.content_key}, ${app.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S2 app nudges fatal:', err);
  }

  // Youth nudges: mentor_pending, grant_pending, final_video_pending
  const YOUTH_NUDGES: Array<{
    stage: string;
    nudge_day: number;
    content_key: string;
    notify_champion: boolean;
    has_deadline: boolean;
  }> = [
    { stage: 'mentor_pending',      nudge_day: 3,  content_key: 'nudge_orientation_1', notify_champion: true,  has_deadline: true  },
    { stage: 'mentor_pending',      nudge_day: 6,  content_key: 'nudge_orientation_2', notify_champion: true,  has_deadline: true  },
    { stage: 'grant_pending',       nudge_day: 5,  content_key: 'nudge_grant',          notify_champion: false, has_deadline: false },
    { stage: 'final_video_pending', nudge_day: 7,  content_key: 'nudge_full_send_1',   notify_champion: false, has_deadline: true  },
    { stage: 'final_video_pending', nudge_day: 12, content_key: 'nudge_full_send_2',   notify_champion: false, has_deadline: true  },
  ];

  try {
    for (const nudge of YOUTH_NUDGES) {
      const cutoff = new Date(Date.now() - nudge.nudge_day * dayMs).toISOString();
      const now = new Date().toISOString();

      let query = supabase
        .from('youth')
        .select('*')
        .eq('status', nudge.stage)
        .lte('stage_entered_at', cutoff);

      if (nudge.has_deadline) {
        query = query.gt('token_expires_at', now);
      }

      const { data: youths, error: youthsErr } = await query;

      if (youthsErr) {
        console.error(`[daily-scheduler] S2 youth nudge query error (${nudge.content_key}):`, youthsErr.message);
        continue;
      }

      for (const youth of (youths ?? [])) {
        try {
          const { data: existing } = await supabase
            .from('comms_log')
            .select('id')
            .eq('youth_id', youth.id)
            .eq('stage_key', nudge.content_key)
            .limit(1);

          if (existing && existing.length > 0) {
            continue; // already sent
          }

          const recipient = {
            first_name: youth.first_name,
            last_name: youth.last_name,
            email: youth.email,
            phone: youth.phone,
          };

          let vars: Record<string, string> = {};

          if (nudge.notify_champion && youth.champion_id) {
            const { data: champion } = await supabase
              .from('champions')
              .select('id, first_name, last_name, email, phone')
              .eq('id', youth.champion_id)
              .single();

            if (champion) {
              const championName = `${champion.first_name} ${champion.last_name}`;
              vars = { champion_name: championName };

              // Notify champion too
              await sendNotification(
                nudge.content_key,
                { first_name: champion.first_name, last_name: champion.last_name, email: champion.email, phone: champion.phone },
                { champion_name: championName, youth_name: `${youth.first_name} ${youth.last_name}` },
                { champion_id: champion.id, youth_id: youth.id },
              );
            }
          }

          // link for grant_pending
          if (nudge.stage === 'grant_pending') {
            vars.link = `${config.BASE_URL}/grant?token=${youth.access_token}`;
          }

          // link for final_video_pending
          if (nudge.stage === 'final_video_pending') {
            vars.link = `${config.BASE_URL}/full-send?token=${youth.access_token}`;
          }

          await sendNotification(nudge.content_key, recipient, vars, { youth_id: youth.id });
          // dispatcher writes comms_log with youth_id automatically

          console.log(`[daily-scheduler] S2 sent ${nudge.content_key} to youth ${youth.id}`);
        } catch (err) {
          console.error(`[daily-scheduler] S2 youth nudge error (${nudge.content_key}, ${youth.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S2 youth nudges fatal:', err);
  }

  // ── Section 3 — Deadline removals ──────────────────────────────────────────

  // Application removals: declaration_pending, video_pending
  const APP_REMOVAL_STAGES: Array<{ stage: string; content_key: string }> = [
    { stage: 'declaration_pending', content_key: 'removed_declaration' },
    { stage: 'video_pending',       content_key: 'removed_first_drop'  },
  ];

  try {
    const now = new Date().toISOString();

    for (const removal of APP_REMOVAL_STAGES) {
      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select('*')
        .eq('screening_status', removal.stage)
        .lte('stage_deadline_at', now);

      if (appsErr) {
        console.error(`[daily-scheduler] S3 app removal query error (${removal.stage}):`, appsErr.message);
        continue;
      }

      for (const app of (apps ?? [])) {
        try {
          const { error: advanceError } = await supabase.rpc('advance_status', {
            record_id:               app.id,
            table_name:              'applications',
            expected_current_status: removal.stage,
            next_status:             'rejected',
            additional_fields: {
              ai_reasoning:         'deadline_missed',
              dropped_off_at_stage: removal.stage,
              stage_entered_at:     new Date().toISOString(),
            },
          });

          if (advanceError) {
            if (advanceError.message?.includes('StatusConflictError')) {
              console.log(`[daily-scheduler] S3 StatusConflictError for app ${app.id} — already processed`);
              continue;
            }
            throw new Error(`advance_status error: ${advanceError.message}`);
          }

          const recipient = {
            first_name: app.first_name,
            last_name: app.last_name,
            email: app.email,
            phone: app.phone,
          };

          await sendNotification(removal.content_key, recipient, {}, {});

          await supabase.from('comms_log').insert([
            {
              program_id:      config.PROGRAM_ID,
              application_id:  app.id,
              direction:       'outbound',
              channel:         'email',
              stage_key:       removal.content_key,
              message_body:    removal.content_key,
              sent_at:         new Date().toISOString(),
              delivery_status: 'sent',
            },
            {
              program_id:      config.PROGRAM_ID,
              application_id:  app.id,
              direction:       'outbound',
              channel:         'sms',
              stage_key:       removal.content_key,
              message_body:    removal.content_key,
              sent_at:         new Date().toISOString(),
              delivery_status: 'sent',
            },
          ]);

          console.log(`[daily-scheduler] S3 removed app ${app.id} from ${removal.stage}`);
        } catch (err) {
          console.error(`[daily-scheduler] S3 app removal error (${removal.stage}, ${app.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S3 app removals fatal:', err);
  }

  // Youth removals: mentor_pending, final_video_pending
  const YOUTH_REMOVAL_STAGES: Array<{
    stage: string;
    deadline_days: number;
    content_key: string;
    decrement_champion: boolean;
  }> = [
    { stage: 'mentor_pending',      deadline_days: config.STAGES.mentor_pending.deadline_days!,      content_key: 'removed_orientation', decrement_champion: true  },
    { stage: 'final_video_pending', deadline_days: config.STAGES.final_video_pending.deadline_days!, content_key: 'removed_full_send',   decrement_champion: false },
  ];

  try {
    for (const removal of YOUTH_REMOVAL_STAGES) {
      const cutoff = new Date(Date.now() - removal.deadline_days * dayMs).toISOString();

      const { data: youths, error: youthsErr } = await supabase
        .from('youth')
        .select('*')
        .eq('status', removal.stage)
        .lte('stage_entered_at', cutoff);

      if (youthsErr) {
        console.error(`[daily-scheduler] S3 youth removal query error (${removal.stage}):`, youthsErr.message);
        continue;
      }

      for (const youth of (youths ?? [])) {
        try {
          const { error: advanceError } = await supabase.rpc('advance_status', {
            record_id:               youth.id,
            table_name:              'youth',
            expected_current_status: removal.stage,
            next_status:             'removed',
            additional_fields: {
              dropped_off_at_stage: removal.stage,
              stage_entered_at:     new Date().toISOString(),
            },
          });

          if (advanceError) {
            if (advanceError.message?.includes('StatusConflictError')) {
              console.log(`[daily-scheduler] S3 StatusConflictError for youth ${youth.id} — already processed`);
              continue;
            }
            throw new Error(`advance_status error: ${advanceError.message}`);
          }

          // Decrement champion capacity if mentor_pending
          if (removal.decrement_champion && youth.champion_id) {
            const { data: champ } = await supabase
              .from('champions')
              .select('active_youth_count')
              .eq('id', youth.champion_id)
              .single();

            if (champ && champ.active_youth_count > 0) {
              await supabase
                .from('champions')
                .update({ active_youth_count: champ.active_youth_count - 1 })
                .eq('id', youth.champion_id);
            }
          }

          const recipient = {
            first_name: youth.first_name,
            last_name: youth.last_name,
            email: youth.email,
            phone: youth.phone,
          };

          await sendNotification(removal.content_key, recipient, {}, { youth_id: youth.id });

          console.log(`[daily-scheduler] S3 removed youth ${youth.id} from ${removal.stage}`);
        } catch (err) {
          console.error(`[daily-scheduler] S3 youth removal error (${removal.stage}, ${youth.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S3 youth removals fatal:', err);
  }

  // ── Section 4 — Full Send link dispatch ────────────────────────────────────
  try {
    const cutoff = new Date(Date.now() - config.FULL_SEND_TRIGGER_DAYS * dayMs).toISOString();

    const { data: youths, error: youthsErr } = await supabase
      .from('youth')
      .select('*')
      .eq('status', 'grant_approved')
      .lte('accepted_at', cutoff);

    if (youthsErr) {
      console.error('[daily-scheduler] S4 query error:', youthsErr.message);
    } else {
      for (const youth of (youths ?? [])) {
        try {
          // Idempotency: skip if already sent
          const { data: existing } = await supabase
            .from('comms_log')
            .select('id')
            .eq('youth_id', youth.id)
            .eq('stage_key', 'full_send_link')
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`[daily-scheduler] S4 skip — full_send_link already sent to youth ${youth.id}`);
            continue;
          }

          const tokenData = generateToken(config.STAGES.final_video_pending.deadline_days);

          const { error: advanceError } = await supabase.rpc('advance_status', {
            record_id:               youth.id,
            table_name:              'youth',
            expected_current_status: 'grant_approved',
            next_status:             'final_video_pending',
            additional_fields: {
              access_token:     tokenData.access_token,
              token_expires_at: tokenData.stage_deadline_at,
              stage_entered_at: new Date().toISOString(),
            },
          });

          if (advanceError) {
            if (advanceError.message?.includes('StatusConflictError')) {
              console.log(`[daily-scheduler] S4 StatusConflictError for youth ${youth.id} — already processed`);
              continue;
            }
            throw new Error(`advance_status error: ${advanceError.message}`);
          }

          const fullSendLink = `${config.BASE_URL}/final-video?token=${tokenData.access_token}`;
          const recipient = {
            first_name: youth.first_name,
            last_name: youth.last_name,
            email: youth.email,
            phone: youth.phone,
          };

          await sendNotification('full_send_link', recipient, { link: fullSendLink }, { youth_id: youth.id });
          // dispatcher writes comms_log with youth_id automatically

          console.log(`[daily-scheduler] S4 sent full_send_link to youth ${youth.id}, advanced to final_video_pending`);
        } catch (err) {
          console.error(`[daily-scheduler] S4 error for youth ${youth.id}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S4 fatal:', err);
  }

  console.log('[daily-scheduler] run complete');

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
