import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";

export default function WarehouseForm() {
  const [form, setForm] = useState({ name: "", type: "store", location: "", active: true });

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from("warehouses").insert([form]);
    if (error) toast.error("❌ Greška pri kreiranju skladišta");
    else {
      toast.success("✅ Skladište kreirano");
      setForm({ name: "", type: "store", location: "", active: true });
    }
  }

  return (
    <div className="warehouse-section">
      <h3>➕ Novo skladište</h3>
      <form onSubmit={handleSubmit} className="warehouse-form">
        <input placeholder="Naziv skladišta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="store">Poslovnica</option>
          <option value="central">Centralno</option>
          <option value="production">Proizvodnja</option>
        </select>
        <input placeholder="Lokacija" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}/>
        <button className="save-button">💾 Spremi</button>
      </form>
    </div>
  );
}
