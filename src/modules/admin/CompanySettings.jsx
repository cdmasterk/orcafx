import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

const empty = {
  legal_name: "", address_line: "", city: "", country: "",
  tax_id: "", iban: "", phone: "", email: "", logo_url: ""
};

export default function CompanySettings() {
  const [row, setRow] = useState(empty);
  const [id, setId] = useState(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("company_info").select("*").limit(1).single();
    if (!error && data) { setRow(data); setId(data.id); }
  };

  useEffect(()=>{ load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    if (id) {
      const { error } = await supabase
        .from("company_info")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) setMsg("❌ " + error.message); else setMsg("✅ Updated");
    } else {
      const { data, error } = await supabase.from("company_info").insert([{ ...row }]).select();
      if (error) setMsg("❌ " + error.message);
      else { setMsg("✅ Created"); setId(data[0].id); }
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">🏢 Company Settings</h1>
      <form onSubmit={save} className="bg-white border rounded p-4 space-y-3">
        {[
          ["legal_name","Legal name"],["address_line","Address"],["city","City"],["country","Country"],
          ["tax_id","Tax ID / OIB"],["iban","IBAN"],["phone","Phone"],["email","Email"],["logo_url","Logo URL"]
        ].map(([k,label])=>(
          <div key={k}>
            <label className="block text-sm mb-1">{label}</label>
            <input className="border rounded p-2 w-full" value={row[k]||""} onChange={e=>setRow({...row,[k]:e.target.value})}/>
          </div>
        ))}
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>
    </div>
  );
}
