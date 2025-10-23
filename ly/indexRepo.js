// ly/indexRepo.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // učitaj .env.local
import { createClient } from "@supabase/supabase-js";
import { getEmbedder } from "./embeddingsProvider.js";

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "ly", "project.ly.json");

// ──────────────────────────────────────────────
// Guards
if (!fs.existsSync(manifestPath)) {
  console.error("❌ Missing ly/project.ly.json — create it first.");
  process.exit(1);
}

const MANIFEST = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const SUPABASE_URL = process.env.LY_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.LY_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing LY Supabase envs (LY_SUPABASE_URL, LY_SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ──────────────────────────────────────────────
// Helpers
function walk(dir, ignore = []) {
  const out = [];
  const skipExts = [
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico",
    ".ttf", ".otf", ".woff", ".woff2",
    ".pdf", ".zip", ".gz", ".tar", ".7z", ".rar",
    ".mp3", ".mp4", ".mov", ".avi", ".webm", ".wav"
  ];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = path.relative(ROOT, full);
    const ext = path.extname(item).toLowerCase();
    if ((ignore || []).some((ig) => rel.startsWith(ig) || item === ig)) continue;
    if (skipExts.includes(ext)) continue; // ⛔ skip binary files
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, ignore));
    else out.push(full);
  }
  return out;
}

function chunkText(txt, max = 1600) {
  const lines = txt.split("\n");
  const chunks = [];
  let buf = [], len = 0;
  for (const line of lines) {
    const l = line.length + 1;
    if (len + l > max) { chunks.push(buf.join("\n")); buf = [line]; len = l; }
    else { buf.push(line); len += l; }
  }
  if (buf.length) chunks.push(buf.join("\n"));
  return chunks;
}

async function ensureProject(project_key, name) {
  const { data, error } = await sb
    .from("ly_projects")
    .select("project_key")
    .eq("project_key", project_key)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: insErr } = await sb.from("ly_projects").insert({ project_key, name });
    if (insErr) throw insErr;
  }
}

async function upsertArtifact(project_key, relPath, content) {
  const sha = crypto.createHash("sha1").update(content).digest("hex");

  const { data: existing, error: selErr } = await sb
    .from("ly_artifacts")
    .select("*")
    .eq("project_key", project_key)
    .eq("path", relPath)
    .maybeSingle();
  if (selErr) throw selErr;

  if (!existing) {
    const { data: inserted, error } = await sb
      .from("ly_artifacts")
      .insert({ project_key, path: relPath, content, sha })
      .select()
      .single();
    if (error) throw error;
    const { error: verErr } = await sb
      .from("ly_artifact_versions").insert({ artifact_id: inserted.id, content, sha });
    if (verErr) throw verErr;
    return inserted.id;
  }

  if (existing.sha !== sha) {
    const { data: updated, error } = await sb
      .from("ly_artifacts")
      .update({ content, sha, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    const { error: verErr } = await sb
      .from("ly_artifact_versions").insert({ artifact_id: existing.id, content, sha });
    if (verErr) throw verErr;
    return updated.id;
  }

  return existing.id; // no changes
}

async function embedChunks(project_key, artifact_id, relPath, chunks, tags = []) {
  const embed = await getEmbedder(); // local model (Xenova/all-MiniLM-L6-v2)
  // idempotent refresh for this artifact
  const { error: delErr } = await sb.from("ly_embeddings").delete().eq("artifact_id", artifact_id);
  if (delErr) throw delErr;

  for (let i = 0; i < chunks.length; i++) {
    const vec = await embed(chunks[i]); // Array<number> length ~384
    const { error } = await sb.from("ly_embeddings").insert({
      artifact_id, project_key, path: relPath,
      chunk_index: i, chunk_text: chunks[i], embedding: vec, tags
    });
    if (error) throw error;
  }
}

// ──────────────────────────────────────────────
// Main
(async () => {
  const { project_key, name, index_targets, ignore } = MANIFEST;

  console.log(`🔹 LY Indexer starting for ${project_key} → ${name}`);
  await ensureProject(project_key, name);

  // gather target files
  const targets = [];
  for (const t of index_targets) {
    const p = path.join(ROOT, t);
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) targets.push(...walk(p, ignore || []));
    else targets.push(p);
  }

  for (const full of targets) {
    const rel = path.relative(ROOT, full);

    // Read as UTF-8 and strip accidental NULLs to avoid 22P05
    let content = "";
    try {
      content = fs.readFileSync(full, "utf8");
    } catch {
      // If file is not valid UTF-8, skip it safely
      console.warn(`⚠️ Skipping non-UTF8 file: ${rel}`);
      continue;
    }
    // strip nulls
    if (content.includes("\u0000")) {
      content = content.replace(/\u0000/g, "");
    }

    const artifactId = await upsertArtifact(project_key, rel, content);
    const chunks = chunkText(content, 1600);
    await embedChunks(project_key, artifactId, rel, chunks);
    console.log(`✅ Indexed: ${rel} (${chunks.length} chunks)`);
  }

  console.log("🎉 Index complete for", project_key, "→", name);
})();

// Global catcher so we see real errors
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});
