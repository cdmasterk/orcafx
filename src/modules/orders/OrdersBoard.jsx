import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./Orders.css";

const Column = ({ title, icon, items }) => (
  <div className="board-col">
    <h4>
      {icon} {title} <span className="small">({items.length})</span>
    </h4>
    {items.map((r) => (
      <div key={r.id} className="board-card">
        <div>
          <b>{r.order_no}</b> — {r.customer_name || "-"}
        </div>
        <div className="muted">
          {r.product_type || "-"} · qty {r.quantity || 1}
        </div>
        <div className="muted">
          {r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}
        </div>
      </div>
    ))}
    {!items.length && <div className="small">—</div>}
  </div>
);

export default function OrdersBoard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("custom_orders")
        .select("id, order_no, customer_name, product_type, quantity, status, due_date")
        .order("created_at", { ascending: false })
        .limit(400);
      if (!error) setRows(data || []);
    })();
  }, []);

  const by = (s) => rows.filter((r) => r.status === s);

  return (
    <div className="board-grid">
      <Column title="Pending" icon="🕒" items={by("PENDING")} />
      <Column title="In Progress" icon="⚙️" items={by("IN_PROGRESS")} />
      <Column title="Ready" icon="✅" items={by("READY")} />
      <Column title="Delivered" icon="📦" items={by("DELIVERED")} />
    </div>
  );
}
