import React, { useState } from "react";
import "./Orders.css";
import CustomOrderForm from "./CustomOrderForm";
import CustomOrdersTable from "./CustomOrdersTable";
import OrdersBoard from "./OrdersBoard.jsx";
import WorkOrderForm from "./WorkOrderForm";
import WorkOrdersTable from "./WorkOrdersTable";
import "./WorkOrder.css";

export default function CustomOrdersPage() {
  // ⬇️ default otvoren tab je "orders"
  const [active, setActive] = useState("orders");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshWorkOrders, setRefreshWorkOrders] = useState(0);

  return (
    <div className="orders-page">
      {/* -------------------- Tabs Navigation -------------------- */}
      <div className="orders-tabs">
        <button
          className={`orders-tab ${active === "create" ? "active" : ""}`}
          onClick={() => setActive("create")}
        >
          Create
        </button>
        <button
          className={`orders-tab ${active === "orders" ? "active" : ""}`}
          onClick={() => setActive("orders")}
        >
          Orders
        </button>
        <button
          className={`orders-tab ${active === "board" ? "active" : ""}`}
          onClick={() => setActive("board")}
        >
          Board (beta)
        </button>
        <button
          className={`orders-tab ${active === "workorders" ? "active" : ""}`}
          onClick={() => setActive("workorders")}
        >
          ⚙️ Work Orders
        </button>
      </div>

      {/* -------------------- Create Custom Order -------------------- */}
      {active === "create" && (
        <CustomOrderForm onCreated={() => setRefreshKey((k) => k + 1)} />
      )}

      {/* -------------------- Orders List -------------------- */}
      {active === "orders" && <CustomOrdersTable refreshKey={refreshKey} />}

      {/* -------------------- Orders Board -------------------- */}
      {active === "board" && <OrdersBoard />}

      {/* -------------------- Work Orders Section -------------------- */}
      {active === "workorders" && (
        <div className="workorders-tab">
          <h2 className="page-title">⚙️ Radni Nalozi</h2>
          <WorkOrderForm
            onCreated={() => setRefreshWorkOrders((prev) => prev + 1)}
          />
          <WorkOrdersTable refreshKey={refreshWorkOrders} />
        </div>
      )}
    </div>
  );
}
