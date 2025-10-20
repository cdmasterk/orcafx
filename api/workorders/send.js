// api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import czsClient from "../../lib/czsClient.js";


const BREVO_API_KEY = process.env.BREVO_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { workOrderId } = req.body;
    if (!workOrderId) throw new Error("Missing workOrderId");

    // 1️⃣ Dohvati radni nalog
    const { data: wo, error } = await supabase
      .from("work_orders")
      .select(
        "id, order_no, customer_name, customer_email, product_type, purity, color, quantity, status, partners"
      )
      .eq("id", workOrderId)
      .single();

    if (error || !wo) throw new Error(`Work order not found: ${workOrderId}`);

    // 2️⃣ Izgradi PDF
    const pdfBytes = await buildPdf(wo);

    // 3️⃣ Pošalji e-mail
    const mailResult = await sendBrevoEmail({ pdfBytes, wo });

    // 4️⃣ Zapiši u bazu
    await supabase.rpc("fn_log_email_result", {
      p_work_order_id: workOrderId,
      p_status: mailResult.sent ? "sent" : "failed",
      p_message: mailResult.message || "No message",
    });

    return res.status(200).json({
      success: true,
      sent: mailResult.sent,
      toList: mailResult.toList,
    });
  } catch (err) {
    console.error("❌ send.js error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// 🧾 PDF Builder
async function buildPdf(wo) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontPath = path.resolve("./public/fonts/NotoSans-Regular.ttf");
  const fontBytes = fs.readFileSync(fontPath);
  const font = await pdfDoc.embedFont(fontBytes);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  page.drawText("Radni nalog", {
    x: 50,
    y: height - 80,
    size: 20,
    font,
    color: rgb(0, 0, 0.6),
  });

  const lines = [
    `Broj naloga: ${wo.order_no || "-"}`,
    `Kupac: ${wo.customer_name || "-"}`,
    `E-mail: ${wo.customer_email || "-"}`,
    `Vrsta proizvoda: ${wo.product_type || "-"}`,
    `Čistoća: ${wo.purity || "-"}`,
    `Boja: ${wo.color || "-"}`,
    `Količina: ${wo.quantity || 1}`,
    `Status: ${wo.status || "-"}`,
  ];

  lines.forEach((line, i) => {
    page.drawText(line, {
      x: 50,
      y: height - 130 - i * 25,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  });

  return await pdfDoc.save();
}

// ✉️ Slanje maila
async function sendBrevoEmail({ pdfBytes, wo }) {
  const internal = (process.env.INTERNAL_PRODUCTION_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const partnerEmails = Array.isArray(wo.partners?.emails)
    ? wo.partners.emails
    : [];

  const toList = [
    ...(wo.customer_email ? [wo.customer_email] : []),
    ...partnerEmails,
    ...internal,
  ].filter(Boolean);

  if (toList.length === 0) {
    return { sent: false, message: "No recipients found", toList };
  }

  const payload = {
    sender: { name: "ORCA Production", email: "noreply@orca.hr" },
    to: toList.map((email) => ({ email })),
    subject: `Radni nalog ${wo.order_no}`,
    htmlContent: `<p>Poštovani,</p>
      <p>U privitku se nalazi radni nalog <b>${wo.order_no}</b>.</p>
      <p>Srdačan pozdrav,<br/>ORCA Production System</p>`,
    attachment: [
      {
        name: `${wo.order_no || "workorder"}.pdf`,
        content: Buffer.from(pdfBytes).toString("base64"),
      },
    ],
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errTxt = await res.text();
    return { sent: false, message: errTxt, toList };
  }

  return { sent: true, message: "Email sent", toList };
}
