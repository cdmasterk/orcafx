// api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@supabase/supabase-js";

// 🔑 ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 🗂 Font
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
function formatDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("hr-HR");
  } catch {
    return String(v);
  }
}
function section(page, font, title, y) {
  page.drawText(title, { x: 40, y, size: 13, font, color: rgb(0, 0, 0) });
  return y - 20;
}
function multiLine(page, font, text, x, y, size, maxWidth, leading) {
  const words = String(text || "-").split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth) {
      page.drawText(line, { x, y, size, font });
      y -= leading;
      line = w;
    } else line = test;
  }
  if (line) page.drawText(line, { x, y, size, font });
  return y - leading;
}

// ───────────────────────────────────────────────────────────────────────────────
// QR generator (with fallback, no dependency required)
async function makeQRBuffer(text, sizePx = 80) {
  // 1) Try dynamic import of 'qrcode' if it exists
  let qrcode = null;
  try {
    // dynamic import avoids hard dependency at build-time
    qrcode = await import("qrcode").then((m) => m.default || m).catch(() => null);
  } catch {
    qrcode = null;
  }

  if (qrcode && qrcode.toBuffer) {
    return await qrcode.toBuffer(text, { width: sizePx });
  }

  // 2) Fallback to public QR service (PNG)
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(
    text
  )}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("QR fetch failed");
  const arr = await resp.arrayBuffer();
  return Buffer.from(arr);
}

// ───────────────────────────────────────────────────────────────────────────────
// PDF builder (Fiori-style)
async function buildPdf(order, company) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let fontBytes;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch (e) {
    console.warn("⚠️ Font not found, using Helvetica fallback:", e.message);
  }
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const draw = (txt, x, y, size = 11) =>
    page.drawText(String(txt ?? "-"), { x, y, size, font, color: rgb(0, 0, 0) });

  // 🏢 Company header
  const companyName = company?.legal_name || "Zlatarna Krizek doo";
  const address = [company?.address_line, company?.city, company?.country].filter(Boolean).join(", ");
  let y = height - 40;

  if (company?.logo_url) {
    try {
      const buf = await fetch(company.logo_url).then((r) => r.arrayBuffer());
      let img;
      try {
        img = await pdfDoc.embedPng(buf);
      } catch {
        img = await pdfDoc.embedJpg(buf);
      }
      page.drawImage(img, { x: 40, y: y - 32, width: 96, height: 32 });
    } catch (e) {
      console.warn("⚠️ Logo embed failed:", e.message);
    }
  }

  draw(companyName, 160, y, 16);
  draw(`${address}`, 160, y - 16, 10);
  draw(`${company?.email || ""}  |  ${company?.phone || ""}`, 160, y - 28, 10);
  draw(`OIB: ${company?.tax_id || "-"}`, 160, y - 40, 10);
  y -= 60;

  // Title + dates
  draw(`RADNI NALOG ${order.order_no}`, 40, y, 18);
  y -= 24;
  draw(`Datum narudžbe: ${formatDate(order.order_date)}`, 40, y);
  draw(`Rok izrade: ${formatDate(order.due_date)}`, 300, y);
  y -= 18;

  // Separator
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 20;

  // 👤 Customer
  y = section(page, font, "KUPAC", y);
  draw(`Ime: ${order.customer_name || "-"}`, 60, y);
  y -= 18;
  draw(`Email: ${order.customer_email || "-"}`, 60, y);
  y -= 18;
  draw(`Telefon: ${order.customer_phone || "-"}`, 60, y);
  y -= 10;

  // 📦 Specifikacije
  y = section(page, font, "SPECIFIKACIJE", y);
  const specs = [
    ["Kategorija", order.category],
    ["Model", order.model],
    ["Čistoća", order.purity],
    ["Boja", order.color],
    ["Količina", order.quantity],
    ["Status", order.status],
  ];
  for (const [k, v] of specs) {
    draw(`${k}: ${v ?? "-"}`, 60, y);
    y -= 18;
  }

  // 💍 Detalji
  y = section(page, font, "DETALJI", y);
  const details = [
    ["Veličina (muška)", order.male_size],
    ["Veličina (ženska)", order.female_size],
    ["Kamenje", order.stones],
    ["Gravura 1", order.engraving_1],
    ["Gravura 2", order.engraving_2],
    ["Zajednička gravura", order.joint_engraving],
  ];
  for (const [k, v] of details) {
    draw(`${k}: ${v ?? "-"}`, 60, y);
    y -= 18;
  }

  // 💬 Napomene
  y = section(page, font, "DODATNE NAPOMENE", y);
  y = multiLine(page, font, order.additional_comment ?? "-", 60, y, 11, 480, 16) - 8;

  // 🖼️ Skica
  if (order.sketch_url) {
    y = section(page, font, "SKICA", y);
    try {
      const buf = await fetch(order.sketch_url).then((r) => r.arrayBuffer());
      let img;
      try {
        img = await pdfDoc.embedPng(buf);
      } catch {
        img = await pdfDoc.embedJpg(buf);
      }
      page.drawImage(img, { x: 60, y: y - 180, width: 180, height: 180 });
      y -= 190;
    } catch {
      draw("⚠️ Skica nije učitana", 60, y);
      y -= 18;
    }
  }

  // 🔲 QR (no dependency fallback)
  try {
    const qrText = `${companyName} | ${order.order_no}`;
    const qrPng = await makeQRBuffer(qrText, 80);
    const qrImg = await pdfDoc.embedPng(qrPng);
    page.drawImage(qrImg, { x: width - 120, y: 60, width: 60, height: 60 });
  } catch (e) {
    console.warn("⚠️ QR embed failed:", e.message);
  }

  // Footer
  draw(`Generated by ORCAFX • ${companyName} • ${new Date().toLocaleString("hr-HR")}`, 40, 40, 9);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

// ───────────────────────────────────────────────────────────────────────────────
// Brevo
async function sendEmail(to, pdfBase64, order_no) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "Zlatarna Krizek", email: "noreply@krizek.hr" },
      to: [{ email: to }],
      subject: `Radni nalog ${order_no}`,
      htmlContent: `<p>Poštovani,</p><p>U privitku se nalazi radni nalog <b>${order_no}</b>.</p><p>Lijep pozdrav,<br>Zlatarna Krizek</p>`,
      attachment: [{ name: `${order_no}.pdf`, base64Content: pdfBase64 }],
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${txt}`);
  return JSON.parse(txt);
}

// ───────────────────────────────────────────────────────────────────────────────
// Handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res.status(400).json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });

  try {
    // 1) Order (from view to get merged fields)
    const { data: order, error: orderErr } = await supabase
      .from("work_order_full_view")
      .select("*")
      .eq("id", workOrderId)
      .single();
    if (orderErr || !order) throw new Error("Work order not found");

    // 2) Company
    const { data: company } = await supabase.from("company_profile").select("*").limit(1).single();

    // 3) PDF
    const pdfBase64 = await buildPdf(order, company);

    // 4) Print only mode
    if (emailToSend === "printonly@local") {
      return res.status(200).json({ ok: true, pdfBase64, order_no: order.order_no });
    }

    // 5) Send email
    const result = await sendEmail(emailToSend, pdfBase64, order.order_no);

    // 6) Log success
    await supabase.rpc("fn_wo_log_email", {
      p_work_order_id: workOrderId,
      p_to: emailToSend,
      p_status: "SENT",
      p_provider_id: result?.messageId ?? null,
      p_error: null,
      p_payload: result ?? {},
    });

    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error("❌ send.js error:", e.message);
    try {
      await supabase.rpc("fn_wo_log_email", {
        p_work_order_id: req.body?.workOrderId ?? null,
        p_to: req.body?.emailToSend ?? null,
        p_status: "FAILED",
        p_provider_id: null,
        p_error: e.message?.slice(0, 300) || "unknown",
        p_payload: {},
      });
    } catch {}
    return res.status(500).json({ ok: false, error: e.message });
  }
}
