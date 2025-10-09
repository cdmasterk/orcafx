import React from "react";
import { Link } from "react-router-dom";
import "../admin/Admin.css"; // koristi isti stil Fiori kartica

export default function WarehouseHub() {
  const modules = [
    { path: "/warehouses/overview", label: "Warehouse Overview", icon: "📦" },
    { path: "/warehouses/summary", label: "Warehouse Summary", icon: "🏬" },
    { path: "/warehouses/transfers", label: "Transfers", icon: "🔄" },
    { path: "/warehouses/procurement", label: "Procurement", icon: "📥" },
    { path: "/warehouses/production", label: "Production", icon: "⚙️" },
    { path: "/warehouses/manage", label: "Warehouse Manager", icon: "🧱" },
    { path: "/warehouses/procurement", label: "Procurement", icon: "📥" },
    { path: "/warehouses/transfer", label: "Transfer", icon: "🔄" },
  ];

  return (
    <div className="admin-container">
      <h2 className="admin-title">🏭 Warehouse Hub</h2>
      <p className="admin-subtitle">
        Upravljanje zalihama, prijenosima i proizvodnjom
      </p>

      <div className="admin-grid">
        {modules.map((m) => (
          <Link key={m.path} to={m.path} className="admin-card">
            <span className="admin-icon">{m.icon}</span>
            <span className="admin-label">{m.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
