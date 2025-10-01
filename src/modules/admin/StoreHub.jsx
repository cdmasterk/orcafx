import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function StoreHub() {
  const [stores, setStores] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "", tax_id: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const loadStores = async () => {
    // one-to-many nested fetch zahvaljujući FK-ovima
    const { data, error } = await supabase
      .from("stores")
      .select("*, warehouses(*), pos_terminals(*)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setStores(data || []);
  };

  useEffect(() => { loadStores(); }, []);

  const createStore = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const { data, error } = await supabase.from("stores").insert([form]).select();
    setLoading(false);
    if (error) { setMsg("❌ " + error.message); return; }
    setMsg("✅ Store created: " + data[0].name);
    setForm({ name: "", address: "", city: "", country: "", tax_id: "" });
    await loadStores(); // trigger je kreirao warehouse + POS
  };

  const addWarehouse = async (storeId) => {
    const name = prompt("Warehouse name:");
    if (!name) return;
    const { error } = await supabase.from("warehouses").insert([{ store_id: storeId, name }]);
    if (error) alert(error.message); else loadStores();
  };

  const addPos = async (storeId) => {
    const name = prompt("POS name:");
    if (!name) return;
    const { error } = await supabase.from("pos_terminals").insert([{ store_id: storeId, name }]);
    if (error) alert(error.message); else loadStores();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">🏬 Store Hub</h1>

      <form onSubmit={createStore} className="bg-white border rounded p-4 mb-6 space-y-2">
        <div className="font-medium">Create new store</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="Address" value={form.address} onChange={e=>setForm({...form, address:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="City" value={form.city} onChange={e=>setForm({...form, city:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="Country" value={form.country} onChange={e=>setForm({...form, country:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="Tax ID / OIB" value={form.tax_id} onChange={e=>setForm({...form, tax_id:e.target.value})}/>
        </div>
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Saving..." : "Save Store"}
        </button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>

      <div className="space-y-3">
        {stores.map((s) => (
          <div key={s.id} className="bg-white border rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm opacity-80">
                  {s.address} {s.city && `• ${s.city}`} {s.country && `• ${s.country}`}
                </div>
              </div>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => setExpanded((ex) => ({ ...ex, [s.id]: !ex[s.id] }))}
              >
                {expanded[s.id] ? "Hide" : "Details"}
              </button>
            </div>

            {expanded[s.id] && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Warehouses</div>
                    <button className="text-sm px-2 py-1 border rounded" onClick={() => addWarehouse(s.id)}>+ Add</button>
                  </div>
                  <ul className="space-y-1">
                    {(s.warehouses || []).map(w => (
                      <li key={w.id} className="border rounded p-2">
                        {w.name} <span className="text-xs opacity-70">({w.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">POS Terminals</div>
                    <button className="text-sm px-2 py-1 border rounded" onClick={() => addPos(s.id)}>+ Add</button>
                  </div>
                  <ul className="space-y-1">
                    {(s.pos_terminals || []).map(p => (
                      <li key={p.id} className="border rounded p-2 flex items-center justify-between">
                        <div>
                          {p.name} <span className="text-xs opacity-70">• {p.status}</span>
                        </div>
                        <a className="text-sm underline" href={`/admin/fiscal/${p.id}`}>Fiscal settings →</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
        {stores.length === 0 && <div className="opacity-70">No stores yet.</div>}
      </div>
    </div>
  );
}
