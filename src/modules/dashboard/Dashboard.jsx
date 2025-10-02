import React from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import MetalPricesCharts from "../reports/MetalPricesCharts"; // ✅ grafovi FX stil
import MetalPricesTable from "../reports/MetalPricesTable";   // ✅ tablica ispod

export default function Dashboard() {
  const shortcuts = [
    { path: "/pos", label: "Sales (POS)", icon: "🖥️" },
    { path: "/reports", label: "Reports", icon: "📊" },
    { path: "/reports/bank", label: "Bank Report", icon: "🏦" },
    { path: "/service", label: "Service", icon: "🔧" },
    { path: "/buyback", label: "Buyback", icon: "💰" },
    { path: "/custom-orders", label: "Custom Orders", icon: "📑" },
    { path: "/admin", label: "Admin Hub", icon: "⚙️" },
  ];

  return (
    <div className="dashboard-container">
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

      {/* Grafovi burzovni stil */}
      <div className="dashboard-widget">
        <MetalPricesCharts />
      </div>

      {/* Tablica ispod grafova */}
      <div className="dashboard-widget">
        <div className="dashboard-widget-header">
          <h3>📋 Metal Prices — Tablica</h3>
        </div>
        <MetalPricesTable />
      </div>
    </div>
  );
}
