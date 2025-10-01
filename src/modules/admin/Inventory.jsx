import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./Inventory.css";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("code");
    if (error) {
      alert("Greška kod dohvaćanja: " + error.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateField = async (id, field, value) => {
    try {
      const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    } catch (err) {
      alert("Greška kod updatea: " + err.message);
    }
  };

  const exportToExcel = () => {
    if (!items.length) {
      alert("Nema podataka za export.");
      return;
    }

    const headers = [
      "code",
      "name",
      "category",
      "material",
      "purity",
      "weight",
      "price",
      "stock",
      "manufacturer",
      "created_at"
    ];

    const data = items.map((i) => ({
      code: i.code,
      name: i.name,
      category: i.category,
      material: i.material,
      purity: i.purity,
      weight: i.weight,
      price: i.price,
      stock: i.stock,
      manufacturer: i.manufacturer,
      created_at: i.created_at
    }));

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "products_export.xlsx");
  };

  return (
    <div className="inventory">
      <div className="inventory-top">
        <h3>Skladište - proizvodi</h3>
        <div className="actions">
          <button className="btn" onClick={fetchItems}>{loading ? "..." : "Refresh"}</button>
          <button className="btn secondary" onClick={exportToExcel}>Export u Excel</button>
        </div>
      </div>

      <div className="inv-table">
        <table>
          <thead>
            <tr>
              <th>Šifra (Code)</th>
              <th>Naziv</th>
              <th>Kategorija</th>
              <th>Materijal</th>
              <th>Cijena (€)</th>
              <th>Stanje</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.code}</td>
                <td>{i.name}</td>
                <td>{i.category}</td>
                <td>{i.material}</td>
                <td>
                  <input
                    type="number"
                    defaultValue={i.price}
                    onBlur={(e) =>
                      updateField(i.id, "price", parseFloat(e.target.value))
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    defaultValue={i.stock}
                    onBlur={(e) =>
                      updateField(i.id, "stock", parseInt(e.target.value, 10))
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn small"
                    onClick={() => navigator.clipboard.writeText(i.code)}
                  >
                    Copy Code
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
