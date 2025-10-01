import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function FiscalSettings() {
  const { posId } = useParams();
  const [pos, setPos] = useState(null);
  const [row, setRow] = useState({ cert:"", cert_password:"", oib:"", device_label:"", endpoint_url:"" });
  const [id, setId] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const [p, f] = await Promise.all([
      supabase.from("pos_terminals").select("*, stores!fk_pos_store(name)").eq("id", posId).single(),
      supabase.from("fiscal_settings").select("*").eq("pos_id", posId).limit(1).single()
    ]);
    if (!p.error) setPos(p.data);
    if (f.data) { setRow(f.data); setId(f.data.id); }
  };

  useEffect(()=>{ load(); }, [posId]);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    if (id) {
      const { error } = await supabase.from("fiscal_settings").update(row).eq("id", id);
      if (error) setMsg("❌ " + error.message); else setMsg("✅ Updated");
    } else {
      const payload = { ...row, pos_id: posId };
      const { data, error } = await supabase.from("fiscal_settings").insert([payload]).select();
      if (error) setMsg("❌ " + error.message); else { setMsg("✅ Created"); setId(data[0].id); }
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">🧾 Fiscal Settings</h1>
      {pos && (
        <div className="mb-4 p-3 border rounded bg-white">
          <div className="font-medium">POS: {pos.name}</div>
          <div className="text-sm opacity-80">Store: {pos.stores?.name || "-"}</div>
        </div>
      )}
      <form onSubmit={save} className="bg-white border rounded p-4 space-y-3">
        {[
          ["oib","OIB"],["device_label","Device Label"],["endpoint_url","Endpoint URL"],["cert_password","Cert Password"]
        ].map(([k,label])=>(
          <div key={k}>
            <label className="block text-sm mb-1">{label}</label>
            <input className="border rounded p-2 w-full" value={row[k]||""} onChange={e=>setRow({...row,[k]:e.target.value})}/>
          </div>
        ))}
        <div>
          <label className="block text-sm mb-1">Certificate (base64 or path)</label>
          <textarea className="border rounded p-2 w-full h-28" value={row.cert||""} onChange={e=>setRow({...row,cert:e.target.value})}/>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>
    </div>
  );
}
