import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

const BUCKET = "custom-orders";

export default function OrderSketchPreview({ orderId, title = "Latest sketch" }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(false);

  const getPublicUrl = (path) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("v_co_latest_sketch")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setRow(null); setLoading(false); return; }

      const url = data.file_path ? getPublicUrl(data.file_path) : null;
      const thumb = data.thumb_path ? getPublicUrl(data.thumb_path) : null;

      setRow({ ...data, url, thumb });
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

      {row?.url && (
        <>
          <img
            src={row.thumb || row.url}
            alt="sketch"
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
            {new Date(row.created_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
