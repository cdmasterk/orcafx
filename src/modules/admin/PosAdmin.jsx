import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

export default function PosAdmin() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("pos_terminals")
      .select("*, stores!fk_pos_store(name)")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    const { error } = await supabase.from("pos_terminals").update({ status }).eq("id", id);
    if (error) alert(error.message); else load();
  };

  const filtered = rows.filter(r =>
    (r.name || "").toLowerCase().includes(filter.toLowerCase()) ||
    ((r.stores?.name || "")).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">🖥️ POS Admin</h1>
      <input
        className="border rounded p-2 mb-3 w-full"
        placeholder="Search by POS or Store..."
        value={filter}
        onChange={(e)=>setFilter(e.target.value)}
      />

      <div className="bg-white border rounded">
        <div className="grid grid-cols-4 font-medium border-b p-3">
          <div>POS</div><div>Store</div><div>Status</div><div>Actions</div>
        </div>
        {filtered.map((r)=>(
          <div key={r.id} className="grid grid-cols-4 p-3 border-b">
            <div>{r.name}</div>
            <div>{r.stores?.name || "-"}</div>
            <div>{r.status}</div>
            <div className="space-x-2">
              <button className="px-2 py-1 border rounded" onClick={()=>setStatus(r.id, r.status === "active" ? "inactive" : "active")}>
                {r.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <Link className="underline" to={`/admin/fiscal/${r.id}`}>Fiscal settings</Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-3">No POS found.</div>}
      </div>
    </div>
  );
}
