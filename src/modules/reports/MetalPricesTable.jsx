import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./MetalPricesTable.css";

export default function MetalPricesTable() {
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchData = async (opts = {}) => {
    const take = opts.limit ?? limit;
    setLoading(true);

    const { data, error } = await supabase
      .from("metal_prices_view")
      .select(
        "fetched_at, gold_g, silver_g, gold_8k, gold_14k, gold_18k, gold_22k, gold_24k, silver_925, silver_999"
      )
      .order("fetched_at", { ascending: false })
      .limit(take);

    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja cijena metala.");
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData({ limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL.replace(
          ".supabase.co",
          ".functions.supabase.co"
        )}/fetch_metal_prices`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      // log cijelog response-a za debug
      console.log("🔎 Edge Function status:", res.status, res.statusText);

      let data = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        console.warn("⚠️ Response nije validan JSON:", parseErr);
      }
      console.log("🔎 Edge Function response body:", data);

      if (!res.ok) {
        throw new Error(data?.error || `Edge Function error (${res.status})`);
      }

      // uvijek osvježi tablicu
      await fetchData({ limit });

      // uvijek success toast kad status === 200
      toast.success("Cijene uspješno osvježene.");
    } catch (err) {
      console.error("❌ Refresh error:", err);
      await fetchData({ limit }); // fallback – povuci zadnje stanje
      toast.error("Greška kod osvježavanja cijena (Edge Function).");
    } finally {
      setLoading(false);
    }
  };

  const fmt2 = (v) => (v == null ? "-" : Number(v).toFixed(2));
  const fmt3 = (v) => (v == null ? "-" : Number(v).toFixed(3));
  const fmtDT = (ts) =>
    new Date(ts).toLocaleString("hr-HR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="metal-table-card">
      <div className="metal-table-header">
        <div>
          <h3>📋 Cijene metala – sve čistoće</h3>
          <p className="subtitle">
            Izvor: metal_prices_view (zadnjih {limit} zapisa)
          </p>
        </div>
        <div className="controls">
          <label>
            Prikaži:
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={1}>posljednji</option>
              <option value={7}>7</option>
              <option value={10}>10</option>
              <option value={14}>14</option>
              <option value={30}>30</option>
            </select>
          </label>
          <button
            className="btn refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "⏳ Osvježavam..." : "🔄 Osvježi odmah"}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="metal-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Au €/g</th>
              <th>Au 8k</th>
              <th>Au 14k</th>
              <th>Au 18k</th>
              <th>Au 22k</th>
              <th>Au 24k</th>
              <th>Ag €/g</th>
              <th>Ag 925</th>
              <th>Ag 999</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan="10" className="empty">
                  Nema podataka u bazi. Pritisni “Osvježi odmah” za ručno
                  dohvaćanje.
                </td>
              </tr>
            )}
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>{fmtDT(r.fetched_at)}</td>
                <td className="num">{fmt2(r.gold_g)}</td>
                <td className="num">{fmt2(r.gold_8k)}</td>
                <td className="num">{fmt2(r.gold_14k)}</td>
                <td className="num">{fmt2(r.gold_18k)}</td>
                <td className="num">{fmt2(r.gold_22k)}</td>
                <td className="num">{fmt2(r.gold_24k)}</td>
                <td className="num">{fmt3(r.silver_g)}</td>
                <td className="num">{fmt3(r.silver_925)}</td>
                <td className="num">{fmt3(r.silver_999)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows?.[0] && (
        <div className="meta-line">
          <span>
            Zadnje ažuriranje: <strong>{fmtDT(rows[0].fetched_at)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
