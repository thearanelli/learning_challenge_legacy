-- Schedule daily-scheduler Edge Function to run every 30 minutes via pg_cron + pg_net.
--
-- PREREQUISITE: Store the service role key in Vault before running this migration.
-- Run once in the SQL Editor:
--
--   select vault.create_secret('<your-service-role-key>', 'service_role_key');
--
-- The service role key is in: Dashboard → Project Settings → API → service_role secret.

select cron.schedule(
  'daily-scheduler',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://bqysrqjywxdmvcmxxrui.supabase.co/functions/v1/daily-scheduler',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from   vault.decrypted_secrets
        where  name = 'service_role_key'
        limit  1
      )
    ),
    body    := '{}'::jsonb
  )
  $$
);
