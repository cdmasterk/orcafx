import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SB_URL");
    const supabaseKey = Deno.env.get("SB_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiUrl = Deno.env.get("METALPRICE_API_URL");
    const apiKey = Deno.env.get("METALPRICE_API_KEY");

    const res = await fetch(
      `${apiUrl}?api_key=${apiKey}&base=EUR&currencies=XAU,XAG`
    );
    const data = await res.json();

    console.log("📊 API response:", data);

    // ✅ SAMO EURXAU i EURXAG
    const goldOz = parseFloat(data.rates?.EURXAU);
    const silverOz = parseFloat(data.rates?.EURXAG);

    if (isNaN(goldOz) || isNaN(silverOz)) {
      return new Response(
        JSON.stringify({ error: "Invalid API data", rates: data.rates }),
        { status: 400 }
      );
    }

    const goldG = goldOz / 31.1035;
    const silverG = silverOz / 31.1035;

    const { error } = await supabase.from("metal_prices").insert([
      {
        fetched_at: new Date().toISOString(),
        gold_oz: goldOz,
        silver_oz: silverOz,
        gold_g: goldG,
        silver_g: silverG,
      },
    ]);

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        message: "✅ Prices inserted",
        goldOz,
        silverOz,
        goldG,
        silverG,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
