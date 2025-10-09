import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./Admin.css";

export default function ProductCodeRulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    category_code: "",
    category_name: "",
    price_tier: "",
    seq_length: 6,
    active: true,
  });

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_code_rules")
      .select("*")
      .order("category_code", { ascending: true })
      .order("price_tier", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Greška pri dohvaćanju pravila.");
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      category_code: "",
      category_name: "",
      price_tier: "",
      seq_length: 6,
      active: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_code || !form.category_name || !form.price_tier) {
      toast.warn("Popuni kategoriju, naziv i cjenovni razred.");
      return;
    }

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("product_code_rules")
        .update({
          category_code: form.category_code.trim(),
          category_name: form.category_name.trim(),
          price_tier: form.price_tier.trim(),
          seq_length: Number(form.seq_length) || 6,
          active: !!form.active,
        })
        .eq("id", editingId));
      if (!error) toast.success("✏️ Pravilo ažurirano.");
    } else {
      ({ error } = await supabase.from("product_code_rules").insert([
        {
          category_code: form.category_code.trim(),
          category_name: form.category_name.trim(),
          price_tier: form.price_tier.trim(),
          seq_length: Number(form.seq_length) || 6,
          active: !!form.active,
        },
      ]));
      if (!error) toast.success("✅ Pravilo dodano.");
    }

    if (error) toast.error(error.message);
    resetForm();
    fetchRules();
  };

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      category_code: rule.category_code,
      category_name: rule.category_name,
      price_tier: rule.price_tier,
      seq_length: rule.seq_length ?? 6,
      active: !!rule.active,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigurno obrisati ovo pravilo?")) return;
    const { error } = await supabase.from("product_code_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.info("🗑️ Pravilo obrisano.");
    fetchRules();
  };

  const handleToggleActive = async (rule) => {
    const { error } = await supabase
      .from("product_code_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    if (error) toast.error(error.message);
    else toast.success(!rule.active ? "✅ Aktivirano" : "⏸️ Deaktivirano");
    fetchRules();
  };

  const handleResetCounter = async (rule) => {
    let val = prompt(
      `Postavi novi početni redni broj za ${rule.category_code}${rule.price_tier} (trenutno: ${rule.current_seq})`,
      "0"
    );
    if (val === null) return;
    const next = Number(val);
    if (Number.isNaN(next) || next < 0) {
      toast.warn("Unesi ispravan broj (>= 0).");
      return;
    }
    const { error } = await supabase
      .from("product_code_rules")
      .update({ current_seq: next })
      .eq("id", rule.id);
    if (error) toast.error(error.message);
    else toast.success(`🔄 Brojač postavljen na ${next}.`);
    fetchRules();
  };

  const nextCodePreview = (r) => {
    const prefix = (r.category_code || "") + (r.price_tier || "");
    const seqLength = r.seq_length ?? 6;
    const next = String((r.current_seq ?? 0) + 1).padStart(seqLength, "0");
    return `${prefix}${next}`;
  };

  return (
    <div className="admin-container">
      <h2 className="admin-title">🧩 Product Code Rules Manager</h2>
      <p className="admin-subtitle">Upravljanje kategorijama, cjenovnim razredima i brojačima šifri</p>

      {/* Forma */}
      <form className="stock-filters" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          placeholder="Kategorija (npr. A)"
          value={form.category_code}
          onChange={(e) => setForm({ ...form, category_code: e.target.value.toUpperCase().slice(0, 1) })}
        />
        <input
          placeholder="Naziv kategorije (npr. Privjesak)"
          value={form.category_name}
          onChange={(e) => setForm({ ...form, category_name: e.target.value })}
        />
        <input
          placeholder="Cjenovni razred (npr. A)"
          value={form.price_tier}
          onChange={(e) => setForm({ ...form, price_tier: e.target.value.toUpperCase().slice(0, 1) })}
        />
        <input
          type="number"
          min={1}
          max={12}
          placeholder="Duljina broja (default 6)"
          value={form.seq_length}
          onChange={(e) => setForm({ ...form, seq_length: e.target.value })}
          style={{ width: 160 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Aktivno
        </label>
        <button type="submit" className="btn-primary">
          {editingId ? "💾 Spremi uređivanje" : "➕ Dodaj pravilo"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm}>
            ❎ Odustani
          </button>
        )}
      </form>

      {/* Tablica */}
      {loading ? (
        <p>Učitavanje...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Kategorija</th>
                <th>Naziv</th>
                <th>Cjen. razred</th>
                <th>Prefix</th>
                <th>Seq len</th>
                <th>Tren. br.</th>
                <th>Next code</th>
                <th>Aktivno</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.category_code}</td>
                  <td>{r.category_name}</td>
                  <td>{r.price_tier}</td>
                  <td>{(r.category_code || "") + (r.price_tier || "")}</td>
                  <td>{r.seq_length ?? 6}</td>
                  <td>{r.current_seq ?? 0}</td>
                  <td>{nextCodePreview(r)}</td>
                  <td>{r.active ? "✅" : "⏸️"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button onClick={() => handleEdit(r)}>✏️</button>{" "}
                    <button onClick={() => handleResetCounter(r)}>🔄 Reset</button>{" "}
                    <button onClick={() => handleToggleActive(r)}>{r.active ? "⏸️ Deaktiviraj" : "▶️ Aktiviraj"}</button>{" "}
                    <button onClick={() => handleDelete(r.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "#666" }}>
                    Nema definiranih pravila. Dodaj prvo barem jedno pravilo iznad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
