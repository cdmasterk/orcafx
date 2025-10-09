import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { supabase } from "../../supabaseClient";
import "./WarehouseProcurement.css";

// ==============================
// 🧱 Excel Template Mapping
// ==============================
const COL_MAP = {
  "Product Name": "name",
  "Code": "code",
  "Category": "category_name",
  "Material": "material",
  "Purity": "purity",
  "Weight (g)": "weight_g",
  "Stone Type": "stone_type",
  "Carat (stone)": "stone_carat",
  "Supplier": "supplier_name",
  "Price NC": "price_nc",
  "Price VP": "price_vp",
  "Price MP": "price_mp",
  "VAT %": "vat_rate",
  "Notes": "notes",
  "Price Tier": "price_tier", // ✅ omogućava razred po retku u Excelu
};

const TEMPLATE_HEADERS = Object.keys(COL_MAP);
const REQUIRED_FIELDS = ["Product Name", "Category", "Material", "Purity", "Weight (g)", "Price NC"];

// helpers
const injectTierIntoCode = (baseCode, prefix, tier) => {
  if (!baseCode || !prefix || !tier) return baseCode;
  // ubaci slovo razreda odmah nakon prefiksa kategorije
  return `${prefix}${tier}${String(baseCode).slice(prefix.length)}`;
};

export default function WarehouseProcurement() {
  const [importData, setImportData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priceTiers, setPriceTiers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [categoryPrefixMap, setCategoryPrefixMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [nextCodePreview, setNextCodePreview] = useState("");

  // 🔹 manual (compact grid)
  const [manual, setManual] = useState({
    code: "",
    name: "",
    material: "",
    purity: "",
    weight_g: "",
    stone_type: "",
    stone_carat: "",
    supplier_name: "",
    price_nc: "",
    price_vp: "",
    price_mp: "",
    vat_rate: "",
    notes: "",
  });

  // ==============================
  // 📦 FETCH — categories & tiers
  // ==============================
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("product_code_rules")
        .select("category_name, category_code, current_seq, seq_length")
        .eq("active", true)
        .order("category_name", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("❌ Ne mogu dohvatiti kategorije");
        return;
      }

      const list = [];
      const map = {};
      (data || []).forEach((d) => {
        list.push(d.category_name);
        map[d.category_name] = {
          code: d.category_code, // prefiks kategorije (npr. D)
          seq: d.current_seq,
          len: d.seq_length,     // ukupna duljina (prefiks + broj) iz tvojih pravila
        };
      });
      setCategories(list);
      setCategoryPrefixMap(map);
      if (list.length > 0) setSelectedCategory(list[0]);
    };

    const fetchTiers = async () => {
      const { data, error } = await supabase
        .from("price_tiers")
        .select("tier_code, tier_name, vp_markup, mp_markup")
        .eq("active", true)
        .order("tier_code", { ascending: true });

      if (error) {
        console.error(error);
        toast.error("❌ Ne mogu dohvatiti cjenovne razrede");
        return;
      }
      setPriceTiers(data || []);
      if (data && data.length > 0) setSelectedTier(data[0].tier_code);
    };

    fetchCategories();
    fetchTiers();
  }, []);

  // ==============================
  // 📄 DOWNLOAD TEMPLATE
  // ==============================
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    // Primjer sada pokazuje i tier u šifri (AB00001)
    XLSX.utils.sheet_add_aoa(
      ws,
      [[
        "Gold ring classic", "AB00001", "Privjesak", "Gold", "18K", 3.25,
        "Diamond", 0.15, "Aurum d.o.o.", 120.00, 180.00, 249.00, 25, "Classic model", "B"
      ]],
      { origin: "A2" }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "ORCA_Product_Import_Template.xlsx");
    toast.success("✅ Template preuzet");
  };

  // ==============================
  // 📤 UPLOAD EXCEL
  // ==============================
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const missingHeaders = TEMPLATE_HEADERS.filter(h => !Object.keys(rows[0] || {}).includes(h));
      if (missingHeaders.length) {
        toast.error("Nedostaju kolone: " + missingHeaders.join(", "));
        return;
      }

      setImportData(rows);
      toast.info(`📦 Učitano ${rows.length} redova`);
    };
    reader.readAsBinaryString(file);
  };

  // ==============================
  // 🧠 VALIDATE
  // ==============================
  const validate = (rows) => {
    const errs = [];
    rows.forEach((row, idx) => {
      const miss = REQUIRED_FIELDS.filter((f) => !row[f] && row[f] !== 0);
      if (miss.length) errs.push(`Red #${idx + 2}: nedostaju polja → ${miss.join(", ")}`);
    });
    return errs;
  };

  // ==============================
  // ⚙️ GENERATE NEXT CODE (category + tier ⇒ e.g. DB00003)
  // ==============================
  const generateNextCode = async (categoryName, tierCode) => {
    try {
      const rule = categoryPrefixMap[categoryName];
      if (!rule) return null;

      // pokušaj RPC koji vraća sljedeći code (bez tier slova unutra)
      const { data, error } = await supabase.rpc("generate_next_code_preview", {
        p_category: rule.code,
      });

      if (!error && data?.next_code) {
        // ubaci tier slovo odmah poslije prefiksa kategorije
        const codeWithTier = injectTierIntoCode(data.next_code, rule.code, tierCode);
        return codeWithTier;
      }

      // fallback ako RPC nije dostupan: izgradi lokalno
      const digitsLen = Math.max(1, (rule.len || 6) - String(rule.code).length - 1); // -1 zbog tier slova
      const nextNum = (Number(rule.seq) + 1).toString().padStart(digitsLen, "0");
      return `${rule.code}${tierCode}${nextNum}`;
    } catch (err) {
      console.error("Error generating code:", err);
      return null;
    }
  };

  // ==============================
  // 🔍 LIVE PREVIEW CODE (na promjenu kategorije ili razreda)
  // ⚠️ Napomena: tvoj RPC povećava sekvencu i za preview (po tvojoj odluci ranije)
  // ==============================
  useEffect(() => {
    const loadNextCode = async () => {
      if (!selectedCategory || !selectedTier) return;
      const next = await generateNextCode(selectedCategory, selectedTier);
      setNextCodePreview(next || "");
    };
    loadNextCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedTier]);

  // ==============================
  // 🧮 AUTO PRICE CALC (manual)
  // ==============================
  const handleManualChange = (key, value) => {
    if (key === "price_nc") {
      const nc = value === "" ? "" : Number(value);
      const tier = priceTiers.find((t) => t.tier_code === selectedTier);
      if (tier && value !== "") {
        const vp = Number((nc * (1 + Number(tier.vp_markup))).toFixed(2));
        const mp = Number((nc * (1 + Number(tier.mp_markup))).toFixed(2));
        setManual((m) => ({ ...m, price_nc: value, price_vp: vp, price_mp: mp }));
        return;
      }
    }
    setManual((m) => ({ ...m, [key]: value }));
  };

  // ==============================
  // 💾 SAVE MANUAL ENTRY
  // ==============================
  const handleManualSave = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      toast.warning("⚠️ Odaberi kategoriju!");
      return;
    }
    if (!selectedTier) {
      toast.warning("⚠️ Odaberi cjenovni razred!");
      return;
    }

    setLoading(true);
    try {
      let code = (manual.code || "").trim();
      if (!code) {
        code = await generateNextCode(selectedCategory, selectedTier);
        if (!code) throw new Error("Nije moguće generirati šifru (Code)");
      } else {
        // Ako je korisnik ručno upisao bez tier slova, pokušaj ga injektirati:
        const rule = categoryPrefixMap[selectedCategory];
        if (rule && !code.startsWith(`${rule.code}${selectedTier}`) && code.startsWith(rule.code)) {
          code = injectTierIntoCode(code, rule.code, selectedTier);
        }
      }

      const payload = {
        code,
        name: manual.name || null,
        category_name: selectedCategory,
        category_code: categoryPrefixMap[selectedCategory]?.code || null,
        material: manual.material || null,
        purity: manual.purity || null,
        weight_g: manual.weight_g === "" ? null : Number(manual.weight_g),
        stone_type: manual.stone_type || null,
        stone_carat: manual.stone_carat === "" ? null : Number(manual.stone_carat),
        supplier_name: manual.supplier_name || null,
        price_nc: manual.price_nc === "" ? null : Number(manual.price_nc),
        price_vp: manual.price_vp === "" ? null : Number(manual.price_vp),
        price_mp: manual.price_mp === "" ? null : Number(manual.price_mp),
        vat_rate: manual.vat_rate === "" ? null : Number(manual.vat_rate),
        notes: manual.notes || null,
        price_tier: selectedTier,
        type: "product",
      };

      const { error } = await supabase.from("items").insert([payload]);
      if (error) throw error;

      toast.success(`✅ Artikl ${code} dodan (Tier: ${selectedTier})`);
      setManual({
        code: "",
        name: "",
        material: "",
        purity: "",
        weight_g: "",
        stone_type: "",
        stone_carat: "",
        supplier_name: "",
        price_nc: "",
        price_vp: "",
        price_mp: "",
        vat_rate: "",
        notes: "",
      });
      // osvježi preview nakon spremanja
      const next = await generateNextCode(selectedCategory, selectedTier);
      setNextCodePreview(next || "");
    } catch (err) {
      toast.error("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // 🚀 BULK IMPORT
  // ==============================
  const toItemsPayload = async (rows) => {
    const result = [];
    for (const r of rows) {
      const o = {};
      for (const [excelKey, dbKey] of Object.entries(COL_MAP)) {
        let v = r[excelKey];
        if (["Weight (g)", "Carat (stone)", "Price NC", "Price VP", "Price MP", "VAT %"].includes(excelKey)) {
          v = v === "" ? null : Number(String(v).replace(",", "."));
        }
        o[dbKey] = v === "" ? null : v;
      }

      // price tier po retku ili globalno
      const rowTier = r["Price Tier"] || selectedTier;

      // generiraj code ako nije dan — u formatu PREFIX + TIER + DIGITS
      if (!o.code) {
        o.code = await generateNextCode(o.category_name, rowTier);
      } else {
        // ako je code bez tier slova ali s prefiksom, injektiraj tier
        const rule = categoryPrefixMap[o.category_name];
        if (rule && !o.code.startsWith(`${rule.code}${rowTier}`) && o.code.startsWith(rule.code)) {
          o.code = injectTierIntoCode(o.code, rule.code, rowTier);
        }
      }

      // automatski VP/MP po razredu
      const tier = priceTiers.find((t) => t.tier_code === rowTier);
      if (tier && o.price_nc) {
        o.price_vp = Number((o.price_nc * (1 + Number(tier.vp_markup))).toFixed(2));
        o.price_mp = Number((o.price_nc * (1 + Number(tier.mp_markup))).toFixed(2));
      }

      o.category_code = categoryPrefixMap[o.category_name]?.code || null;
      o.price_tier = rowTier;
      o.type = "product";

      result.push(o);
    }
    return result;
  };

  const handleImport = async () => {
    if (!importData.length) {
      toast.error("⚠️ Nema podataka za import");
      return;
    }

    const vErrs = validate(importData);
    setErrors(vErrs);
    if (vErrs.length) {
      toast.error("Molim ispravi greške u Excelu");
      return;
    }

    setLoading(true);
    try {
      const itemsPayload = await toItemsPayload(importData);
      const { error } = await supabase.from("items").upsert(itemsPayload, { onConflict: "code" });
      if (error) throw error;
      toast.success(`✅ Importirano ${itemsPayload.length} artikala`);
      setImportData([]);
      setErrors([]);
      // osvježi preview nakon importa
      const next = await generateNextCode(selectedCategory, selectedTier);
      setNextCodePreview(next || "");
    } catch (err) {
      toast.error("❌ Greška pri importu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // 🖼️ RENDER
  // ==============================
  return (
    <div className="procurement-container">
      <h2>📦 Procurement</h2>
      <p>Uvoz i ručni unos artikala — automatski VP/MP i šifre po kategoriji + cjenovnom razredu (npr. DB00003).</p>

      <div style={{ marginBottom: 8 }}>
        <strong>Kategorija:</strong>{" "}
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <strong style={{ marginLeft: 20 }}>Cjenovni razred:</strong>{" "}
        <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
          {priceTiers.map((t) => (
            <option key={t.tier_code} value={t.tier_code}>
              {t.tier_code} — {t.tier_name}
            </option>
          ))}
        </select>

        {nextCodePreview && (
          <span style={{ marginLeft: 20, fontSize: "0.95rem", color: "#0a1f44" }}>
            🔢 <strong>Sljedeći kod:</strong> {nextCodePreview}
          </span>
        )}
      </div>

      {/* 🧾 Manual entry - compact grid (2 reda) */}
      <div className="manual-entry">
        <h4 style={{ marginBottom: 10 }}>➕ Ručni unos artikla</h4>

        <form
          onSubmit={handleManualSave}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "8px",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <input placeholder="Code (auto ako prazno)" value={manual.code} onChange={(e) => handleManualChange("code", e.target.value)} />
          <input placeholder="Product Name" value={manual.name} onChange={(e) => handleManualChange("name", e.target.value)} />
          <input placeholder="Material" value={manual.material} onChange={(e) => handleManualChange("material", e.target.value)} />
          <input placeholder="Purity" value={manual.purity} onChange={(e) => handleManualChange("purity", e.target.value)} />
          <input placeholder="Weight (g)" value={manual.weight_g} onChange={(e) => handleManualChange("weight_g", e.target.value)} />
          <input placeholder="Stone Type" value={manual.stone_type} onChange={(e) => handleManualChange("stone_type", e.target.value)} />
          <input placeholder="Carat (stone)" value={manual.stone_carat} onChange={(e) => handleManualChange("stone_carat", e.target.value)} />
          <input placeholder="Supplier" value={manual.supplier_name} onChange={(e) => handleManualChange("supplier_name", e.target.value)} />
        </form>

        <form
          onSubmit={handleManualSave}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <input placeholder="Price NC" value={manual.price_nc} onChange={(e) => handleManualChange("price_nc", e.target.value)} />
          <input placeholder="Price VP" value={manual.price_vp} onChange={(e) => handleManualChange("price_vp", e.target.value)} />
          <input placeholder="Price MP" value={manual.price_mp} onChange={(e) => handleManualChange("price_mp", e.target.value)} />
          <input placeholder="VAT %" value={manual.vat_rate} onChange={(e) => handleManualChange("vat_rate", e.target.value)} />
          <input placeholder="Notes" value={manual.notes} onChange={(e) => handleManualChange("notes", e.target.value)} />
          <div></div>
          <div></div>
          <button type="submit" disabled={loading}>
            {loading ? "⏳" : "💾 Spremi"}
          </button>
        </form>
      </div>

      {/* Bulk import */}
      <div className="procurement-actions">
        <button onClick={downloadTemplate} className="btn btn-template">📄 Preuzmi Template</button>
        <label className="file-upload">
          📤 Učitaj Excel
          <input type="file" accept=".xlsx" onChange={handleFileUpload} hidden />
        </label>
        <button className="btn btn-import" onClick={handleImport} disabled={loading || importData.length === 0}>
          {loading ? "⏳ Importiram..." : "✅ Potvrdi Import"}
        </button>
      </div>

      {importData.length > 0 && (
        <>
          <h4 style={{ marginTop: 20 }}>Pregled (prvih 10 redova)</h4>
          <div style={{ overflowX: "auto", maxHeight: "380px" }}>
            <table className="preview-table">
              <thead>
                <tr>
                  {TEMPLATE_HEADERS.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {importData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {TEMPLATE_HEADERS.map(h => <td key={h}>{String(row[h] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
