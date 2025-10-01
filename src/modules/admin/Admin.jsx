import React from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

export default function Admin() {
  const modules = [
    { path: "/admin/stores", label: "Store Hub", icon: "🏬" },
    { path: "/admin/pos", label: "POS Admin", icon: "🖥️" },
    { path: "/admin/company", label: "Company", icon: "🏢" },
    { path: "/admin/warehouse", label: "Warehouse", icon: "📦" },
    { path: "/admin/fiscal/1", label: "Fiscal", icon: "💶" },
    { path: "/admin/bulk-import", label: "Bulk Import", icon: "📥" },
    { path: "/admin/services", label: "Service Admin", icon: "🔧" }, // ✅ NOVO
  ];

  return (
    <div className="admin-container">
      <h2 className="admin-title">⚙️ Admin Hub</h2>
      <p className="admin-subtitle">Odaberite modul za administraciju:</p>

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
