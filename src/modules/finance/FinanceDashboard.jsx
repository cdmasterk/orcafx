import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./Finance.css";
import LiveStatus from "./LiveStatus";

export default function FinanceDashboard() {
  const [prices, setPrices] = useState(null);
  const [lastRecalc, setLastRecalc] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch last metal prices
  const fetchMetalPrices = async () => {
    const { data, error } = await supabase
      .from("metal_prices")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(1);
    if (!error && data.length > 0) setPrices(data[0]);
  };

  // 🔹 Fetch last recalculation log
  const fetchLastRecalc = async () => {
    const { data, error } = await supabase
      .from("price_recalc_log")
      .select("*")
      .order("triggered_at", { ascending: false })
      .limit(1);
    if (!error && data.length > 0) setLastRecalc(data[0]);
  };

  // 🔹 Manual trigger (proxy to avoid CORS)
  const handleRecalc = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recalculate-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("✅ Recalculation triggered successfully!");
        fetchLastRecalc();
      } else {
        toast.error("❌ Failed to trigger recalculation");
        console.error(result);
      }
    } catch (err) {
      toast.error("❌ Network or server error");
      console.error("Recalc fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetalPrices();
    fetchLastRecalc();
  }, []);

  return (
    <div className="finance-dashboard">
      <h1>💰 Finance Hub</h1>

      <section className="finance-section">
        <h2>📊 Metal Prices (Latest)</h2>
        {prices ? (
          <div className="price-card">
            <p>Gold: {prices.gold_g?.toFixed(2)} €/g</p>
            <p>Silver: {prices.silver_g?.toFixed(2)} €/g</p>
            <p>Fetched at: {new Date(prices.fetched_at).toLocaleString()}</p>
          </div>
        ) : (
          <p>No data yet</p>
        )}
      </section>

      <section className="finance-section">
        <h2>⚙️ Last Recalculation</h2>
        {lastRecalc ? (
          <div className="log-card">
            <p>
              <strong>Status:</strong>{" "}
              {lastRecalc.success ? "✅ Success" : "❌ Failed"}
            </p>
            <p>
              <strong>Triggered:</strong>{" "}
              {new Date(lastRecalc.triggered_at).toLocaleString()}
            </p>
            <p>
              <strong>Triggered By:</strong> {lastRecalc.triggered_by}
            </p>
            <p>
              <strong>Details:</strong> {lastRecalc.details}
            </p>
          </div>
        ) : (
          <p>No logs yet</p>
        )}
<LiveStatus pollMs={5000} />
        <button
          className="recalc-btn"
          onClick={handleRecalc}
          disabled={loading}
        >
          {loading ? "Recalculating..." : "🔁 Recalculate Now"}
        </button>
      </section>
    </div>
  );
}
