import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./MetalPricesCharts.css";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Sve", days: null },
];

const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("hr-HR", { day: "2-digit", month: "2-digit" });

export default function MetalPricesCharts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState(RANGES[1]); // default 30d

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("metal_prices_view")
      .select("fetched_at, gold_24k, silver_999")
      .order("fetched_at", { ascending: true });
    if (!error && data) setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!rows?.length) return [];
    if (!range?.days) return rows;
    const from = new Date();
    from.setDate(from.getDate() - range.days);
    return rows.filter((r) => new Date(r.fetched_at) >= from);
  }, [rows, range]);

  const chartData = useMemo(
    () =>
      filtered.map((r) => ({
        date: fmtDate(r.fetched_at),
        gold24k: r.gold_24k ?? null,
        silver999: r.silver_999 ?? null,
      })),
    [filtered]
  );

  const lastGold = chartData.at(-1)?.gold24k;
  const prevGold = chartData.at(-2)?.gold24k;
  const lastSilver = chartData.at(-1)?.silver999;
  const prevSilver = chartData.at(-2)?.silver999;

  return (
    <div className="mpc-card light-theme">
      <div className="mpc-header">
        <h3 className="mpc-title">📊 FX Charts — Au 24k / Ag 999</h3>
        <div className="mpc-range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              className={`mpc-chip ${range.label === r.label ? "active" : ""}`}
              onClick={() => setRange(r)}
              disabled={loading}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="mpc-loading">Učitavam podatke…</div>}
      {!loading && chartData.length > 0 && (
        <div className="mpc-grid">
          {/* GOLD */}
          <div className="mpc-chart-card">
            <div className="fx-header">
              <span className="mpc-chart-title">Zlato 24 kt (€/g)</span>
              {lastGold && (
                <span
                  className={`fx-ticker ${
                    lastGold >= prevGold ? "up" : "down"
                  }`}
                >
                  {lastGold.toFixed(2)} €/g {lastGold >= prevGold ? "▲" : "▼"}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #ddd",
                    color: "#111",
                  }}
                  formatter={(v) =>
                    v == null ? "-" : `${Number(v).toFixed(2)} €/g`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="gold24k"
                  stroke={lastGold >= prevGold ? "#16c784" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SILVER */}
          <div className="mpc-chart-card">
            <div className="fx-header">
              <span className="mpc-chart-title">Srebro 999 (€/g)</span>
              {lastSilver && (
                <span
                  className={`fx-ticker ${
                    lastSilver >= prevSilver ? "up" : "down"
                  }`}
                >
                  {lastSilver.toFixed(3)} €/g {lastSilver >= prevSilver ? "▲" : "▼"}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(v) => v.toFixed(3)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #ddd",
                    color: "#111",
                  }}
                  formatter={(v) =>
                    v == null ? "-" : `${Number(v).toFixed(3)} €/g`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="silver999"
                  stroke={lastSilver >= prevSilver ? "#16c784" : "#ef4444"}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
