// /api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import czsClient from "../../src/lib/czsClient.js"; // ✅ točan path

// ✅ Environment
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { workOrderId, customerEmail, customerName } = req.body;

    // 1️⃣ Fetch iz točne tablice
    const { data: order, error } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (error || !order) {
      await czsClient.log(`DB error: ${error?.message}`);
      return res.status(400).json({ error: "Nalog nije pronađen." });
    }

    // 2️⃣ PDF
    const pdfBytes = await generateWorkOrderPDF(order);
    const pdfPath = path.join("/tmp", `workorder_${order.repair_no}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);

    // 3️⃣ Upload u Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(`workorders/${order.repair_no}.pdf`, fs.readFileSync(pdfPath), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) await czsClient.log(`Upload error: ${uploadError.message}`);

    // 4️⃣ Slanje maila (Brevo)
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Goldschmiede Krizek" <${SMTP_USER}>`,
      to: customerEmail,
      subject: `Radni nalog #${order.repair_no}`,
      text: `Poštovani ${customerName},\n\nVaš nalog (${order.description}) je spreman.\n\nSrdačan pozdrav,\nGoldschmiede Krizek`,
      attachments: [{ filename: `radni_nalog_${order.repair_no}.pdf`, path: pdfPath }],
    });

    await czsClient.log(`Mail poslan: ${order.repair_no}`);

    return res.status(200).json({ success: true, message: "Mail poslan i PDF spremljen." });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    await czsClient.log(`Server error: ${err.message}`);
    return res.status(500).json({ error: "Greška na serveru." });
  }
}

// 🔹 PDF generator
async function generateWorkOrderPDF(order) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lines = [
    `Radni nalog #${order.repair_no}`,
    `Kupac: ${order.customer_name}`,
    `Opis: ${order.description}`,
    `Status: ${order.status}`,
    `Datum: ${new Date(order.received_at).toLocaleDateString()}`,
  ];

  lines.forEach((text, i) =>
    page.drawText(text, {
      x: 50,
      y: height - 60 - i * 25,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    })
  );

  return await pdfDoc.save();
}
