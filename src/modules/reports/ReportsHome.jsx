import React from "react";
import { Link } from "react-router-dom";
import "./ReportsHome.css";

export default function ReportsHome() {
  const reports = [
    { path: "/reports", label: "Računi", icon: "📄" },
    { path: "/reports/sessions", label: "Smjene", icon: "📊" },
    { path: "/dashboard", label: "Home", icon: "🏠" },
  ];

  return (
    <div className="reports-container">
      <h2 className="reports-title">📑 Reports</h2>
      <p className="reports-subtitle">Odaberi tip izvještaja:</p>

      <div className="reports-grid">
        {reports.map((r) => (
          <Link key={r.path} to={r.path} className="reports-card">
            <span className="reports-icon">{r.icon}</span>
            <span className="reports-label">{r.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
