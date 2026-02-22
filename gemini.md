# Gemini - Project Constitution
# Falco Bean Counter - WooCommerce Sync & Automation

---

## Data Schemas

### Input: WooCommerce Product (from WC REST API v3)
```json
{
  "id": 123,
  "name": "Ethiopia Yirgacheffe",
  "status": "publish",
  "price": "12.50",
  "stock_quantity": 45,
  "short_description": "...",
  "description": "..."
}
```

### Input: WooCommerce Order Webhook Payload
```json
{
  "id": 456,
  "status": "completed",
  "billing": { "first_name": "Jan", "last_name": "Jansen" },
  "line_items": [
    { "product_id": 123, "quantity": 2, "name": "Ethiopia Yirgacheffe" }
  ]
}
```

### Internal: Sync Log Entry
```json
{
  "id": "uuid",
  "sync_type": "import_stock | import_products | import_order | full_sync",
  "direction": "from_woocommerce | to_woocommerce",
  "product_id": "uuid | null",
  "woocommerce_product_id": 123,
  "woocommerce_order_id": 456,
  "old_value": "45",
  "new_value": "43",
  "status": "success | failed | pending",
  "error_message": "string | null",
  "error_details": { "http_status": 429, "response": "...", "category": "rate_limit" },
  "synced_at": "ISO timestamp"
}
```

### Output: Sync Health Status (NEW - for Dashboard)
```json
{
  "status": "healthy | degraded | error",
  "lastSuccessfulSync": "ISO timestamp | null",
  "failedCount24h": 0,
  "successCount24h": 15,
  "nextScheduledSync": "ISO timestamp | null",
  "autoSyncEnabled": true,
  "syncIntervalMinutes": 15
}
```

---

## Behavioral Rules

1. **Language:** All UI text in Dutch (Nederlands)
2. **Data Integrity:** Never delete existing products during import; skip or update only
3. **Sync Direction:** Default is FROM WooCommerce. Push TO WooCommerce only for manual local stock changes (source != 'woocommerce')
4. **Conflict Resolution:** Last-write-wins. Both changes are logged in sync_log for audit
5. **Error Recovery:** Transient errors (network, rate limit) retry 3x with exponential backoff. Permanent errors (auth, data) are logged and surfaced
6. **Pricing:** All prices in EUR, rounded to 2 decimal places
7. **Stock Units:** Always in kilograms (kg)
8. **Auto-Sync:** Controlled by `auto_import_enabled` toggle. Default interval: 15 minutes
9. **Webhook Security:** HMAC-SHA256 verification required when webhook_secret is configured
10. **Logging:** Every sync operation MUST be logged to sync_log table, regardless of outcome

---

## Architectural Invariants

1. **Supabase Edge Functions** handle all external API communication (WC)
2. **Frontend never calls WC API directly** — always through Edge Functions
3. **Service Role Key** used only for webhook processing (no user auth available)
4. **User JWT** required for all user-initiated sync operations
5. **All temporary data** goes in `.tmp/` directory (ephemeral)
6. **sync_log** is the single source of truth for sync history
7. **woocommerce_settings** table holds exactly ONE row of config
8. **React Query** manages all frontend data fetching with 30s auto-refresh for sync data

---

## Maintenance Log

### 2026-02-22 - Initial Deployment

**Supabase Project:** `kesapqjliobaqwyrixwd`

**Edge Functions Deployed:**
| Function | Purpose |
|----------|---------|
| `woocommerce-sync` | User-initiated sync (pull/push stock, import products, match, test connection) |
| `woocommerce-auto-sync` | Scheduled bidirectional sync (called by pg_cron every 15 min) |
| `woocommerce-webhook` | Receives WooCommerce order webhooks, deducts stock automatically |

**Cron Job:**
- Name: `woocommerce-auto-sync`
- Schedule: `*/15 * * * *` (every 15 minutes)
- Setup: Run `supabase/cron-setup.sql` in SQL Editor (requires service_role key)
- Monitor: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`
- Disable: `SELECT cron.unschedule('woocommerce-auto-sync');`

**WooCommerce Webhook:**
- URL: `https://kesapqjliobaqwyrixwd.supabase.co/functions/v1/woocommerce-webhook`
- Topic: Order completed
- Secret: Configured in app (WooCommerce page > Webhook Secret)

**How to Redeploy Edge Functions:**
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <function-name> --project-ref kesapqjliobaqwyrixwd
```

**Troubleshooting:**
- Check sync health: Dashboard or WooCommerce page shows live status
- View sync logs: WooCommerce page > Sync Geschiedenis
- Check cron runs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`
- Check Edge Function logs: Supabase Dashboard > Edge Functions > Logs
- Error categories: connection, auth, rate_limit, not_found, data, server, unknown
- Retryable errors (connection, rate_limit, server) auto-retry 3x with exponential backoff
