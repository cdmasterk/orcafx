// api/workorders/send.js
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@supabase/supabase-js";

// ===== ENV =====
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Hard fail if essentials missing (shows clear 500)
function assertEnv() {
  const miss = [];
  if (!SUPABASE_URL) miss.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) miss.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!BREVO_API_KEY) miss.push("BREVO_API_KEY");
  if (miss.length) throw new Error("Missing env: " + miss.join(", "));
}
assertEnv();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ===== PDF FONT (optional) =====
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// ===== helpers =====
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const fmtDate = (d) => {
  try {
    return d ? new Date(d).toLocaleString("hr-HR") : "-";
  } catch {
    return "-";
  }
};

// ---------- PDF BUILDER ----------
async function buildPdf(order, company) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // try NotoSans (UTF-8), fallback to Helvetica
  let fontBytes = null;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch {
    // ignore; will use Helvetica
  }
  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const draw = (label, value, y) => {
    const text = `${label}: ${value || "-"}`;
    page.drawText(text, { x: 40, y, size: 11, font, color: rgb(0, 0, 0) });
  };

  // Header
  const legal = company?.legal_name || "ORCAFX ERP";
  const addr = [company?.address_line, company?.city, company?.country].filter(Boolean).join(", ");
  const phoneEmail = [company?.phone, company?.email].filter(Boolean).join(" · ");

  page.drawText(legal, { x: 40, y: height - 60, size: 16, font, color: rgb(0, 0, 0) });
  if (addr) page.drawText(addr, { x: 40, y: height - 78, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
  if (phoneEmail) page.drawText(phoneEmail, { x: 40, y: height - 92, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

  page.drawText("RADNI NALOG", { x: width - 180, y: height - 60, size: 16, font, color: rgb(0, 0, 0) });

  // Order meta
  let y = height - 130;
  draw("Broj naloga", safe(order.order_no || order.id), y); y -= 18;
  draw("Status", safe(order.status), y); y -= 18;
  draw("Datum kreiranja", fmtDate(order.created_at), y); y -= 18;
  draw("Rok (Due date)", fmtDate(order.due_date), y); y -= 24;

  // Customer
  page.drawText("Kupac", { x: 40, y, size: 12, font, color: rgb(0, 0, 0) }); y -= 16;
  draw("Ime", safe(order.customer_name), y); y -= 18;
  draw("Email", safe(order.customer_email), y); y -= 24;

  // Specs
  page.drawText("Specifikacije", { x: 40, y, size: 12, font, color: rgb(0, 0, 0) }); y -= 16;
  draw("Tip proizvoda", safe(order.product_type), y); y -= 18;
  draw("Čistoća", safe(order.purity), y); y -= 18;
  draw("Boja", safe(order.color), y); y -= 18;
  draw("Model", safe(order.model), y); y -= 18;
  draw("Količina", safe(order.quantity), y); y -= 24;

  // Sizes & engraving (only if fields exist on the row)
  const maybe = (k) => order && Object.prototype.hasOwnProperty.call(order, k) ? order[k] : undefined;

  const male_size = maybe("male_size");
  const female_size = maybe("female_size");
  const stones = maybe("stones");
  const engraving_1 = maybe("engraving_1");
  const engraving_2 = maybe("engraving_2");
  const joint_engraving = maybe("joint_engraving");
  const additional_comment = maybe("additional_comment");
  const has_sketch = maybe("has_sketch");

  page.drawText("Dimenzije / Gravure", { x: 40, y, size: 12, font, color: rgb(0, 0, 0) }); y -= 16;
  if (male_size !== undefined) { draw("Muška mjera", safe(male_size), y); y -= 18; }
  if (female_size !== undefined) { draw("Ženska mjera", safe(female_size), y); y -= 18; }
  if (stones !== undefined) { draw("Kamenje", safe(stones), y); y -= 18; }
  if (engraving_1 !== undefined) { draw("Gravura 1", safe(engraving_1), y); y -= 18; }
  if (engraving_2 !== undefined) { draw("Gravura 2", safe(engraving_2), y); y -= 18; }
  if (joint_engraving !== undefined) { draw("Zajednička gravura", safe(joint_engraving), y); y -= 18; }
  y -= 6;

  // Additional comment (wrap naive)
  if (additional_comment) {
    page.drawText("Napomena:", { x: 40, y, size: 12, font, color: rgb(0, 0, 0) }); y -= 16;
    const text = safe(additional_comment);
    const maxChars = 90;
    for (let i = 0; i < text.length; i += maxChars) {
      const line = text.slice(i, i + maxChars);
      page.drawText(line, { x: 40, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 14;
      if (y < 80) break;
    }
    y -= 8;
  }

  // Sketch info (we only indicate presence; embedding image requires URL fetch & decode)
  if (has_sketch === true || has_sketch === "true") {
    page.drawText("Priložena skica: DA (vidi sustav)", { x: 40, y, size: 11, font, color: rgb(0, 0.3, 0) });
    y -= 18;
  }

  // Footer / signature
  page.drawText("Potpis radionice:", { x: 40, y: 90, size: 11, font, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: 160, y: 88 }, end: { x: width - 40, y: 88 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });

  const bytes = await pdfDoc.save();
  // Brevo expects pure base64 content (no data: prefix)
  return Buffer.from(bytes).toString("base64");
}

// ---------- BREVO ----------
async function sendEmail(to, pdfBase64, order_no, company) {
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

  const email = (to || "").trim();
  if (!email || !email.includes("@")) {
    throw new Error(`Invalid recipient email: ${email || "(empty)"}`);
  }

  // Prefer company email if present, fallback to a verified sender on Brevo
  const senderEmail = (company?.email || "").trim() || "noreply@krizek.hr";
  const senderName = company?.legal_name || "ORCAFX ERP";

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email }],
    subject: `Radni nalog ${order_no}`,
    htmlContent: `
      <p>Poštovani,</p>
      <p>U privitku se nalazi radni nalog <b>${order_no}</b>.</p>
      <p>Lijep pozdrav,<br>${senderName}</p>
    `,
    attachment: [
      {
        name: `${order_no}.pdf`,
        base64Content: pdfBase64, // <-- correct field for Brevo
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

// ---------- MAIN HANDLER ----------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });
  }

  try {
    // 1) company profile (for header & sender)
    const { data: company } = await supabase
      .from("company_profile")
      .select("legal_name,address_line,city,country,phone,email")
      .limit(1)
      .maybeSingle();

    // 2) work order
    const { data: order, error: woErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (woErr || !order) throw new Error("Work order not found in database");

    // 3) PDF
    const pdfBase64 = await buildPdf(order, company);

    // 4) EMAIL
    const result = await sendEmail(emailToSend, pdfBase64, order.order_no || order.id, company);

    // 5) LOG success
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
    // log failure (best effort)
    try {
      await supabase.rpc("fn_wo_log_email", {
        p_work_order_id: workOrderId,
        p_to: emailToSend,
        p_status: "FAILED",
        p_provider_id: null,
        p_error: (e?.message || "unknown").slice(0, 300),
        p_payload: {},
      });
    } catch (_) {
      // ignore
    }
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
