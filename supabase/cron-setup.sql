-- ============================================================
-- Falco Bean Counter - Auto-Sync Cron Setup
-- Run this in Supabase SQL Editor (SQL Editor > New Query)
-- ============================================================
-- This sets up a cron job that calls the woocommerce-auto-sync
-- Edge Function every 15 minutes for automatic stock sync.
-- ============================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Schedule the auto-sync every 15 minutes
-- NOTE: Replace <SERVICE_ROLE_KEY> with your actual service role key
-- from Supabase Dashboard > Settings > API > service_role key
SELECT cron.schedule(
  'woocommerce-auto-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kesapqjliobaqwyrixwd.supabase.co/functions/v1/woocommerce-auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- Useful management commands (run separately as needed):
-- ============================================================

-- View all scheduled jobs:
-- SELECT * FROM cron.job;

-- View recent job runs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule the auto-sync:
-- SELECT cron.unschedule('woocommerce-auto-sync');

-- Change interval to every 30 minutes:
-- SELECT cron.unschedule('woocommerce-auto-sync');
-- SELECT cron.schedule('woocommerce-auto-sync', '*/30 * * * *', $$ ... $$);
