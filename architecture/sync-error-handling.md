# SOP: Sync Error Handling & Observability

## Goal
Make every sync failure visible, categorized, and auto-recoverable where possible.

---

## Error Categories

| Category | HTTP Codes | Retryable | Example |
|----------|-----------|-----------|---------|
| `connection` | 0, ECONNREFUSED, timeout | Yes (3x) | WC server down, DNS failure |
| `auth` | 401, 403 | No | Invalid API keys, expired credentials |
| `rate_limit` | 429 | Yes (3x, with backoff) | Too many API calls |
| `not_found` | 404 | No | WC product deleted but still linked locally |
| `data` | 400, 422 | No | Invalid payload, schema mismatch |
| `server` | 500, 502, 503 | Yes (3x) | WC server error, temporary outage |
| `unknown` | Other | No | Unexpected errors |

---

## Retry Logic

### Strategy: Exponential Backoff
- Attempt 1: immediate
- Attempt 2: wait 2 seconds
- Attempt 3: wait 4 seconds
- After 3 failures: log as failed, move to next product

### Implementation
Wrap `wcFetch` and `wcPut` with a retry helper that:
1. Catches errors
2. Classifies them by HTTP status
3. Retries if category is retryable
4. Logs final failure with full error_details JSON

---

## error_details Schema (stored in sync_log.error_details)
```json
{
  "category": "rate_limit",
  "http_status": 429,
  "response_body": "Rate limit exceeded...",
  "attempts": 3,
  "last_attempt_at": "ISO timestamp"
}
```

---

## Sync Health Status

### Computed from sync_log, not a separate table
Query the last 24 hours of sync_log to determine health:

- **Healthy**: Last successful sync < 1 hour ago AND failed count in last 3 syncs = 0
- **Degraded**: Last successful sync < 2 hours ago OR failed count in last 3 syncs <= 1
- **Error**: Last successful sync > 2 hours ago OR last 3 syncs all failed

### Hook: `useSyncHealth()`
Returns `{ status, lastSuccess, failedCount24h, successCount24h }`

### Dashboard Widget
Replace hardcoded "Actief" with real computed health status.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/woocommerce-sync/index.ts` | Add retry wrapper, error categorization, populate error_details |
| `supabase/functions/woocommerce-auto-sync/index.ts` | Same retry wrapper |
| `src/hooks/useWooCommerce.ts` | Add `useSyncHealth()` hook |
| `src/pages/WooCommerce.tsx` | Show direction column + error details in sync log |
| `src/pages/Dashboard.tsx` | Replace hardcoded health with computed status |
