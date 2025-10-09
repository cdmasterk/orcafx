import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import { downloadProductTemplate } from "../../lib/excel/templates/ProductTemplate"; // ✅ točan import
import "../admin/Admin.css";

export default function ProductImport() {
  const [rows, setRows] = useState([]);
  const [rules, setRules] = useState([]);
  const [preview, setPreview] = useState([]);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    const { data, error } = await supabase.from("product_code_rules").select("*");
    if (error) toast.error("❌ Greška pri dohvaćanju pravila!");
    else setRules(data || []);
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    setRows(json);
    generatePreview(json);
  }

  function generatePreview(data) {
    const out = data.map((r) => {
      const rule = rules.find(
        (x) =>
          x.category_code?.toUpperCase() === r.category_code?.toUpperCase() &&
          x.price_tier?.toUpperCase() === r.price_tier?.toUpperCase()
      );
      if (!rule) {
        return { ...r, next_code: "⚠️ Pravilo ne postoji!", valid: false };
      }

      const prefix = rule.category_code + rule.price_tier;
      const nextSeq = (rule.current_seq ?? 0) + 1;
      const padded = String(nextSeq).padStart(rule.seq_length ?? 6, "0");
      return { ...r, next_code: prefix + padded, valid: true };
    });
    setPreview(out);
  }

  async function handleUpload() {
    if (!rows.length) return toast.error("⚠️ Nema podataka u Excelu!");
    const invalids = preview.filter((r) => !r.valid);
    if (invalids.length > 0) {
      toast.warn("⚠️ Neka pravila nedostaju. Dodaj ih u Product Code Manageru prije uploada.");
      return;
    }

    let inserted = 0;
    for (const r of rows) {
      const { error } = await supabase.from("products").insert([
        {
          category_code: r.category_code,
          price_tier: r.price_tier,
          name: r.name,
          purity: r.purity,
          color: r.color,
          price_nc: r.price_nc,
          price_vp: r.price_vp,
          price_mpc: r.price_mpc,
        },
      ]);

      if (!error) inserted++;
      else console.warn("❌ Insert error:", error.message);
    }

    toast.success(`✅ Uspješno dodano ${inserted} artikala!`);
    setRows([]);
    setPreview([]);
  }

  return (
    <div className="admin-container">
      <h2 className="admin-title">📦 Import artikala iz Excela</h2>
      <p className="admin-subtitle">
        Uvezi proizvode iz Excel predloška i automatski generiraj šifre prema pravilima.
      </p>

      <div className="stock-filters" style={{ marginBottom: 16 }}>
        <button onClick={downloadProductTemplate}>⬇️ Preuzmi Excel predložak</button>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          style={{ marginLeft: 12 }}
        />
        {rows.length > 0 && (
          <button onClick={handleUpload} style={{ marginLeft: 12 }}>
            📤 Učitaj u bazu
          </button>
        )}
      </div>

      {preview.length > 0 && (
        <div className="overflow-x-auto" style={{ marginTop: 16 }}>
          <table className="stock-table">
            <thead>
              <tr>
                <th>Kategorija</th>
                <th>Cjen. razred</th>
                <th>Naziv</th>
                <th>Purity</th>
                <th>Boja</th>
                <th>NC</th>
                <th>VP</th>
                <th>MPC</th>
                <th>Sljedeća šifra</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: !r.valid ? "#fff4e5" : "inherit",
                    color: !r.valid ? "#d9534f" : "inherit",
                  }}
                >
                  <td>{r.category_code}</td>
                  <td>{r.price_tier}</td>
                  <td>{r.name}</td>
                  <td>{r.purity}</td>
                  <td>{r.color}</td>
                  <td>{r.price_nc}</td>
                  <td>{r.price_vp}</td>
                  <td>{r.price_mpc}</td>
                  <td>{r.next_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
