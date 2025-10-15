// src/modules/orders/OrderSketchViewer.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./OrderSketchViewer.css";

export default function OrderSketchViewer({ orderId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_order_files")
      .select("id, file_path, thumb_path, kind, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setFiles([]);
    } else setFiles(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [orderId]);

  return (
    <div className="sketch-viewer">
      <div className="sketch-header">
        <h3>🖼️ Skice / Prilozi</h3>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "…" : "🔄 Refresh"}
        </button>
      </div>

      {!files.length && <p className="muted">Nema priloženih datoteka.</p>}

      <div className="sketch-grid">
        {files.map((f) => {
          const thumbUrl = supabase.storage
            .from("custom-orders")
            .getPublicUrl(f.thumb_path || f.file_path).data.publicUrl;
          return (
            <div
              key={f.id}
              className="sketch-thumb"
              onClick={() => setSelected(thumbUrl)}
              title={`${f.kind || "file"} • ${new Date(f.created_at).toLocaleString()}`}
            >
              <img src={thumbUrl} alt="Sketch" loading="lazy" />
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="sketch-modal" onClick={() => setSelected(null)}>
          <img src={selected} alt="Full" className="sketch-modal-img" />
          <div className="sketch-modal-close">✖</div>
        </div>
      )}
    </div>
  );
}
