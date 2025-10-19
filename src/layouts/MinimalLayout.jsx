// src/layouts/MinimalLayout.jsx
import React from "react";
export default function MinimalLayout({ children }) {
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
