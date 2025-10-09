import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "../admin/Admin.css";

export default function WarehouseOverview() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);

      let query = supabase.from("current_stock").select("*");

      if (warehouseFilter) query = query.ilike("warehouse_name", `%${warehouseFilter}%`);
      if (productFilter) query = query.ilike("product_name", `%${productFilter}%`);

      const { data, error } = await query;
      if (error) console.error("Greška kod dohvaćanja stocka:", error.message);
      else setStock(data);

      setLoading(false);
    };

    fetchStock();
  }, [warehouseFilter, productFilter]);

  return (
    <div className="stock-container">
      <h2 className="stock-title">📦 Warehouse Overview</h2>

      <div className="stock-filters">
        <input
          type="text"
          placeholder="Filter po proizvodu..."
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter po skladištu..."
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="stock-table">
          <thead>
            <tr>
              <th>Skladište</th>
              <th>Šifra</th>
              <th>Proizvod</th>
              <th style={{ textAlign: "right" }}>Količina</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => (
              <tr key={`${row.warehouse_id}-${row.product_id}`}>
                <td>{row.warehouse_name}</td>
                <td>{row.product_sku || "—"}</td>
                <td>{row.product_name}</td>
                <td
                  className={
                    row.stock_quantity <= 0
                      ? "stock-quantity-zero"
                      : "stock-quantity-positive"
                  }
                  style={{ textAlign: "right" }}
                >
                  {row.stock_quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
