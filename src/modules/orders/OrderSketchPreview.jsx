// src/modules/orders/OrderSketchPreview.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function OrderSketchPreview({ orderId, title = "Latest sketch" }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("v_co_latest_sketch")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      setRow(data || null);
    } catch (e) {
      console.error(e);
      setRow(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ margin: 0 }}>🖼️ {title}</h3>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "…" : "🔄 Refresh"}
        </button>
      </div>

      {!row && !loading && (
        <div className="small muted" style={{ marginTop: 8 }}>No sketch uploaded yet.</div>
      )}

      {row && (
        <>
          <img
            src={`data:${row.content_type};base64,${row.content_b64}`}
            alt={row.filename}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              borderRadius: 12,
              marginTop: 8,
              objectFit: "contain",
            }}
          />
          <div className="small muted" style={{ marginTop: 6 }}>
            {row.filename} • {new Date(row.created_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
