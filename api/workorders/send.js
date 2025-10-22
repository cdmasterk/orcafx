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

// ✅ Validacija env varijabli
function assertEnv() {
  const miss = [];
  if (!SUPABASE_URL) miss.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) miss.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!BREVO_API_KEY) miss.push("BREVO_API_KEY");
  if (miss.length) throw new Error("Missing env: " + miss.join(", "));
}
assertEnv();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 📂 Font path
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// 🧾 PDF builder (sa sigurnosnim fallbackom)
async function buildPdf(order, company) {
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    let font;
    try {
      const fontBytes = fs.existsSync(FONT_PATH)
        ? fs.readFileSync(FONT_PATH)
        : null;
      font = fontBytes
        ? await pdfDoc.embedFont(fontBytes)
        : await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const safe = (v) =>
      v === null || v === undefined ? "-" : String(v).trim();
    const draw = (label, value, y) => {
      page.drawText(`${label}: ${safe(value)}`, {
        x: 50,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
    };

    // 🔹 HEADER
    const companyName = company?.legal_name || "Zlatarna Križek d.o.o.";
    const addr = [company?.address_line, company?.city, company?.country]
      .filter(Boolean)
      .join(", ");
    const contact = [company?.phone, company?.email]
      .filter(Boolean)
      .join(" · ");

    page.drawText(companyName, { x: 50, y: height - 60, size: 16, font });
    if (addr) page.drawText(addr, { x: 50, y: height - 76, size: 10, font });
    if (contact)
      page.drawText(contact, { x: 50, y: height - 90, size: 10, font });

    page.drawText("RADNI NALOG", {
      x: 400,
      y: height - 60,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });

    // 🔹 OSNOVNI PODACI
    let y = height - 130;
    draw("Broj naloga", order.order_no || order.id, y);
    y -= 18;
    draw("Kupac", order.customer_name, y);
    y -= 18;
    draw("Email", order.customer_email, y);
    y -= 18;
    draw("Status", order.status, y);
    y -= 18;
    draw("Količina", order.quantity, y);
    y -= 18;
    draw("Datum izrade", new Date().toLocaleString("hr-HR"), y);
    y -= 30;

    // 🔹 SPECIFIKACIJE
    page.drawText("📦 Specifikacije", { x: 50, y, size: 13, font });
    y -= 20;
    draw("Tip proizvoda", order.product_type, y);
    y -= 18;
    draw("Čistoća", order.purity, y);
    y -= 18;
    draw("Boja", order.color, y);
    y -= 18;
    draw("Model", order.model, y);
    y -= 18;
    draw("Muška mjera", order.male_size, y);
    y -= 18;
    draw("Ženska mjera", order.female_size, y);
    y -= 18;
    draw("Kamenje", order.stones, y);
    y -= 30;

    // 🔹 GRAVURE I KOMENTAR
    page.drawText("🪶 Gravure / Napomene", { x: 50, y, size: 13, font });
    y -= 20;
    draw("Gravura 1", order.engraving_1, y);
    y -= 18;
    draw("Gravura 2", order.engraving_2, y);
    y -= 18;
    draw("Zajednička gravura", order.joint_engraving, y);
    y -= 18;
    draw("Napomena", order.additional_comment, y);
    y -= 18;

    // 🔹 SKICA
    if (order.has_sketch === true || order.has_sketch === "true") {
      y -= 10;
      page.drawText("📎 Priložena skica: DA (vidi sustav)", {
        x: 50,
        y,
        size: 11,
        font,
        color: rgb(0, 0.3, 0),
      });
      y -= 18;
    }

    // 🔹 FOOTER
    page.drawText("Generirano putem ORCAFX ERP sustava", {
      x: 50,
      y: 40,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString("base64");
  } catch (e) {
    console.error("❌ PDF error:", e.message);
    throw new Error("PDF generiranje nije uspjelo");
  }
}

// ✉️ Brevo email
async function sendEmail(to, pdfBase64, order_no, company) {
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");
  const email = (to || "").trim();
  if (!email || !email.includes("@")) {
    throw new Error(`Invalid recipient email: ${email || "(empty)"}`);
  }

  const senderEmail = (company?.email || "noreply@krizek.hr").trim();
  const senderName = company?.legal_name || "Zlatarna Križek d.o.o.";

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email }],
    subject: `Radni nalog ${order_no}`,
    htmlContent: `
      <p>Poštovani,</p>
      <p>U privitku se nalazi vaš radni nalog <b>${order_no}</b>.</p>
      <p>Lijep pozdrav,<br>${senderName}</p>
    `,
    attachment: [
      {
        name: `${order_no}.pdf`,
        base64Content: pdfBase64,
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

// 🚀 Main handler
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res
      .status(400)
      .json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });

  try {
    // 🔹 Company info
    const { data: company } = await supabase
      .from("company_profile")
      .select("legal_name,address_line,city,country,phone,email")
      .limit(1)
      .maybeSingle();

    // 🔹 Work order
    const { data: order, error } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (error || !order) throw new Error("Work order not found in database");

    // 🔹 PDF
    const pdfBase64 = await buildPdf(order, company);

    // 🔹 Send email
    const result = await sendEmail(
      emailToSend,
      pdfBase64,
      order.order_no || order.id,
      company
    );

    // 🔹 Log success
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
        p_work_order_id: workOrderId,
        p_to: emailToSend,
        p_status: "FAILED",
        p_provider_id: null,
        p_error: (e?.message || "unknown").slice(0, 300),
        p_payload: {},
      });
    } catch (_) {}

    return res.status(500).json({ ok: false, error: e.message });
  }
}
