import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function computeHmacSha256Base64(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-source, x-wc-webhook-topic, x-wc-webhook-resource, x-wc-webhook-event, x-wc-webhook-id, x-wc-webhook-delivery-id",
};

const ACCEPTED_ORDER_STATUSES = ["completed", "processing"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for webhook processing (no user auth)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.text();

    // Get webhook secret for verification
    const { data: wcSettings } = await supabase
      .from("woocommerce_settings")
      .select("webhook_secret")
      .limit(1)
      .single();

    // Verify webhook signature — mandatory if secret is configured
    const signature = req.headers.get("x-wc-webhook-signature");
    if (wcSettings?.webhook_secret) {
      if (!signature) {
        console.error("Missing webhook signature");
        return new Response("Missing signature", { status: 401 });
      }
      const expectedSig = await computeHmacSha256Base64(wcSettings.webhook_secret, payload);
      if (signature !== expectedSig) {
        console.error("Invalid webhook signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const order = JSON.parse(payload);

    // Ignore ping events or payloads without order data
    if (!order?.id || !order?.line_items) {
      return new Response("OK - ignored", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only process orders with accepted statuses
    if (!ACCEPTED_ORDER_STATUSES.includes(order.status)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Order status '${order.status}' niet verwerkt` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atomic deduplication: insert into processed_webhooks, skip if already exists
    const { error: dedupeError } = await supabase
      .from("processed_webhooks")
      .insert({ woocommerce_order_id: order.id });

    if (dedupeError) {
      // Unique constraint violation = already processed
      if (dedupeError.code === "23505") {
        return new Response("Already processed", {
          status: 200,
          headers: corsHeaders,
        });
      }
      // Other DB error — log and continue cautiously
      console.error("Deduplication check error:", dedupeError.message);
    }

    let processed = 0;

    for (const item of order.line_items) {
      // Look up by variation_id first (for variable products), then product_id
      let product = null;

      if (item.variation_id && item.variation_id > 0) {
        const { data } = await supabase
          .from("products")
          .select("id, name, current_stock")
          .eq("woocommerce_product_id", item.variation_id)
          .eq("woocommerce_parent_id", item.product_id)
          .maybeSingle();
        product = data;
      }

      if (!product) {
        const { data } = await supabase
          .from("products")
          .select("id, name, current_stock")
          .eq("woocommerce_product_id", item.product_id)
          .is("woocommerce_parent_id", null)
          .maybeSingle();
        product = data;
      }

      const wcId = (item.variation_id && item.variation_id > 0) ? item.variation_id : item.product_id;

      if (product) {
        // Create inventory movement (trigger will update stock)
        await supabase.from("inventory_movements").insert({
          product_id: product.id,
          movement_type: "out",
          source: "woocommerce",
          quantity: item.quantity,
          notes: `WooCommerce Bestelling #${order.id}${
            order.billing
              ? ` - ${order.billing.first_name ?? ""} ${
                  order.billing.last_name ?? ""
                }`.trim()
              : ""
          }`,
        });

        await supabase.from("sync_log").insert({
          sync_type: "import_order",
          direction: "from_woocommerce",
          product_id: product.id,
          woocommerce_product_id: wcId,
          woocommerce_order_id: order.id,
          old_value: String(product.current_stock),
          new_value: String(Number(product.current_stock) - item.quantity),
          status: "success",
        });

        processed++;
      } else {
        await supabase.from("sync_log").insert({
          sync_type: "import_order",
          direction: "from_woocommerce",
          woocommerce_product_id: wcId,
          woocommerce_order_id: order.id,
          status: "failed",
          error_message: item.variation_id && item.variation_id > 0
            ? `Productvariant met WooCommerce ID ${item.variation_id} (parent ${item.product_id}) niet gevonden`
            : `Product met WooCommerce ID ${item.product_id} niet gevonden`,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Verwerking mislukt" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
