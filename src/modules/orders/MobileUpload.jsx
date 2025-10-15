import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function MobileUpload() {
  const { orderId } = useParams();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const canvasRef = useRef(null);

  const compressTo = (blob, maxSide = 1280, quality = 0.8) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSide) {
          height = Math.round(height * (maxSide / width));
          width = maxSide;
        } else if (height >= width && height > maxSide) {
          width = Math.round(width * (maxSide / height));
          height = maxSide;
        }
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => (b ? resolve({ blob: b, width, height }) : reject(new Error("Compress fail"))),
          "image/jpeg",
          quality
        );
        URL.revokeObjectURL(url);
      };
      img.onerror = reject;
      img.src = url;
    });

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result; // "data:image/jpeg;base64,...."
        const [, base64 = ""] = String(dataUrl).split("base64,");
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setServerError("");
    try {
      // 1) original ~1280
      const orig = await compressTo(file, 1280, 0.82);
      const base64 = await blobToBase64(orig.blob);

      // 2) thumb ~320
      const t = await compressTo(file, 320, 0.7);
      const base64Thumb = await blobToBase64(t.blob);

      const filename = `sketch_${Date.now()}.jpg`;
      const thumbname = `sketch_${Date.now()}_thumb.jpg`;

      // ✅ Edge function upload u Storage + DB insert
      const { data, error } = await supabase.functions.invoke("co-upload", {
        body: {
          orderId,
          kind: "SKETCH",
          original: {
            filename,
            base64,
            contentType: "image/jpeg",
            width: orig.width,
            height: orig.height,
          },
          thumb: {
            filename: thumbname,
            base64: base64Thumb,
            contentType: "image/jpeg",
            width: t.width,
            height: t.height,
          }
        },
      });

      if (error) throw error;

      alert("✅ Uploaded");
      setFile(null);
    } catch (e) {
      const msg = e?.message || e?.error || String(e);
      setServerError(msg);
      alert("❌ " + msg);
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>📷 Upload Sketch</h2>
      <p>Order: <b>{orderId}</b></p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 8 }}>
        <button onClick={upload} disabled={!file || busy} style={btn}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>

      {serverError ? (
        <div style={errBox}>Server error: {serverError}</div>
      ) : null}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const btn = {
  border: "1px solid #e5e7eb",
  background: "#111827",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
};
const errBox = {
  marginTop: 10,
  padding: 10,
  borderRadius: 8,
  background: "#FEF2F2",
  color: "#991B1B",
  border: "1px solid #FECACA",
  fontSize: 13,
  wordBreak: "break-word",
};
