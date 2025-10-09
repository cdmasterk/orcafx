import React from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import MetalPricesCharts from "../reports/MetalPricesCharts"; // 📈 grafovi FX stil
import MetalPricesTable from "../reports/MetalPricesTable";   // 📋 tablica ispod

export default function Dashboard() {
  const shortcuts = [
    { path: "/pos", label: "Sales (POS)", icon: "🖥️" },
    { path: "/reports", label: "Reports", icon: "📊" },
    { path: "/reports/bank", label: "Bank Report", icon: "🏦" },
    { path: "/service", label: "Service", icon: "🔧" },
    { path: "/buyback", label: "Buyback", icon: "💰" },
    { path: "/custom-orders", label: "Custom Orders", icon: "📑" },
    { path: "/warehouses", label: "Warehouses", icon: "🏭" }, // ✅ NOVO — centralni Warehouse Hub
    { path: "/admin", label: "Admin Hub", icon: "⚙️" },
  ];

  return (
    <div className="dashboard-container">
      {/* Naslov i podnaslov */}
      <h2 className="dashboard-title">📊 Dashboard</h2>
      <p className="dashboard-subtitle">Brzi pristup glavnim modulima:</p>

      {/* Shortcut kartice */}
      <div className="dashboard-grid">
        {shortcuts.map((s) => (
          <Link key={s.path} to={s.path} className="dashboard-card">
            <span className="dashboard-icon">{s.icon}</span>
            <span className="dashboard-label">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Burzovni grafovi */}
      <div className="dashboard-widget">
        <MetalPricesCharts />
      </div>

      {/* Tablica metala */}
      <div className="dashboard-widget">
        <div className="dashboard-widget-header">
          <h3>📋 Metal Prices — Tablica</h3>
        </div>
        <MetalPricesTable />
      </div>

      {/* Sekcija za skladišta i proizvodnju */}
      <div className="dashboard-widget">
        <div className="dashboard-widget-header">
          <h3>🏭 Warehouses — Operativni moduli</h3>
          <p className="dashboard-subnote">
            Upravljanje zalihama, prijenosima i proizvodnjom
          </p>
        </div>
        <div className="dashboard-grid small">
          <Link to="/warehouses" className="dashboard-card">
            <span className="dashboard-icon">📦</span>
            <span className="dashboard-label">Warehouse Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
