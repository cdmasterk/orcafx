import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function LookupSelect({
  label,
  source,             // 'products' | 'categories' | 'collections'
  display = (r)=>r.name || r.code || r.id,
  valueKey = "id",
  value,
  onChange,
  placeholder = "Search…",
  hint
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async (term="") => {
    setLoading(true);
    let query = supabase.from(source).select("*").limit(25);
    if (term) {
      if (source === "products") query = query.or(`code.ilike.%${term}%,name.ilike.%${term}%`);
      if (source === "categories" || source === "collections") query = query.ilike("name", `%${term}%`);
    }
    const { data, error } = await query;
    setLoading(false);
    if (!error) setRows(data || []);
  };

  useEffect(()=>{ fetchRows(""); },[]);

  return (
    <div style={{display:"grid", gap:6}}>
      {label && <label style={{fontWeight:600}}>{label}</label>}
      <div style={{display:"flex", gap:6}}>
        <input
          value={q}
          placeholder={placeholder}
          onChange={e=>setQ(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter') fetchRows(q); }}
          style={{flex:1, padding:"10px", border:"1px solid #dfe3e8", borderRadius:10}}
        />
        <button className="btn" onClick={()=>fetchRows(q)} disabled={loading}>{loading?"…":"🔎"}</button>
      </div>
      <select
        value={value || ""}
        onChange={(e)=>onChange(e.target.value)}
        style={{padding:"10px", border:"1px solid #dfe3e8", borderRadius:10}}
      >
        <option value="">{`— Odaberi iz "${source}" —`}</option>
        {rows.map(r=>(
          <option key={r[valueKey]} value={r[valueKey]}>
            {display(r)}
          </option>
        ))}
      </select>
      {value && <small style={{opacity:.75}}>Odabrano ID: <code>{value}</code></small>}
      {hint && <small style={{opacity:.65}}>{hint}</small>}
    </div>
  );
}
