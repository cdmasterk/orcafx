// src/modules/orders/OrderQuickActions.jsx
import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import OrderSketchPreview from "./OrderSketchPreview";
import OrderFilesList from "./OrderFilesList";

export default function OrderQuickActions() {
  const { orderId } = useParams();
  const nav = useNavigate();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h2 style={{ margin: 0 }}>⚡ Order Actions</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/orders/upload/${orderId}`}><button className="btn">📷 Upload</button></Link>
          <button className="btn" onClick={() => nav(-1)}>← Back</button>
        </div>
      </header>

      <OrderSketchPreview orderId={orderId} />
      <OrderFilesList orderId={orderId} />
    </div>
  );
}
