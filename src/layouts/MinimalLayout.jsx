import React from "react";

export default function MinimalLayout({ children }) {
  return (
    <div style={wrap}>
      <main style={main}>{children}</main>
    </div>
  );
}

const wrap = {
  minHeight: "100vh",
  background: "#fafafa",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",
};

const main = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  padding: 16,
};
