import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

export default function CurrentPricesTable() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const fetchData = async () => {
    const base = supabase.from("v_product_current_prices");
    const query = q?.trim()
      ? base.select("*").ilike("product_code", `%${q}%`).limit(200)
      : base.select("*").order("created_at", { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) toast.error("❌ Greška kod dohvaćanja cijena"); else setRows(data || []);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="widget-card">
      <h3 className="widget-title">Trenutno važeće cijene</h3>
      <div className="field-row">
        <input placeholder="Pretraga po product_code…" value={q} onChange={(e)=>setQ(e.target.value)} />
        <button className="btn" onClick={fetchData}>🔎 Traži</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Code</th><th>Purity</th><th>g</th><th>Metal</th>
            <th>NC</th><th>VP (bez PDV)</th><th>MP (bez PDV)</th><th>MP s PDV</th><th>Ts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.product_id || r.product_code}>
              <td>{r.product_code || <em>-</em>}</td>
              <td>{r.purity}</td>
              <td>{r.grams}</td>
              <td>{r.metal_type}</td>
              <td>{r.cost_nc?.toFixed(2)}</td>
              <td>{r.price_wholesale?.toFixed(2)}</td>
              <td>{r.price_retail?.toFixed(2)}</td>
              <td><b>{r.price_retail_vat?.toFixed(2)}</b></td>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="9">Nema podataka.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
