// CRON SCHEDULE — configured in supabase/config.toml
// [functions.daily-scheduler]
// schedule = "*/30 * * * *"
//
// Runs every 30 minutes. In TEST_MODE one minute counts as one day.
//
// Section 1 — 48-hour delayed sends (declaration_pending / rejected)
// Section 2 — Nudges (application stages, youth stages)
// Section 3 — Deadline removals (application stages, youth stages)
// Section 4 — Full Send link dispatch (grant_approved / grant_expired → final_video_pending)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from '../_shared/config.ts';
import { sendNotification } from '../_shared/dispatcher.ts';
import { generateToken } from '../_shared/tokens.ts';

serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const TEST_MODE_ALLOWED = Deno.env.get('TEST_MODE_ALLOWED') === 'true';
  const TEST_MODE = Deno.env.get('TEST_MODE') === 'true' || (TEST_MODE_ALLOWED && body.test_mode === true);
  const dayMs = TEST_MODE ? 60 * 1000 : 24 * 60 * 60 * 1000;

  function formatDeadline(isoDate: string | null | undefined): string {
    if (!isoDate) return 'soon';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

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
              { link: declareLink, profile_link: profileLink, deadline_date: formatDeadline(app.stage_deadline_at), passion: app.passion ?? '', base_url: config.BASE_URL },
              { application_id: app.id },
              { skipSms: !app.sms_consent },
            );
            console.log(`[daily-scheduler] S1 sent declaration_pending to app ${app.id}`);
          } else if (app.screening_status === 'rejected') {
            await sendNotification(
              'rejected',
              recipient,
              { base_url: config.BASE_URL },
              { application_id: app.id },
              { skipSms: !app.sms_consent },
            );
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
    { stage: 'video_pending',       nudge_day: 5,  content_key: 'nudge_first_drop_1',   link_field: 'access_token' },
    { stage: 'video_pending',       nudge_day: 7,  content_key: 'nudge_first_drop_mid', link_field: 'access_token' },
    { stage: 'video_pending',       nudge_day: 9,  content_key: 'nudge_first_drop_2',   link_field: 'access_token' },
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

          await sendNotification(
            nudge.content_key,
            recipient,
            { link, deadline_date: formatDeadline(app.stage_deadline_at), base_url: config.BASE_URL },
            { application_id: app.id },
            { skipSms: !app.sms_consent },
          );

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
    champion_only?: boolean;
    has_deadline: boolean;
  }> = [
    { stage: 'mentor_pending',      nudge_day: 4,  content_key: 'nudge_orientation_champion', notify_champion: false, champion_only: true,  has_deadline: true  },
    { stage: 'mentor_pending',      nudge_day: 3,  content_key: 'nudge_orientation_1', notify_champion: false, has_deadline: true  },
    { stage: 'mentor_pending',      nudge_day: 6,  content_key: 'nudge_orientation_2', notify_champion: false, has_deadline: true  },
    { stage: 'grant_pending',       nudge_day: 5,  content_key: 'nudge_grant',          notify_champion: false, has_deadline: false },
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

          if (nudge.champion_only) {
            if (youth.champion_id) {
              const { data: champion } = await supabase
                .from('champions')
                .select('id, first_name, last_name, email, phone, champion_token')
                .eq('id', youth.champion_id)
                .single();

              if (!champion) {
                console.error(`[daily-scheduler] champion_only — champion not found for youth ${youth.id}`);
                continue;
              }

              await sendNotification(
                nudge.content_key,
                { first_name: champion.first_name, last_name: champion.last_name, email: champion.email, phone: champion.phone },
                { youth_name: `${youth.first_name} ${youth.last_name}`, deadline_date: formatDeadline(youth.token_expires_at), base_url: config.BASE_URL, orientation_link: `${config.BASE_URL}/orientation?token=${champion.champion_token}`, youth_phone: youth.phone ?? '' },
                { champion_id: champion.id, youth_id: youth.id },
              );
            }
            continue;
          }

          const recipient = {
            first_name: youth.first_name,
            last_name: youth.last_name,
            email: youth.email,
            phone: youth.phone,
          };

          let vars: Record<string, string> = {};

          if (nudge.stage === 'mentor_pending' && youth.champion_id) {
            const { data: champData } = await supabase
              .from('champions')
              .select('first_name, last_name, phone')
              .eq('id', youth.champion_id)
              .single();
            if (champData) {
              vars.champion_name = `${champData.first_name} ${champData.last_name}`;
              vars.champion_phone = champData.phone ?? '';
            }
          }

          if (nudge.stage === 'final_video_pending' && youth.champion_id) {
            const { data: fsChampion } = await supabase
              .from('champions')
              .select('first_name, last_name, phone')
              .eq('id', youth.champion_id)
              .single();
            if (fsChampion) {
              vars.champion_name = `${fsChampion.first_name} ${fsChampion.last_name}`;
              vars.champion_phone = fsChampion.phone ?? '';
            }
          }

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
                { champion_name: championName, youth_name: `${youth.first_name} ${youth.last_name}`, deadline_date: formatDeadline(youth.token_expires_at), base_url: config.BASE_URL },
                { champion_id: champion.id, youth_id: youth.id },
              );
            }
          }

          // Fetch fresh BoldSign signing links for nudge
          if (nudge.stage === 'grant_pending') {
            const boldSignApiKey = Deno.env.get('BOLDSIGN_API_KEY') ?? '';
            let w9Link = '';
            let agreementLink = '';

            if (boldSignApiKey) {
              try {
                const { data: gr } = await supabase
                  .from('grant_requests')
                  .select('boldsign_w9_id, boldsign_agreement_id')
                  .eq('youth_id', youth.id)
                  .single();

                if (gr?.boldsign_w9_id) {
                  const w9Res = await fetch(
                    `https://api.boldsign.com/v1/document/getEmbeddedSignLink?documentId=${gr.boldsign_w9_id}&signerEmail=${encodeURIComponent(youth.email)}&linkValidTill=21`,
                    { headers: { 'X-API-KEY': boldSignApiKey } }
                  );
                  if (w9Res.ok) w9Link = (await w9Res.json()).signLink ?? '';
                }

                if (gr?.boldsign_agreement_id) {
                  const agreeRes = await fetch(
                    `https://api.boldsign.com/v1/document/getEmbeddedSignLink?documentId=${gr.boldsign_agreement_id}&signerEmail=${encodeURIComponent(youth.email)}&linkValidTill=21`,
                    { headers: { 'X-API-KEY': boldSignApiKey } }
                  );
                  if (agreeRes.ok) agreementLink = (await agreeRes.json()).signLink ?? '';
                }
              } catch (err) {
                console.error(`[daily-scheduler] BoldSign link fetch failed for nudge_grant (youth ${youth.id}):`, err);
              }
            }

            vars.w9_link = w9Link;
            vars.agreement_link = agreementLink;
          }

          // link for final_video_pending
          if (nudge.stage === 'final_video_pending') {
            vars.link = `${config.BASE_URL}/full-send?token=${youth.access_token}`;
          }

          await sendNotification(nudge.content_key, recipient, { ...vars, deadline_date: formatDeadline(youth.token_expires_at), base_url: config.BASE_URL }, { youth_id: youth.id }, { skipSms: !youth.sms_consent });
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

  // ── Final video smart nudges ─────────────────────────────────────────────
  try {
    const now = new Date().toISOString();

    for (const nudge_day of [7, 12]) {
      const cutoff = new Date(Date.now() - nudge_day * dayMs).toISOString();
      const isFinal = nudge_day === 12;

      const { data: youths, error } = await supabase
        .from('youth')
        .select('*')
        .eq('status', 'final_video_pending')
        .lte('stage_entered_at', cutoff)
        .gt('token_expires_at', now);

      if (error) {
        console.error(`[daily-scheduler] smart nudge query error (day ${nudge_day}):`, error.message);
        continue;
      }

      for (const youth of (youths ?? [])) {
        try {
          const hasVideo = !!youth.full_send_url;
          const hasEoc = !!youth.end_of_challenge_completed_at;

          // Skip if both done
          if (hasVideo && hasEoc) continue;

          // Determine youth content key
          let youthKey: string;
          if (!hasVideo && !hasEoc) {
            youthKey = isFinal ? 'nudge_full_send_neither_final' : 'nudge_full_send_neither';
          } else if (hasEoc && !hasVideo) {
            youthKey = isFinal ? 'nudge_full_send_no_video_final' : 'nudge_full_send_no_video';
          } else {
            youthKey = isFinal ? 'nudge_full_send_no_eoc_final' : 'nudge_full_send_no_eoc';
          }

          // Idempotency check for youth
          const { data: existing } = await supabase
            .from('comms_log')
            .select('id')
            .eq('youth_id', youth.id)
            .eq('stage_key', youthKey)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Fetch champion
          let championName = '';
          let championPhone = '';
          let championRecord: any = null;
          let championToken = '';

          if (youth.champion_id) {
            const { data: champ } = await supabase
              .from('champions')
              .select('id, first_name, last_name, email, phone, champion_token')
              .eq('id', youth.champion_id)
              .single();
            if (champ) {
              championRecord = champ;
              championName = `${champ.first_name} ${champ.last_name}`;
              championPhone = champ.phone ?? '';
              championToken = champ.champion_token ?? '';
            }
          }

          const eocLink = `${config.BASE_URL}/end-of-challenge?token=${championToken}`;
          const fullSendLink = `${config.BASE_URL}/final-video?token=${youth.access_token}`;

          // Send youth nudge
          await sendNotification(
            youthKey,
            { first_name: youth.first_name, last_name: youth.last_name, email: youth.email, phone: youth.phone },
            {
              link: fullSendLink,
              deadline_date: formatDeadline(youth.token_expires_at),
              champion_name: championName,
              champion_phone: championPhone,
              base_url: config.BASE_URL,
            },
            { youth_id: youth.id },
            { skipSms: !youth.sms_consent },
          );

          console.log(`[daily-scheduler] smart nudge ${youthKey} → youth ${youth.id}`);

          // Send champion nudge if EOC missing
          if (!hasEoc && championRecord) {
            const champKey = isFinal
              ? 'nudge_full_send_champion_no_eoc_final'
              : 'nudge_full_send_champion_no_eoc';

            const { data: champExisting } = await supabase
              .from('comms_log')
              .select('id')
              .eq('youth_id', youth.id)
              .eq('champion_id', championRecord.id)
              .eq('stage_key', champKey)
              .limit(1);

            if (!champExisting || champExisting.length === 0) {
              await sendNotification(
                champKey,
                { first_name: championRecord.first_name, last_name: championRecord.last_name, email: championRecord.email, phone: championRecord.phone },
                {
                  youth_name: `${youth.first_name} ${youth.last_name}`,
                  youth_phone: youth.phone ?? '',
                  deadline_date: formatDeadline(youth.token_expires_at),
                  eoc_link: eocLink,
                  base_url: config.BASE_URL,
                },
                { youth_id: youth.id, champion_id: championRecord.id },
              );
              console.log(`[daily-scheduler] smart nudge ${champKey} → champion ${championRecord.id}`);
            }
          }
        } catch (err) {
          console.error(`[daily-scheduler] smart nudge error (youth ${youth.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] smart nudges fatal:', err);
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

          await sendNotification(removal.content_key, recipient, { deadline_date: formatDeadline(app.stage_deadline_at), base_url: config.BASE_URL }, { application_id: app.id }, { skipSms: !app.sms_consent });

          console.log(`[daily-scheduler] S3 removed app ${app.id} from ${removal.stage}`);
        } catch (err) {
          console.error(`[daily-scheduler] S3 app removal error (${removal.stage}, ${app.id}):`, err);
        }
      }
    }
  } catch (err) {
    console.error('[daily-scheduler] S3 app removals fatal:', err);
  }

  // Youth removals: mentor_pending, grant_pending, final_video_pending
  const YOUTH_REMOVAL_STAGES: Array<{
    stage: string;
    deadline_days: number;
    content_key: string | null;
    decrement_champion: boolean;
    next_status: string;
  }> = [
    { stage: 'mentor_pending',      deadline_days: config.STAGES.mentor_pending.deadline_days!,      content_key: 'removed_orientation', decrement_champion: true,  next_status: 'removed'       },
    { stage: 'grant_pending',       deadline_days: 21,                                                content_key: null,                  decrement_champion: false, next_status: 'grant_expired' },
    { stage: 'final_video_pending', deadline_days: config.STAGES.final_video_pending.deadline_days!, content_key: 'removed_full_send',   decrement_champion: false, next_status: 'removed'       },
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
            next_status:             removal.next_status,
            additional_fields: {
              ...(removal.next_status === 'removed' ? { dropped_off_at_stage: removal.stage } : {}),
              stage_entered_at: new Date().toISOString(),
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

          if (removal.content_key) {
            const recipient = {
              first_name: youth.first_name,
              last_name: youth.last_name,
              email: youth.email,
              phone: youth.phone,
            };
            await sendNotification(removal.content_key, recipient, { deadline_date: formatDeadline(new Date(Date.now() - removal.deadline_days * dayMs).toISOString()), base_url: config.BASE_URL }, { youth_id: youth.id }, { skipSms: !youth.sms_consent });
          }

          console.log(`[daily-scheduler] S3 youth ${youth.id} → ${removal.next_status} (from ${removal.stage})`);
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
      .in('status', ['grant_approved', 'grant_expired'])
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
            expected_current_status: youth.status,
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

          // Fetch champion for full_send_link vars and EOC notification
          let eocChampion: { id: string; first_name: string; last_name: string; email: string; phone: string; champion_token: string } | null = null;
          if (youth.champion_id) {
            const { data: champData } = await supabase
              .from('champions')
              .select('id, first_name, last_name, email, phone, champion_token')
              .eq('id', youth.champion_id)
              .single();
            eocChampion = champData ?? null;
          }

          const championName  = eocChampion ? `${eocChampion.first_name} ${eocChampion.last_name}` : '';
          const championPhone = eocChampion?.phone ?? '';

          await sendNotification('full_send_link', recipient, { link: fullSendLink, deadline_date: formatDeadline(tokenData.stage_deadline_at), base_url: config.BASE_URL, champion_name: championName, champion_phone: championPhone }, { youth_id: youth.id }, { skipSms: !youth.sms_consent });
          // dispatcher writes comms_log with youth_id automatically

          if (eocChampion) {
            const eocLink = `${config.BASE_URL}/end-of-challenge?token=${eocChampion.champion_token}`;
            await sendNotification(
              'end_of_challenge_champion',
              { first_name: eocChampion.first_name, last_name: eocChampion.last_name, email: eocChampion.email, phone: eocChampion.phone },
              {
                youth_name:  `${youth.first_name} ${youth.last_name}`,
                youth_phone: youth.phone ?? '',
                eoc_link:    eocLink,
                base_url:    config.BASE_URL,
              },
              { champion_id: eocChampion.id, youth_id: youth.id },
            );
          }

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
