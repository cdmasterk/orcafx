// api/workorders/send.js
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fetch from "node-fetch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { workOrderId, emailToSend } = req.body;
    if (!workOrderId)
      return res.status(400).json({ error: "workOrderId required" });

    // 1️⃣ Dohvati radni nalog + originalni custom order
    const { data: wo, error } = await supabase
      .from("work_orders")
      .select(
        `
        *,
        custom_orders:custom_order_id (
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

    if (error || !wo) throw new Error("Work order not found");

    // 2️⃣ Kreiraj PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;

    const draw = (label, val) => {
      page.drawText(label, { x: 40, y, size: 11, font: bold });
      page.drawText(val || "-", { x: 180, y, size: 11, font });
      y -= 16;
    };

    page.drawText("RADNI NALOG", {
      x: 40,
      y,
      size: 18,
      font: bold,
      color: rgb(0, 0, 0.3),
    });
    y -= 30;
    draw("Broj naloga:", wo.order_no || workOrderId);
    draw("Datum:", new Date().toLocaleString());
    draw("Status:", wo.status || "PENDING");
    y -= 10;
    page.drawLine({
      start: { x: 40, y },
      end: { x: 550, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 20;

    // Customer info
    draw("Kupac:", wo.custom_orders?.customer_name);
    draw("Email:", wo.custom_orders?.customer_email);
    draw("Model:", wo.custom_orders?.model);
    draw("Vrsta:", wo.custom_orders?.product_type);
    draw("Čistoća:", wo.custom_orders?.purity);
    draw("Boja:", wo.custom_orders?.color);
    draw("Količina:", String(wo.custom_orders?.quantity || 1));
    draw("Radionica:", wo.custom_orders?.workshop_name);
    draw("POS lokacija:", wo.custom_orders?.store_location);
    y -= 10;
    page.drawLine({
      start: { x: 40, y },
      end: { x: 550, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 20;

    // Engravings
    draw("Gravura 1:", wo.custom_orders?.engraving_1);
    draw("Gravura 2:", wo.custom_orders?.engraving_2);
    draw("Zajednička gravura:", wo.custom_orders?.joint_engraving);
    draw("Kamenje:", wo.custom_orders?.stones);
    draw("Komentar:", wo.custom_orders?.additional_comment);
    draw("Skica:", wo.custom_orders?.has_sketch ? "DA" : "NE");

    y -= 30;
    page.drawText("Potpis radionice:", {
      x: 40,
      y,
      size: 11,
      font: bold,
    });
    page.drawLine({
      start: { x: 40, y: y - 10 },
      end: { x: 300, y: y - 10 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Footer
    page.drawText("Generirano putem ORCA sustava", {
      x: 40,
      y: 60,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // 3️⃣ Slanje maila kroz tvoj API
    const mailResp = await fetch(`${process.env.APP_BASE_URL}/api/sendMail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emailToSend,
        subject: `Radni nalog ${wo.order_no || workOrderId}`,
        html: `<p>Poštovani,</p><p>U privitku se nalazi radni nalog <b>${wo.order_no || workOrderId}</b>.</p><p>Srdačan pozdrav,<br/>ORCA Production System</p>`,
        text: `Radni nalog ${wo.order_no || workOrderId}`,
      }),
    });

    if (!mailResp.ok) throw new Error("Mail slanje nije uspjelo");

    return res.status(200).json({
      ok: true,
      sentTo: emailToSend,
      pdfBase64,
    });
  } catch (err) {
    console.error("❌ send.js error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
