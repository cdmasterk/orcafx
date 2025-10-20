// /api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import czsClient from "../../src/lib/czsClient.js"; // ← tvoj path

// --- Supabase client (server-side env) ---
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase env vars missing on server (SUPABASE_URL/ANON_KEY).");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Storage bucket (fallback na 'pdfs') ---
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "pdfs";

// --- SMTP (Brevo) ---
const SMTP_HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { workOrderId, customerEmail, customerName } = req.body || {};
    if (!workOrderId || !customerEmail) {
      return res.status(400).json({ error: "Missing parameters: workOrderId, customerEmail" });
    }

    // 1) Dohvati nalog
    const { data: order, error } = await supabase
      .from("work_orders") // ← u tvojoj bazi je ovo ime
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (error || !order) {
      await czsClient.log(`DB error: ${error?.message || "not found"}`);
      return res.status(400).json({ error: "Nalog nije pronađen." });
    }

    // 2) Generiraj PDF u /tmp (Vercel)
    const pdfBytes = await generateWorkOrderPDF(order);
    const pdfPath = path.join("/tmp", `workorder_${order.repair_no || order.id}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);

    // 3) Upload u Supabase Storage
    const uploadKey = `workorders/${order.repair_no || order.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(uploadKey, fs.readFileSync(pdfPath), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      await czsClient.log(`Upload error: ${uploadError.message}`);
      // ne rušimo flow zbog uploada; mail svejedno ide
    }

    // 4) Slanje maila (Brevo SMTP)
    if (!SMTP_USER || !SMTP_PASS) {
      await czsClient.log("SMTP creds missing; cannot send email.");
      return res.status(500).json({ error: "Mail greška: SMTP nije konfiguriran." });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"Goldschmiede Krizek" <${SMTP_USER}>`,
      to: customerEmail,
      subject: `Radni nalog #${order.repair_no || order.id}`,
      text: `Poštovani ${customerName || ""},

Vaš nalog je zaprimljen/obrađen.

Opis: ${order.description || "-"}

Srdačan pozdrav,
Goldschmiede Krizek`,
      attachments: [
        { filename: `radni_nalog_${order.repair_no || order.id}.pdf`, path: pdfPath },
      ],
    });

    await czsClient.log(`Mail poslan: ${order.repair_no || order.id}`);
    return res.status(200).json({
      success: true,
      message: "Mail poslan i PDF spremljen.",
      storage_path: `${STORAGE_BUCKET}/${uploadKey}`,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    await czsClient.log(`Server error: ${err.message}`);
    return res.status(500).json({ error: "Greška na serveru." });
  }
}

// --- PDF helper ---
async function generateWorkOrderPDF(order) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lines = [
    `Radni nalog #${order.repair_no || order.id}`,
    `Kupac: ${order.customer_name || ""}`,
    `Opis: ${order.description || ""}`,
    `Status: ${order.status || ""}`,
    `Datum: ${
      order.received_at ? new Date(order.received_at).toLocaleDateString() : new Date().toLocaleDateString()
    }`,
  ];

  lines.forEach((text, i) => {
    page.drawText(text, { x: 50, y: height - 60 - i * 25, size: 14, font, color: rgb(0, 0, 0) });
  });

  return await pdfDoc.save();
}
