import React from "react";
import { useNavigate } from "react-router-dom";
import "./Warehouse.css";

export default function WarehouseDashboard() {
  const navigate = useNavigate();

  const cards = [
    { label: "🏬 Warehouse Overview", path: "/warehouses/overview", desc: "Pregled svih skladišta" },
    { label: "🏢 Warehouse Summary", path: "/warehouses/summary", desc: "Sažetak stanja skladišta" },
    { label: "📦 Stock Overview", path: "/warehouses/stock-overview", desc: "Stanje zaliha po artiklima" },
    { label: "📊 Stock Summary", path: "/warehouses/stock-summary", desc: "Kratki pregled stanja zaliha" },
    { label: "🔄 Transfers", path: "/warehouses/transfer", desc: "Prijenosi među skladištima" },
    { label: "📥 Procurement", path: "/warehouses/procurement", desc: "Nabava artikala i materijala" },
    { label: "🧰 Warehouse Manager", path: "/warehouses/manage", desc: "Upravljanje skladištima" },
    { label: "📦 Product Import", path: "/warehouses/product-import", desc: "Uvoz artikala iz CSV-a" },
    { label: "📑 Bulk Import", path: "/warehouses/bulk-import", desc: "Masovni uvoz podataka" },
    { label: "🧩 Product Codes", path: "/warehouses/product-codes", desc: "Pravila i šifre proizvoda" },
    { label: "🧰 Service Admin", path: "/warehouses/service-admin", desc: "Administracija servisa" },
  ];

  return (
    <div className="warehouse-dashboard">
      <h2 className="warehouse-title">🏭 Warehouse Hub</h2>
      <p className="warehouse-subtitle">
        Centralno upravljanje zalihama, artiklima, šiframa, prijenosima i nabavom.
      </p>

      <div className="warehouse-grid">
        {cards.map((c) => (
          <div
            key={c.label}
            className="warehouse-card"
            onClick={() => navigate(c.path)}
          >
            <h3>{c.label}</h3>
            <p>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
