import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

const BUCKET = "custom-orders";

export default function OrderFilesList({ orderId }) {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(false);

  const getPublicUrl = (path) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_order_files")
        .select("id, file_path, thumb_path, content, content_type, size_bytes, kind, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const list = (data || []).map((f) => {
        if (f.file_path) {
          return { ...f, url: getPublicUrl(f.file_path), thumb: f.thumb_path ? getPublicUrl(f.thumb_path) : null };
        } else if (f.content) {
          // legacy bytea
          const src = `data:${f.content_type};base64,${f.content}`;
          return { ...f, url: src, thumb: src };
        }
        return { ...f, url: null, thumb: null };
      });
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { if (orderId) load(); /* eslint-disable-next-line */ }, [orderId]);

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
            title={`${f.file_path || "inline"} (${f.kind})`}
          >
            {f.thumb ? (
              <img
                src={f.thumb}
                alt="thumb"
                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div className="small">No preview</div>
            )}
            <div className="small" style={{ marginTop: 6 }}>
              <span className="muted">{f.kind} • {new Date(f.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div style={overlay} onClick={() => setActive(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 600 }}>
                {active.file_path ? active.file_path.split("/").pop() : "inline"}
              </div>
              <button className="btn" onClick={() => setActive(null)}>Close</button>
            </div>
            {active.url ? (
              <img
                src={active.url}
                alt="full"
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
