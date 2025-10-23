import { pipeline } from "@xenova/transformers";

let embedder = null;

export async function getEmbedder() {
  if (embedder) return embedder;

  console.log("🧩 Loading local embedding model (all-MiniLM-L6-v2)...");
  const feature_extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  embedder = async (text) => {
    const output = await feature_extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  };

  return embedder;
}

