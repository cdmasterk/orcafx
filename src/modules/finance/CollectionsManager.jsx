import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

export default function CollectionsManager() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [editRowId, setEditRowId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCatId, setEditCatId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: cols }, { data: cats }] = await Promise.all([
        supabase.from("collections").select("id, name, category_id, created_at").order("name", { ascending: true }),
        supabase.from("categories").select("id, name").order("name", { ascending: true })
      ]);
      setRows(cols || []);
      setCategories(cats || []);
    } catch (e) {
      toast.error("❌ Ne mogu dohvatiti kolekcije/kategorije");
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return toast.warn("Unesi naziv kolekcije");
    try {
      const payload = { name: newName.trim(), category_id: newCatId || null };
      const { error } = await supabase.from("collections").insert([payload]);
      if (error) throw error;
      toast.success("✅ Kolekcija dodana");
      setNewName(""); setNewCatId("");
      load();
    } catch (e) {
      if (String(e?.message || "").toLowerCase().includes("duplicate")) {
        toast.error("⚠️ Kolekcija s tim nazivom već postoji");
      } else {
        toast.error("❌ Spremanje nije uspjelo");
      }
      console.error(e);
    }
  };

  const startEdit = (row) => {
    setEditRowId(row.id);
    setEditName(row.name);
    setEditCatId(row.category_id || "");
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return toast.warn("Unesi naziv");
    try {
      const { error } = await supabase
        .from("collections")
        .update({ name: editName.trim(), category_id: editCatId || null })
        .eq("id", id);
      if (error) throw error;
      toast.success("✅ Ažurirano");
      setEditRowId(null); setEditName(""); setEditCatId("");
      load();
    } catch (e) {
      if (String(e?.message || "").toLowerCase().includes("duplicate")) {
        toast.error("⚠️ Kolekcija s tim nazivom već postoji");
      } else {
        toast.error("❌ Ažuriranje nije uspjelo");
      }
      console.error(e);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Obrisati kolekciju? Ako je u uporabi, brisanje može biti blokirano.")) return;
    try {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
      toast.success("🗑️ Obrisano");
      load();
    } catch (e) {
      toast.error("⚠️ Ne može se obrisati jer se kolekcija koristi. Razmotri preimenovanje.");
      console.error(e);
    }
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">Kolekcije</h3>

      {/* Add new */}
      <div className="field-row">
        <input placeholder="Naziv nove kolekcije" value={newName} onChange={(e)=>setNewName(e.target.value)} />
        <select value={newCatId} onChange={(e)=>setNewCatId(e.target.value)}>
          <option value="">— Kategorija (opc.) —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button className="btn primary" onClick={add}>➕ Dodaj</button>

      {/* List */}
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr><th>Naziv</th><th>Kategorija</th><th>ID</th><th>Kreirano</th><th style={{width:220}}></th></tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const catName = categories.find(c=>c.id===row.category_id)?.name || <em>-</em>;
            return (
              <tr key={row.id}>
                <td>
                  {editRowId === row.id
                    ? <input value={editName} onChange={(e)=>setEditName(e.target.value)} />
                    : row.name}
                </td>
                <td>
                  {editRowId === row.id ? (
                    <select value={editCatId} onChange={(e)=>setEditCatId(e.target.value)}>
                      <option value="">— (opc.) —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  ) : catName}
                </td>
                <td><code>{row.id}</code></td>
                <td>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  {editRowId === row.id ? (
                    <>
                      <button className="btn primary" onClick={()=>saveEdit(row.id)}>💾 Spremi</button>
                      <button className="btn" onClick={()=>{ setEditRowId(null); setEditName(""); setEditCatId(""); }}>✖ Odustani</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={()=>startEdit(row)}>✏️ Uredi</button>
                      <button className="btn danger" onClick={()=>remove(row.id)}>🗑️ Obriši</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan="5">{loading ? "Učitavam…" : "Nema kolekcija."}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
