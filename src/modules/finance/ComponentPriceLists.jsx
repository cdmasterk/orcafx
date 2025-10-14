import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

const TYPES = ["diamond","pearl","coral","other"];
const UNITS = ["ct","g","pcs"];

export default function ComponentPriceLists() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ component_type:"diamond", quality:"", unit:"ct", price_per_unit:"" });

  const load = async () => {
    const { data, error } = await supabase
      .from("component_price_lists")
      .select("*")
      .eq("is_active", true)
      .order("component_type", { ascending:true })
      .order("quality", { ascending:true });
    if (error) return toast.error("❌ Ne mogu dohvatiti cjenike");
    setRows(data || []);
  };
  useEffect(()=>{ load(); },[]);

  const add = async () => {
    if (!form.price_per_unit) return toast.warn("Unesi cijenu");
    const payload = {
      component_type: form.component_type,
      quality: form.quality || null,
      unit: form.unit,
      price_per_unit: Number(form.price_per_unit),
      is_active: true
    };
    const { error } = await supabase.from("component_price_lists").insert([payload]);
    if (error) return toast.error("❌ Spremanje nije uspjelo");
    toast.success("✅ Dodano"); setForm({ ...form, quality:"", price_per_unit:"" }); load();
  };

  const deactivate = async (id) => {
    const { error } = await supabase
      .from("component_price_lists")
      .update({ is_active:false, valid_to: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("❌ Deaktivacija nije uspjela");
    toast.success("✅ Deaktivirano"); load();
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">Cjenici komponenti (dijamant, biser, koralj, ostalo)</h3>

      <div className="field-row">
        <select value={form.component_type} onChange={(e)=>setForm({...form, component_type:e.target.value})}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <input placeholder="Kvaliteta (npr. VVS-G / AA / …)" value={form.quality} onChange={(e)=>setForm({...form, quality:e.target.value})}/>
      </div>
      <div className="field-row">
        <select value={form.unit} onChange={(e)=>setForm({...form, unit:e.target.value})}>
          {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Cijena po jedinici" value={form.price_per_unit} onChange={(e)=>setForm({...form, price_per_unit:e.target.value})}/>
      </div>
      <button className="btn primary" onClick={add}>💾 Dodaj</button>

      <table className="table" style={{marginTop:12}}>
        <thead>
          <tr><th>Vrsta</th><th>Kvaliteta</th><th>Jedinica</th><th>Cijena/Jed</th><th></th></tr>
        </thead>
        <tbody>
          {(rows||[]).map(r=>(
            <tr key={r.id}>
              <td>{r.component_type}</td>
              <td>{r.quality || <em>-</em>}</td>
              <td>{r.unit}</td>
              <td>{Number(r.price_per_unit).toFixed(2)}</td>
              <td><button className="btn danger" onClick={()=>deactivate(r.id)}>Deaktiviraj</button></td>
            </tr>
          ))}
          {!rows?.length && <tr><td colSpan="5">Nema aktivnih cjenika.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
