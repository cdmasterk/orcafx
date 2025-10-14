import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "../finance/FinanceHubWidgets.css"; // koristi postojeći stil

const shortId = (id) => (id ? `${id.slice(0, 8)}…` : "");

export default function BOMManager() {
  const [hasTable, setHasTable] = useState(true);
  const [loading, setLoading] = useState(false);

  // pretraga proizvoda
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // odabrani proizvod
  const [product, setProduct] = useState(null);

  // stavke BOM-a
  const [rows, setRows] = useState([]);

  // nova stavka
  const [draft, setDraft] = useState({
    component_type: "diamond",
    quality: "",
    qty: "1",
    unit: "pcs",
    is_active: true,
  });

  // detektiraj postoji li tablica
  const probe = async () => {
    try {
      const { error } = await supabase.from("product_components").select("id").limit(1);
      if (error) throw error;
      setHasTable(true);
    } catch {
      setHasTable(false);
    }
  };

  useEffect(() => {
    probe();
  }, []);

  // live search products by code (ili name ako postoji)
  useEffect(() => {
    const t = setTimeout(async () => {
      const s = q.trim();
      if (s.length < 2) {
        setResults([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, code, brand, metal, purity, grams, collection_id, category_id")
          .or(`code.ilike.%${s}%,brand.ilike.%${s}%`)
          .order("code")
          .limit(20);
        if (error) throw error;
        setResults(data || []);
        setShowResults(true);
      } catch (e) {
        console.warn("Product search error:", e?.message || e);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // zatvori dropdown klikom vani
  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target) &&
        searchRef.current &&
        !searchRef.current.contains(e.target)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pickProduct = async (p) => {
    setProduct(p);
    setQ(p.code || "");
    setShowResults(false);
    await loadBOM(p.id);
  };

  const loadBOM = async (product_id) => {
    if (!hasTable || !product_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_components")
        .select("id, component_type, quality, qty, unit, is_active, valid_from, created_at")
        .eq("product_id", product_id)
        .order("valid_from", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast.error(`❌ Ne mogu dohvatiti BOM: ${e?.message || e}`);
      setRows([]);
    }
    setLoading(false);
  };

  const addRow = async () => {
    if (!product?.id) return toast.warn("Prvo odaberi proizvod");
    const payload = {
      product_id: product.id,
      component_type: draft.component_type,
      quality: draft.quality || null,
      qty: Number(draft.qty || 1),
      unit: draft.unit || "pcs",
      is_active: !!draft.is_active,
      valid_from: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from("product_components").insert([payload]);
      if (error) throw error;
      toast.success("✅ Dodano");
      setDraft({ component_type: "diamond", quality: "", qty: "1", unit: "pcs", is_active: true });
      loadBOM(product.id);
    } catch (e) {
      toast.error(`❌ Spremanje nije uspjelo: ${e?.message || e}`);
    }
  };

  const saveCell = async (id, field, value) => {
    try {
      const patch = { [field]: value };
      if (field === "qty") patch.qty = Number(value || 1);
      if (field === "is_active") patch.is_active = !!value;
      const { error } = await supabase.from("product_components").update(patch).eq("id", id);
      if (error) throw error;
      toast.success("💾 Spremljeno");
      setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    } catch (e) {
      toast.error(`❌ Greška spremanja: ${e?.message || e}`);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Obrisati komponentu iz BOM-a?")) return;
    try {
      const { error } = await supabase.from("product_components").delete().eq("id", id);
      if (error) throw error;
      toast.success("🗑️ Obrisano");
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(`❌ Brisanje nije uspjelo: ${e?.message || e}`);
    }
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">BOM (Bill of Materials) – Receptura</h3>

      {!hasTable && (
        <div className="notice" style={{ marginBottom: 10 }}>
          <b>ℹ️ BOM trenutno nije aktivan.</b> Tablica <code>product_components</code> ne postoji.
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Ako želiš uvesti recepture sada, zalijepi jednokratno SQL migraciju u Supabase (mogu ti je opet poslati), pa osvježi stranicu.
          </div>
        </div>
      )}

      {/* Product picker */}
      <div className="field-row" style={{ position: "relative" }}>
        <label>Product code</label>
        <input
          ref={searchRef}
          placeholder="upiši 2+ znaka (code/brand)…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(results.length > 0)}
        />
        <button className="btn" onClick={() => setShowResults((s) => !s)}>🔎</button>

        {showResults && results.length > 0 && (
          <div
            ref={resultsRef}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #dfe3e8",
              borderRadius: 10,
              zIndex: 50,
              maxHeight: 260,
              overflowY: "auto",
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
            }}
          >
            {results.map((p) => (
              <div
                key={p.id}
                onClick={() => pickProduct(p)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f2f4f7",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <b>{p.code}</b>
                  <span style={{ opacity: 0.7 }}>{p.brand || ""}</span>
                </div>
                <div style={{ opacity: 0.6, display: "flex", gap: 8 }}>
                  <span>{p.metal || "-"}</span>
                  <span>{p.purity || "-"}</span>
                  <span>{p.grams ? `${p.grams}g` : "-"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header o odabranom proizvodu */}
      {product && (
        <div className="field-row" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Odabrano:</span>
            <code>{product.code}</code>
            <span style={{ opacity: 0.7 }}>({shortId(product.id)})</span>
          </div>
          <button className="btn" onClick={() => loadBOM(product.id)} disabled={loading}>
            {loading ? "Učitavam…" : "↻ Osvježi BOM"}
          </button>
        </div>
      )}

      {/* Dodavanje nove stavke */}
      <div className="field-row" style={{ marginTop: 8 }}>
        <label>Tip</label>
        <select
          value={draft.component_type}
          onChange={(e) => setDraft((d) => ({ ...d, component_type: e.target.value }))}
        >
          <option value="diamond">diamond</option>
          <option value="pearl">pearl</option>
          <option value="coral">coral</option>
          <option value="other">other</option>
        </select>

        <label>Kvaliteta/Opis</label>
        <input
          placeholder="npr. VVS-G / AA / Sardegna…"
          value={draft.quality}
          onChange={(e) => setDraft((d) => ({ ...d, quality: e.target.value }))}
        />

        <label>Qty</label>
        <input
          type="number"
          step="0.001"
          value={draft.qty}
          onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))}
        />

        <label>Unit</label>
        <input
          placeholder="pcs/ct/g"
          value={draft.unit}
          onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
          style={{ width: 90 }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
          />
          Active
        </label>

        <button className="btn primary" onClick={addRow} disabled={!product?.id || !hasTable}>
          ➕ Dodaj
        </button>
      </div>

      {/* Tabela stavki */}
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Tip</th>
            <th>Kvaliteta</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Active</th>
            <th>Valid from</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r) => (
            <tr key={r.id}>
              <td>
                <select
                  value={r.component_type}
                  onChange={(e) => saveCell(r.id, "component_type", e.target.value)}
                >
                  <option value="diamond">diamond</option>
                  <option value="pearl">pearl</option>
                  <option value="coral">coral</option>
                  <option value="other">other</option>
                </select>
              </td>
              <td>
                <input
                  value={r.quality || ""}
                  onChange={(e) => saveCell(r.id, "quality", e.target.value)}
                />
              </td>
              <td style={{ width: 110 }}>
                <input
                  type="number"
                  step="0.001"
                  value={r.qty ?? ""}
                  onChange={(e) => saveCell(r.id, "qty", e.target.value)}
                />
              </td>
              <td style={{ width: 110 }}>
                <input
                  value={r.unit || ""}
                  onChange={(e) => saveCell(r.id, "unit", e.target.value)}
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={!!r.is_active}
                  onChange={(e) => saveCell(r.id, "is_active", e.target.checked)}
                />
              </td>
              <td>{r.valid_from ? new Date(r.valid_from).toLocaleString() : "-"}</td>
              <td>
                <button className="btn danger" onClick={() => removeRow(r.id)}>🗑️</button>
              </td>
            </tr>
          ))}
          {!rows?.length && (
            <tr>
              <td colSpan="7">{product ? (loading ? "Učitavam…" : "Nema stavki za ovaj proizvod.") : "Odaberi proizvod."}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
