// api/workorders/send.js
// Node.js (CommonJS) kompatibilno — bez import.meta i bez ESM/CJS kolizija

const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { createClient } = require("@supabase/supabase-js");

// 🔑 ENV (postavljeno u Vercel Project Settings → Environment Variables)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@krizek.hr";
const BREVO_SENDER_NAME  = process.env.BREVO_SENDER_NAME  || "Zlatarna Križek";

// ⛑️ Supabase SR klijent (server-side)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 📂 Put do fonta (radi i na Vercelu jer je u repo-u: public/fonts/NotoSans-Regular.ttf)
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────

function isValidEmail(v) {
  return typeof v === "string" && v.includes("@") && v.length <= 254;
}

function safe(val) {
  if (val === null || val === undefined) return "-";
  if (typeof val === "string" && !val.trim()) return "-";
  return String(val);
}

// ───────────────────────────────────────────────────────────────────────────────
// PDF (Fiori-ish layout, HR znakovi podržani preko NotoSans; fallback Helvetica)
// ───────────────────────────────────────────────────────────────────────────────

async function buildPdf({ company, wo, co }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  let fontBytes = null;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch (e) {
    console.warn("⚠️ Font not found, fallback to Helvetica:", e.message);
  }

  const font = fontBytes
    ? await pdf.embedFont(fontBytes, { subset: true })
    : await pdf.embedFont(StandardFonts.Helvetica);

  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 72,
    width,
    height: 72,
    color: rgb(0.97, 0.97, 0.98),
  });

  // Company block (iz company_info)
  const companyName  = company?.legal_name || "—";
  const companyAddr  = [company?.address_line, company?.city, company?.country].filter(Boolean).join(", ");
  const companyEmail = company?.email || "-";
  const companyPhone = company?.phone || "-";
  const companyTaxId = company?.tax_id ? `OIB: ${company.tax_id}` : "";

  page.drawText(companyName, { x: 40, y: height - 40, size: 14, font });
  page.drawText(companyAddr,  { x: 40, y: height - 58, size: 10, font, color: rgb(0.25,0.25,0.25) });
  page.drawText(`${companyEmail}  |  ${companyPhone}  ${companyTaxId ? " | " + companyTaxId : ""}`, {
    x: 40, y: height - 72, size: 9, font, color: rgb(0.35,0.35,0.35)
  });

  // Title
  page.drawText("RADNI NALOG", {
    x: width - 200,
    y: height - 48,
    size: 18,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Meta
  const metaTop = height - 110;
  const line = (label, value, y) => {
    page.drawText(label, { x: 40, y, size: 10, font, color: rgb(0.45, 0.45, 0.45) });
    page.drawText(safe(value), { x: 170, y, size: 11, font, color: rgb(0, 0, 0) });
  };

  line("Broj naloga", wo.order_no || wo.id, metaTop);
  line("Datum", new Date().toLocaleString("hr-HR"), metaTop - 16);
  line("Status", wo.status || "-", metaTop - 32);

  // Customer / Order
  const leftTop = metaTop - 70;
  page.drawText("PODACI O NARUČITELJU", {
    x: 40, y: leftTop, size: 10, font, color: rgb(0.4, 0.4, 0.4)
  });
  page.drawRectangle({ x: 40, y: leftTop - 4, width: 160, height: 1, color: rgb(0.8,0.8,0.85) });

  line("Kupac", wo.customer_name || co?.customer_name || "-", leftTop - 18);
  line("E-mail", wo.customer_email || co?.customer_email || "-", leftTop - 34);

  page.drawText("DETALJI NARUDŽBE", {
    x: 330, y: leftTop, size: 10, font, color: rgb(0.4, 0.4, 0.4)
  });
  page.drawRectangle({ x: 330, y: leftTop - 4, width: 160, height: 1, color: rgb(0.8,0.8,0.85) });

  const r = (lbl, v, y) => line(lbl, v, y);
  r("Tip", wo.product_type || co?.product_type || "-", leftTop - 18);
  r("Čistoća", wo.purity || co?.purity || "-", leftTop - 34);
  r("Boja", wo.color || co?.color || "-", leftTop - 50);
  r("Model", wo.model || co?.model || "-", leftTop - 66);
  r("Količina", wo.quantity || co?.quantity || 1, leftTop - 82);
  r("Rok (Due)", co?.due_date ? new Date(co.due_date).toLocaleString("hr-HR") : "-", leftTop - 98);

  // Specs from custom_orders (ako postoje)
  const specTop = leftTop - 130;
  page.drawText("SPECIFIKACIJE", {
    x: 40, y: specTop, size: 10, font, color: rgb(0.4, 0.4, 0.4)
  });
  page.drawRectangle({ x: 40, y: specTop - 4, width: 450, height: 1, color: rgb(0.8,0.8,0.85) });

  const specs = [
    ["Muška mjera", co?.male_size],
    ["Ženska mjera", co?.female_size],
    ["Gravura 1", co?.engraving_1],
    ["Gravura 2", co?.engraving_2],
    ["Zajednička gravura", co?.joint_engraving],
    ["Kamenje", co?.stones],
    ["Skica", co?.has_sketch ? "DA" : "NE"],
    ["Napomena", co?.additional_comment],
  ];

  let y = specTop - 18;
  for (const [lbl, val] of specs) {
    line(lbl, val || "-", y);
    y -= 16;
  }

  // Footer (potpis)
  const footY = 130;
  page.drawText("Potpis radionice:", { x: 40, y: footY + 10, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawLine({ start: { x: 40, y: footY }, end: { x: width - 40, y: footY }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

  page.drawText("Generirano iz ORCA sustava", { x: 40, y: 60, size: 9, font, color: rgb(0.5,0.5,0.5) });

  const pdfBytes = await pdf.save();
  return pdfBytes.toString("base64");
}

// ───────────────────────────────────────────────────────────────────────────────
// Brevo (attachment: base64Content) — nema 'content' niti 'url'
// ───────────────────────────────────────────────────────────────────────────────

async function sendEmail({ to, pdfBase64, orderNo }) {
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");
  if (!isValidEmail(to)) throw new Error("Neispravna e-mail adresa primatelja");

  const payload = {
    sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
    to: [{ email: to }],
    subject: `Radni nalog ${orderNo}`,
    htmlContent: `
      <p>Poštovani,</p>
      <p>U privitku se nalazi radni nalog <b>${orderNo}</b>.</p>
      <p>Lijep pozdrav,<br/>${BREVO_SENDER_NAME}</p>
    `,
    attachment: [
      {
        name: `${orderNo}.pdf`,
        base64Content: pdfBase64, // ✅ ispravno polje za Brevo
      },
    ],
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

  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${text}`);
  return JSON.parse(text);
}

// ───────────────────────────────────────────────────────────────────────────────
// Main handler
// ───────────────────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { workOrderId, emailToSend, printOnly } = req.body || {};
  if (!workOrderId) {
    return res.status(400).json({ ok: false, error: "Missing parameter: workOrderId" });
  }
  if (!printOnly && !emailToSend) {
    return res.status(400).json({ ok: false, error: "Missing parameter: emailToSend" });
  }

  try {
    // 1) Work order
    const { data: wo, error: woErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();
    if (woErr || !wo) throw new Error("Work order not found");

    // 2) Linked custom order (za sve detalje s forme)
    let co = null;
    if (wo.custom_order_id) {
      const { data: coRow } = await supabase
        .from("custom_orders")
        .select("*")
        .eq("id", wo.custom_order_id)
        .single();
      co = coRow || null;
    }

    // 3) Company info (zaglavlje)
    const { data: company } = await supabase
      .from("company_info")
      .select("*")
      .limit(1)
      .single();

    // 4) PDF
    const pdfBase64 = await buildPdf({ company, wo, co });

    // → Ako je printOnly: vrati samo PDF (frontend će prikazati/save bez slanja)
    if (printOnly) {
      return res.status(200).json({
        ok: true,
        mode: "PRINT_ONLY",
        order_no: wo.order_no || wo.id,
        pdfBase64,
      });
    }

    // 5) Slanje maila
    const email = emailToSend || wo.customer_email || co?.customer_email;
    if (!email) throw new Error("Nema e-mail adrese primatelja");

    const mailRes = await sendEmail({
      to: email,
      pdfBase64,
      orderNo: wo.order_no || wo.id,
    });

    // 6) Log u bazi (ako imaš RPC fn_wo_log_email)
    try {
      await supabase.rpc("fn_wo_log_email", {
        p_work_order_id: workOrderId,
        p_to: email,
        p_status: "SENT",
        p_provider_id: mailRes?.messageId ?? null,
        p_error: null,
        p_payload: mailRes ?? {},
      });
    } catch (e) {
      console.warn("⚠️ Email log RPC failed:", e.message);
    }

    return res.status(200).json({
      ok: true,
      mode: "EMAIL_SENT",
      order_no: wo.order_no || wo.id,
      mailRes,
    });
  } catch (e) {
    // FAIL log
    try {
      await supabase.rpc("fn_wo_log_email", {
        p_work_order_id: workOrderId,
        p_to: emailToSend || null,
        p_status: "FAILED",
        p_provider_id: null,
        p_error: e.message?.slice(0, 300) || "unknown",
        p_payload: {},
      });
    } catch {}

    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
