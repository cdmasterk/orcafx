import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

export default function TaxRatesManager() {
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({ country_code: "HR", name: "PDV 25%", rate: 0.25, valid_from: "" });

  const fetchRates = async () => {
    const { data, error } = await supabase.from("tax_rates").select("*").order("valid_from", { ascending: false }).limit(50);
    if (error) toast.error("❌ Greška kod dohvaćanja PDV stopa"); else setRates(data || []);
  };
  useEffect(() => { fetchRates(); }, []);

  const addRate = async () => {
    if (!form.name || form.rate == null) return toast.warn("Unesi naziv i stopu");
    const payload = {
      country_code: form.country_code || "HR",
      name: form.name,
      rate: Number(form.rate),
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : undefined,
      is_active: true,
    };
    const { error } = await supabase.from("tax_rates").insert([payload]);
    if (error) toast.error("❌ Neuspjelo spremanje PDV-a");
    else { toast.success("✅ Dodano"); setForm({ ...form, name: "", rate: 0, valid_from: "" }); fetchRates(); }
  };

  const deactivate = async (id) => {
    const { error } = await supabase.from("tax_rates")
      .update({ is_active: false, valid_to: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("❌ Neuspjelo deaktiviranje"); else { toast.success("✅ Deaktivirano"); fetchRates(); }
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">PDV stope</h3>
      <div className="field-row">
        <input placeholder="Zemlja (HR)" value={form.country_code} onChange={(e)=>setForm({...form, country_code:e.target.value})}/>
        <input placeholder="Naziv (npr. PDV 25%)" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})}/>
      </div>
      <div className="field-row">
        <input type="number" step="0.001" placeholder="Stopa (0.25)" value={form.rate} onChange={(e)=>setForm({...form, rate:e.target.value})}/>
        <input type="date" value={form.valid_from} onChange={(e)=>setForm({...form, valid_from:e.target.value})}/>
      </div>
      <button className="btn primary" onClick={addRate}>💾 Dodaj stopu</button>

      <table className="table" style={{marginTop:12}}>
        <thead><tr><th>Naziv</th><th>Zemlja</th><th>Stopa</th><th>Status</th><th>Od</th><th>Do</th><th></th></tr></thead>
        <tbody>
          {rates.map(r=>(
            <tr key={r.id}>
              <td>{r.name}</td><td>{r.country_code}</td><td>{Number(r.rate).toFixed(3)}</td>
              <td>{r.is_active ? <span className="badge">AKTIVNO</span> : "neaktivno"}</td>
              <td>{r.valid_from ? new Date(r.valid_from).toLocaleString() : "-"}</td>
              <td>{r.valid_to ? new Date(r.valid_to).toLocaleString() : "-"}</td>
              <td>{r.is_active && <button className="btn danger" onClick={()=>deactivate(r.id)}>Deaktiviraj</button>}</td>
            </tr>
          ))}
          {!rates.length && <tr><td colSpan="7">Nema zapisa.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
