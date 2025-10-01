import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./MainLayout.css";
import Navbar from "../components/Navbar";
import { supabase } from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MainLayout({ children }) {
  const [price, setPrice] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);

  // dohvat zadnje cijene
  const fetchLatest = async () => {
    const { data, error } = await supabase
      .from("metal_prices")
      .select("fetched_at, gold_g, silver_g")
      .order("fetched_at", { ascending: false })
      .limit(1);

    if (!error && data.length > 0) {
      setPrice(data[0]);
    }
  };

  // dohvat trenda
  const fetchTrend = async () => {
    const { data, error } = await supabase
      .from("metal_prices")
      .select("fetched_at, gold_g, silver_g")
      .order("fetched_at", { ascending: false })
      .limit(30);

    if (!error && data) {
      const formatted = data
        .map((d) => ({
          date: new Date(d.fetched_at).toLocaleDateString("hr-HR", {
            day: "2-digit",
            month: "2-digit",
          }),
          gold: parseFloat(d.gold_g),
          silver: parseFloat(d.silver_g),
        }))
        .reverse();
      setTrend(formatted);
    }
  };

  // ručno osvježavanje (RPC)
  const manualRefresh = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("fetch_metal_prices");
    if (error) {
      console.error(error);
    } else {
      await fetchLatest();
      await fetchTrend();
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLatest();
    fetchTrend();
  }, []);

  return (
    <div className="app-shell">
      <Navbar />
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-top">
            <h2>ORCA</h2>
            <nav>
              <Link to="/pos">💳 POS</Link>
              <Link to="/dashboard">📊 Dashboard</Link>
              <Link to="/buyback">🔄 Otkup</Link>
              <Link to="/custom-orders">📐 Custom narudžbe</Link>
            </nav>
          </div>

          {/* 📈 Widget za metale */}
          <div className="sidebar-widget">
            <h4>📈 Tržišne cijene</h4>
            {price ? (
              <>
                <p>🟦 Zlato: {price.gold_g.toFixed(2)} €/g</p>
                <p>⚪ Srebro: {price.silver_g.toFixed(2)} €/g</p>
                <small>
                  Ažurirano:{" "}
                  {new Date(price.fetched_at).toLocaleDateString("hr-HR")}{" "}
                  {new Date(price.fetched_at).toLocaleTimeString("hr-HR")}
                </small>
              </>
            ) : (
              <p>⚠️ Nema podataka u bazi</p>
            )}

            <button
              className="refresh-btn"
              onClick={manualRefresh}
              disabled={loading}
            >
              {loading ? "⏳ Dohvaćam..." : "🔄 Osvježi odmah"}
            </button>

            {trend.length > 0 && (
              <div className="trend-chart">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={trend}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v, name) => [
                        v.toFixed(2) + " €/g",
                        name === "gold" ? "Zlato" : "Srebro",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="gold"
                      stroke="#0A6ED1"   // 🔵 plava za zlato
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="silver"
                      stroke="#C0C0C0"   // ⚪ siva za srebro
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="sidebar-bottom">
            <Link to="/admin">⚙️ Admin</Link>
          </div>
        </aside>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
