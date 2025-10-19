// api/sendMail.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, text, attachments } = req.body || {};
  const apiKey = process.env.BREVO_API_KEY;

  if (!to) return res.status(400).json({ error: "Missing 'to' address" });
  if (!apiKey) return res.status(500).json({ error: "BREVO_API_KEY missing" });

  try {
    const payload = {
      sender: { name: "Zlatarna Križek", email: "noreply@krizek.hr" },
      to: Array.isArray(to) ? to.map((e) => ({ email: e })) : [{ email: to }],
      subject: subject || "Poruka",
      htmlContent: html || "",
      textContent: text || "",
    };

    // Opcionalni attachmenti (PDF i sl.)
    if (Array.isArray(attachments) && attachments.length > 0) {
      // Brevo očekuje: [{ name: "file.pdf", content: "BASE64_STRING" }]
      payload.attachment = attachments.map((a) => ({
        name: a.name,
        content: a.content, // Base64 string bez prefiksa
      }));
    }

    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      return res.status(200).json({ success: true });
    }
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || `Mail send failed (${resp.status})`);
  } catch (err) {
    console.error("❌ Brevo API error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
