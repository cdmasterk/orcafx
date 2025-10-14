import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function MobileUpload() {
  const { orderId } = useParams();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  const compress = (blob) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const max = 1600;
      let { width, height } = img;
      if (width > height && width > max) { height = Math.round(height * (max/width)); width = max; }
      else if (height >= width && height > max) { width = Math.round(width * (max/height)); height = max; }
      const canvas = canvasRef.current;
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error("Compress fail")); }, "image/jpeg", 0.8);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compress(file);
      const filename = `sketch_${Date.now()}.jpg`;
      const path = `${orderId}/${filename}`;
      const { error: upErr } = await supabase.storage.from("custom_orders").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      await supabase.from("custom_order_files").insert({ order_id: orderId, file_path: path, kind: "SKETCH" });
      alert("✅ Uploaded");
      setFile(null);
    } catch (e) {
      alert("❌ " + (e.message || e));
    }
    setBusy(false);
  };

  return (
    <div style={{ padding:16 }}>
      <h2>📷 Upload Sketch</h2>
      <p>Order: {orderId}</p>
      <input type="file" accept="image/*" capture="environment" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
      <div style={{ marginTop:8 }}>
        <button onClick={upload} disabled={!file || busy} style={btn}>{busy ? "Uploading…" : "Upload"}</button>
      </div>
      <canvas ref={canvasRef} style={{ display:"none" }} />
    </div>
  );
}

const btn = { border:"1px solid #e5e7eb", background:"#111827", color:"#fff", borderRadius:10, padding:"8px 12px", cursor:"pointer" };
