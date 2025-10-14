import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";

export default function MobileUpload() {
  const { orderId } = useParams();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);

  const compress = (blob) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const max = 1600;
        let { width, height } = img;
        if (width > height && width > max) {
          height = Math.round(height * (max / width));
          width = max;
        } else if (height >= width && height > max) {
          width = Math.round(width * (max / height));
          height = max;
        }
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Compress fail"));
          },
          "image/jpeg",
          0.8
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
    try {
      const blob = await compress(file);
      const base64 = await blobToBase64(blob);
      const filename = `sketch_${Date.now()}.jpg`;

      const res = await fetch("/api/co-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          filename,
          contentType: "image/jpeg",
          base64,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      alert("✅ Uploaded");
      setFile(null);
    } catch (e) {
      alert("❌ " + (e.message || e));
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>📷 Upload Sketch</h2>
      <p>Order: {orderId}</p>

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
