import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./OrderSketchViewer.css";

export default function OrderSketchViewer({ orderId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  // ✅ Helper za sigurno dohvaćanje javnog URL-a
  const getImageUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from("custom-orders").getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const load = async () => {
    if (!orderId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("custom_order_files")
      .select("id, file_path, thumb_path, kind, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Greška kod učitavanja:", error.message);
      setFiles([]);
    } else {
      setFiles(data || []);
    }

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

      {!files.length && (
        <p className="muted">Nema priloženih datoteka za ovu narudžbu.</p>
      )}

      <div className="sketch-grid">
        {files.map((f) => {
          const thumbUrl = getImageUrl(f.thumb_path || f.file_path);
          if (!thumbUrl) return null;
          return (
            <div
              key={f.id}
              className="sketch-thumb"
              onClick={() => setSelected(getImageUrl(f.file_path))}
              title={`${f.kind || "Datoteka"} • ${new Date(
                f.created_at
              ).toLocaleString()}`}
            >
              <img
                src={thumbUrl}
                alt="Sketch"
                loading="lazy"
                onError={(e) => (e.target.style.display = "none")}
              />
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
