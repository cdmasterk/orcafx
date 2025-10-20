// /api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import czsClient from "../../src/lib/czsClient.js";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { workOrderId, customerEmail, customerName, description } = req.body;

    // 1️⃣ Fetch order data
    const { data: orderData, error: orderError } = await supabase
      .from("workorders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (orderError) {
      console.error(orderError);
      return res.status(400).json({ error: "❌ Neuspješno dohvaćanje naloga" });
    }

    // 2️⃣ Generate PDF
    const pdfBytes = await generateWorkOrderPDF(orderData);

    // 3️⃣ Save PDF locally (tmp)
    const pdfPath = path.join("/tmp", `workorder_${workOrderId}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);

    // 4️⃣ Upload to Supabase storage (folder: workorders)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(`workorders/${workOrderId}.pdf`, fs.readFileSync(pdfPath), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: "❌ Neuspješno spremanje PDF-a" });
    }

    // 5️⃣ Send email via Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Goldschmiede Krizek" <${SMTP_USER}>`,
      to: customerEmail,
      subject: `Radni nalog #${orderData.repair_no}`,
      text: `Poštovani ${customerName},\n\nVaš radni nalog je spreman.\nOpis: ${description}\n\nSrdačan pozdrav,\nGoldschmiede Krizek`,
      attachments: [
        {
          filename: `radni_nalog_${orderData.repair_no}.pdf`,
          path: pdfPath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "✅ Mail poslan i PDF spremljen" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "⚠️ Greška na serveru" });
  }
}

// 🔹 Helper function to generate PDF
async function generateWorkOrderPDF(order) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(`Radni Nalog #${order.repair_no}`, {
    x: 50,
    y: height - 60,
    size: 20,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Kupac: ${order.customer_name || ""}`, {
    x: 50,
    y: height - 100,
    size: 14,
    font,
  });

  page.drawText(`Opis: ${order.description || ""}`, {
    x: 50,
    y: height - 130,
    size: 12,
    font,
  });

  page.drawText(`Status: ${order.status || "PENDING"}`, {
    x: 50,
    y: height - 160,
    size: 12,
    font,
  });

  page.drawText(`Datum: ${new Date(order.received_at).toLocaleDateString()}`, {
    x: 50,
    y: height - 190,
    size: 12,
    font,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
