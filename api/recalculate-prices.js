// /api/recalculate-prices.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const response = await fetch(
      "https://vbrzdxbbijwgkfexfdfk.supabase.co/functions/v1/trigger_price_recalc",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();

    return res.status(response.status).json({
      success: true,
      triggered: true,
      recalculated: data?.recalculated || 0,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Recalc proxy error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Unknown error" });
  }
}
