import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "../../lib/supabase";
import "./BulkImport.css";

const TEMPLATE_HEADERS = [
  "code",
  "name",
  "category",
  "material",
  "purity",
  "weight",
  "price",
  "stock",
  "manufacturer"
];

export default function BulkImport() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileName(f.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setPreview(rows.slice(0, 200));
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    if (!preview.length) {
      alert("Nema podataka za import.");
      return;
    }
    if (!window.confirm(`Upisati ${preview.length} redova u products (upsert)?`)) return;

    setLoading(true);
    try {
      const rows = preview.map((r) => ({
        code: r.code || ("CODE-" + Math.random().toString(36).slice(2, 9)),
        name: r.name || "",
        category: r.category || "",
        material: r.material || "",
        purity: r.purity || "",
        weight: r.weight ? parseFloat(r.weight) : null,
        price: r.price ? parseFloat(r.price) : 0,
        stock: r.stock ? parseInt(r.stock, 10) : 0,
        manufacturer: r.manufacturer || null,
        created_at: new Date().toISOString(),
      }));

      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("products")
          .upsert(chunk, { onConflict: ["code"] }); // 🔑 code je ključ
        if (error) throw error;
      }

      alert("Upsert uspješan.");
      setPreview([]);
      setFileName("");
    } catch (err) {
      console.error(err);
      alert("Import error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(
      [
        {
          code: "ZL0001",
          name: "Zlatni prsten",
          category: "Vjenčano prstenje",
          material: "Zlato",
          purity: "585",
          weight: 3.2,
          price: 250.0,
          stock: 5,
          manufacturer: "Zlatarna Krizek",
        },
      ],
      { header: TEMPLATE_HEADERS }
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "products_template.xlsx");
  };

  return (
    <div className="bulk-import">
      <h3>Bulk Import proizvoda (Excel)</h3>
      <p>
        Očekivane kolone: <code>{TEMPLATE_HEADERS.join(", ")}</code>
      </p>

      <div className="controls">
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
        <button className="btn" disabled={!preview.length || loading} onClick={handleImport}>
          {loading ? "Učitavam..." : "Upsert u bazu"}
        </button>
        <button className="btn secondary" onClick={downloadTemplate}>
          Download Excel Template
        </button>
      </div>

      <div className="preview">
        <h4>Preview (prvih {preview.length}):</h4>
        {preview.length ? (
          <table>
            <thead>
              <tr>
                {TEMPLATE_HEADERS.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, idx) => (
                <tr key={idx}>
                  {TEMPLATE_HEADERS.map((h) => (
                    <td key={h}>{r[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Nema previewa.</p>
        )}
      </div>
    </div>
  );
}
