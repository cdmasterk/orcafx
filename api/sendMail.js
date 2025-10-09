// api/sendMail.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, text } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // primarni pošiljatelj (tvoja domena); DKIM/SPF kroz Brevo
    const fromPrimary = `"Zlatarna Križek" <noreply@krizek.hr>`;

    await transporter.sendMail({
      from: fromPrimary,
      to,
      subject,
      text: text || "Automatska poruka iz ORCA sustava.",
      html,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
