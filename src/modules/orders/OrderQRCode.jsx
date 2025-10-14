// src/modules/orders/OrderQRCode.jsx
import React, { useMemo, useState } from "react";
import { getAppBaseUrl, getAppBaseUrlDebug } from "../../utils/appBaseUrl";

export default function OrderQRCode({ orderId, onClose }) {
  const [override, setOverride] = useState("");
  const base = getAppBaseUrl();
  const debug = getAppBaseUrlDebug();

  const url = useMemo(() => `${base}/orders/upload/${orderId}`, [base, orderId]);
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  const saveOverride = () => {
    try {
      if (!override.trim()) return;
      const v = override.trim().replace(/\/$/, "");
      window.localStorage.setItem("orca_base_url_override", v);
      window.location.reload();
    } catch {}
  };

  const resetOverride = () => {
    try {
      window.localStorage.removeItem("orca_base_url_override");
      window.location.reload();
    } catch {}
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>📷 Upload Sketch (QR)</h3>

        <img src={qrImg} alt="QR code" width={220} height={220} style={{ display: "block", marginBottom: 8 }} />

        <div style={{ fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>{url}</div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => navigator.clipboard?.writeText?.(url)}
            style={btn}
            title="Copy link"
          >
            🔗 Copy link
          </button>
          <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button style={btn}>↗ Open</button>
          </a>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={btn}>Close</button>
        </div>

        {/* Debug & override panel */}
        <div style={debugBox}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Base URL</div>
          <div className="small">Using: <b>{base}</b></div>

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              className="input"
              placeholder="https://orcafx.vercel.app ili http://192.168.178.20:3000"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              style={{ flex: 1 }}
            />
            <button style={btn} onClick={saveOverride}>Save</button>
            <button style={btn} onClick={resetOverride}>Reset</button>
          </div>

          <details style={{ marginTop: 8 }}>
            <summary className="small">Debug info</summary>
            <pre style={pre}>
{JSON.stringify(debug, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 };
const modal   = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, width: 420, maxWidth: "95vw" };
const btn     = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "8px 10px", cursor: "pointer" };
const debugBox= { marginTop: 12, borderTop: "1px dashed #e5e7eb", paddingTop: 10 };
const pre     = { fontSize: 11, background: "#f9fafb", border: "1px solid #e5e7eb", padding: 8, borderRadius: 8, maxHeight: 160, overflow: "auto" };
