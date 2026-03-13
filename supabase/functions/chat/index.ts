import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  const allowedHeaders = "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

  if (envOrigins) {
    const allowed = envOrigins.split(",").map((s) => s.trim());
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    return {
      "Access-Control-Allow-Origin": (allowed.includes(origin) || isLocalDev) ? origin : allowed[0],
      "Access-Control-Allow-Headers": allowedHeaders,
      "Vary": "Origin",
    };
  }

  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": allowedHeaders,
    "Vary": "Origin",
  };
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_product_info",
      description: "Haal gedetailleerde informatie op over een specifiek product",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Naam (of deel) van het product" },
        },
        required: ["product_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_stock",
      description: "Pas voorraad aan: positief = toevoegen, negatief = aftrekken",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          quantity: { type: "number", description: "Positief om toe te voegen, negatief om af te trekken" },
          reason: { type: "string", description: "Reden voor de aanpassing" },
        },
        required: ["product_name", "quantity", "reason"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_activity",
      description: "Bekijk recente voorraad mutaties",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Aantal (standaard 10)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_stock",
      description: "Toon alle producten met lage of kritieke voorraad",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Geef verkoop samenvatting voor een periode",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month"], description: "Periode" },
        },
        required: ["period"],
        additionalProperties: false,
      },
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  userEmail: string
) {
  switch (name) {
    case "get_product_info": {
      const { data } = await supabase
        .from("stock_status_view")
        .select("*")
        .ilike("name", `%${args.product_name}%`);
      if (!data?.length) return { error: `Product "${args.product_name}" niet gevonden` };
      return data;
    }

    case "update_stock": {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, current_stock")
        .ilike("name", `%${args.product_name}%`);
      if (!products?.length) return { error: `Product "${args.product_name}" niet gevonden` };
      const product = products[0];
      const qty = Number(args.quantity);
      const { error } = await supabase.from("inventory_movements").insert({
        product_id: product.id,
        movement_type: qty > 0 ? "in" : "out",
        source: "manual",
        quantity: Math.abs(qty),
        notes: `Via chatbot: ${args.reason}`,
        user_email: userEmail,
      });
      if (error) return { error: error.message };
      const newStock = Number(product.current_stock) + qty;
      return { success: true, product: product.name, previous: Number(product.current_stock), new_stock: newStock };
    }

    case "get_recent_activity": {
      const limit = Number(args.limit) || 10;
      const { data } = await supabase
        .from("inventory_movements")
        .select("*, products(name, unit)")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    }

    case "get_low_stock": {
      const { data } = await supabase
        .from("stock_status_view")
        .select("name, current_stock, minimum_stock, critical_stock, stock_status, unit")
        .in("stock_status", ["low", "critical"])
        .order("stock_status");
      return data?.length ? data : { message: "Alle producten hebben voldoende voorraad ✅" };
    }

    case "get_sales_summary": {
      const now = new Date();
      let dateFrom: string;
      if (args.period === "today") {
        dateFrom = now.toISOString().slice(0, 10);
      } else if (args.period === "week") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        dateFrom = d.toISOString().slice(0, 10);
      } else {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        dateFrom = d.toISOString().slice(0, 10);
      }
      const { data } = await supabase
        .from("inventory_movements")
        .select("quantity, products(name, unit)")
        .eq("movement_type", "out")
        .gte("created_at", dateFrom);
      if (!data?.length) return { message: "Geen verkopen in deze periode" };
      const byProduct: Record<string, number> = {};
      data.forEach((m: any) => {
        const name = m.products?.name ?? "Onbekend";
        byProduct[name] = (byProduct[name] || 0) + Number(m.quantity);
      });
      return Object.entries(byProduct)
        .sort((a, b) => b[1] - a[1])
        .map(([name, qty]) => ({ product: name, quantity_kg: qty }));
    }

    default:
      return { error: "Onbekende functie" };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages: clientMessages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email ?? "unknown";

    // Fetch current inventory context
    const { data: products } = await supabase
      .from("stock_status_view")
      .select("name, current_stock, minimum_stock, critical_stock, stock_status, unit, origin, roast_level")
      .eq("is_active", true);

    const stockContext = (products ?? [])
      .map((p: any) => `- ${p.name}: ${p.current_stock} ${p.unit} (min: ${p.minimum_stock}, status: ${p.stock_status})`)
      .join("\n");

    const systemPrompt = `Je bent de Falco Caffè voorraadassistent. Je helpt met voorraad, producten, leveranciers en bestellingen.

HUIDIGE VOORRAAD:
${stockContext || "Geen producten gevonden"}

REGELS:
- Antwoord ALTIJD in het Nederlands
- Wees vriendelijk, beknopt en professioneel
- Gebruik emoji's spaarzaam (alleen ✅ ⚠️ ❌ 📊 voor status)
- Vraag bevestiging voordat je voorraad aanpast
- Als een gebruiker zegt "ja" of "bevestig" na een voorstel, voer de actie dan uit
- Gebruik de beschikbare tools om actuele data op te halen en acties uit te voeren
- Formatteer antwoorden met markdown: **bold** voor productnamen, bullets voor lijsten`;

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...(clientMessages ?? []),
    ];

    // First AI call
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: allMessages,
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het zo opnieuw." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits op. Voeg credits toe in Workspace instellingen." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;

    // Handle tool calls (up to 3 rounds)
    let rounds = 0;
    while (assistantMessage?.tool_calls?.length && rounds < 3) {
      rounds++;
      const updatedMessages = [...allMessages, assistantMessage];

      for (const tc of assistantMessage.tool_calls) {
        const args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
        const toolResult = await executeTool(tc.function.name, args, supabase, userEmail);
        updatedMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        } as any);
      }

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: updatedMessages,
          tools,
          stream: false,
        }),
      });

      if (!response.ok) throw new Error(`AI follow-up error: ${response.status}`);
      result = await response.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    const content = assistantMessage?.content ?? "Sorry, ik kon geen antwoord genereren.";

    return new Response(JSON.stringify({ message: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
