import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";

export default function StockOverview() {
  const [rows, setRows] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    // očekujemo view: current_stock_view (product_code, product_name, category, warehouse_name, quantity)
    const { data, error } = await supabase
      .from("current_stock_view")
      .select("*")
      .limit(500);
    if (error) toast.error("❌ Greška pri dohvaćanju zaliha");
    else setRows(data || []);
  }

  return (
    <div className="warehouse-section">
      <h3>📦 Stanje zaliha</h3>
      <table className="stock-table">
        <thead>
          <tr>
            <th>Šifra</th>
            <th>Naziv</th>
            <th>Kategorija</th>
            <th>Skladište</th>
            <th>Količina</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.product_code ?? r.code ?? "-"}</td>
              <td>{r.product_name ?? r.name ?? "-"}</td>
              <td>{r.category ?? r.category_name ?? "-"}</td>
              <td>{r.warehouse_name ?? "-"}</td>
              <td className={(r.quantity ?? 0) > 0 ? "stock-quantity-positive" : "stock-quantity-zero"}>
                {r.quantity ?? 0}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} style={{textAlign:"center", color:"#666"}}>Nema podataka o zalihama.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
