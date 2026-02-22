import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role — no user auth for scheduled invocations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if auto-sync is enabled
    const { data: wcSettings } = await supabase
      .from("woocommerce_settings")
      .select("*")
      .limit(1)
      .single();

    if (!wcSettings) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "WooCommerce niet geconfigureerd" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!wcSettings.auto_import_enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Auto-sync is uitgeschakeld" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wcAuth = "Basic " + btoa(`${wcSettings.consumer_key}:${wcSettings.consumer_secret}`);

    function categorizeError(status: number): { category: string; retryable: boolean } {
      if (status === 0) return { category: "connection", retryable: true };
      if (status === 401 || status === 403) return { category: "auth", retryable: false };
      if (status === 404) return { category: "not_found", retryable: false };
      if (status === 429) return { category: "rate_limit", retryable: true };
      if (status === 400 || status === 422) return { category: "data", retryable: false };
      if (status >= 500) return { category: "server", retryable: true };
      return { category: "unknown", retryable: false };
    }

    class WcApiError extends Error {
      status: number;
      category: string;
      retryable: boolean;
      responseBody: string;
      constructor(status: number, responseBody: string) {
        const { category, retryable } = categorizeError(status);
        super(`WC API fout (${status}/${category}): ${responseBody.slice(0, 200)}`);
        this.status = status;
        this.category = category;
        this.retryable = retryable;
        this.responseBody = responseBody.slice(0, 500);
      }
      toErrorDetails(attempts: number) {
        return { category: this.category, http_status: this.status, response_body: this.responseBody, attempts, last_attempt_at: new Date().toISOString() };
      }
    }

    async function wcRequest(endpoint: string, options: { method?: string; params?: Record<string, string>; body?: Record<string, unknown> } = {}) {
      const maxRetries = 3;
      const { method = "GET", params = {}, body } = options;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const url = new URL(`${wcSettings.store_url}/wp-json/wc/v3/${endpoint}`);
          Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
          const fetchOptions: RequestInit = {
            method,
            headers: { Authorization: wcAuth, ...(body ? { "Content-Type": "application/json" } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
          };
          const res = await fetch(url.toString(), fetchOptions);
          if (!res.ok) {
            const text = await res.text();
            const err = new WcApiError(res.status, text);
            if (err.retryable && attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
              continue;
            }
            throw err;
          }
          return res.json();
        } catch (e) {
          if (e instanceof WcApiError) throw e;
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          throw new WcApiError(0, e instanceof Error ? e.message : "Verbindingsfout");
        }
      }
    }

    async function wcFetch(endpoint: string, params: Record<string, string> = {}) {
      return wcRequest(endpoint, { params });
    }

    async function wcPut(endpoint: string, body: Record<string, unknown>) {
      return wcRequest(endpoint, { method: "PUT", body });
    }

    // Get all linked products
    const { data: products } = await supabase
      .from("products")
      .select("id, name, woocommerce_product_id, current_stock")
      .not("woocommerce_product_id", "is", null);

    let pullCount = 0;
    let pushCount = 0;
    let errors = 0;

    for (const product of products ?? []) {
      try {
        const wcp = await wcFetch(`products/${product.woocommerce_product_id}`);
        const wcStock = wcp.stock_quantity ?? 0;
        const localStock = Number(product.current_stock) || 0;

        if (wcStock === localStock) continue;

        // Pull from WC: if WC stock differs, update local
        // Then push local back to WC to ensure consistency
        // Net effect: WC stock is pulled first, then local becomes source of truth
        // if local was changed since last sync

        // Step 1: Pull WC → local (only if WC changed and local didn't)
        // We check sync_log for recent local changes to this product
        const { data: recentLocalChange } = await supabase
          .from("sync_log")
          .select("id")
          .eq("product_id", product.id)
          .eq("direction", "to_woocommerce")
          .gte("synced_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .limit(1)
          .maybeSingle();

        // Check for recent inventory movements (source != woocommerce)
        const { data: recentMovement } = await supabase
          .from("inventory_movements")
          .select("id")
          .eq("product_id", product.id)
          .neq("source", "woocommerce")
          .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .limit(1)
          .maybeSingle();

        if (recentMovement || recentLocalChange) {
          // Local was changed recently → push local stock to WC
          await wcPut(`products/${product.woocommerce_product_id}`, {
            stock_quantity: localStock,
            manage_stock: true,
          });

          await supabase.from("sync_log").insert({
            sync_type: "import_stock",
            direction: "to_woocommerce",
            product_id: product.id,
            woocommerce_product_id: product.woocommerce_product_id,
            old_value: String(wcStock),
            new_value: String(localStock),
            status: "success",
          });
          pushCount++;
        } else {
          // No local change → pull WC stock to local
          await supabase
            .from("products")
            .update({ current_stock: wcStock })
            .eq("id", product.id);

          await supabase.from("sync_log").insert({
            sync_type: "import_stock",
            direction: "from_woocommerce",
            product_id: product.id,
            woocommerce_product_id: product.woocommerce_product_id,
            old_value: String(localStock),
            new_value: String(wcStock),
            status: "success",
          });
          pullCount++;
        }
      } catch (e) {
        errors++;
        await supabase.from("sync_log").insert({
          sync_type: "full_sync",
          direction: "from_woocommerce",
          product_id: product.id,
          woocommerce_product_id: product.woocommerce_product_id,
          status: "failed",
          error_message: e instanceof Error ? e.message : "Onbekende fout",
          error_details: e instanceof WcApiError ? e.toErrorDetails(3) : { category: "unknown", attempts: 1 },
        });
      }
    }

    // Update last sync timestamp
    await supabase
      .from("woocommerce_settings")
      .update({ last_import_at: new Date().toISOString() })
      .eq("id", wcSettings.id);

    // Log summary
    await supabase.from("sync_log").insert({
      sync_type: "full_sync",
      direction: "from_woocommerce",
      status: "success",
      new_value: `Pull: ${pullCount}, Push: ${pushCount}, Fouten: ${errors}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        pulled: pullCount,
        pushed: pushCount,
        errors,
        total: products?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-sync error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Onbekende fout",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
