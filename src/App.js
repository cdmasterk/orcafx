import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

// ===== GLAVNE POS STRANICE =====
import POS from "./modules/pos/POS";
import ProductList from "./modules/pos/ProductList";
import Invoices from "./modules/pos/Invoices";

import Dashboard from "./modules/dashboard/Dashboard";
import Login from "./modules/auth/Login";

// ===== OSTALI MODULI =====
import Buyback from "./modules/buyback/Buyback";
import CustomOrders from "./modules/customOrders/CustomOrders";

// ===== ADMIN MODULI =====
import Admin from "./modules/admin/Admin";
import StoreHub from "./modules/admin/StoreHub";
import PosAdmin from "./modules/admin/PosAdmin";
import CompanySettings from "./modules/admin/CompanySettings";
import WarehouseManager from "./modules/admin/WarehouseManager";
import FiscalSettings from "./modules/admin/FiscalSettings";
import BulkImport from "./modules/admin/BulkImport";
import ServiceAdmin from "./modules/admin/ServiceAdmin"; // ✅ NOVO

// ===== REPORTS =====
import SessionsReport from "./modules/admin/SessionsReport";
import DailySalesReport from "./modules/reports/DailySalesReport";
import BankReport from "./modules/admin/BankReport";

import { supabase } from "./supabaseClient"; // ✅ FIX

// 🔔 Toastify
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [user, setUser] = useState(null);

  // provjera usera i auth state listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ako nije logiran, otvori login
  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        {/* 🔔 ToastContainer dostupan i na login screenu */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </>
    );
  }

  // ako je logiran, pokreni aplikaciju sa sidebar layoutom
  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* Redirect root na dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Glavne POS rute */}
          <Route path="/pos" element={<POS />} />
          <Route path="/settings" element={<ProductList />} />

          {/* Reports (flat model) */}
          <Route path="/reports/invoices" element={<Invoices />} />
          <Route path="/reports/sessions" element={<SessionsReport />} />
          <Route path="/reports/daily-sales" element={<DailySalesReport />} />
          <Route path="/reports/bank" element={<BankReport />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Ostali moduli */}
          <Route path="/buyback" element={<Buyback />} />
          <Route path="/custom-orders" element={<CustomOrders />} />

          {/* Admin hub i moduli */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/stores" element={<StoreHub />} />
          <Route path="/admin/pos" element={<PosAdmin />} />
          <Route path="/admin/company" element={<CompanySettings />} />
          <Route path="/admin/warehouse" element={<WarehouseManager />} />
          <Route path="/admin/fiscal/:posId" element={<FiscalSettings />} />
          <Route path="/admin/bulk-import" element={<BulkImport />} />
          <Route path="/admin/services" element={<ServiceAdmin />} /> {/* ✅ NOVO */}

          {/* Fallback */}
          <Route path="*" element={<h2 style={{ padding: 24 }}>404 — Not Found</h2>} />
        </Routes>
      </MainLayout>

      {/* 🔔 Globalni ToastContainer za cijelu app */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
