// src/modules/orders/OrderFilesList.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function OrderFilesList({ orderId }) {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState(null); // aktivni preview
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_order_files")
        .select("id, filename, content_type, content, size_bytes, kind, created_at")
        .eq("order_id", orderId)
        .not("content", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Pretvori bytea (base64) kao data URL
      const list = (data || []).map((f) => ({
        ...f,
        src: f.content ? `data:${f.content_type};base64,${f.content}` : null,
      }));
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
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
        <h3 style={{ margin: 0 }}>📎 Files</h3>
        <button className="btn" onClick={load} disabled={loading}>{loading ? "…" : "🔄"}</button>
      </div>

      {rows.length === 0 && !loading && (
        <div className="small muted" style={{ marginTop: 6 }}>No files.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 10 }}>
        {rows.map((f) => (
          <div
            key={f.id}
            className="card"
            style={{ padding: 8, cursor: "pointer" }}
            onClick={() => setActive(f)}
            title={`${f.filename} (${f.kind})`}
          >
            {f.src ? (
              <img
                src={f.src}
                alt={f.filename}
                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div className="small">No preview</div>
            )}
            <div className="small" style={{ marginTop: 6 }}>
              <b style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {f.filename}
              </b>
              <span className="muted">{f.kind} • {new Date(f.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal preview */}
      {active && (
        <div style={overlay} onClick={() => setActive(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 600 }}>{active.filename}</div>
              <button className="btn" onClick={() => setActive(null)}>Close</button>
            </div>
            {active.src ? (
              <img
                src={active.src}
                alt={active.filename}
                style={{ display: "block", width: "100%", maxHeight: "70vh", objectFit: "contain", marginTop: 10 }}
              />
            ) : (
              <div className="small">No preview</div>
            )}
            <div className="small muted" style={{ marginTop: 6 }}>
              {active.kind} • {new Date(active.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modal = {
  width: "min(100%, 920px)",
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  padding: 12,
};
