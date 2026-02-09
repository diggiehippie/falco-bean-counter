import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    // Get WooCommerce settings
    const { data: wcSettings } = await supabase
      .from("woocommerce_settings")
      .select("*")
      .limit(1)
      .single();

    if (!wcSettings && action !== "test_connection") {
      return new Response(
        JSON.stringify({
          error: "WooCommerce niet geconfigureerd. Sla eerst je verbindingsgegevens op.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const storeUrl = params.store_url || wcSettings?.store_url;
    const consumerKey = params.consumer_key || wcSettings?.consumer_key;
    const consumerSecret =
      params.consumer_secret || wcSettings?.consumer_secret;

    const wcAuth =
      "Basic " + btoa(`${consumerKey}:${consumerSecret}`);

    async function wcFetch(endpoint: string, fetchParams: Record<string, string> = {}) {
      const url = new URL(`${storeUrl}/wp-json/wc/v3/${endpoint}`);
      Object.entries(fetchParams).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
      const res = await fetch(url.toString(), {
        headers: { Authorization: wcAuth },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`WooCommerce API fout (${res.status}): ${text.slice(0, 200)}`);
      }
      return res.json();
    }

    let result: unknown;

    switch (action) {
      case "test_connection": {
        const data = await wcFetch("system_status");
        result = {
          success: true,
          site_url: data?.environment?.site_url ?? storeUrl,
          wc_version: data?.environment?.version,
        };
        break;
      }

      case "import_products": {
        let page = 1;
        let imported = 0;
        let skipped = 0;
        let allProducts: any[] = [];

        // Paginate through all WooCommerce products
        while (true) {
          const wcProducts = await wcFetch("products", {
            per_page: "100",
            page: String(page),
          });
          if (!wcProducts?.length) break;
          allProducts = allProducts.concat(wcProducts);
          if (wcProducts.length < 100) break;
          page++;
        }

        for (const wcp of allProducts) {
          // Check if product already exists
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("woocommerce_product_id", wcp.id)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          const { data: newProduct, error } = await supabase
            .from("products")
            .insert({
              name: wcp.name,
              description: wcp.short_description || wcp.description || null,
              current_stock: wcp.stock_quantity || 0,
              woocommerce_product_id: wcp.id,
              selling_price: wcp.price ? parseFloat(wcp.price) : null,
              is_active: wcp.status === "publish",
            })
            .select("id")
            .single();

          if (!error && newProduct) {
            imported++;
            await supabase.from("sync_log").insert({
              sync_type: "import_products",
              direction: "from_woocommerce",
              product_id: newProduct.id,
              woocommerce_product_id: wcp.id,
              new_value: wcp.name,
              status: "success",
            });
          } else if (error) {
            await supabase.from("sync_log").insert({
              sync_type: "import_products",
              direction: "from_woocommerce",
              woocommerce_product_id: wcp.id,
              new_value: wcp.name,
              status: "failed",
              error_message: error.message,
            });
          }
        }

        // Update last_import_at
        if (wcSettings) {
          await supabase
            .from("woocommerce_settings")
            .update({ last_import_at: new Date().toISOString() })
            .eq("id", wcSettings.id);
        }

        result = { imported, skipped, total: allProducts.length };
        break;
      }

      case "sync_stock": {
        const { data: products } = await supabase
          .from("products")
          .select("id, woocommerce_product_id, current_stock")
          .not("woocommerce_product_id", "is", null);

        let synced = 0;
        let errors = 0;

        for (const product of products ?? []) {
          try {
            const wcp = await wcFetch(
              `products/${product.woocommerce_product_id}`
            );
            const wcStock = wcp.stock_quantity ?? 0;

            if (wcStock !== Number(product.current_stock)) {
              await supabase
                .from("products")
                .update({ current_stock: wcStock })
                .eq("id", product.id);

              await supabase.from("sync_log").insert({
                sync_type: "import_stock",
                direction: "from_woocommerce",
                product_id: product.id,
                woocommerce_product_id: product.woocommerce_product_id,
                old_value: String(product.current_stock),
                new_value: String(wcStock),
                status: "success",
              });
              synced++;
            }
          } catch (e) {
            errors++;
            await supabase.from("sync_log").insert({
              sync_type: "import_stock",
              direction: "from_woocommerce",
              product_id: product.id,
              woocommerce_product_id: product.woocommerce_product_id,
              status: "failed",
              error_message: e instanceof Error ? e.message : "Onbekende fout",
            });
          }
        }

        if (wcSettings) {
          await supabase
            .from("woocommerce_settings")
            .update({ last_import_at: new Date().toISOString() })
            .eq("id", wcSettings.id);
        }

        result = { synced, errors, total: products?.length ?? 0 };
        break;
      }

      case "match_products": {
        // Try to match products by name
        let page = 1;
        let allWcProducts: any[] = [];
        while (true) {
          const wcProducts = await wcFetch("products", {
            per_page: "100",
            page: String(page),
          });
          if (!wcProducts?.length) break;
          allWcProducts = allWcProducts.concat(wcProducts);
          if (wcProducts.length < 100) break;
          page++;
        }

        const { data: localProducts } = await supabase
          .from("products")
          .select("id, name, woocommerce_product_id")
          .is("woocommerce_product_id", null);

        const matched: { localName: string; wcName: string; wcId: number }[] = [];
        const unmatched: string[] = [];

        for (const lp of localProducts ?? []) {
          const match = allWcProducts.find(
            (wcp: any) =>
              wcp.name.toLowerCase().trim() === lp.name.toLowerCase().trim()
          );
          if (match) {
            await supabase
              .from("products")
              .update({ woocommerce_product_id: match.id })
              .eq("id", lp.id);
            matched.push({
              localName: lp.name,
              wcName: match.name,
              wcId: match.id,
            });
          } else {
            unmatched.push(lp.name);
          }
        }

        result = { matched, unmatched };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Onbekende actie: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WooCommerce sync error:", error);
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
