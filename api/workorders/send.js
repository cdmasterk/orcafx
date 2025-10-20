import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createClient } from "@supabase/supabase-js";

// 🔑 Environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 📂 Font path
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");

// 🧾 PDF Builder
async function buildPdf(order) {
  console.log("🧾 Building PDF for order:", order.order_no);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let fontBytes;
  try {
    fontBytes = fs.readFileSync(FONT_PATH);
  } catch (err) {
    console.warn("⚠️ Font not found, using Helvetica fallback:", err.message);
  }

  const font = fontBytes
    ? await pdfDoc.embedFont(fontBytes)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();

  page.drawText("🔧 RADNI NALOG", {
    x: 50,
    y: height - 80,
    size: 24,
    color: rgb(0, 0, 0),
    font,
  });

  let y = height - 130;
  const fields = [
    ["Broj naloga", order.order_no],
    ["Kupac", order.customer_name],
    ["Email", order.customer_email],
    ["Tip proizvoda", order.product_type],
    ["Čistoća", order.purity],
    ["Boja", order.color],
    ["Količina", order.quantity],
    ["Status", order.status],
    ["Datum izrade", new Date().toLocaleString("hr-HR")],
  ];

  for (const [label, val] of fields) {
    page.drawText(`${label}: ${val || "-"}`, { x: 50, y, size: 12, font });
    y -= 22;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.toString("base64");
}

// ✉️ Brevo Mail Sender
async function sendEmail(to, pdfBase64, order_no) {
  console.log("📤 Sending email to:", to, "for order:", order_no);
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: "noreply@orcafx.app", name: "ORCAFX ERP" },
      to: [{ email: to }],
      subject: `Radni nalog ${order_no}`,
      htmlContent: `
        <p>Poštovani,</p>
        <p>U privitku se nalazi vaš radni nalog <b>${order_no}</b>.</p>
        <p>Lijep pozdrav,<br>ORCAFX ERP sustav</p>
      `,
      attachment: [
        {
          name: `${order_no}.pdf`,
          content: pdfBase64,
        },
      ],
    }),
  });

  const text = await res.text();
  console.log("📩 Brevo raw response:", text);

  if (!res.ok) throw new Error(`Brevo error: ${text}`);
  return JSON.parse(text);
}

// 🚀 Handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.warn("⚠️ Invalid request method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📨 send.js triggered:", req.body);

  const { workOrderId, emailToSend } = req.body || {};
  console.log("🔹 workOrderId:", workOrderId);
  console.log("🔹 emailToSend:", emailToSend);

  if (!workOrderId || !emailToSend) {
    console.error("❌ Missing parameters:", { workOrderId, emailToSend });
    return res
      .status(400)
      .json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });
  }

  try {
    console.log("🔍 Fetching order from Supabase...");
    const { data: order, error } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();

    if (error || !order) throw new Error("Work order not found in database");
    console.log("✅ Order found:", order.order_no);

    // 📄 Generate PDF
    const pdfBase64 = await buildPdf(order);
    console.log("🧾 PDF generated successfully, size:", pdfBase64.length, "bytes");

    // 📧 Send email
    const result = await sendEmail(emailToSend, pdfBase64, order.order_no);
    console.log("✅ Mail sent successfully via Brevo:", result?.messageId || "no id");

    // 💾 Log success to Supabase
    const { error: logErr } = await supabase.rpc("fn_wo_log_email", {
      p_work_order_id: workOrderId,
      p_to: emailToSend,
      p_status: "SENT",
      p_provider_id: result?.messageId ?? null,
      p_error: null,
      p_payload: result ?? {},
    });

    if (logErr) console.warn("⚠️ Logging RPC failed:", logErr.message);
    else console.log("🧾 Email log saved in database");

    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error("❌ send.js error:", e.message);

    // 🚨 Fallback log
    try {
      await supabase.rpc("fn_wo_log_email", {
        p_work_order_id: workOrderId,
        p_to: emailToSend,
        p_status: "FAILED",
        p_provider_id: null,
        p_error: e.message?.slice(0, 300) || "unknown",
        p_payload: {},
      });
      console.log("⚠️ Logged email failure to database.");
    } catch (err2) {
      console.warn("⚠️ Could not log email error:", err2.message);
    }

    return res.status(500).json({ ok: false, error: e.message });
  }
}
