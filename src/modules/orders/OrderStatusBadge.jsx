import React from "react";
import "./Orders.css";
export default function OrderStatusBadge({ status }) {
  const s = status || "PENDING";
  return <span className={`badge ${s}`}>{s.replace("_"," ")}</span>;
}
