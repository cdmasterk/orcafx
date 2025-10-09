// api/sendMail.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, text } = req.body;
  const apiKey = process.env.BREVO_API_KEY;

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Zlatarna Križek", email: "noreply@krizek.hr" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (resp.ok) return res.status(200).json({ success: true });
    const data = await resp.json();
    throw new Error(data.message || "Mail send failed");
  } catch (err) {
    console.error("❌ Brevo API error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
