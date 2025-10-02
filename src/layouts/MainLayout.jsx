import React from "react";
import { Link } from "react-router-dom";
import "./MainLayout.css";
import Navbar from "../components/Navbar";

export default function MainLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-top">
            <h2>ORCA</h2>
            <nav>
              <Link to="/pos">💳 POS</Link>
              <Link to="/dashboard">📊 Dashboard</Link>
              <Link to="/buyback">🔄 Otkup</Link>
              <Link to="/custom-orders">📐 Custom narudžbe</Link>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <Link to="/admin">⚙️ Admin</Link>
          </div>
        </aside>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
