import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./WorkOrder.css";

export default function WorkOrdersTable({ refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [refreshKey]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) toast.error("❌ Greška kod dohvaćanja naloga");
    else setOrders(data);

    setLoading(false);
  };

  const completeOrder = async (id) => {
    const confirm = window.confirm("Želiš li označiti nalog kao dovršen?");
    if (!confirm) return;

    const { error } = await supabase
      .from("work_orders")
      .update({ status: "COMPLETED" })
      .eq("id", id);

    if (error) {
      toast.error("❌ Greška kod završavanja naloga");
    } else {
      toast.success("✅ Nalog dovršen i cijena izračunata!");
      fetchOrders(); // refresh
    }
  };

  if (loading) return <p>Učitavam...</p>;

  return (
    <div className="workorder-table">
      <h2>📋 Radni Nalozi</h2>
      <table>
        <thead>
          <tr>
            <th>Broj</th>
            <th>Kupac</th>
            <th>Tip</th>
            <th>Status</th>
            <th>Procijenjeni trošak (€)</th>
            <th>Izračunata cijena (€)</th>
            <th>Akcija</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center" }}>
                Nema zapisa
              </td>
            </tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id}>
                <td>{o.order_no}</td>
                <td>{o.customer_name}</td>
                <td>{o.production_type === "internal" ? "Interna" : "Vanjska"}</td>
                <td>
                  <span
                    className={`status-badge ${
                      o.status === "COMPLETED"
                        ? "completed"
                        : o.status === "IN_PROGRESS"
                        ? "progress"
                        : "pending"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td>{o.estimated_cost || "-"}</td>
                <td>{o.price_calculated || "-"}</td>
                <td>
                  {o.status !== "COMPLETED" ? (
                    <button
                      className="complete-btn"
                      onClick={() => completeOrder(o.id)}
                    >
                      Završi nalog
                    </button>
                  ) : (
                    <button className="pdf-btn" onClick={() => alert("PDF export uskoro!")}>
                      PDF
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
