import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./FinanceHubWidgets.css";

const shortId = (id) => (id ? `${id.slice(0, 8)}…` : "");

/** Normalizira red iz products ili items tablice u zajednički oblik */
const unifyProductRow = (r) => {
  if (!r) return null;
  return {
    id: r.id || null,
    code: r.code || r.sku || r.name || "",
    brand: r.brand || r.maker || r.vendor || "",
    metal: r.metal || r.material || "",
    purity: r.purity || r.fineness || r.grade || "",
    grams: r.grams ?? r.weight_g ?? r.weight ?? null,
    collection_id: r.collection_id || null,
    category_id: r.category_id || r.category || null,
  };
};

export default function PriceSheetCalculator() {
  const [loading, setLoading] = useState(false);

  // dropdown data
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);

  // options
  const [purityOptions, setPurityOptions] = useState(["14k", "18k", "22k", "24k", "999", "925"]);
  const [metalOptions, setMetalOptions] = useState(["gold", "silver"]);
  const defaultQualities = {
    diamond: ["VVS-G", "VS-G", "SI-H"],
    pearl: ["A", "AA", "AAA"],
    coral: ["Sardegna", "Mediterranean"],
    other: ["std"],
  };
  const [qualityOpts, setQualityOpts] = useState({
    diamond: [],
    pearl: [],
    coral: [],
    other: [],
  });

  // product search + results
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // dostupnost items tablice (fallback) i BOM
  const [itemsAvailable, setItemsAvailable] = useState(false);
  const [bomAvailable, setBomAvailable] = useState(false);
  const [useBOM, setUseBOM] = useState(false);

  // forma
  const [form, setForm] = useState({
    // product
    product_id: "",
    product_code: "",
    brand: "",
    // taxonomy
    category_id: "",
    collection_id: "",
    collection: "", // legacy name (compat)
    // metal
    metal: "gold",
    purity: "14k",
    grams: "",
    // costs (manual overrides) – prazno/0 => AUTO iz cjenika; >0 => ručni override
    stone_cost: "",
    pearl_cost: "",
    coral_cost: "",
    other_components_cost: "",
    labor_cost: "",
    // auto cjenici (qty & quality) – ako je quality bez qty => qty=1
    diamond_quality: "",
    diamond_qty: "",
    pearl_quality: "",
    pearl_qty: "",
    coral_quality: "",
    coral_qty: "",
    other_quality: "",
    other_qty: "",
    // tax / rule
    tax_country: "HR",
    rule_id: "",
    notes: "",
  });

  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean).map((x) => String(x).trim())));

  // ----- LOADERS -----
  const loadCats = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch {
      setCategories([]);
    }
  };

  const loadCols = async () => {
    try {
      const { data, error } = await supabase.from("collections").select("id, name, category_id").order("name");
      if (error) throw error;
      setCollections(data || []);
    } catch {
      setCollections([]);
    }
  };

  const probeItems = async () => {
    try {
      const { error } = await supabase.from("items").select("id").limit(1);
      if (error) throw error;
      setItemsAvailable(true);
    } catch {
      setItemsAvailable(false);
    }
  };

  const probeBOM = async () => {
    try {
      const { error } = await supabase.from("product_components").select("id").limit(1);
      if (error) throw error;
      setBomAvailable(true);
    } catch {
      setBomAvailable(false);
      setUseBOM(false);
    }
  };

  const loadPurityOptions = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("purity")
        .not("purity", "is", null)
        .order("purity", { ascending: true })
        .limit(1000);
      if (data?.length) {
        const values = uniq(data.map((d) => d.purity));
        if (values.length) setPurityOptions((prev) => uniq([...values, ...prev]));
      }
    } catch { /* keep defaults */ }
  };

  const loadMetalOptions = async () => {
    const acc = [];
    try {
      const { data } = await supabase
        .from("products")
        .select("metal")
        .not("metal", "is", null)
        .limit(2000);
      if (data?.length) acc.push(...data.map((d) => d.metal));
    } catch {}
    if (itemsAvailable) {
      try {
        const { data } = await supabase.from("items").select("metal, material").limit(2000);
        if (data?.length) {
          for (const r of data) {
            if (r.metal) acc.push(r.metal);
            if (r.material) acc.push(r.material);
          }
        }
      } catch {}
    }
    const values = uniq([...acc, ...metalOptions]);
    if (values.length) setMetalOptions(values);
  };

  const loadQualityOptions = async (type) => {
    try {
      const { data } = await supabase
        .from("component_price_lists")
        .select("quality")
        .eq("component_type", type)
        .eq("is_active", true)
        .not("quality", "is", null)
        .order("quality", { ascending: true })
        .limit(2000);
      const values = uniq((data || []).map((d) => d.quality));
      setQualityOpts((s) => ({ ...s, [type]: values.length ? values : defaultQualities[type] }));
    } catch {
      setQualityOpts((s) => ({ ...s, [type]: defaultQualities[type] }));
    }
  };

  // init
  useEffect(() => {
    (async () => {
      await Promise.all([loadCats(), loadCols(), probeItems(), probeBOM()]);
      await Promise.all([loadPurityOptions(), loadQualityOptions("diamond"), loadQualityOptions("pearl"), loadQualityOptions("coral"), loadQualityOptions("other")]);
      await loadMetalOptions();
    })();
  }, []);

  // ----- TYPEAHEAD: products → (fallback) items -----
  const searchProducts = async (q) => {
    try {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, code, brand, metal, purity, grams, collection_id, category_id")
          .or(`code.ilike.%${q}%,name.ilike.%${q}%,brand.ilike.%${q}%`)
          .order("code")
          .limit(20);
        if (error) throw error;
        if (data?.length) return data.map(unifyProductRow);
      } catch {
        const { data } = await supabase
          .from("products")
          .select("id, code, brand, metal, purity, grams, collection_id, category_id")
          .ilike("code", `%${q}%`)
          .order("code")
          .limit(20);
        if (data?.length) return data.map(unifyProductRow);
      }
    } catch {}

    if (!itemsAvailable) return [];
    let acc = [];
    try {
      const { data } = await supabase.from("items").select("*").ilike("code", `%${q}%`).order("code").limit(20);
      if (data?.length) acc = acc.concat(data.map(unifyProductRow));
    } catch {}
    try {
      const { data } = await supabase.from("items").select("*").ilike("sku", `%${q}%`).order("sku").limit(20);
      if (data?.length) acc = acc.concat(data.map(unifyProductRow));
    } catch {}
    try {
      const { data } = await supabase.from("items").select("*").ilike("name", `%${q}%`).order("name").limit(20);
      if (data?.length) acc = acc.concat(data.map(unifyProductRow));
    } catch {}

    const seen = new Set();
    const uniqRows = [];
    for (const r of acc) {
      const key = `${r.id}-${r.code}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqRows.push(r);
      }
      if (uniqRows.length >= 20) break;
    }
    return uniqRows;
  };

  useEffect(() => {
    const handler = setTimeout(async () => {
      const q = productSearch.trim();
      if (q.length < 2) {
        setProductResults([]);
        return;
      }
      try {
        const list = await searchProducts(q);
        setProductResults(list);
        setShowResults(true);
      } catch {
        setProductResults([]);
        setShowResults(false);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [productSearch]);

  // close dropdown on outside click
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

  const applyProduct = async (pUnified) => {
    if (!pUnified) return;
    setShowResults(false);
    setF("product_id", pUnified.id || "");
    setF("product_code", pUnified.code || "");
    setProductSearch(pUnified.code || "");
    if (pUnified.metal) setF("metal", pUnified.metal);
    if (pUnified.purity) setF("purity", pUnified.purity);
    if (pUnified.grams) setF("grams", pUnified.grams);
    if (pUnified.brand) setF("brand", pUnified.brand);

    // Kolekcija/kategorija
    if (pUnified.collection_id) {
      setF("collection_id", pUnified.collection_id);
      const col = collections.find((c) => c.id === pUnified.collection_id);
      setF("collection", col?.name || "");
      if (pUnified.category_id) {
        setF("category_id", pUnified.category_id);
      } else if (col?.category_id) {
        setF("category_id", col.category_id);
      }
    } else if (pUnified.category_id) {
      setF("category_id", pUnified.category_id);
    }

    toast.success("✅ Proizvod učitan");

    // Auto povuci BOM ako je dostupan i uključen
    if (bomAvailable && useBOM && pUnified.id) {
      await loadBOMForProduct(pUnified.id);
    }
  };

  // ----- BOM: učitaj i mapiraj u formu -----
  const loadBOMForProduct = async (productId) => {
    if (!bomAvailable || !productId) return;
    try {
      const { data, error } = await supabase
        .from("product_components")
        .select("component_type, quality, qty, unit, is_active, valid_from")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("valid_from", { ascending: false });

      if (error) throw error;
      if (!data?.length) {
        toast.info("ℹ️ Nema aktivnih komponenti (BOM) za ovaj proizvod");
        return;
      }

      // uzmi najnoviji zapis po tipu
      const latestByType = {};
      for (const row of data) {
        const t = String(row.component_type || "").toLowerCase();
        if (!latestByType[t]) latestByType[t] = row;
      }

      const apply = (type, qKey, qtyKey) => {
        const r = latestByType[type];
        if (r) {
          if (r.quality) setF(qKey, r.quality);
          if (r.qty != null && r.qty !== "") setF(qtyKey, String(r.qty));
        }
      };

      apply("diamond", "diamond_quality", "diamond_qty");
      apply("pearl", "pearl_quality", "pearl_qty");
      apply("coral", "coral_quality", "coral_qty");
      apply("other", "other_quality", "other_qty");

      toast.success("📦 BOM učitan (quality/qty auto)");
    } catch (e) {
      console.error(e);
      toast.error(`❌ BOM učitavanje nije uspjelo: ${e?.message || e}`);
    }
  };

  // ----- Cjenici / kalkulacija -----
  const getPriceFromList = async (type, quality, qty) => {
    const qtyNum =
      qty === "" || qty === null || typeof qty === "undefined"
        ? (quality ? 1 : 0)
        : Number(qty);

    if (Number.isNaN(qtyNum) || qtyNum <= 0) return 0;

    try {
      const { data } = await supabase
        .from("component_price_lists")
        .select("price_per_unit")
        .eq("component_type", type)
        .eq("quality", quality || null)
        .eq("is_active", true)
        .order("valid_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return 0;
      return qtyNum * Number(data.price_per_unit);
    } catch {
      return 0;
    }
  };

  const autoCost = async (manualStr, type, quality, qty) => {
    const manual = Number(manualStr);
    if (!Number.isNaN(manual) && manual > 0) return manual;  // >0 = ručni override
    return await getPriceFromList(type, quality, qty);        // prazno/0 = auto cjenik
  };

  const calcAndSave = async () => {
    if (!form.metal || !form.purity || !form.grams) {
      toast.warn("Unesi/odaberi metal, čistoću i grame");
      return;
    }
    setLoading(true);

    try {
      const stone_cost  = await autoCost(form.stone_cost,  "diamond", form.diamond_quality, form.diamond_qty);
      const pearl_cost  = await autoCost(form.pearl_cost,  "pearl",   form.pearl_quality,   form.pearl_qty);
      const coral_cost  = await autoCost(form.coral_cost,  "coral",   form.coral_quality,   form.coral_qty);
      const other_components_cost = await autoCost(form.other_components_cost, "other", form.other_quality, form.other_qty);
      const labor_cost = Number(form.labor_cost || 0);

      const { error } = await supabase.rpc("fn_upsert_price_sheet", {
        p_product_id: form.product_id || null,
        p_product_code: form.product_code || null,
        p_category_id: form.category_id || null,
        p_metal: form.metal,
        p_purity: form.purity,
        p_grams: Number(form.grams),
        p_stone_cost: stone_cost,
        p_pearl_cost: pearl_cost,
        p_coral_cost: coral_cost,
        p_other_components_cost: other_components_cost,
        p_labor_cost: labor_cost,
        p_brand: form.brand || null,
        p_collection: form.collection || null,
        p_tax_country: form.tax_country || "HR",
        p_rule_id: form.rule_id || null,
        p_notes: form.notes || null,
        p_collection_id: form.collection_id || null,
      });

      if (error) {
        const msg = String(error.message || "");
        if (msg.includes('column "category_id"') && msg.includes("price_sheets")) {
          toast.error("❌ Kalkulacija nije uspjela: price_sheets.category_id nedostaje");
          toast.info("SQL fix:\nALTER TABLE price_sheets ADD COLUMN IF NOT EXISTS category_id uuid;");
        } else {
          throw error;
        }
      } else {
        toast.success("✅ Snapshot spremljen");
      }
    } catch (e) {
      console.error(e);
      toast.error(`❌ Kalkulacija nije uspjela: ${e?.message || e}`);
    }
    setLoading(false);
  };

  const previewRule = async () => {
    try {
      const { data, error } = await supabase.rpc("fn_pick_pricing_rule", {
        p_category_id: form.category_id || null,
        p_purity: form.purity || null,
        p_brand: form.brand || null,
        p_collection_id: form.collection_id || null,
        p_collection_name: form.collection || null,
      });
      if (error) throw error;
      if (!data) toast.info("⚠️ Nema specifičnog pravila – koristit će se DEFAULT.");
      else toast.success(`🧭 Primijenit će se pravilo: ${shortId(data)}`);
    } catch (e) {
      console.error(e);
      toast.error(`❌ Preview pravila nije uspio: ${e?.message || e}`);
    }
  };

  // ----- REFRESH gumb (re-fetch svih opcija + BOM probe) -----
  const refreshOptions = async () => {
    try {
      await Promise.all([loadCats(), loadCols(), probeItems(), probeBOM()]);
      await Promise.all([loadPurityOptions(), loadQualityOptions("diamond"), loadQualityOptions("pearl"), loadQualityOptions("coral"), loadQualityOptions("other")]);
      await loadMetalOptions();
      toast.success("🔄 Opcije osvježene");
    } catch (e) {
      toast.error(`❌ Refresh nije uspio: ${e?.message || e}`);
    }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Kalkulacija cijene (snapshot)</h3>
        <div className="widget-actions" style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={previewRule}>🧭 Preview pravila</button>
          <button className="btn" onClick={refreshOptions}>🔄 Refresh</button>
          <button className="btn primary" onClick={calcAndSave} disabled={loading}>
            {loading ? "Računam…" : "💾 Spremi snapshot"}
          </button>
        </div>
      </div>

      {/* BOM toggle – prikaz samo ako tablica postoji */}
      {bomAvailable && (
        <div className="field-row" style={{ alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={useBOM}
              onChange={(e) => setUseBOM(e.target.checked)}
            />
            Use product BOM (auto components)
          </label>
          <button
            className="btn"
            onClick={() => {
              if (!form.product_id) {
                toast.warn("Nema product_id — prvo odaberi proizvod");
              } else {
                loadBOMForProduct(form.product_id);
              }
            }}
          >
            📦 Učitaj BOM za proizvod
          </button>
        </div>
      )}

      {/* Product code – typeahead dropdown */}
      <div className="field-row" style={{ position: "relative" }}>
        <label>Product code</label>
        <input
          ref={searchRef}
          placeholder="upiši 2+ znaka (pretraga products, pa items)"
          value={productSearch}
          onChange={(e) => {
            setProductSearch(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(productResults.length > 0)}
        />
        <button
          className="btn"
          onClick={() => {
            if (productSearch.trim().length < 2) {
              toast.warn("Upiši barem 2 znaka za pretragu");
              return;
            }
            if (productResults.length > 0) {
              applyProduct(productResults[0]);
            } else {
              toast.info("Nema rezultata za taj upit");
            }
          }}
        >
          ⏎ Odaberi prvo
        </button>

        {showResults && productResults.length > 0 && (
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
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)"
            }}
          >
            {productResults.map((p) => (
              <div
                key={`${p.id}-${p.code}`}
                onClick={() => applyProduct(p)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f2f4f7"
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

      {/* Auto-popunjena polja */}
      <div className="field-row">
        <label>Product ID</label>
        <input
          placeholder="(auto)"
          value={form.product_id}
          onChange={(e) => setF("product_id", e.target.value)}
        />
        <label>Product code</label>
        <input
          placeholder="RING-001"
          value={form.product_code}
          onChange={(e) => setF("product_code", e.target.value)}
        />
      </div>

      {/* Taxonomy */}
      <div className="field-row">
        <div style={{ display: "grid", gap: 6 }}>
          <label>Kategorija</label>
          {categories.length ? (
            <select
              value={form.category_id || ""}
              onChange={(e) => setF("category_id", e.target.value)}
            >
              <option value="">— (opc.) —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} title={c.id}>
                  {c.name} — {shortId(c.id)}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="category_id (UUID, opc.)"
              value={form.category_id}
              onChange={(e) => setF("category_id", e.target.value)}
            />
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label>Kolekcija</label>
          {collections.length ? (
            <select
              value={form.collection_id || ""}
              onChange={(e) => {
                const id = e.target.value;
                setF("collection_id", id);
                const col = collections.find((x) => x.id === id);
                setF("collection", col?.name || "");
                if (!form.category_id && col?.category_id) {
                  setF("category_id", col.category_id);
                  toast.info("↪ Kategorija postavljena prema kolekciji");
                }
              }}
            >
              <option value="">— (opc.) —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id} title={c.id}>
                  {c.name} — {shortId(c.id)}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                placeholder="naziv kolekcije (legacy opc.)"
                value={form.collection}
                onChange={(e) => setF("collection", e.target.value)}
              />
              <input
                placeholder="collection_id (UUID, opc.)"
                value={form.collection_id}
                onChange={(e) => setF("collection_id", e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Metal & grams */}
      <div className="field-row">
        <label>Metal</label>
        <input
          list="metal-list"
          placeholder="npr. gold/silver/steel…"
          value={form.metal}
          onChange={(e) => setF("metal", e.target.value)}
        />
        <datalist id="metal-list">
          {metalOptions.map((m) => (
            <option key={`m-${m}`} value={m} />
          ))}
        </datalist>

        <label>Purity</label>
        <select value={form.purity} onChange={(e) => setF("purity", e.target.value)}>
          <option value="">—</option>
          {purityOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <label>Grami</label>
        <input
          type="number"
          step="0.01"
          placeholder="npr. 3.50"
          value={form.grams}
          onChange={(e) => setF("grams", e.target.value)}
        />
      </div>

      {/* Dodatni troškovi + quality dropdownovi */}
      <div className="field-row">
        <label>Kamenje (€)</label>
        <input
          type="number"
          step="0.01"
          placeholder="prazno/0 = auto iz cjenika"
          value={form.stone_cost}
          onChange={(e) => setF("stone_cost", e.target.value)}
        />
        <label>Diamond quality</label>
        <select value={form.diamond_quality} onChange={(e) => setF("diamond_quality", e.target.value)}>
          <option value="">—</option>
          {(qualityOpts.diamond.length ? qualityOpts.diamond : defaultQualities.diamond).map((q) => (
            <option key={`dq-${q}`} value={q}>{q}</option>
          ))}
        </select>
        <label>Qty (ct/g/pcs)</label>
        <input
          type="number"
          step="0.001"
          placeholder="(prazno = 1)"
          value={form.diamond_qty}
          onChange={(e) => setF("diamond_qty", e.target.value)}
        />
      </div>

      <div className="field-row">
        <label>Biseri (€)</label>
        <input
          type="number"
          step="0.01"
          placeholder="prazno/0 = auto iz cjenika"
          value={form.pearl_cost}
          onChange={(e) => setF("pearl_cost", e.target.value)}
        />
        <label>Pearl quality</label>
        <select value={form.pearl_quality} onChange={(e) => setF("pearl_quality", e.target.value)}>
          <option value="">—</option>
          {(qualityOpts.pearl.length ? qualityOpts.pearl : defaultQualities.pearl).map((q) => (
            <option key={`pq-${q}`} value={q}>{q}</option>
          ))}
        </select>
        <label>Qty</label>
        <input
          type="number"
          step="0.001"
          placeholder="(prazno = 1)"
          value={form.pearl_qty}
          onChange={(e) => setF("pearl_qty", e.target.value)}
        />
      </div>

      <div className="field-row">
        <label>Koralj (€)</label>
        <input
          type="number"
          step="0.01"
          placeholder="prazno/0 = auto iz cjenika"
          value={form.coral_cost}
          onChange={(e) => setF("coral_cost", e.target.value)}
        />
        <label>Coral quality</label>
        <select value={form.coral_quality} onChange={(e) => setF("coral_quality", e.target.value)}>
          <option value="">—</option>
          {(qualityOpts.coral.length ? qualityOpts.coral : defaultQualities.coral).map((q) => (
            <option key={`cq-${q}`} value={q}>{q}</option>
          ))}
        </select>
        <label>Qty</label>
        <input
          type="number"
          step="0.001"
          placeholder="(prazno = 1)"
          value={form.coral_qty}
          onChange={(e) => setF("coral_qty", e.target.value)}
        />
      </div>

      <div className="field-row">
        <label>Ostale komponente (€)</label>
        <input
          type="number"
          step="0.01"
          placeholder="prazno/0 = auto iz cjenika"
          value={form.other_components_cost}
          onChange={(e) => setF("other_components_cost", e.target.value)}
        />
        <label>Other quality</label>
        <select value={form.other_quality} onChange={(e) => setF("other_quality", e.target.value)}>
          <option value="">—</option>
          {(qualityOpts.other.length ? qualityOpts.other : defaultQualities.other).map((q) => (
            <option key={`oq-${q}`} value={q}>{q}</option>
          ))}
        </select>
        <label>Qty</label>
        <input
          type="number"
          step="0.001"
          placeholder="(prazno = 1)"
          value={form.other_qty}
          onChange={(e) => setF("other_qty", e.target.value)}
        />
      </div>

      <div className="field-row">
        <label>Rad (€)</label>
        <input
          type="number"
          step="0.01"
          placeholder="0 (ručni unos)"
          value={form.labor_cost}
          onChange={(e) => setF("labor_cost", e.target.value)}
        />

        <label>Brand</label>
        <input
          placeholder="npr. Atelier (opc.)"
          value={form.brand}
          onChange={(e) => setF("brand", e.target.value)}
        />

        <label>PDV zemlja</label>
        <input
          placeholder="HR"
          value={form.tax_country}
          onChange={(e) => setF("tax_country", e.target.value)}
        />
      </div>

      <div className="field-row">
        <label>Pravilo (override ID)</label>
        <input
          placeholder="(opc.) pricing_rule_id"
          value={form.rule_id}
          onChange={(e) => setF("rule_id", e.target.value)}
        />

        <label>Napomena</label>
        <input
          placeholder="(opc.)"
          value={form.notes}
          onChange={(e) => setF("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
