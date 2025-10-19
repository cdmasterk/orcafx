import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "./Orders.css";

export default function OrderQuickActions() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_order_files")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setFiles(data || []);
    setLatest(data?.[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line
  }, [orderId]);

  return (
    <div className="order-actions-wrapper fade-in">
      <div className="content-box">
        <div className="actions-header">
          <h2>⚡ Order Actions</h2>
          <div className="actions-top">
            <button
              onClick={() => navigate(`/orders/upload/${orderId}`)}
              className="btn primary"
            >
              📷 Upload Sketch
            </button>
            <button onClick={() => navigate(-1)} className="btn secondary">
              ← Back
            </button>
          </div>
        </div>

        {loading && <p className="small">Loading...</p>}

        {/* === Latest sketch === */}
        {latest && (
          <div className="card">
            <h3>🖼️ Latest Sketch</h3>
            <img
              src={
                supabase.storage
                  .from("custom-orders")
                  .getPublicUrl(latest.file_path).data.publicUrl
              }
              alt="latest sketch"
              className="preview-thumb"
              onClick={() =>
                setPreview(
                  supabase.storage
                    .from("custom-orders")
                    .getPublicUrl(latest.file_path).data.publicUrl
                )
              }
            />
            <div className="meta">
              {new Date(latest.created_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* === All uploaded files === */}
        <div className="card">
          <h3>📎 All Files</h3>
          <div className="thumb-grid">
            {files.map((f) => {
              const thumbUrl = supabase.storage
                .from("custom-orders")
                .getPublicUrl(f.thumb_path || f.file_path).data.publicUrl;
              const fullUrl = supabase.storage
                .from("custom-orders")
                .getPublicUrl(f.file_path).data.publicUrl;
              return (
                <div key={f.id} className="thumb-item">
                  <img
                    src={thumbUrl}
                    alt="thumb"
                    onClick={() => setPreview(fullUrl)}
                  />
                  <div className="meta">
                    {f.kind} • {new Date(f.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          {!files.length && !loading && (
            <p className="small">No files uploaded yet.</p>
          )}
        </div>

        {/* === Lightbox === */}
        {preview && (
          <div className="lightbox" onClick={() => setPreview(null)}>
            <img src={preview} alt="preview" className="lightbox-img" />
          </div>
        )}
      </div>
    </div>
  );
}
