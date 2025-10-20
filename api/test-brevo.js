// api/test-brevo.js
export default async function handler(req, res) {
  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: "noreply@krizek.hr", name: "ORCAFX ERP Test" },
        to: [{ email: "kkrnjevi@gmail.com" }], // ⬅️ stavi svoj email za test
        subject: "🔧 ORCAFX Brevo test",
        htmlContent: "<p>Ovo je test poruka sa Vercel servera.</p>",
      }),
    });

    const text = await response.text();
    console.log("📩 Brevo response:", text);

    if (!response.ok) throw new Error(`Brevo returned ${response.status}: ${text}`);
    return res.status(200).json({ ok: true, msg: "✅ Mail poslan", response: JSON.parse(text) });
  } catch (e) {
    console.error("❌ Test Brevo error:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
