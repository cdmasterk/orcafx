// api/workorders/send.js
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * 🧩 Environment Fallback System
 * Radi i ako koristiš REACT_APP_*, NEXT_PUBLIC_*, ili SERVICE_KEY varijante
 */
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET ||
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  "https://orcafx.vercel.app";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase ENV values", {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  });
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

/**
 * 📨 Handler
 * - generira PDF radnog naloga
 * - šalje mail (preko tvojeg /api/sendMail)
 * - logira rezultat u work_orders.email_log
 */
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  if (!supabase)
    return res.status(500).json({
      ok: false,
      error:
        "Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
    });

  try {
    const { workOrderId, emailToSend } = req.body || {};
    if (!workOrderId) {
      return res.status(400).json({ ok: false, error: "workOrderId required" });
    }
    if (!emailToSend) {
      return res
        .status(400)
        .json({ ok: false, error: "emailToSend (recipient) required" });
    }

    // 1️⃣ Dohvati radni nalog i povezanu custom narudžbu
    const { data: wo, error: woErr } = await supabase
      .from("work_orders")
      .select(
        `
        *,
        custom_orders:custom_order_id (
          order_no,
          order_date,
          due_date,
          customer_name,
          customer_email,
          product_type,
          purity,
          color,
          model,
          quantity,
          engraving_1,
          engraving_2,
          joint_engraving,
          stones,
          additional_comment,
          workshop_name,
          store_location,
          has_sketch
        )
      `
      )
      .eq("id", workOrderId)
      .single();

    if (woErr || !wo) throw new Error("Work order not found in Supabase");

    // 2️⃣ Kreiraj PDF (A4 format)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const draw = (label, val) => {
      page.drawText(label, { x: 40, y, size: 11, font: bold, color: rgb(0, 0, 0) });
      page.drawText((val ?? "-").toString(), { x: 180, y, size: 11, font });
      y -= 16;
    };
    const hr = () => {
      page.drawLine({
        start: { x: 40, y },
        end: { x: 555, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 20;
    };

    page.drawText("RADNI NALOG", {
      x: 40,
      y,
      size: 18,
      font: bold,
      color: rgb(0, 0.1, 0.45),
    });
    y -= 28;

    draw("Broj naloga:", wo.order_no || workOrderId);
    draw("Datum:", new Date().toLocaleString());
    draw("Status:", wo.status || "PENDING");
    hr();

    draw("Kupac:", wo.custom_orders?.customer_name);
    draw("Email:", wo.custom_orders?.customer_email);
    draw(
      "Datum narudžbe:",
      wo.custom_orders?.order_date
        ? new Date(wo.custom_orders.order_date).toLocaleString()
        : "-"
    );
    draw(
      "Rok izrade:",
      wo.custom_orders?.due_date
        ? new Date(wo.custom_orders.due_date).toLocaleString()
        : "-"
    );
    draw("POS lokacija:", wo.custom_orders?.store_location);
    draw("Radionica:", wo.custom_orders?.workshop_name);
    hr();

    draw("Vrsta proizvoda:", wo.custom_orders?.product_type);
    draw("Model:", wo.custom_orders?.model);
    draw("Čistoća:", wo.custom_orders?.purity);
    draw("Boja:", wo.custom_orders?.color);
    draw("Količina:", String(wo.custom_orders?.quantity ?? 1));
    hr();

    draw("Gravura 1:", wo.custom_orders?.engraving_1);
    draw("Gravura 2:", wo.custom_orders?.engraving_2);
    draw("Zajednička gravura:", wo.custom_orders?.joint_engraving);
    draw("Kamenje:", wo.custom_orders?.stones);
    hr();

    page.drawText("Napomena:", { x: 40, y, size: 11, font: bold });
    y -= 16;
    const note = wo.custom_orders?.additional_comment || "-";
    const wrap = (text, maxChars = 90) =>
      text.match(new RegExp(`.{1,${maxChars}}`, "g")) || [text];
    for (const line of wrap(note, 90)) {
      page.drawText(line, { x: 60, y, size: 11, font });
      y -= 14;
      if (y < 120) break;
    }
    y -= 20;

    draw("Skica:", wo.custom_orders?.has_sketch ? "DA" : "NE");
    y -= 30;
    page.drawText("Potpis radionice:", { x: 40, y, size: 11, font: bold });
    page.drawLine({
      start: { x: 40, y: y - 10 },
      end: { x: 300, y: y - 10 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText("Generirano putem ORCA sustava", {
      x: 40,
      y: 60,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // 3️⃣ Pošalji e-mail s prilogom (preko lokalnog API /api/sendMail)
    const mailResp = await fetch(`${APP_BASE_URL}/api/sendMail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emailToSend,
        subject: `Radni nalog ${wo.order_no || workOrderId}`,
        html: `<p>Poštovani,</p><p>U privitku se nalazi radni nalog <b>${wo.order_no ||
          workOrderId}</b>.</p><p>Srdačan pozdrav,<br/>ORCA Production System</p>`,
        text: `Radni nalog ${wo.order_no || workOrderId}`,
        attachments: [
          { name: `${wo.order_no || workOrderId}.pdf`, content: pdfBase64 },
        ],
      }),
    });

    if (!mailResp.ok) {
      const msg = await mailResp.text().catch(() => "");
      throw new Error(`SendMail API failed: ${msg || mailResp.status}`);
    }

    // 4️⃣ Zapiši log u bazu
    const logEntry = {
      at: new Date().toISOString(),
      to: emailToSend,
      result: "OK",
      via: "api/sendMail",
    };
    const currentLog = Array.isArray(wo.email_log) ? wo.email_log : [];
    await supabase
      .from("work_orders")
      .update({ email_log: [...currentLog, logEntry] })
      .eq("id", workOrderId);

    return res.status(200).json({
      ok: true,
      sentTo: emailToSend,
      order_no: wo.order_no,
      pdfBase64,
    });
  } catch (err) {
    console.error("❌ send.js error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal Server Error" });
  }
}
