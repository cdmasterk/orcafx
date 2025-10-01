import React, { useState } from "react";
import { useItems } from "../../hooks/useItems";

export default function POSBrowser({ onAdd }) {
  const [activeTab, setActiveTab] = useState("PRODUCT");

  const { items, loading, error } = useItems(activeTab);

  return (
    <div style={{ padding: 20 }}>
      <h2>Dodavanje u košaricu</h2>

      <div style={{ marginBottom: 15 }}>
        <button
          onClick={() => setActiveTab("PRODUCT")}
          style={{
            padding: "8px 16px",
            marginRight: "10px",
            background: activeTab === "PRODUCT" ? "#0a1f44" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          📦 Proizvodi
        </button>

        <button
          onClick={() => setActiveTab("SERVICE")}
          style={{
            padding: "8px 16px",
            background: activeTab === "SERVICE" ? "#0a1f44" : "#ccc",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔧 Usluge
        </button>
      </div>

      {loading && <p>Učitavanje...</p>}
      {error && <p>Greška: {error.message}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 200px)",
          gap: "15px",
        }}
      >
        {items.map((i) => (
          <div
            key={i.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: 10,
              cursor: "pointer",
              background: "#f9fafc",
            }}
            onClick={() => onAdd(i)} // ✅ kad klikneš, dodaje item u Cart
          >
            <strong>{i.name}</strong>
            <p>{i.price.toFixed(2)} €</p>
          </div>
        ))}
      </div>
    </div>
  );
}
