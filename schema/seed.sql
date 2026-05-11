-- applications table — locked schema (MVP)
-- Already run in Supabase. Kept here for reference.
create extension if not exists "uuid-ossp";
create table applications (
  id                    uuid primary key default uuid_generate_v4(),
  program_id            uuid,
  first_name            text        not null,
  last_name             text        not null,
  birthdate             text        not null,
  email                 text        not null,
  phone                 text        not null,
  screening_status      text        not null default 'submitted',
  ai_decision           text,
  ai_reasoning          text,
  failed_criteria       text,
  submitted_at          timestamptz not null default now(),
  application_responses jsonb       not null default '{}'::jsonb,
  sms_consent           boolean     default false,
  gender                text,
  pronouns              text,
  street_address        text,
  city                  text,
  state                 text,
  zip                   text,
  passion               text,
  first_drop_goal       text
);
create index idx_applications_screening_status on applications(screening_status);
create index idx_applications_submitted_at on applications(submitted_at desc);
create index idx_applications_email on applications(email);

-- Champions: mentors matched with accepted youth
create table if not exists champions (
  id                  uuid primary key default gen_random_uuid(),
  program_id          uuid,
  first_name          text not null,
  last_name           text not null,
  email               text not null unique,
  phone               text not null,
  bio                 text,
  max_youth           integer not null,
  active_youth_count  integer default 0,
  available           boolean default true,
  registration_token  text,
  registered_at       timestamptz,
  created_at          timestamptz default now(),
  gender              text,
  pronouns            text
);

-- Youth: accepted participants, created on video approval
create table if not exists youth (
  id                            uuid primary key default gen_random_uuid(),
  program_id                    uuid,
  application_id                uuid references applications(id),
  first_name                    text not null,
  last_name                     text not null,
  email                         text not null,
  phone                         text not null,
  birthdate                     text not null,
  status                        text not null default 'onboarding',
  current_week                  integer,
  champion_id                   uuid,
  access_token                  text,
  token_expires_at              timestamptz,
  grant_sent                    boolean default false,
  first_drop_url                text,
  full_send_url                 text,
  accepted_at                   timestamptz default now(),
  orientation_call_completed_at timestamptz,
  sms_consent                   boolean default false,
  gender                        text,
  pronouns                      text,
  street_address                text,
  city                          text,
  state                         text,
  zip                           text,
  passion                       text
);
-- NOTE: champion_id has no foreign key constraint intentionally.
-- The constraint will be added later once both tables are stable.
-- STATUS VALUES — plain text, never a Postgres enum. Current valid values:
--   'onboarding'            Accepted, matching in progress
--   'mentor_pending'        Matched, awaiting orientation call
--   'orientation_complete'  Orientation call confirmed
--   'grant_pending'         Awaiting W-9 + participation agreement signing
--   'grant_review'          Documents signed, staff reviewing
--   'grant_approved'        Grant approved, awaiting Full Send trigger
--   'grant_expired'         Grant window closed (21-day missed), still in program
--   'final_video_pending'   Full Send link sent, awaiting video submission
--   'full_send_review'      Full Send submitted, under review
--   'completed'             Program complete. TERMINAL.
--   'removed'               Missed deadline or dropped out. TERMINAL.

-- TABLE: comms_log
-- Tracks every outbound email and SMS sent by the system
CREATE TABLE IF NOT EXISTS comms_log (
  id              uuid primary key default gen_random_uuid(),
  program_id      text,
  youth_id        uuid references youth(id),
  champion_id     uuid references champions(id),
  direction       text not null default 'outbound',
  channel         text not null,
  stage_key       text not null,
  message_body    text,
  sent_at         timestamptz not null default now(),
  application_id  uuid,
  delivery_status text
);

ALTER TABLE comms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON comms_log
  FOR ALL USING (auth.role() = 'service_role');

-- Seed: 5 dummy champions covering distinct interest areas
insert into champions (program_id, first_name, last_name, email, phone, bio, max_youth, active_youth_count, available)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Marcus', 'Rivera',
    'marcus.rivera@example.com',
    '212-555-0141',
    'Marcus is a music producer and vocalist from the Bronx who has been writing and recording hip-hop and R&B for over a decade. He runs a community recording studio in Mott Haven where he teaches teens beatmaking, songwriting, and audio engineering. As a mentor, he helps young creators develop their artistic voice and understand the business side of the music industry.',
    2, 0, true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Priya', 'Chandrasekaran',
    'priya.chandrasekaran@example.com',
    '212-555-0257',
    'Priya is a software engineer and coding bootcamp instructor based in Astoria, Queens, who specializes in web development and data science. She co-founded a nonprofit that runs free coding workshops for teenagers in underserved neighborhoods across NYC. She mentors youth who want to build apps, explore AI, or launch tech-driven projects — meeting them where they are, no prior experience required.',
    2, 0, true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Deja', 'Washington',
    'deja.washington@example.com',
    '212-555-0389',
    'Deja is a community organizer from Crown Heights, Brooklyn, with eight years of experience in youth advocacy, civic engagement, and grassroots campaigns. She currently leads a teen civic leadership program at a local nonprofit and has helped high schoolers run voter registration drives, policy pitch competitions, and neighborhood cleanup initiatives. She mentors young people who want to create change in their communities through organizing, storytelling, or direct action.',
    2, 0, true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Carlos', 'Medina',
    'carlos.medina@example.com',
    '212-555-0463',
    'Carlos is a certified personal trainer and youth sports coach from Washington Heights who has worked with teen athletes across basketball, track, and martial arts for over seven years. He runs an after-school fitness program at a Harlem rec center focused on discipline, goal-setting, and mental resilience alongside physical training. He mentors youth whose passion is health, sports, fitness, or using athletics as a vehicle for self-expression and leadership.',
    2, 0, true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Sofia', 'Nakamura',
    'sofia.nakamura@example.com',
    '212-555-0578',
    'Sofia is a chef and small business owner from Jackson Heights, Queens, who opened her own Caribbean-Japanese fusion catering company at age 24 after years working in restaurant kitchens across the city. She teaches pop-up cooking classes for teens and mentors young food entrepreneurs on recipe development, branding, and the basics of running a food business. She works best with youth who are passionate about cooking, food culture, nutrition, or building something from scratch.',
    2, 0, true
  )
on conflict (email) do nothing;

-- Champions: mentors matched with accepted youth
create table if not exists champions (
  id                  uuid primary key default gen_random_uuid(),
  program_id          uuid,
  first_name          text not null,
  last_name           text not null,
  email               text not null unique,
  phone               text not null,
  bio                 text,
  max_youth           integer not null,
  active_youth_count  integer default 0,
  available           boolean default true,
  registration_token  text,
  registered_at       timestamptz,
  created_at          timestamptz default now(),
  gender              text,
  pronouns            text
);

-- Youth: accepted participants, created on video approval
create table if not exists youth (
  id                            uuid primary key default gen_random_uuid(),
  program_id                    uuid,
  application_id                uuid references applications(id),
  first_name                    text not null,
  last_name                     text not null,
  email                         text not null,
  phone                         text not null,
  birthdate                     text not null,
  status                        text not null default 'onboarding',
  current_week                  integer,
  champion_id                   uuid,
  access_token                  text,
  token_expires_at              timestamptz,
  grant_sent                    boolean default false,
  first_drop_url                text,
  full_send_url                 text,
  accepted_at                   timestamptz default now(),
  orientation_call_completed_at timestamptz,
  gender                        text,
  pronouns                      text,
  street_address                text,
  city                          text,
  state                         text,
  zip                           text,
  passion                       text
);

-- Seed: 5 dummy champions for pilot testing
-- Replace with real champions before launch
insert into champions (program_id, first_name, last_name, email, phone, bio, max_youth, available, active_youth_count)
values
  ('00000000-0000-0000-0000-000000000001', 'Marcus', 'Williams', 'marcus.williams@example.com', '212-555-0101', 'I am a music producer and songwriter based in Harlem who has worked with independent artists across NYC for over a decade. I specialize in helping young creatives find their voice and turn passion into a real practice. I can offer mentorship on the music industry, creative discipline, and building an artistic identity.', 2, true, 0),
  ('00000000-0000-0000-0000-000000000001', 'Priya', 'Patel', 'priya.patel@example.com', '212-555-0102', 'I am a software engineer at a Brooklyn-based startup who grew up in Queens and taught myself to code at 16. I am passionate about making tech accessible to young people who do not see themselves represented in the industry. I can mentor on coding, product thinking, and building your first project from scratch.', 2, true, 0),
  ('00000000-0000-0000-0000-000000000001', 'DeShawn', 'Carter', 'deshawn.carter@example.com', '212-555-0103', 'I have spent the last eight years organizing in the Bronx around housing rights and youth civic engagement. I believe young people are the most powerful force for change in this city and I want to help them build the skills to lead. I can offer mentorship on organizing strategy, public speaking, and turning ideas into action.', 2, true, 0),
  ('00000000-0000-0000-0000-000000000001', 'Aaliyah', 'Johnson', 'aaliyah.johnson@example.com', '212-555-0104', 'I am a certified personal trainer and wellness coach based in Crown Heights who works primarily with young people on building sustainable fitness habits. I played college basketball and now run a community fitness program on weekends. I can mentor on sports performance, wellness routines, and using athletics as a platform for leadership.', 2, true, 0),
  ('00000000-0000-0000-0000-000000000001', 'Carlos', 'Mendez', 'carlos.mendez@example.com', '212-555-0105', 'I am a chef and food entrepreneur from the Bronx who started my first pop-up at 19 and now run a catering business focused on Latin cuisine. I am passionate about food as culture, community, and a path to economic independence. I can mentor on culinary skills, starting a food business, and building something from nothing.', 2, true, 0)
on conflict (email) do nothing;

-- RLS: enable on all tables and grant service role full access
-- Public and anonymous roles have no access to any table
-- All Edge Functions use SUPABASE_SERVICE_KEY (service role)

alter table applications enable row level security;
alter table champions enable row level security;
alter table youth enable row level security;

create policy "service role full access" on applications
  to service_role using (true) with check (true);

create policy "service role full access" on champions
  to service_role using (true) with check (true);

create policy "service role full access" on youth
  to service_role using (true) with check (true);

-- Drop old 3-arg signature if it exists (replaced by 5-arg version below)
drop function if exists advance_status(uuid, text, text);

-- advance_status: the ONLY permitted way to move a record's status forward.
-- Raises StatusConflictError if the record is not in expected_current_status.
-- table_name must be one of: applications, champions, youth.
-- applications uses screening_status; all other tables use status.

-- Ensure updated_at exists on tables managed by advance_status
alter table applications add column if not exists updated_at        timestamptz;
alter table applications add column if not exists notify_after      timestamptz;
alter table applications add column if not exists stage_entered_at  timestamptz;
alter table youth       add column if not exists updated_at         timestamptz;
alter table youth       add column if not exists dropped_off_at_stage text;
alter table youth       add column if not exists stage_entered_at   timestamptz;

create or replace function advance_status(
  record_id               uuid,
  table_name              text,
  expected_current_status text,
  next_status             text,
  additional_fields       jsonb default '{}'
) returns jsonb
language plpgsql
security definer
as $$
declare
  status_col  text;
  cur_status  text;
  set_clause  text;
  pair        record;
  result      jsonb;
begin
  -- Whitelist table names to prevent SQL injection
  if table_name not in ('applications', 'champions', 'youth') then
    raise exception 'advance_status: unknown table "%"', table_name;
  end if;

  -- applications uses screening_status; all other tables use status
  if table_name = 'applications' then
    status_col := 'screening_status';
  else
    status_col := 'status';
  end if;

  -- Read and lock the row
  execute format('select %I from %I where id = $1 for update', status_col, table_name)
    into cur_status
    using record_id;

  if cur_status is null then
    raise exception 'advance_status: record not found — id % in table %', record_id, table_name;
  end if;

  if cur_status <> expected_current_status then
    raise exception 'StatusConflictError: expected % but found % for id %',
      expected_current_status, cur_status, record_id;
  end if;

  -- Base SET clause: always update status and updated_at
  set_clause := format('%I = $1, updated_at = now()', status_col);

  -- Append additional_fields to SET clause
  -- timestamptz columns must be cast explicitly; jsonb_each_text yields plain text
  for pair in select key, value from jsonb_each_text(additional_fields) loop
    if pair.key in ('stage_deadline_at', 'stage_entered_at', 'notify_after') then
      set_clause := set_clause || format(', %I = %L::timestamptz', pair.key, pair.value);
    else
      set_clause := set_clause || format(', %I = %L', pair.key, pair.value);
    end if;
  end loop;

  -- Execute update and return the updated row as jsonb
  execute format(
    'update %I set %s where id = $2 returning to_jsonb(%I.*)',
    table_name, set_clause, table_name
  ) into result
    using next_status, record_id;

  return result;
end;
$$;

-- RLS policy for advance_status function
grant execute on function advance_status to service_role;

-- STATUS NOTE (2026-04-22): grant_approved added to youth status values.
-- grant_review.next changed from 'active' to 'grant_approved'.
-- New flow: grant_review -> grant_approved -> active.
-- grant_approved fires on-grant-approved webhook (staff sets
-- staff_approved = true on grant_requests), advances status,
-- sends deposit link to youth.

-- ============================================================
-- run manually, do not execute on fresh seed
-- Already run in Supabase on 2026-04-22.
-- ============================================================

-- grant_requests: one row per youth, tracks BoldSign document
-- signing status and staff approval for the $250 stipend.
-- Created when youth submits the grant form (boldsign-send-documents).
-- Columns updated by boldsign-webhook as documents are signed.

-- CREATE TABLE IF NOT EXISTS grant_requests (
--   id                      uuid primary key default gen_random_uuid(),
--   program_id              uuid,
--   youth_id                uuid references youth(id),
--   boldsign_w9_id          text,
--   boldsign_agreement_id   text,
--   w9_signed_at            timestamptz,
--   agreement_signed_at     timestamptz,
--   w9_doc_url              text,
--   agreement_doc_url       text,
--   grant_coding            text default 'LC26',
--   mailing_address         text,
--   tremendous_reward_id    text,
--   staff_approved          boolean default false,
--   staff_approved_at       timestamptz,
--   created_at              timestamptz default now(),
--   updated_at              timestamptz
-- );
--
-- ALTER TABLE grant_requests ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Service role full access" ON grant_requests
--   FOR ALL USING (true)
--   WITH CHECK (true);

-- receipts: one row per uploaded receipt file. Created by api/receipt-upload.js.
-- Youth upload spending receipts after grant is approved.
-- Files stored in Supabase Storage bucket 'receipts' (private).

-- CREATE TABLE IF NOT EXISTS receipts (
--   id          uuid primary key default gen_random_uuid(),
--   program_id  uuid,
--   youth_id    uuid references youth(id),
--   first_name  text,
--   last_name   text,
--   file_url    text not null,
--   uploaded_at timestamptz default now()
-- );
--
-- ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Service role full access on receipts"
--   ON receipts FOR ALL
--   USING (true)
--   WITH CHECK (true);
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('receipts', 'receipts', false)
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- full_send_queue: staff view — youth awaiting Full Send review
-- All youth where status = 'full_send_review'.
-- Run in Supabase dashboard if not already created.
-- ============================================================

-- CREATE OR REPLACE VIEW full_send_queue AS
-- SELECT
--   y.id,
--   y.first_name,
--   y.last_name,
--   y.email,
--   y.full_send_url,
--   y.updated_at,
--   a.screening_status
-- FROM youth y
-- JOIN applications a ON a.id = y.application_id
-- WHERE y.status = 'full_send_review';

CREATE OR REPLACE VIEW full_send_queue AS
SELECT
  y.id,
  y.first_name,
  y.last_name,
  y.email,
  y.full_send_url,
  y.updated_at,
  a.screening_status
FROM youth y
JOIN applications a ON a.id = y.application_id
WHERE y.status = 'full_send_review';

-- ============================================================
-- YOUTH_COMMS_CHECKLIST VIEW
-- Staff monitoring view: one row per application (left-joined
-- to youth). Shows comms gaps, next scheduled comm, and
-- at-risk flags. Run manually in the Supabase SQL editor.
-- ============================================================

CREATE OR REPLACE VIEW youth_comms_checklist AS
WITH

-- Resolve all comms_log entries to their application_id.
-- Entries linked only via youth_id are resolved through youth.application_id.
app_comms AS (
  SELECT
    COALESCE(cl.application_id, y.application_id) AS app_id,
    cl.id        AS comm_id,
    cl.stage_key,
    cl.sent_at
  FROM comms_log cl
  LEFT JOIN youth y ON y.id = cl.youth_id
  WHERE COALESCE(cl.application_id, y.application_id) IS NOT NULL
),

-- Aggregate per application: received stage_keys, last comm info
comms_agg AS (
  SELECT
    app_id                                              AS application_id,
    array_agg(DISTINCT stage_key)                       AS received_keys,
    MAX(sent_at)                                        AS last_comm_at,
    (array_agg(stage_key ORDER BY sent_at DESC))[1]     AS last_comm_sent
  FROM app_comms
  GROUP BY app_id
),

-- Base: applications LEFT JOIN youth, attach comms aggregates.
-- LEFT JOIN ensures applications with no youth row are included.
base AS (
  SELECT
    a.id                                              AS application_id,
    y.id                                              AS youth_id,
    COALESCE(y.first_name, a.first_name)              AS first_name,
    COALESCE(y.last_name,  a.last_name)               AS last_name,
    COALESCE(y.email,      a.email)                   AS email,
    COALESCE(y.status, a.screening_status)            AS current_stage,
    FLOOR(
      EXTRACT(EPOCH FROM
        (now() - COALESCE(y.stage_entered_at, a.stage_entered_at))
      ) / 86400
    )::integer                                        AS days_in_stage,
    COALESCE(ca.received_keys, ARRAY[]::text[])       AS received_keys,
    ca.last_comm_sent,
    ca.last_comm_at,
    CASE
      WHEN ca.last_comm_at IS NOT NULL
        THEN FLOOR(EXTRACT(EPOCH FROM (now() - ca.last_comm_at)) / 86400)::integer
      ELSE NULL
    END                                               AS days_since_last_comm
  FROM applications a
  LEFT JOIN youth     y  ON y.application_id = a.id
  LEFT JOIN comms_agg ca ON ca.application_id = a.id
),

-- Attach expected comms list per stage.
-- SYNC WITH config.ts STAGES expected comms if this mapping changes.
expected AS (
  SELECT
    b.*,
    CASE b.current_stage
      WHEN 'declaration_pending' THEN ARRAY['declaration_pending']::text[]
      WHEN 'video_pending'       THEN ARRAY['declaration_pending','declaration_confirmed']::text[]
      WHEN 'video_review'        THEN ARRAY['declaration_pending','declaration_confirmed']::text[]
      WHEN 'mentor_pending'      THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending']::text[]
      WHEN 'grant_pending'       THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending','grant_pending']::text[]
      WHEN 'grant_approved'      THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending','grant_pending','grant_approved']::text[]
      WHEN 'grant_expired'       THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending','grant_pending']::text[]
      WHEN 'final_video_pending' THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending','grant_pending','full_send_link']::text[]
      WHEN 'full_send_review'    THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending','grant_pending','full_send_link','full_send_submitted']::text[]
      WHEN 'completed'           THEN ARRAY['declaration_pending','declaration_confirmed','mentor_pending','grant_pending','full_send_link','full_send_submitted']::text[]
      WHEN 'rejected'            THEN ARRAY['rejected']::text[]
      ELSE                            ARRAY[]::text[]
    END AS expected_keys
  FROM base b
),

-- Compute derived columns so at_risk can reference them by alias.
computed AS (
  SELECT
    e.application_id,
    e.youth_id,
    e.first_name,
    e.last_name,
    e.email,
    e.current_stage,
    e.days_in_stage,

    -- missing_comms: expected keys not yet present in comms_log
    ARRAY(
      SELECT k FROM unnest(e.expected_keys) AS k
      WHERE NOT (k = ANY(e.received_keys))
    ) AS missing_comms,

    e.last_comm_sent,
    e.last_comm_at,
    e.days_since_last_comm,

    -- next_comm: label of next scheduled comm for the current stage
    CASE e.current_stage
      WHEN 'declaration_pending' THEN
        CASE WHEN NOT ('nudge_declaration'  = ANY(e.received_keys)) THEN 'nudge_declaration'
             ELSE 'deadline_removal' END
      WHEN 'video_pending' THEN
        CASE WHEN NOT ('nudge_first_drop_1' = ANY(e.received_keys)) THEN 'nudge_first_drop_1'
             WHEN NOT ('nudge_first_drop_2' = ANY(e.received_keys)) THEN 'nudge_first_drop_2'
             ELSE 'deadline_removal' END
      WHEN 'mentor_pending' THEN
        CASE WHEN NOT ('nudge_orientation_1' = ANY(e.received_keys)) THEN 'nudge_orientation_1'
             WHEN NOT ('nudge_orientation_2' = ANY(e.received_keys)) THEN 'nudge_orientation_2'
             ELSE 'deadline_removal' END
      WHEN 'grant_pending' THEN
        CASE WHEN NOT ('nudge_grant' = ANY(e.received_keys)) THEN 'nudge_grant'
             ELSE 'grant_expired' END
      WHEN 'final_video_pending' THEN
        CASE WHEN NOT ('nudge_full_send_1' = ANY(e.received_keys)) THEN 'nudge_full_send_1'
             WHEN NOT ('nudge_full_send_2' = ANY(e.received_keys)) THEN 'nudge_full_send_2'
             ELSE 'deadline_removal' END
      ELSE NULL
    END AS next_comm,

    -- next_comm_in_days: days until next_comm fires (0 = today, negative = overdue)
    -- SYNC WITH config.ts STAGES nudge_days if nudge schedules change
    CASE e.current_stage
      WHEN 'declaration_pending' THEN
        CASE WHEN NOT ('nudge_declaration'  = ANY(e.received_keys)) THEN GREATEST(0,  6 - e.days_in_stage)
             ELSE                                                         GREATEST(0, 10 - e.days_in_stage) END
      WHEN 'video_pending' THEN
        CASE WHEN NOT ('nudge_first_drop_1' = ANY(e.received_keys)) THEN GREATEST(0,  5 - e.days_in_stage)
             WHEN NOT ('nudge_first_drop_2' = ANY(e.received_keys)) THEN GREATEST(0,  9 - e.days_in_stage)
             ELSE                                                         GREATEST(0, 10 - e.days_in_stage) END
      WHEN 'mentor_pending' THEN
        CASE WHEN NOT ('nudge_orientation_1' = ANY(e.received_keys)) THEN GREATEST(0, 3 - e.days_in_stage)
             WHEN NOT ('nudge_orientation_2' = ANY(e.received_keys)) THEN GREATEST(0, 6 - e.days_in_stage)
             ELSE                                                          GREATEST(0, 7 - e.days_in_stage) END
      WHEN 'grant_pending' THEN
        CASE WHEN NOT ('nudge_grant' = ANY(e.received_keys)) THEN GREATEST(0,  5 - e.days_in_stage)
             ELSE                                                  GREATEST(0, 21 - e.days_in_stage) END
      WHEN 'final_video_pending' THEN
        CASE WHEN NOT ('nudge_full_send_1' = ANY(e.received_keys)) THEN GREATEST(0,  7 - e.days_in_stage)
             WHEN NOT ('nudge_full_send_2' = ANY(e.received_keys)) THEN GREATEST(0, 12 - e.days_in_stage)
             ELSE                                                        GREATEST(0, 14 - e.days_in_stage) END
      ELSE NULL
    END AS next_comm_in_days,

    -- deadline_in_days: days until stage deadline (negative = past deadline, null = no deadline)
    -- SYNC WITH config.ts STAGES deadline_days if deadlines change
    CASE e.current_stage
      WHEN 'declaration_pending' THEN (10 - e.days_in_stage)
      WHEN 'video_pending'       THEN (10 - e.days_in_stage)
      WHEN 'mentor_pending'      THEN ( 7 - e.days_in_stage)
      WHEN 'grant_pending'       THEN (21 - e.days_in_stage)
      WHEN 'final_video_pending' THEN (14 - e.days_in_stage)
      ELSE NULL
    END AS deadline_in_days

  FROM expected e
)

SELECT
  c.application_id,
  c.youth_id,
  c.first_name,
  c.last_name,
  c.email,
  c.current_stage,
  c.days_in_stage,
  c.missing_comms,
  c.last_comm_sent,
  c.last_comm_at,
  c.days_since_last_comm,
  c.next_comm,
  c.next_comm_in_days,
  c.deadline_in_days,
  -- at_risk: true if missing comms exist OR deadline is within 2 days (or already past)
  (
    CARDINALITY(c.missing_comms) > 0
    OR (c.deadline_in_days IS NOT NULL AND c.deadline_in_days <= 2)
  ) AS at_risk
FROM computed c;

-- Restrict access: service_role only
REVOKE ALL    ON youth_comms_checklist FROM PUBLIC;
GRANT  SELECT ON youth_comms_checklist TO   service_role;
