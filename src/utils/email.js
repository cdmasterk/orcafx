// src/utils/email.js
import nodemailer from "nodemailer";

export async function sendNotificationEmail(to, subject, html, text = "") {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const primarySender = `"Zlatarna Križek" <noreply@krizek.hr>`;
    const fallbackSender = `"Zlatarna Križek" <noreply@brevo-mail.com>`;

    const info = await transporter.sendMail({
      from: primarySender,
      to,
      subject,
      text: text || "Automatska poruka iz ORCA sustava.",
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    return { success: false, error: err.message };
  }
}
