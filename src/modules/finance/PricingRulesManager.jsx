import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

const shortId = (id) => (id ? `${id.slice(0, 8)}…` : "");
const copy = async (txt) => {
  try { await navigator.clipboard.writeText(txt); toast.info("📋 Copied"); } catch {}
};

export default function PricingRulesManager() {
  const [rules, setRules] = useState([]);

  // dropdown izvori
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [catsReady, setCatsReady] = useState(false);
  const [colsReady, setColsReady] = useState(false);

  const [form, setForm] = useState({
    rule_name: "DEFAULT",
    category_id: "",      // UUID ili prazno
    purity: "",           // 14k / 18k / 925 ...
    brand: "",
    collection_id: "",    // FK (UUID)
    collection: "",       // legacy string (opcionalno, radi kompatibilnosti)
    margin_wholesale: 0.30,
    margin_retail: 1.80,
    stone_markup: 0.00,
    labor_markup: 0.00,
    priority: 100
  });

  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from("pricing_rules")
      .select("*")
      .order("priority", { ascending: true })
      .limit(200);
    if (error) toast.error(`❌ Greška kod dohvaćanja pravila: ${error.message}`);
    else setRules(data || []);
  };

  const fetchCatsCols = async () => {
    // Kategorije
    try {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      setCategories(data || []);
      setCatsReady(true);
    } catch (e) {
      console.warn("Categories not available:", e?.message || e);
      setCategories([]);
      setCatsReady(false);
    }
    // Kolekcije
    try {
      const { data, error } = await supabase.from("collections").select("id, name").order("name");
      if (error) throw error;
      setCollections(data || []);
      setColsReady(true);
    } catch (e) {
      console.warn("Collections not available:", e?.message || e);
      setCollections([]);
      setColsReady(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchCatsCols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRule = async () => {
    const payload = {
      rule_name: form.rule_name?.trim() || "RULE",
      category_id: form.category_id || null,
      purity: form.purity?.trim() || null,
      brand: form.brand?.trim() || null,
      // collection (legacy string) ostaje zbog kompatibilnosti – nije obavezno
      collection: form.collection?.trim() || null,
      // primarno koristimo collection_id (FK)
      collection_id: form.collection_id || null,
      margin_wholesale: Number(form.margin_wholesale || 0),
      margin_retail: Number(form.margin_retail || 0),
      stone_markup: Number(form.stone_markup || 0),
      labor_markup: Number(form.labor_markup || 0),
      priority: Number(form.priority || 100),
      is_active: true,
    };

    const { error } = await supabase.from("pricing_rules").insert([payload]);
    if (error) {
      toast.error(`❌ Neuspjelo spremanje pravila: ${error.message}`);
    } else {
      toast.success("✅ Dodano pravilo");
      fetchRules();
    }
  };

  const deactivate = async (id) => {
    const { error } = await supabase
      .from("pricing_rules")
      .update({ is_active: false, valid_to: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(`❌ Neuspjelo deaktiviranje: ${error.message}`);
    else { toast.success("✅ Deaktivirano"); fetchRules(); }
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">Pravila marži</h3>

      <div className="field-row">
        <label>Naziv pravila</label>
        <input
          value={form.rule_name}
          onChange={(e)=>setF("rule_name", e.target.value)}
          placeholder="DEFAULT ili npr. 'Rings – Classic'"
        />

        <label>Purity</label>
        <input
          value={form.purity}
          onChange={(e)=>setF("purity", e.target.value)}
          placeholder="14k / 18k / 925 (opc.)"
        />
      </div>

      {/* Kategorija + Kolekcija */}
      <div className="field-row">
        {/* Kategorija (UUID) */}
        <div style={{display:"grid", gap:6}}>
          <label>Kategorija</label>
          {catsReady && categories.length > 0 ? (
            <>
              <select
                value={form.category_id}
                onChange={(e)=>setF("category_id", e.target.value)}
              >
                <option value="">— (opc.) —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id} title={c.id}>
                    {c.name} — {shortId(c.id)}
                  </option>
                ))}
              </select>
              {form.category_id && (
                <small style={{opacity:.75}}>
                  ID: <code>{form.category_id}</code>{" "}
                  <button className="btn" onClick={()=>copy(form.category_id)}>📋 copy</button>
                </small>
              )}
            </>
          ) : (
            <input
              value={form.category_id}
              onChange={(e)=>setF("category_id", e.target.value)}
              placeholder="category_id (UUID, opc.)"
            />
          )}
          <small style={{opacity:.75}}>Pravilo se primjenjuje na sve proizvode u ovoj kategoriji.</small>
        </div>

        {/* Kolekcija (FK ID) + legacy name auto */}
        <div style={{display:"grid", gap:6}}>
          <label>Kolekcija</label>
          {colsReady && collections.length > 0 ? (
            <>
              <select
                value={form.collection_id}
                onChange={(e)=>{
                  const id = e.target.value;
                  setF("collection_id", id);
                  const col = collections.find(x=>x.id===id);
                  // legacy string – popunimo naziv (nije obavezno, ali pomaže u kompatibilnosti)
                  setF("collection", col?.name || "");
                }}
              >
                <option value="">— (opc.) —</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id} title={c.id}>
                    {c.name} — {shortId(c.id)}
                  </option>
                ))}
              </select>
              {form.collection_id && (
                <small style={{opacity:.75}}>
                  ID: <code>{form.collection_id}</code>{" "}
                  <button className="btn" onClick={()=>copy(form.collection_id)}>📋 copy</button>
                </small>
              )}
            </>
          ) : (
            <>
              <input
                value={form.collection}
                onChange={(e)=>setF("collection", e.target.value)}
                placeholder="naziv kolekcije (opc.)"
              />
              <input
                value={form.collection_id}
                onChange={(e)=>setF("collection_id", e.target.value)}
                placeholder="collection_id (UUID, opc.)"
              />
            </>
          )}
          <small style={{opacity:.75}}>Primarno se koristi <b>collection_id</b>; naziv je samo za kompatibilnost.</small>
        </div>
      </div>

      <div className="field-row">
        <label>Brand</label>
        <input
          value={form.brand}
          onChange={(e)=>setF("brand", e.target.value)}
          placeholder="npr. Atelier (opc.)"
        />

        <label>Priority</label>
        <input
          type="number"
          step="1"
          value={form.priority}
          onChange={(e)=>setF("priority", e.target.value)}
          placeholder="niži = jači (default 100)"
        />
      </div>

      <div className="field-row">
        <label>Marža VP</label>
        <input
          type="number"
          step="0.01"
          value={form.margin_wholesale}
          onChange={(e)=>setF("margin_wholesale", e.target.value)}
          placeholder="0.30"
        />

        <label>Marža MP</label>
        <input
          type="number"
          step="0.01"
          value={form.margin_retail}
          onChange={(e)=>setF("margin_retail", e.target.value)}
          placeholder="1.80"
        />
      </div>

      <div className="field-row">
        <label>Markup – stone</label>
        <input
          type="number"
          step="0.01"
          value={form.stone_markup}
          onChange={(e)=>setF("stone_markup", e.target.value)}
          placeholder="0.00"
        />

        <label>Markup – labor</label>
        <input
          type="number"
          step="0.01"
          value={form.labor_markup}
          onChange={(e)=>setF("labor_markup", e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <button className="btn primary" onClick={addRule}>💾 Dodaj pravilo</button>
      </div>

      {/* Lista pravila */}
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Spec (cat/collection/brand/purity)</th>
            <th>Marže</th>
            <th>Priority</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(rules || []).map(r => (
            <tr key={r.id}>
              <td>{r.rule_name}</td>
              <td>
                <div style={{display:"flex", flexDirection:"column", gap:2}}>
                  <span>Category: <code>{r.category_id || "-"}</code></span>
                  <span>Collection_id: <code>{r.collection_id || "-"}</code></span>
                  <span>Collection (name): <code>{r.collection || "-"}</code></span>
                  <span>Brand: <code>{r.brand || "-"}</code></span>
                  <span>Purity: <code>{r.purity || "-"}</code></span>
                </div>
              </td>
              <td>
                VP: <b>{Number(r.margin_wholesale).toFixed(2)}</b> •{" "}
                MP: <b>{Number(r.margin_retail).toFixed(2)}</b><br/>
                Stone: {Number(r.stone_markup||0).toFixed(2)} • Labor: {Number(r.labor_markup||0).toFixed(2)}
              </td>
              <td>{r.priority}</td>
              <td>
                {r.is_active ? (
                  <button className="btn danger" onClick={()=>deactivate(r.id)}>Deaktiviraj</button>
                ) : (
                  <span className="badge">inactive</span>
                )}
              </td>
            </tr>
          ))}
          {!rules?.length && (
            <tr><td colSpan="5">Nema pravila. Dodaj barem <b>DEFAULT</b> pravilo.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
