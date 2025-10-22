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

// 🔹 Utility
const fmt = (v) => (v ? String(v) : "-");
const dateHR = (v) => (!v ? "-" : new Date(v).toLocaleString("hr-HR"));

// 🧾 PDF builder (Fiori look)
async function buildPdf(order, company) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  let fontBytes;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch (e) {
    console.warn("⚠️ Font not found:", e.message);
  }

  const font = fontBytes
    ? await pdf.embedFont(fontBytes, { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);

  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 50;

  const draw = (text, x, y, size = 11, gray = 0) =>
    page.drawText(String(text ?? "-"), { x, y, size, font, color: rgb(gray, gray, gray) });

  // 🏢 HEADER
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.95, 0.96, 0.97) });

  draw(company?.legal_name || "Zlatarna Križek doo", 40, height - 45, 14);
  const addr = [company?.address_line, company?.city, company?.country]
    .filter(Boolean)
    .join(", ");
  draw(addr, 40, height - 62, 10, 0.3);
  draw(
    `${company?.email || ""}  |  ${company?.phone || ""}  |  OIB: ${company?.tax_id || "-"}`,
    40,
    height - 75,
    9,
    0.4
  );

  // 🧾 Title bar
  y -= 60;
  draw(`RADNI NALOG — ${order.order_no ?? ""}`, 40, y, 18);
  y -= 20;
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 0.8,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 25;

  draw(`Datum narudžbe: ${dateHR(order.order_date)}`, 40, y);
  draw(`Rok izrade: ${dateHR(order.due_date)}`, 320, y);
  y -= 25;

  // SECTION helper
  const section = (title) => {
    y -= 15;
    page.drawRectangle({ x: 40, y, width: width - 80, height: 22, color: rgb(0.94, 0.95, 0.97) });
    draw(title, 50, y + 7, 12, 0.1);
    y -= 35;
  };

  // 👤 CUSTOMER
  section("KUPAC");
  const cust = [
    ["Ime", order.customer_name],
    ["Email", order.customer_email],
    ["Telefon", order.customer_phone],
  ];
  for (const [k, v] of cust) {
    draw(`${k}: ${fmt(v)}`, 60, y);
    y -= 18;
  }

  // 📦 SPECIFIKACIJE
  section("SPECIFIKACIJE");
  const specs = [
    ["Kategorija", order.category],
    ["Model", order.model],
    ["Čistoća", order.purity],
    ["Boja", order.color],
    ["Količina", order.quantity],
    ["Status", order.status],
  ];
  for (const [k, v] of specs) {
    draw(`${k}: ${fmt(v)}`, 60, y);
    y -= 18;
  }

  // 💍 DETALJI
  section("DETALJI");
  const details = [
    ["Veličina (muška)", order.male_size],
    ["Veličina (ženska)", order.female_size],
    ["Kamenje", order.stones],
    ["Gravura 1", order.engraving_1],
    ["Gravura 2", order.engraving_2],
    ["Zajednička gravura", order.joint_engraving],
  ];
  for (const [k, v] of details) {
    draw(`${k}: ${fmt(v)}`, 60, y);
    y -= 18;
  }

  // 💬 KOMENTAR
  section("DODATNE NAPOMENE");
  const comment = fmt(order.additional_comment);
  const words = comment.split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    const widthTxt = font.widthOfTextAtSize(test, 11);
    if (widthTxt > 470) {
      draw(line, 60, y);
      y -= 16;
      line = w;
    } else line = test;
  }
  if (line) draw(line, 60, y);
  y -= 30;

  // 🖼️ SKICA
  if (order.sketch_url) {
    section("SKICA");
    try {
      const buf = await fetch(order.sketch_url).then((r) => r.arrayBuffer());
      let img;
      try {
        img = await pdf.embedPng(buf);
      } catch {
        img = await pdf.embedJpg(buf);
      }
      const W = 180,
        H = 180;
      page.drawImage(img, { x: 60, y: y - H, width: W, height: H });
      y -= H + 20;
    } catch (e) {
      draw("⚠️ Skica nije učitana", 60, y);
      y -= 18;
    }
  }

  // FOOTER
  page.drawLine({
    start: { x: 40, y: 80 },
    end: { x: width - 40, y: 80 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  draw(`Generirano iz ORCAFX · ${new Date().toLocaleString("hr-HR")}`, 40, 65, 9, 0.4);

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

// ✉️ Mail via Brevo
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
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${txt}`);
  return JSON.parse(txt);
}

// 🚀 Handler
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res.status(400).json({ ok: false, error: "Missing parameters" });

  try {
    // Work order
    const { data: order, error: woErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();
    if (woErr || !order) throw new Error("Work order not found");

    // Company info (not profile)
    const { data: company, error: cErr } = await supabase
      .from("company_info")
      .select("*")
      .limit(1)
      .single();
    if (cErr) console.warn("⚠️ company_info fetch:", cErr.message);

    // Generate PDF
    const pdfBase64 = await buildPdf(order, company);

    // Print-only
    if (emailToSend === "printonly@local") {
      return res.status(200).json({ ok: true, pdfBase64, order_no: order.order_no });
    }

    // Send mail
    const result = await sendEmail(emailToSend, pdfBase64, order.order_no);

    // Log
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
    } catch (err2) {
      console.warn("⚠️ Logging fail:", err2.message);
    }

    return res.status(500).json({ ok: false, error: e.message });
  }
}
