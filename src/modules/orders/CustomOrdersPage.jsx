import React, { useState } from "react";
import "./Orders.css";
import CustomOrderForm from "./CustomOrderForm";
import CustomOrdersTable from "./CustomOrdersTable";
import OrdersBoard from "./OrdersBoard.jsx";

export default function CustomOrdersPage() {
  // ⬇️ default otvoren tab je "orders"
  const [active, setActive] = useState("orders");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="orders-page">
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
      </div>

      {active === "create" && (
        <CustomOrderForm onCreated={() => setRefreshKey((k) => k + 1)} />
      )}
      {active === "orders" && <CustomOrdersTable refreshKey={refreshKey} />}
      {active === "board" && <OrdersBoard />}
    </div>
  );
}
