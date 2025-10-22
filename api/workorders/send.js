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
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// ───────────────────────────── HELPERS ─────────────────────────────
function formatDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleDateString("hr-HR");
  } catch {
    return String(v);
  }
}

async function makeQRBuffer(text, sizePx = 90) {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(text)}`;
    const resp = await fetch(url);
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

// ───────────────────────────── PDF BUILDER ─────────────────────────────
async function buildPdf(order) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let fontBytes;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch {}
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const blue = rgb(0, 0.44, 0.95);
  const gray = rgb(0.25, 0.25, 0.25);
  const lightGray = rgb(0.96, 0.96, 0.96);
  const borderGray = rgb(0.8, 0.8, 0.8);

  const draw = (txt, x, y, size = 11, color = rgb(0, 0, 0)) =>
    page.drawText(String(txt ?? "-"), { x, y, size, font, color });

  let y = height - 50;

  // 🏢 COMPANY INFO
  page.drawRectangle({
    x: 40,
    y: y - 80,
    width: width - 80,
    height: 65,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  draw(order.company_name || "Zlatarna Krizek", 55, y - 50, 15, blue);
  draw(
    [order.company_address, order.company_city, order.company_country].filter(Boolean).join(", "),
    55,
    y - 66,
    10,
    gray
  );
  draw(
    [order.company_email, order.company_phone].filter(Boolean).join(" | "),
    55,
    y - 78,
    9,
    gray
  );
  y -= 100;

  // 🔷 HEADER
  page.drawRectangle({
    x: 40,
    y: y - 40,
    width: width - 80,
    height: 35,
    color: blue,
  });
  draw(`RADNI NALOG ${order.order_no || order.id}`, 55, y - 22, 15, rgb(1, 1, 1));
  y -= 60;

  draw(`Datum narudžbe: ${formatDate(order.order_date)}`, 55, y, 10, gray);
  draw(`Rok izrade: ${formatDate(order.due_date)}`, 330, y, 10, gray);
  y -= 30;

  // 👤 KUPAC
  draw("KUPAC", 45, y, 13, blue);
  y -= 15;
  page.drawRectangle({
    x: 40,
    y: y - 80,
    width: width - 80,
    height: 65,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  draw(`Ime: ${order.customer_name || "-"}`, 55, y - 20, 10, gray);
  draw(`Email: ${order.customer_email || "-"}`, 55, y - 35, 10, gray);
  draw(`Telefon: ${order.customer_phone || "-"}`, 55, y - 50, 10, gray);
  y -= 100;

  // 📦 SPECIFIKACIJE
  draw("SPECIFIKACIJE", 45, y, 13, blue);
  y -= 15;
  page.drawRectangle({
    x: 40,
    y: y - 145,
    width: width - 80,
    height: 130,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  const specs = [
    ["Kategorija", order.category],
    ["Model", order.model],
    ["Čistoća", order.purity],
    ["Boja", order.color],
    ["Količina", order.quantity],
    ["Status", order.status],
    ["Tip proizvoda", order.product_type],
    ["Vrsta proizvodnje", order.production_type],
  ];
  let yy = y - 25;
  for (const [label, val] of specs) {
    draw(`${label}: ${val ?? "-"}`, 55, yy, 10, gray);
    yy -= 15;
  }
  y -= 165;

  // 💍 DETALJI
  draw("DETALJI", 45, y, 13, blue);
  y -= 15;
  page.drawRectangle({
    x: 40,
    y: y - 145,
    width: width - 80,
    height: 130,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  const details = [
    ["Veličina (muška)", order.male_size],
    ["Veličina (ženska)", order.female_size],
    ["Kamenje", order.stones],
    ["Gravura 1", order.engraving_1],
    ["Gravura 2", order.engraving_2],
    ["Zajednička gravura", order.joint_engraving],
  ];
  let dy = y - 25;
  for (const [label, val] of details) {
    draw(`${label}: ${val ?? "-"}`, 55, dy, 10, gray);
    dy -= 15;
  }
  y -= 165;

  // 💬 NAPOMENE
  draw("NAPOMENE", 45, y, 13, blue);
  y -= 15;
  page.drawRectangle({
    x: 40,
    y: y - 90,
    width: width - 80,
    height: 75,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });
  const notes = order.additional_comment || order.notes || "-";
  const lines = notes.split("\n").slice(0, 5);
  let nY = y - 25;
  for (const line of lines) {
    draw(line, 55, nY, 10, gray);
    nY -= 13;
  }
  y -= 110;

  // 🔲 QR CODE
  try {
    const qrPng = await makeQRBuffer(`${order.company_name} | ${order.order_no || order.id}`);
    if (qrPng) {
      const qrImg = await pdfDoc.embedPng(qrPng);
      page.drawImage(qrImg, { x: width - 130, y: 60, width: 80, height: 80 });
    }
  } catch {}

  draw(
    `Generated by ORCAFX • ${order.company_name || ""} • ${new Date().toLocaleString("hr-HR")}`,
    55,
    40,
    9,
    gray
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

// ───────────────────────────── EMAIL ─────────────────────────────
async function sendEmail(to, pdfBase64, order_no, company_name) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: company_name || "ORCAFX", email: "noreply@orcafx.app" },
      to: [{ email: to }],
      subject: `Radni nalog ${order_no}`,
      htmlContent: `<p>Poštovani,</p><p>U privitku se nalazi radni nalog <b>${order_no}</b>.</p><p>Lijep pozdrav,<br>${company_name || "ORCAFX"}</p>`,
      attachment: [{ name: `${order_no}.pdf`, base64Content: pdfBase64 }],
    }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${txt}`);
  return JSON.parse(txt);
}

// ───────────────────────────── HANDLER ─────────────────────────────
export default async function handler(req, res) {
  // ✅ CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "https://orcafx.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "https://orcafx.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res.status(400).json({ ok: false, error: "Missing parameters" });

  try {
    // 🔍 TEST: pokušaj s ID i s work_order_id
    let { data: order, error } = await supabase
      .from("work_order_full_view")
      .select("*")
      .eq("work_order_id", workOrderId)
      .single();

    if (!order) {
      const alt = await supabase
        .from("work_order_full_view")
        .select("*")
        .eq("id", workOrderId)
        .single();
      order = alt.data;
      error = alt.error;
    }

    console.log("🔍 ORDER LOADED:", order);
    console.log("🔍 SUPABASE ERROR:", error);

    if (error || !order) throw new Error("Work order not found");

    const pdfBase64 = await buildPdf(order);

    if (emailToSend === "printonly@local")
      return res.status(200).json({ ok: true, pdfBase64 });

    const result = await sendEmail(emailToSend, pdfBase64, order.order_no, order.company_name);

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
        p_error: e.message,
        p_payload: {},
      });
    } catch {}
    return res.status(500).json({ ok: false, error: e.message });
  }
}
