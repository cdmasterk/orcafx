// api/health.js
export default async function handler(req, res) {
  try {
    const uptime = process.uptime().toFixed(0);
    const now = new Date().toISOString();

    return res.status(200).json({
      status: "ok",
      service: "ORCAFX Core",
      time: now,
      uptime_seconds: uptime,
      environment: process.env.VERCEL_ENV || "local",
      region: process.env.VERCEL_REGION || "unknown",
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return res.status(500).json({
      status: "error",
      message: err.message || "Unknown error",
    });
  }
}
