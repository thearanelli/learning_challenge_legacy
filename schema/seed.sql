-- applications table — locked schema (MVP)
-- Already run in Supabase. Kept here for reference.
create extension if not exists "uuid-ossp";
create table applications (
  id                    uuid primary key default uuid_generate_v4(),
  program_id            uuid,
  first_name            text        not null,
  last_name             text        not null,
  birthdate             text        not null,
  address               text        not null,
  email                 text        not null,
  phone                 text        not null,
  screening_status      text        not null default 'submitted',
  ai_decision           text,
  ai_reasoning          text,
  failed_criteria       text,
  submitted_at          timestamptz not null default now(),
  application_responses jsonb       not null default '{}'::jsonb
);
create index idx_applications_screening_status on applications(screening_status);
create index idx_applications_submitted_at on applications(submitted_at desc);
create index idx_applications_email on applications(email);
