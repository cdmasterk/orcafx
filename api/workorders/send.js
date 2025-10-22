// api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@supabase/supabase-js";

// ---------- ENV ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Vercel (CommonJS transpile) fallback za __dirname

// ---------- SUPABASE ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- STATIC ASSETS ----------
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");
// Logo: uzimamo iz company_profile.logo_url (preporuka), ali ako želiš fallback lokalno:
// const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

// ---------- HELPERS ----------
async function fetchCompanyProfile() {
  const { data, error } = await supabase
    .from("company_profile")
    .select("legal_name,address_line,city,country,tax_id,iban,phone,email,logo_url")
    .limit(1)
    .single();
  if (error) {
    console.warn("⚠️ company_profile fetch error:", error.message);
    return null;
  }
  return data;
}

async function fetchWorkOrder(workOrderId) {
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", workOrderId)
    .single();
  if (error || !data) throw new Error("Work order not found in database");
  return data;
}

async function fetchLogoBytes(logoUrl) {
  try {
    if (!logoUrl) return null;
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return new Uint8Array(arr);
  } catch {
    return null;
  }
}

// ---------- PDF BUILDER (Fiori-like) ----------
async function buildPdf(order, company) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Font
  let fontBytes = null;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch (err) {
    console.warn("⚠️ Font not found, fallback to Helvetica:", err.message);
  }
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes, { subset: true })
    : await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Colors (Fiori-ish)
  const colPrimary = rgb(0.0, 0.32, 0.61); // SAP blue-ish
  const colMuted = rgb(0.40, 0.40, 0.40);
  const colLine = rgb(0.85, 0.85, 0.85);

  // Page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Optional logo (from URL in DB)
  const logoBytes = await fetchLogoBytes(company?.logo_url || "");
  if (logoBytes) {
    try {
      let logo;
      // pokušaj PNG pa JPG
      try {
        logo = await pdfDoc.embedPng(logoBytes);
      } catch {
        logo = await pdfDoc.embedJpg(logoBytes);
      }
      const lw = 120;
      const lh = (logo.height / logo.width) * lw;
      page.drawImage(logo, { x: width - lw - 40, y: height - lh - 40, width: lw, height: lh });
    } catch {
      /* ignore logo if fails */
    }
  }

  // Header strip
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: rgb(0.97, 0.97, 0.98) });
  page.drawText("RADNI NALOG", { x: 40, y: height - 45, size: 20, color: colPrimary, font });

  // Company block
  const companyName = company?.legal_name || "—";
  const companyLine = [
    company?.address_line, company?.city, company?.country
  ].filter(Boolean).join(", ");
  const companyContact = [
    company?.phone ? `Tel: ${company.phone}` : "",
    company?.email ? `Email: ${company.email}` : ""
  ].filter(Boolean).join(" · ");

  page.drawText(companyName, { x: 40, y: height - 85, size: 12, font, color: rgb(0, 0, 0) });
  if (companyLine) page.drawText(companyLine, { x: 40, y: height - 100, size: 10, font, color: colMuted });
  if (companyContact) page.drawText(companyContact, { x: 40, y: height - 115, size: 10, font, color: colMuted });

  // Thin line
  page.drawLine({ start: { x: 40, y: height - 130 }, end: { x: width - 40, y: height - 130 }, thickness: 0.5, color: colLine });

  // Two-column helper
  const leftX = 40;
  const rightX = width / 2 + 10;
  let yL = height - 160;
  let yR = height - 160;
  const lineGap = 18;

  const drawKV = (x, y, k, v) => {
    page.drawText(k, { x, y, size: 10, font, color: colMuted });
    page.drawText(v ?? "-", { x, y: y - 14, size: 12, font, color: rgb(0, 0, 0) });
  };

  // --- LEFT: Order basics ---
  drawKV(leftX, yL, "Broj naloga", order.order_no || String(order.id)); yL -= lineGap * 2;
  drawKV(leftX, yL, "Datum", new Date().toLocaleString("hr-HR")); yL -= lineGap * 2;
  drawKV(leftX, yL, "Status", order.status || "—"); yL -= lineGap * 2;
  drawKV(leftX, yL, "Količina", String(order.quantity ?? 1)); yL -= lineGap * 2;

  // --- RIGHT: Customer ---
  drawKV(rightX, yR, "Kupac", order.customer_name || "—"); yR -= lineGap * 2;
  drawKV(rightX, yR, "Email", order.customer_email || "—"); yR -= lineGap * 2;
  drawKV(rightX, yR, "Radionica", order.workshop_name || order.workshop || "—"); yR -= lineGap * 2;
  drawKV(rightX, yR, "Unio", order.entered_by || order.created_by || "—"); yR -= lineGap * 2;

  // Section: Specifikacije (full width grid like)
  const sectionTitle = (txt, yy) => {
    page.drawText(txt, { x: 40, y: yy, size: 12, font, color: colPrimary });
    page.drawLine({ start: { x: 40, y: yy - 6 }, end: { x: width - 40, y: yy - 6 }, thickness: 0.5, color: colLine });
  };

  let y = Math.min(yL, yR) - 10;
  sectionTitle("SPECIFIKACIJE", y); y -= 20;

  // Spec fields (2 columns)
  const specPairs = [
    ["Tip proizvoda", order.product_type || order.type || "—"],
    ["Čistoća", order.purity || "—"],
    ["Boja", order.color || "—"],
    ["Model", order.model || order.model_name || "—"],
    ["Muški broj", order.male_size || "—"],
    ["Ženski broj", order.female_size || "—"],
    ["Kamenje", order.stones || "—"],
    ["Skica", order.has_sketch ? "DA" : "NE"],
  ];

  for (let i = 0; i < specPairs.length; i += 2) {
    const [k1, v1] = specPairs[i];
    const [k2, v2] = specPairs[i + 1] || ["", ""];
    drawKV(leftX, y, k1, v1);
    if (k2) drawKV(rightX, y, k2, v2);
    y -= lineGap * 2;
  }

  // Section: Gravure i napomena
  sectionTitle("GRAVURE I DODATNO", y); y -= 20;

  const longKV = (label, value) => {
    page.drawText(label, { x: 40, y, size: 10, font, color: colMuted }); y -= 14;
    const text = (value && String(value)) || "—";
    const chunks = text.match(/.{1,92}/g) || [text];
    for (const line of chunks) {
      page.drawText(line, { x: 40, y, size: 12, font });
      y -= 16;
    }
    y -= 4;
  };

  longKV("Gravura 1", order.engraving_1);
  longKV("Gravura 2", order.engraving_2);
  longKV("Zajednička gravura", order.joint_engraving);
  longKV("Napomena", order.additional_comment || order.notes || order.description);

  // Section: Predujam (ako postoji)
  if (order.prepayment || (order.prepayment_amount ?? 0) > 0) {
    sectionTitle("PREDUJAM", y); y -= 20;
    const pp = Number(order.prepayment_amount || 0);
    drawKV(leftX, y, "Predujam", `${pp.toFixed(2)} €`);
    y -= lineGap * 2;
  }

  // Footer
  page.drawLine({ start: { x: 40, y: 70 }, end: { x: width - 40, y: 70 }, thickness: 0.5, color: colLine });
  page.drawText(companyName, { x: 40, y: 56, size: 9, font, color: colMuted });
  if (company?.tax_id)
    page.drawText(`OIB: ${company.tax_id}`, { x: 40, y: 42, size: 9, font, color: colMuted });
  if (company?.iban)
    page.drawText(`IBAN: ${company.iban}`, { x: 40, y: 28, size: 9, font, color: colMuted });
  page.drawText("Generirano u ORCAFX ERP", { x: width - 180, y: 28, size: 9, font, color: colMuted });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

// ---------- BREVO ----------
async function sendEmail(to, pdfBase64, order_no, company) {
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

  const senderEmail = company?.email || "noreply@krizek.hr";
  const senderName = company?.legal_name || "ORCAFX ERP";

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: to }],
    subject: `Radni nalog ${order_no}`,
    htmlContent: `
      <p>Poštovani,</p>
      <p>U privitku se nalazi radni nalog <b>${order_no}</b>.</p>
      <p>Lijep pozdrav,<br>${senderName}</p>
    `,
    attachment: [
      {
        name: `${order_no}.pdf`,
        base64Content: pdfBase64, // ← ispravan ključ za Brevo
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

// ---------- HANDLER ----------
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};

  try {
    // 1) Data
    const [company, order] = await Promise.all([
      fetchCompanyProfile(),
      fetchWorkOrder(workOrderId),
    ]);

    // 2) PDF
    const pdfBase64 = await buildPdf(order, company);

    // 3) If we have an email, send; otherwise just return PDF (print-only mode)
    let sent = null;
    if (emailToSend) {
      sent = await sendEmail(emailToSend, pdfBase64, order.order_no || order.id, company);
      // Log success
      try {
        await supabase.rpc("fn_wo_log_email", {
          p_work_order_id: workOrderId,
          p_to: emailToSend,
          p_status: "SENT",
          p_provider_id: sent?.messageId ?? null,
          p_error: null,
          p_payload: sent ?? {},
        });
      } catch (e) {
        console.warn("⚠️ Could not log success:", e.message);
      }
    }

    return res.status(200).json({
      ok: true,
      mailed: Boolean(emailToSend),
      result: sent,
      pdfBase64, // uvijek vraćamo PDF → frontend može “Print/Download”
      order_no: order.order_no || order.id,
    });
  } catch (e) {
    console.error("❌ send.js error:", e.message);

    // Log fail (ako imamo osnovne id podatke)
    try {
      if (workOrderId && emailToSend) {
        await supabase.rpc("fn_wo_log_email", {
          p_work_order_id: workOrderId,
          p_to: emailToSend,
          p_status: "FAILED",
          p_provider_id: null,
          p_error: e.message?.slice(0, 300) || "unknown",
          p_payload: {},
        });
      }
    } catch (err2) {
      console.warn("⚠️ Could not log error:", err2.message);
    }

    return res.status(500).json({ ok: false, error: e.message });
  }
}
