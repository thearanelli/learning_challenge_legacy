-- Backfill champion_token for existing champions that don't have one.
-- Run once in Supabase Dashboard → SQL Editor after applying add_orientation_columns.sql.

update champions
set champion_token = gen_random_uuid()::text
where champion_token is null;
