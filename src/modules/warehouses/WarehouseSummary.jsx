import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "../admin/Admin.css";

export default function WarehouseSummary() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_per_warehouse")
        .select("*");

      if (error) {
        console.error("Greška kod dohvaćanja stock_per_warehouse:", error.message);
      } else {
        setSummary(data);
      }
      setLoading(false);
    };

    fetchSummary();
  }, []);

  return (
    <div className="stock-container">
      <h2 className="stock-title">🏬 Warehouse Summary</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="stock-table">
          <thead>
            <tr>
              <th>Skladište</th>
              <th>Tip</th>
              <th style={{ textAlign: "right" }}>Ukupno</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.warehouse_id}>
                <td>{row.warehouse_name}</td>
                <td>{row.warehouse_type}</td>
                <td
                  className={
                    row.total_quantity <= 0
                      ? "stock-quantity-zero"
                      : "stock-quantity-positive"
                  }
                  style={{ textAlign: "right" }}
                >
                  {row.total_quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
