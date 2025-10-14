// /api/co-upload.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // server-side only!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orderId, filename, contentType = "image/jpeg", base64 } = req.body || {};
    if (!orderId || !filename || !base64) {
      return res.status(400).json({ error: "Missing orderId | filename | base64" });
    }

    const bucket = "custom_orders";

    // 1) Ensure bucket exists
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) return res.status(500).json({ error: listErr.message });

    const exists = (buckets || []).some((b) => b.name === bucket);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: "15MB",
      });
      if (createErr) return res.status(500).json({ error: createErr.message });
    }

    // 2) Upload file
    const buffer = Buffer.from(base64, "base64");
    const path = `${orderId}/${filename}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: true });

    if (upErr) return res.status(500).json({ error: upErr.message });

    // 3) Insert DB record
    const { error: insErr } = await supabase
      .from("custom_order_files")
      .insert({ order_id: orderId, file_path: path, kind: "SKETCH" });

    if (insErr) return res.status(500).json({ error: insErr.message });

    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
