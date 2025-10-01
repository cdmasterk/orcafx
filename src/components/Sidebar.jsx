import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">ORCA ERP</h1>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/pos">🖥️ POS</Link>
          </li>
          <li>
            <Link to="/dashboard">📊 Dashboard</Link>
          </li>
          <li>
            <Link to="/buyback">💰 Otkup</Link>
          </li>
          <li>
            <Link to="/custom-orders">📑 Custom narudžbe</Link>
        
          </li>
          <li>
  <NavLink to="/reports/sessions">
    📊 Smjene
  </NavLink>
</li>
        </ul>
      </nav>

      {/* Admin link na dnu */}
      <div className="sidebar-bottom">
        <Link to="/admin">⚙️ Admin</Link>
      </div>
    </aside>
  );
}
