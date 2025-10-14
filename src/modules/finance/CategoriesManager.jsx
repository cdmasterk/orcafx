import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

export default function CategoriesManager() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasCreatedAt, setHasCreatedAt] = useState(true); // auto-detect kolone

  const [newName, setNewName] = useState("");
  const [editRowId, setEditRowId] = useState(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      // prvo probaj čitati i created_at
      let q = supabase.from("categories").select("id, name, created_at").order("name", { ascending: true });
      let { data, error } = await q;
      if (error) {
        const msg = (error.message || "").toLowerCase();
        // ako kolona ne postoji, fallback na id,name i sakrij stupac
        if (msg.includes("created_at") && msg.includes("does not exist")) {
          setHasCreatedAt(false);
          const resp = await supabase.from("categories").select("id, name").order("name", { ascending: true });
          if (resp.error) throw resp.error;
          data = resp.data || [];
        } else {
          throw error;
        }
      }
      setRows(data || []);
    } catch (e) {
      console.error("Categories load error:", e);
      toast.error(`❌ Ne mogu dohvatiti kategorije: ${e?.message || e}`);
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return toast.warn("Unesi naziv kategorije");
    try {
      const { error } = await supabase.from("categories").insert([{ name: newName.trim() }]);
      if (error) throw error;
      toast.success("✅ Kategorija dodana");
      setNewName("");
      load();
    } catch (e) {
      console.error("Categories add error:", e);
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("duplicate")) toast.error("⚠️ Kategorija već postoji");
      else toast.error(`❌ Spremanje nije uspjelo: ${e?.message || e}`);
    }
  };

  const startEdit = (row) => {
    setEditRowId(row.id);
    setEditName(row.name);
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return toast.warn("Unesi naziv");
    try {
      const { error } = await supabase.from("categories").update({ name: editName.trim() }).eq("id", id);
      if (error) throw error;
      toast.success("✅ Ažurirano");
      setEditRowId(null);
      setEditName("");
      load();
    } catch (e) {
      console.error("Categories update error:", e);
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("duplicate")) toast.error("⚠️ Kategorija već postoji");
      else toast.error(`❌ Ažuriranje nije uspjelo: ${e?.message || e}`);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Obrisati kategoriju? Ako je u uporabi, brisanje može biti blokirano.")) return;
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("🗑️ Obrisano");
      load();
    } catch (e) {
      console.error("Categories delete error:", e);
      toast.error(`⚠️ Ne može se obrisati: ${e?.message || "FK ograničenje"}`);
    }
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">Kategorije</h3>

      <div className="field-row">
        <input
          placeholder="Naziv nove kategorije"
          value={newName}
          onChange={(e)=>setNewName(e.target.value)}
        />
        <button className="btn primary" onClick={add}>➕ Dodaj</button>
      </div>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>ID</th>
            {hasCreatedAt && <th>Kreirano</th>}
            <th style={{width:160}}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>
                {editRowId === row.id ? (
                  <input value={editName} onChange={(e)=>setEditName(e.target.value)} />
                ) : (
                  row.name
                )}
              </td>
              <td><code>{row.id}</code></td>
              {hasCreatedAt && <td>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</td>}
              <td style={{ display: "flex", gap: 6 }}>
                {editRowId === row.id ? (
                  <>
                    <button className="btn primary" onClick={()=>saveEdit(row.id)}>💾 Spremi</button>
                    <button className="btn" onClick={()=>{ setEditRowId(null); setEditName(""); }}>✖ Odustani</button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={()=>startEdit(row)}>✏️ Uredi</button>
                    <button className="btn danger" onClick={()=>remove(row.id)}>🗑️ Obriši</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={hasCreatedAt ? 4 : 3}>{loading ? "Učitavam…" : "Nema kategorija."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
