# Task Plan - WooCommerce Sync Improvement

## North Star
Make WooCommerce synchronization reliable, automatic, and observable.

---

## Phase 1: Blueprint (COMPLETE)
- [x] Discovery questions answered
- [x] Codebase analyzed
- [x] Data schema approved in gemini.md
- [x] Task plan approved by user

## Phase 2: Link (COMPLETE)
- [x] Verify WooCommerce API connection is functional
- [x] Edge Functions deployed to new Supabase project
- [x] Database migration applied

## Phase 3: Architect (COMPLETE)

### 3A: Auto-Sync Engine (COMPLETE)
- [x] **SOP:** Written `architecture/auto-sync.md`
- [x] **Scheduled Sync Function:** `woocommerce-auto-sync` Edge Function created & deployed
- [x] **Bidirectional Stock Push:** `push_stock` action added to woocommerce-sync
- [x] **Activate `auto_import_enabled` toggle:** Wired up with UI Switch component
- [x] **Conflict Resolution:** Smart detection via recent inventory_movements (15 min window)

### 3B: Error Handling & Observability (COMPLETE)
- [x] **SOP:** Written `architecture/sync-error-handling.md`
- [x] **Error Categorization:** 7 categories (connection, auth, rate_limit, not_found, data, server, unknown)
- [x] **Retry Logic:** Exponential backoff (3 attempts: immediate → 2s → 4s) in both Edge Functions
- [x] **Health Status:** `useSyncHealth()` hook computing healthy/degraded/error from sync_log
- [x] **Dashboard Widget:** Real computed health replacing hardcoded status
- [x] **Enhanced Sync Log:** Direction column (Pull/Push) + error category/attempts display
- [x] **Error Details:** `WcApiError.toErrorDetails()` populating sync_log.error_details JSON
- [x] **Deployed:** All 3 Edge Functions redeployed with retry & error categorization

## Phase 4: Stylize (COMPLETE)
- [x] **Health Summary Card:** Banner card on WooCommerce page with status icon, last sync, 24h ratio + Progress bar, today's orders
- [x] **Colored Left Borders:** Cards change border color based on sync health (success/warning/destructive)
- [x] **SyncStatusBadge:** Replaced emojis with Lucide icons (CheckCircle, XCircle, Clock)
- [x] **Sync Log Improvements:** Color-coded rows, direction badges, error message boxes, entry count badge
- [x] **Dashboard Widget Polish:** Icon boxes for status, colored border, improved layout with semantic colors

## Phase 5: Trigger (COMPLETE)
- [x] **Cron Setup SQL:** Created `supabase/cron-setup.sql` with pg_cron + pg_net (every 15 min)
- [x] **Documentation:** Updated gemini.md with full maintenance log (deploy, troubleshoot, cron management)
- [x] **WC Webhook:** Already set up for order completion (stock change webhook not available natively in WC)
- [ ] **User Action Required:** Run `cron-setup.sql` in Supabase SQL Editor with service_role key
