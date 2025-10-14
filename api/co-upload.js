// /api/co-upload.js
import { createClient } from "@supabase/supabase-js";

// ❗️Postavi ove varijable u Vercel Project Settings → Environment Variables
// SUPABASE_URL = https://<YOUR-REF>.supabase.co
// SUPABASE_SERVICE_ROLE = <SERVICEROLE JWT that starts with eyJ...>

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// ✅ Valid bucket name (bez underscore!)
const BUCKET = "custom-orders";

// 15 MB u bajtovima
const FIFTEEN_MB = 15 * 1024 * 1024;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env",
      });
    }

    const { orderId, filename, contentType = "image/jpeg", base64 } = req.body || {};
    if (!orderId || !filename || !base64) {
      return res.status(400).json({ error: "Missing orderId | filename | base64" });
    }

    // 1) Ensure bucket exists (name mora biti bez underscore!)
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) return res.status(500).json({ error: "listBuckets: " + listErr.message });

    const exists = (buckets || []).some((b) => b.name === BUCKET);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: FIFTEEN_MB, // broj u bajtovima
        allowedMimeTypes: ["image/jpeg", "image/png", "image/heic", "image/heif"],
      });
      if (createErr) return res.status(500).json({ error: "createBucket: " + createErr.message });
    }

    // 2) Upload (folder po orderu)
    const buffer = Buffer.from(base64, "base64");
    const path = `${orderId}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (upErr) return res.status(500).json({ error: "upload: " + upErr.message });

    // 3) Insert DB record u custom_order_files
    //    (pretpostavka: tablica postoji sa: order_id uuid, file_path text, kind text)
    const { error: insErr } = await supabase
      .from("custom_order_files")
      .insert({ order_id: orderId, file_path: path, kind: "SKETCH" });

    if (insErr) return res.status(500).json({ error: "insert: " + insErr.message });

    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
