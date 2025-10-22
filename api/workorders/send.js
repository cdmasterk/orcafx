// api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@supabase/supabase-js";

// 🔑 ENV VARS
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 🗂 Font
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// ---------- Helpers ----------
function formatDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("hr-HR");
  } catch {
    return String(v);
  }
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
async function makeQRBuffer(text, sizePx = 90) {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(
      text
    )}`;
    const resp = await fetch(url);
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

// ---------- PDF BUILDER ----------
async function buildPdf(order, company) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let fontBytes;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch {}
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const blue = rgb(0, 0.44, 0.95);
  const gray = rgb(0.3, 0.3, 0.3);
  const draw = (txt, x, y, size = 11, color = rgb(0, 0, 0)) =>
    page.drawText(String(txt ?? "-"), { x, y, size, font, color });

  let y = height - 40;

  // 🏢 COMPANY INFO
  const name = company?.legal_name || "Zlatarna Krizek doo";
  const address = [company?.address_line, company?.city, company?.country].filter(Boolean).join(", ");
  const tax = company?.tax_id ? `OIB: ${company.tax_id}` : "";
  const contact = [company?.email, company?.phone].filter(Boolean).join("  |  ");
  const iban = company?.iban ? `IBAN: ${company.iban}` : "";

  if (company?.logo_url) {
    try {
      const buf = await fetch(company.logo_url).then((r) => r.arrayBuffer());
      const img = company.logo_url.endsWith(".png")
        ? await pdfDoc.embedPng(buf)
        : await pdfDoc.embedJpg(buf);
      page.drawImage(img, { x: 40, y: y - 40, width: 80, height: 40 });
    } catch {}
  }

  draw(name, 140, y, 16, blue);
  draw(address, 140, y - 18, 10, gray);
  draw(tax, 140, y - 30, 10, gray);
  draw(contact, 140, y - 42, 10, gray);
  draw(iban, 140, y - 54, 10, gray);
  y -= 70;

  // 🔷 HEADER TITLE
  page.drawRectangle({
    x: 40,
    y: y - 30,
    width: width - 80,
    height: 28,
    color: blue,
  });
  draw(`RADNI NALOG ${order.order_no}`, 50, y - 20, 14, rgb(1, 1, 1));
  y -= 50;

  // 🕓 DATUMI
  draw(`Datum narudžbe: ${formatDate(order.order_date)}`, 50, y);
  draw(`Rok izrade: ${formatDate(order.due_date)}`, 330, y);
  y -= 20;

  // 👤 KUPAC
  y = y - 10;
  page.drawText("KUPAC", { x: 40, y, size: 13, font, color: blue });
  y -= 18;
  const cust = [
    ["Ime", order.customer_name],
    ["Email", order.customer_email],
    ["Telefon", order.customer_phone],
  ];
  for (const [k, v] of cust) {
    draw(`${k}:`, 60, y);
    draw(`${v ?? "-"}`, 150, y);
    y -= 16;
  }

  // 📦 SPECIFIKACIJE
  y -= 8;
  page.drawText("SPECIFIKACIJE", { x: 40, y, size: 13, font, color: blue });
  y -= 18;
  const specs = [
    ["Kategorija", order.category],
    ["Model", order.model],
    ["Čistoća", order.purity],
    ["Boja", order.color],
    ["Količina", order.quantity],
    ["Status", order.status],
  ];
  for (const [k, v] of specs) {
    draw(`${k}:`, 60, y);
    draw(`${v ?? "-"}`, 180, y);
    y -= 16;
  }

  // 💍 DETALJI
  y -= 8;
  page.drawText("DETALJI", { x: 40, y, size: 13, font, color: blue });
  y -= 18;
  const details = [
    ["Veličina (muška)", order.male_size],
    ["Veličina (ženska)", order.female_size],
    ["Kamenje", order.stones],
    ["Gravura 1", order.engraving_1],
    ["Gravura 2", order.engraving_2],
    ["Zajednička gravura", order.joint_engraving],
  ];
  for (const [k, v] of details) {
    draw(`${k}:`, 60, y);
    draw(`${v ?? "-"}`, 180, y);
    y -= 16;
  }

  // 💬 NAPOMENE
  y -= 8;
  page.drawText("NAPOMENE", { x: 40, y, size: 13, font, color: blue });
  y = multiLine(page, font, order.additional_comment ?? "-", 60, y - 20, 11, 460, 16);

  // 🖼️ SKICA
  if (order.sketch_url) {
    y -= 10;
    page.drawText("SKICA", { x: 40, y, size: 13, font, color: blue });
    try {
      const buf = await fetch(order.sketch_url).then((r) => r.arrayBuffer());
      const img = order.sketch_url.endsWith(".png")
        ? await pdfDoc.embedPng(buf)
        : await pdfDoc.embedJpg(buf);
      page.drawImage(img, { x: 60, y: y - 180, width: 180, height: 180 });
      y -= 200;
    } catch {
      draw("⚠️ Skica nije učitana", 60, y - 20);
    }
  }

  // 🔲 QR kod
  try {
    const qrPng = await makeQRBuffer(`${name} | ${order.order_no}`);
    if (qrPng) {
      const qrImg = await pdfDoc.embedPng(qrPng);
      page.drawImage(qrImg, { x: width - 120, y: 60, width: 70, height: 70 });
    }
  } catch {}

  // Footer
  draw(`Generated by ORCAFX • ${name} • ${new Date().toLocaleString("hr-HR")}`, 50, 40, 9, gray);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

// ---------- Email ----------
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

// ---------- API HANDLER ----------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res.status(400).json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });

  try {
    // 1️⃣ Work order
    const { data: order, error: orderErr } = await supabase
      .from("work_order_full_view")
      .select("*")
      .eq("id", workOrderId)
      .single();
    if (orderErr || !order) throw new Error("Work order not found");

    // 2️⃣ Company
    const { data: company } = await supabase.from("company_profile").select("*").limit(1).single();

    // 3️⃣ Generate PDF
    const pdfBase64 = await buildPdf(order, company);

    // 4️⃣ Print only mode
    if (emailToSend === "printonly@local") {
      return res.status(200).json({ ok: true, pdfBase64, order_no: order.order_no });
    }

    // 5️⃣ Send mail
    const result = await sendEmail(emailToSend, pdfBase64, order.order_no);

    // 6️⃣ Log result
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
        p_work_order_id: workOrderId ?? null,
        p_to: emailToSend ?? null,
        p_status: "FAILED",
        p_provider_id: null,
        p_error: e.message?.slice(0, 200) || "unknown",
        p_payload: {},
      });
    } catch {}
    return res.status(500).json({ ok: false, error: e.message });
  }
}
