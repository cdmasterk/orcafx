import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../admin/Admin.css";

export default function WarehouseManager() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ name: "", type: "STORE", address: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    else setWarehouses(data);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!form.name) {
      toast.error("❌ Naziv skladišta je obavezan");
      setLoading(false);
      return;
    }

    let error;
    if (editingId) {
      ({ error } = await supabase.from("warehouses").update(form).eq("id", editingId));
      if (!error) toast.success("✏️ Promjene spremljene");
    } else {
      ({ error } = await supabase.from("warehouses").insert([form]));
      if (!error) toast.success("✅ Novo skladište dodano");
    }

    if (error) toast.error(`Greška: ${error.message}`);

    setForm({ name: "", type: "STORE", address: "" });
    setEditingId(null);
    setLoading(false);
    fetchWarehouses();
  };

  const handleEdit = (wh) => {
    setForm({ name: wh.name, type: wh.type, address: wh.address || "" });
    setEditingId(wh.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigurno želiš obrisati ovo skladište?")) return;
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) toast.error(`Greška: ${error.message}`);
    else toast.info("🗑️ Skladište obrisano");
    fetchWarehouses();
  };

  return (
    <div className="admin-container">
      <h2 className="admin-title">📦 Warehouse Manager</h2>
      <p className="admin-subtitle">Kreiranje, uređivanje i brisanje skladišta</p>

      <form className="stock-filters" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Naziv skladišta"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="CENTRAL">Central</option>
          <option value="STORE">Store</option>
          <option value="PRODUCTION">Production</option>
        </select>
        <input
          type="text"
          placeholder="Adresa (opcionalno)"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {editingId ? "💾 Spremi promjene" : "➕ Dodaj skladište"}
        </button>
      </form>

      <table className="stock-table">
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Tip</th>
            <th>Adresa</th>
            <th>Datum kreiranja</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((wh) => (
            <tr key={wh.id}>
              <td>{wh.name}</td>
              <td>{wh.type}</td>
              <td>{wh.address || "-"}</td>
              <td>{new Date(wh.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => handleEdit(wh)}>✏️</button>{" "}
                <button onClick={() => handleDelete(wh.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
