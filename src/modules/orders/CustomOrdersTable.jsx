// src/modules/orders/CustomOrdersTable.jsx
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
  const navigate = useNavigate();

  // QR modal state
  const [showQR, setShowQR] = useState(false);
  const [qrFor, setQrFor] = useState(null);

  const openQR = (orderId) => {
    setQrFor(orderId);
    setShowQR(true);
  };
  const closeQR = () => {
    setShowQR(false);
    setQrFor(null);
  };

  // 🔹 Load all custom orders
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, refreshKey]);

  // 🔹 Promjena statusa pomoću Supabase RPC funkcija
  const updateStatus = async (fnName, id, successMsg) => {
    try {
      const { error } = await supabase.rpc(fnName, { p_order_id: id });
      if (error) throw error;
      toast.success(successMsg);
      load();
    } catch (e) {
      toast.error(`❌ ${e.message || e}`);
    }
  };

  const handleView = (id) => {
    if (!id) return toast.error("⚠️ Nema ID narudžbe");
    navigate(`/orders/actions/${id}`);
  };

  const handleUpload = (id) => {
    if (!id) return toast.error("⚠️ Nema ID narudžbe");
    navigate(`/orders/upload/${id}`);
  };

  // 🔹 NOVO: Generiranje radnog naloga + slanje maila
  const generateWorkOrder = async (id) => {
    try {
      const confirm = window.confirm("Želite li generirati Radni nalog?");
      if (!confirm) return;

      // 1️⃣ Generiraj radni nalog u Supabaseu
      const { data, error } = await supabase.rpc("fn_generate_work_order", {
        p_order_id: id,
      });
      if (error) throw error;
      const workOrderId = data;
      toast.success("✅ Radni nalog uspješno generiran!");

      // 2️⃣ Pozovi Edge Function za PDF + mail
      toast.info("📨 Slanje naloga e-mailom...");
      const { data: fnRes, error: fnErr } = await supabase.functions.invoke(
        "send_work_order_mail",
        {
          body: { workOrderId },
        }
      );

      if (fnErr) {
        console.error(fnErr);
        toast.error("⚠️ Nalog kreiran, ali slanje maila nije uspjelo.");
      } else if (fnRes?.ok) {
        toast.success("📬 Nalog poslan e-mailom (partner / interna / kupac).");

        // 3️⃣ Automatski PDF download (ako je vraćen)
        if (fnRes.pdfBase64) {
          const link = document.createElement("a");
          link.href = `data:application/pdf;base64,${fnRes.pdfBase64}`;
          link.download = `${fnRes.order_no || workOrderId}.pdf`;
          link.click();
        }
      } else {
        toast.warn("⚠️ Mail nije poslan (bez primatelja).");
      }

      // 4️⃣ Refresh tablice
      load();
    } catch (e) {
      console.error(e);
      toast.error(`❌ Greška: ${e.message || e}`);
    }
  };

  return (
    <>
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
              <th style={{ minWidth: 400 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.order_no}</b>
                </td>
                <td>{r.customer_name || "-"}</td>
                <td>{r.product_type || "-"}</td>
                <td>{r.purity || "-"}</td>
                <td>{r.color || "-"}</td>
                <td>{r.quantity || 1}</td>
                <td>
                  <OrderStatusBadge status={r.status} />
                </td>
                <td>
                  {r.due_date
                    ? new Date(r.due_date).toLocaleString()
                    : "-"}
                </td>
                <td>{new Date(r.created_at).toLocaleString()}</td>

                {/* Akcije */}
                <td
                  className="actions"
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button className="btn" onClick={() => openQR(r.id)}>
                    🔳 QR
                  </button>
                  <button className="btn" onClick={() => handleView(r.id)}>
                    👁️ View
                  </button>
                  <button className="btn" onClick={() => handleUpload(r.id)}>
                    📷 Upload
                  </button>

                  {r.status === "PENDING" && (
                    <button
                      className="btn"
                      onClick={() =>
                        updateStatus("fn_co_start", r.id, "▶️ Startano")
                      }
                    >
                      ▶️ Start
                    </button>
                  )}
                  {r.status === "IN_PROGRESS" && (
                    <button
                      className="btn"
                      onClick={() =>
                        updateStatus("fn_co_ready", r.id, "✅ Ready")
                      }
                    >
                      ✅ Ready
                    </button>
                  )}
                  {r.status === "READY" && (
                    <button
                      className="btn"
                      onClick={() =>
                        updateStatus("fn_co_delivered", r.id, "📦 Delivered")
                      }
                    >
                      📦 Delivered
                    </button>
                  )}

                  {r.status !== "DELIVERED" && (
                    <button
                      className="btn workorder"
                      onClick={() => generateWorkOrder(r.id)}
                    >
                      📄 Generate Work Order
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="small">
                  Nema zapisa
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showQR && qrFor && <OrderQRCode orderId={qrFor} onClose={closeQR} />}
    </>
  );
}
