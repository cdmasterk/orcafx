import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function MobileUpload() {
  const { orderId } = useParams();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const canvasRef = useRef(null);

  // 🔹 Kompresija slike prije slanja
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

  // 🔹 Pretvori blob u base64
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

  // 🔹 Upload funkcija
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setServerError("");

    try {
      const orig = await compressTo(file, 1280, 0.82);
      const base64 = await blobToBase64(orig.blob);

      const t = await compressTo(file, 320, 0.7);
      const base64Thumb = await blobToBase64(t.blob);

      const filename = `sketch_${Date.now()}.jpg`;
      const thumbname = `sketch_${Date.now()}_thumb.jpg`;

      const { data, error } = await supabase.functions.invoke("co-upload", {
        body: {
          xOrigin: window.location.origin,
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
          },
        },
      });

      if (error) throw error;

      alert("✅ Upload uspješan!");
      setFile(null);
    } catch (e) {
      const msg = e?.message || e?.error || String(e);
      setServerError(msg);
      alert("❌ " + msg);
    }

    setBusy(false);
  };

  return (
    <div style={container}>
      <h2 style={title}>📷 Upload Sketch</h2>
      <p>Order: <b>{orderId}</b></p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={input}
      />

      <button onClick={upload} disabled={!file || busy} style={btn}>
        {busy ? "Uploading…" : "Upload"}
      </button>

      {serverError && <div style={errBox}>❌ {serverError}</div>}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

const container = {
  padding: 20,
  textAlign: "center",
  maxWidth: 480,
  margin: "0 auto",
};

const title = {
  fontSize: 22,
  marginBottom: 12,
};

const input = {
  marginTop: 12,
  marginBottom: 12,
  width: "100%",
};

const btn = {
  border: "none",
  background: "#111827",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  width: "100%",
  fontSize: 16,
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
