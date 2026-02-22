# SOP: Bidirectional WooCommerce Auto-Sync

## Goal
Keep stock levels synchronized between Falco Bean Counter and WooCommerce in both directions, automatically.

---

## Sync Directions

### Direction 1: App → WooCommerce (push_stock)
**Trigger:** User clicks "Push naar WooCommerce" button, or auto-sync interval fires.
**Logic:**
1. Fetch all local products where `woocommerce_product_id IS NOT NULL`
2. For each product, PUT to `WC REST API /products/{wc_id}` with `{ stock_quantity: current_stock }`
3. Log each update to `sync_log` with `direction: "to_woocommerce"`
4. Skip products where local stock matches WC stock (no unnecessary writes)

### Direction 2: WooCommerce → App (sync_stock) — Already exists
**Trigger:** User clicks "Sync Voorraad Nu" button, or auto-sync interval fires.
**Logic:** (existing) Fetch WC stock for each mapped product, update local if different.

### Direction 3: WooCommerce → App (webhook) — Already exists
**Trigger:** WC sends order webhook.
**Logic:** (existing) Create inventory_movement type:out, stock decrements via DB trigger.

---

## Auto-Sync Scheduled Function

### Function: `woocommerce-auto-sync`
**Runtime:** Supabase Edge Function (Deno)
**Auth:** Service Role Key (no user session available for cron)
**Schedule:** Every 15 minutes (configurable via `woocommerce_settings`)

### Execution Flow
```
1. Check woocommerce_settings.auto_import_enabled === true
   └─ If false → exit early, no work
2. Fetch WC credentials from woocommerce_settings
3. Run sync_stock (WC → App): pull latest stock from WC
4. Run push_stock (App → WC): push local changes to WC
5. Update woocommerce_settings.last_import_at
6. Log summary to sync_log with sync_type: "full_sync"
```

### Conflict Resolution: Last-Write-Wins
- When auto-sync runs, WC stock is fetched first (Direction 2)
- Then local stock is pushed to WC (Direction 1)
- Net effect: the app's local stock becomes the source of truth
- Both operations are logged in sync_log for audit

### Rate Limiting
- WC API calls are sequential (one product at a time)
- Max 100 products per page when fetching
- If rate-limited (HTTP 429), wait and retry up to 3 times

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/woocommerce-sync/index.ts` | Add `push_stock` action |
| `supabase/functions/woocommerce-auto-sync/index.ts` | New scheduled sync function |
| `src/hooks/useWooCommerce.ts` | Add `usePushStock` hook + `useAutoSyncToggle` |
| `src/pages/WooCommerce.tsx` | Add push button + auto-sync toggle UI |
| `supabase/config.toml` | Register new function |

---

## Edge Cases
- Product has no `woocommerce_product_id` → skip (not linked)
- WC product deleted but still linked locally → log error, don't crash
- WC API unreachable → log as failed, don't update local stock
- Auto-sync disabled mid-run → complete current run, skip next
