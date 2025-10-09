// testEmail.js
const nodemailer = require("nodemailer");
require("dotenv").config({ path: ".env.local" });

async function sendTestEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ORCA Test" <noreply@brevo-mail.com>`,
      to: "kkrnjevi@gmail.com", // zamijeni sa svojim mailom
      subject: "🧪 ORCA Test Email",
      text: "Ovo je test email poslan iz ORCA sustava preko Brevo SMTP-a.",
      html: `
        <div style="font-family:sans-serif;color:#222;">
          <h3>🧪 ORCA Test Email</h3>
          <p>Ovo je test poruka iz <b>ORCA sustava</b> poslana putem Brevo SMTP servera.</p>
          <p>Ako vidiš ovaj mail u inboxu — sve radi ispravno ✅</p>
          <p style="font-size:12px;color:#777;">ORCA Notification Service</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("📨 Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

sendTestEmail();
