import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

// ===== GLAVNE POS STRANICE =====
import POS from "./modules/pos/POS";
import ProductList from "./modules/pos/ProductList";
import Invoices from "./modules/pos/Invoices";

// ===== GLAVNE Finance STRANICE =====
import FinanceDashboard from "./modules/finance/FinanceDashboard";

// ===== DASHBOARD & AUTH =====
import Dashboard from "./modules/dashboard/Dashboard";
import Login from "./modules/auth/Login";

// ===== OSTALI MODULI =====
import Buyback from "./modules/buyback/Buyback";
import CustomOrders from "./modules/customOrders/CustomOrders";

// ===== WAREHOUSE MODULI =====
import WarehouseOverview from "./modules/warehouses/WarehouseOverview";
import WarehouseSummary from "./modules/warehouses/WarehouseSummary";
import WarehouseHub from "./modules/warehouses/WarehouseHub";
import WarehouseManager from "./modules/warehouses/WarehouseManager";
import WarehouseDashboard from "./modules/warehouses/WarehouseDashboard";
import WarehouseProcurement from "./modules/warehouses/WarehouseProcurement";
import WarehouseTransfer from "./modules/warehouses/WarehouseTransfer";
import StockOverview from "./modules/warehouses/StockOverview"; // ✅ dodatno

// ===== ADMIN MODULI =====
import Admin from "./modules/admin/Admin";
import StoreHub from "./modules/admin/StoreHub";
import PosAdmin from "./modules/admin/PosAdmin";
import CompanySettings from "./modules/admin/CompanySettings";
import FiscalSettings from "./modules/admin/FiscalSettings";
import BulkImport from "./modules/admin/BulkImport";
import ServiceAdmin from "./modules/admin/ServiceAdmin";
import AdminStock from "./modules/admin/AdminStock";
import AdminStockSummary from "./modules/admin/AdminStockSummary";
import ProductCodeRulesManager from "./modules/admin/ProductCodeRulesManager";
import ProductImport from "./modules/admin/ProductImport";
import SessionsReport from "./modules/admin/SessionsReport";
import BankReport from "./modules/admin/BankReport";
import PriceTiersManager from "./modules/admin/PriceTiersManager";
import RepairCatalog from "./modules/admin/RepairCatalog";

// ===== REPORTS =====
import DailySalesReport from "./modules/reports/DailySalesReport";

// ===== SUPABASE =====
import { supabase } from "./supabaseClient";

// ===== TOASTIFY =====
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [user, setUser] = useState(null);

  // ✅ Provjera user sessiona
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ✅ Ako nije logiran — prikaz login screena
  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
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

  // ✅ Ako je logiran — glavni layout
  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* Redirect root na dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Glavne POS rute */}
          <Route path="/pos" element={<POS />} />
          <Route path="/settings" element={<ProductList />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Ostali moduli */}
          <Route path="/buyback" element={<Buyback />} />
          <Route path="/custom-orders" element={<CustomOrders />} />

          {/* Reports */}
          <Route path="/reports/invoices" element={<Invoices />} />
          <Route path="/reports/sessions" element={<SessionsReport />} />
          <Route path="/reports/daily-sales" element={<DailySalesReport />} />
          <Route path="/reports/bank" element={<BankReport />} />
          
          {/* Finance */}
          <Route path="/finance" element={<FinanceDashboard />} />

          {/* Admin hub i moduli */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/stores" element={<StoreHub />} />
          <Route path="/admin/pos" element={<PosAdmin />} />
          <Route path="/admin/company" element={<CompanySettings />} />
          <Route path="/admin/fiscal/:posId" element={<FiscalSettings />} />
          <Route path="/admin/bulk-import" element={<BulkImport />} />
          <Route path="/admin/services" element={<ServiceAdmin />} />
          <Route path="/admin/stock" element={<AdminStock />} />
          <Route path="/admin/stock-summary" element={<AdminStockSummary />} />
          <Route path="/admin/product-codes" element={<ProductCodeRulesManager />} />
          <Route path="/admin/product-import" element={<ProductImport />} />

          {/* ===== WAREHOUSES ===== */}
          <Route path="/warehouses" element={<WarehouseHub />} />
          <Route path="/warehouses/dashboard" element={<WarehouseDashboard />} />
          <Route path="/warehouses/overview" element={<WarehouseOverview />} />
          <Route path="/warehouses/summary" element={<WarehouseSummary />} />
          <Route path="/warehouses/manage" element={<WarehouseManager />} />
          <Route path="/warehouses/procurement" element={<WarehouseProcurement />} />
          <Route path="/warehouses/transfer" element={<WarehouseTransfer />} />

          {/* ===== DODATNE RUTE IZ ADMINA ===== */}
          <Route path="/warehouses/stock-overview" element={<StockOverview />} />
          <Route path="/warehouses/stock-summary" element={<AdminStockSummary />} />
          <Route path="/warehouses/product-import" element={<ProductImport />} />
          <Route path="/warehouses/bulk-import" element={<BulkImport />} />
          <Route path="/warehouses/product-codes" element={<ProductCodeRulesManager />} />
          <Route path="/warehouses/service-admin" element={<ServiceAdmin />} />
          <Route path="/admin/price-tiers" element={<PriceTiersManager />} />
          <Route path="/admin/repair-catalog" element={<RepairCatalog />} />


          {/* Fallback */}
          <Route path="*" element={<h2 style={{ padding: 24 }}>404 — Not Found</h2>} />
        </Routes>
      </MainLayout>

      {/* 🔔 Globalni ToastContainer */}
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
