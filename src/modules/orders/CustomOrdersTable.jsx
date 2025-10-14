import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderQRCode from "./OrderQRCode";
import "./Orders.css";

export default function CustomOrdersTable({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [qrFor, setQrFor] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (filter !== "ALL") query = query.eq("status", filter);
      if (q.trim().length > 0) {
        // simple ilike on few columns
        query = query.or(
          `order_no.ilike.%${q}%,customer_name.ilike.%${q}%,model.ilike.%${q}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast.error(`❌ Ne mogu dohvatiti narudžbe: ${e.message || e}`);
      setRows([]);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter, refreshKey]);

  const start = async (id) => {
    try {
      const { error } = await supabase.rpc("fn_co_start", { p_order_id: id });
      if (error) throw error;
      toast.success("▶️ Startano");
      load();
    } catch (e) {
      toast.error(`❌ ${e.message || e}`);
    }
  };

  const ready = async (id) => {
    try {
      const { error } = await supabase.rpc("fn_co_ready", { p_order_id: id });
      if (error) throw error;
      toast.success("✅ Ready");
      load();
    } catch (e) {
      toast.error(`❌ ${e.message || e}`);
    }
  };

  const delivered = async (id) => {
    try {
      const { error } = await supabase.rpc("fn_co_delivered", { p_order_id: id });
      if (error) throw error;
      toast.success("📦 Delivered");
      load();
    } catch (e) {
      toast.error(`❌ ${e.message || e}`);
    }
  };

  return (
    <div className="card">
      <div className="orders-toolbar">
        <h3>📋 Custom Orders</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Search (order no / customer / model)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="READY">READY</option>
            <option value="DELIVERED">DELIVERED</option>
          </select>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "…" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Purity</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Due</th>
            <th>Created</th>
            <th>QR</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><b>{r.order_no}</b></td>
              <td>{r.customer_name || "-"}</td>
              <td>{r.product_type || "-"}</td>
              <td>{r.purity || "-"}</td>
              <td>{r.color || "-"}</td>
              <td>{r.quantity || 1}</td>
              <td><OrderStatusBadge status={r.status} /></td>
              <td>{r.due_date ? new Date(r.due_date).toLocaleString() : "-"}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td className="actions" style={{ whiteSpace: "nowrap" }}>
                <button className="btn" onClick={() => setQrFor(r.id)}>🔳</button>
                <button className="btn" onClick={() => navigate(`/orders/actions/${r.id}`)}>⚡</button>
              </td>
              <td className="actions" style={{ whiteSpace: "nowrap" }}>
                {r.status === "PENDING" && (
                  <button className="btn" onClick={() => start(r.id)}>▶️ Start</button>
                )}
                {r.status === "IN_PROGRESS" && (
                  <button className="btn" onClick={() => ready(r.id)}>✅ Ready</button>
                )}
                {r.status === "READY" && (
                  <button className="btn" onClick={() => delivered(r.id)}>📦 Delivered</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={11} className="small">Nema zapisa</td>
            </tr>
          )}
        </tbody>
      </table>

      {qrFor && <OrderQRCode orderId={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
