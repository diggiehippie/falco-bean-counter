# Findings - Falco Bean Counter WooCommerce Sync Improvement

## Discovery Date: 2026-02-22

---

## Current WooCommerce Sync Analysis

### What Exists
1. **Manual sync** via buttons on `/woocommerce` page:
   - "Importeer Alle Producten" - imports new WC products (skips existing)
   - "Match Producten" - fuzzy name-match to link local ↔ WC products
   - "Sync Voorraad Nu" - pulls stock levels from WC for mapped products
2. **Webhook handler** (`woocommerce-webhook/index.ts`):
   - Receives WC order webhooks
   - HMAC-SHA256 signature verification
   - Auto-creates inventory movement (type: "out") on order
   - Deduplication via `sync_log` check on `woocommerce_order_id`
3. **Sync log** (`sync_log` table):
   - Records all sync operations with status (success/failed/pending)
   - Stores old_value/new_value for stock changes
   - Has `error_message` and `error_details` fields
4. **Dashboard widget**: Shows last sync time, today's order count + kg sold

### Gaps Identified

#### Auto-Sync (CRITICAL)
- `auto_import_enabled` field EXISTS in `woocommerce_settings` table but is **NEVER USED**
- All sync is manual button-press only
- No scheduled/periodic sync mechanism
- No Supabase pg_cron or Deno cron configured
- Stock changes in the local app are NOT pushed back to WooCommerce (one-directional)

#### Error Handling (CRITICAL)
- Errors appear only as toast notifications (ephemeral)
- No error categorization (network vs data vs rate-limit)
- No retry mechanism for transient failures
- Sync log captures errors but they're not prominently surfaced
- No health indicator on Dashboard (always shows "🟢 Actief" regardless of errors)
- `error_details` field exists but is never populated

#### Missing Features
- No bidirectional stock sync (local → WC is missing)
- No product data sync (prices, descriptions) after initial import
- No conflict resolution for simultaneous stock changes
- No rate limiting awareness for WC API calls
- No Google Sheets export capability

### Database Schema (Relevant Tables)
- `woocommerce_settings`: Connection config + `auto_import_enabled` (unused)
- `sync_log`: All sync operations with status tracking
- `products`: Has `woocommerce_product_id` for mapping
- `inventory_movements`: Stock changes with source tracking
- `stock_status_view`: Computed view with stock_status field

### API Architecture
- Frontend → Supabase Edge Function (`woocommerce-sync/index.ts`)
- Edge Function → WC REST API v3 (Basic Auth)
- WC Webhooks → Supabase Edge Function (`woocommerce-webhook/index.ts`)
- Auth: User JWT for sync, Service Role Key for webhooks

### Tech Constraints
- Supabase Edge Functions run Deno (not Node.js)
- Edge Functions have 150s timeout on free plan
- WC API rate limits vary by hosting provider
- CORS headers required for all responses
