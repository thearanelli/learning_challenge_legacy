-- Migration: add orientation tracking columns
-- Run once in Supabase Dashboard → SQL Editor
-- orientation_call_completed_at already exists on youth — not re-added here.

alter table youth
  add column if not exists orientation_responses jsonb;

alter table champions
  add column if not exists champion_token text;

create index if not exists idx_champions_champion_token on champions(champion_token);
