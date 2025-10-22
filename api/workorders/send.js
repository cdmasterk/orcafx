// api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

function safe(v) {
  return v ? String(v) : "-";
}
function formatDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("hr-HR");
  } catch {
    return String(v);
  }
}

// 🧾 Fiori-style PDF builder
async function buildPdf(order, company, custom) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  let fontBytes = null;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch (e) {
    console.warn("⚠️ Font not found, using Helvetica fallback:", e.message);
  }
  const font = fontBytes
    ? await pdf.embedFont(fontBytes, { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);

  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 60;
  const draw = (text, x, y, size = 11, gray = 0) =>
    page.drawText(String(text ?? "-"), { x, y, size, font, color: rgb(gray, gray, gray) });

  // 🟦 HEADER
  page.drawRectangle({ x: 0, y: height - 85, width, height: 85, color: rgb(0.95, 0.96, 0.97) });
  draw(company?.legal_name || "Zlatarna Križek doo", 40, height - 45, 14);
  const addr = [company?.address_line, company?.city, company?.country].filter(Boolean).join(", ");
  draw(addr, 40, height - 63, 10, 0.3);
  draw(`${company?.email || ""} | ${company?.phone || ""} | OIB: ${company?.tax_id || "-"}`, 40, height - 77, 9, 0.4);

  // 🧾 Title
  y -= 80;
  draw(`RADNI NALOG ${order.order_no}`, 40, y, 18);
  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.8, color: rgb(0.2, 0.2, 0.2) });
  y -= 25;
  draw(`Datum narudžbe: ${formatDate(order.order_date)}`, 40, y);
  draw(`Rok izrade: ${formatDate(order.due_date)}`, 320, y);
  y -= 30;

  const section = (title) => {
    y -= 10;
    page.drawRectangle({ x: 40, y, width: width - 80, height: 22, color: rgb(0.94, 0.95, 0.97) });
    draw(title, 50, y + 6, 12, 0.1);
    y -= 35;
  };

  // 👤 KUPAC
  section("KUPAC");
  const cust = [
    ["Ime", order.customer_name],
    ["Email", order.customer_email],
    ["Telefon", order.customer_phone],
  ];
  for (const [k, v] of cust) {
    draw(`${k}: ${safe(v)}`, 60, y);
    y -= 16;
  }

  // 📦 SPECIFIKACIJE
  section("SPECIFIKACIJE");
  const spec = [
    ["Kategorija", custom?.category],
    ["Model", custom?.model],
    ["Čistoća", order.purity],
    ["Boja", order.color],
    ["Količina", order.quantity],
    ["Status", order.status],
  ];
  for (const [k, v] of spec) {
    draw(`${k}: ${safe(v)}`, 60, y);
    y -= 16;
  }

  // 💍 DETALJI
  section("DETALJI");
  const det = [
    ["Veličina (muška)", custom?.male_size],
    ["Veličina (ženska)", custom?.female_size],
    ["Kamenje", custom?.stones],
    ["Gravura 1", custom?.engraving_1],
    ["Gravura 2", custom?.engraving_2],
    ["Zajednička gravura", custom?.joint_engraving],
  ];
  for (const [k, v] of det) {
    draw(`${k}: ${safe(v)}`, 60, y);
    y -= 16;
  }

  // 💬 NAPOMENE
  section("DODATNE NAPOMENE");
  const txt = safe(custom?.additional_comment);
  const words = txt.split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const wWidth = font.widthOfTextAtSize(test, 11);
    if (wWidth > 460) {
      draw(line, 60, y);
      y -= 15;
      line = w;
    } else line = test;
  }
  if (line) draw(line, 60, y);
  y -= 30;

  // 🖼️ SKICA
  if (custom?.sketch_url) {
    section("SKICA");
    try {
      const buf = await fetch(custom.sketch_url).then((r) => r.arrayBuffer());
      let img;
      try {
        img = await pdf.embedPng(buf);
      } catch {
        img = await pdf.embedJpg(buf);
      }
      const W = 200,
        H = 200;
      page.drawImage(img, { x: 60, y: y - H, width: W, height: H });
      y -= H + 25;
    } catch (e) {
      draw("⚠️ Skica nije učitana", 60, y);
      y -= 18;
    }
  }

  // FOOTER
  page.drawLine({ start: { x: 40, y: 80 }, end: { x: width - 40, y: 80 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  draw(`Generirano iz ORCAFX · ${new Date().toLocaleString("hr-HR")}`, 40, 65, 9, 0.4);

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

// ✉️ Send mail via Brevo
async function sendEmail(to, pdfBase64, order_no) {
  const payload = {
    sender: { name: "Zlatarna Križek", email: "noreply@krizek.hr" },
    to: [{ email: to }],
    subject: `Radni nalog ${order_no}`,
    htmlContent: `<p>Poštovani,</p><p>U privitku se nalazi vaš radni nalog <b>${order_no}</b>.</p><p>Lijep pozdrav,<br>Zlatarna Križek</p>`,
    attachment: [{ name: `${order_no}.pdf`, base64Content: pdfBase64 }],
  };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": BREVO_API_KEY },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${text}`);
  return JSON.parse(text);
}

// 🚀 Main handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res.status(400).json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });

  try {
    const { data: order, error: woErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();
    if (woErr || !order) throw new Error("Work order not found");

    const { data: custom } = await supabase
      .from("custom_orders")
      .select("*")
      .eq("id", order.custom_order_id)
      .single();

    const { data: company } = await supabase.from("company_info").select("*").limit(1).single();

    const pdfBase64 = await buildPdf(order, company, custom);

    if (emailToSend === "printonly@local")
      return res.status(200).json({ ok: true, pdfBase64, order_no: order.order_no });

    const result = await sendEmail(emailToSend, pdfBase64, order.order_no);

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
    return res.status(500).json({ ok: false, error: e.message });
  }
}
