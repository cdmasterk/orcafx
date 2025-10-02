// supabase/functions/fetch_metal_prices/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// 🔑 Environment varijable
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const METALPRICE_API_URL =
  Deno.env.get("METALPRICE_API_URL") ||
  "https://api.metalpriceapi.com/v1/latest";
const METALPRICE_API_KEY = Deno.env.get("METALPRICE_API_KEY")!;

// Supabase client (service role za insert)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Konstanta za pretvaranje unci u grame
const OZ_TO_GRAM = 31.1035;

// Standardni CORS headeri
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // ⚡ Rukovanje OPTIONS preflightom
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Dohvati cijene od MetalPrice API
    const url =
      `${METALPRICE_API_URL}?api_key=${METALPRICE_API_KEY}&base=EUR&currencies=XAU,XAG`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json?.success || !json.rates?.XAU || !json.rates?.XAG) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API data", raw: json }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Ispravljena konverzija ---
    // API vraća "koliko unci stane u 1 EUR", pa radimo recipročno
    const goldOz = 1 / json.rates.XAU; // EUR/oz
    const silverOz = 1 / json.rates.XAG; // EUR/oz

    // EUR/g
    const goldG = goldOz / OZ_TO_GRAM;
    const silverG = silverOz / OZ_TO_GRAM;

    // Insert u Supabase
    const { error } = await supabase.from("metal_prices").insert({
      gold_oz: goldOz,
      silver_oz: silverOz,
      gold_g: goldG,
      silver_g: silverG,
      fetched_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Database insert failed", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ✅ Sve ok
    return new Response(
      JSON.stringify({
        success: true,
        goldOz,
        silverOz,
        goldG,
        silverG,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
