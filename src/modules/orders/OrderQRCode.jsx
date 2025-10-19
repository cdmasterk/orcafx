import React, { useMemo, useState } from "react";
import { getAppBaseUrl, getAppBaseUrlDebug } from "../../utils/appBaseUrl";

export default function OrderQRCode({ orderId, onClose }) {
  const [override, setOverride] = useState("");
  const base = getAppBaseUrl();
  const debug = getAppBaseUrlDebug();

  const url = useMemo(() => `${base}/orders/upload/${orderId}`, [base, orderId]);
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    url
  )}`;

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

        <img
          src={qrImg}
          alt="QR code"
          width={220}
          height={220}
          style={{ display: "block", margin: "0 auto 8px auto" }}
        />

        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            wordBreak: "break-all",
            textAlign: "center",
          }}
        >
          {url}
        </div>

        {/* ---- Main action buttons ---- */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigator.clipboard?.writeText?.(url)}
            className="bg-[#0070f3] text-white px-4 py-2 rounded-lg hover:bg-[#0059c9] transition"
            title="Copy link"
          >
            🔗 Copy Link
          </button>

          <a href={url} target="_blank" rel="noreferrer">
            <button className="bg-[#0070f3] text-white px-4 py-2 rounded-lg hover:bg-[#0059c9] transition">
              ↗ Open
            </button>
          </a>

          <button
            onClick={onClose}
            className="bg-[#0070f3] text-white px-4 py-2 rounded-lg hover:bg-[#0059c9] transition"
          >
            ✖ Close
          </button>
        </div>

        {/* ---- Debug & override panel ---- */}
        <div style={debugBox}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Base URL</div>
          <div style={{ fontSize: 12 }}>
            Using: <b>{base}</b>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
              placeholder="https://orcafx.vercel.app ili http://192.168.178.20:3000"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
            />
            <button
              onClick={saveOverride}
              className="bg-[#0070f3] text-white px-3 py-1 rounded-lg hover:bg-[#0059c9] transition text-sm"
            >
              Save
            </button>
            <button
              onClick={resetOverride}
              className="bg-[#0070f3] text-white px-3 py-1 rounded-lg hover:bg-[#0059c9] transition text-sm"
            >
              Reset
            </button>
          </div>

          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, color: "#6b7280" }}>
              Debug info
            </summary>
            <pre style={pre}>{JSON.stringify(debug, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};

const modal = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  width: 420,
  maxWidth: "95vw",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
};

const debugBox = {
  marginTop: 16,
  borderTop: "1px dashed #e5e7eb",
  paddingTop: 10,
  fontSize: 12,
  color: "#374151",
};

const pre = {
  fontSize: 11,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  padding: 8,
  borderRadius: 8,
  maxHeight: 160,
  overflow: "auto",
};
