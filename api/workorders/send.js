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

// 📄 Fontovi
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_PRIMARY = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const FONT_FALLBACK = path.join(FONTS_DIR, "DejaVuSans.ttf");

// ---------- util ----------
function coalesce(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}
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
    const wpx = font.widthOfTextAtSize(test, size);
    if (wpx > maxWidth) {
      page.drawText(line, { x, y, size, font });
      y -= leading;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y, size, font });
  return y;
}

// ---------- lookup labela iz ID-ova ----------
async function lookupLabels({ category_id, model_id, purity_id, color_id }) {
  const result = {
    categoryLabel: null,
    modelName: null,
    purityLabel: null,
    colorLabel: null,
  };
  const tasks = [];

  if (category_id) {
    tasks.push(
      supabase
        .from("categories")
        .select("name")
        .eq("id", category_id)
        .single()
        .then(({ data }) => (result.categoryLabel = data?.name || null))
        .catch(() => {})
    );
  }
  if (model_id) {
    tasks.push(
      supabase
        .from("product_models")
        .select("name, code")
        .eq("id", model_id)
        .single()
        .then(({ data }) => {
          if (data?.name) {
            result.modelName = data.code ? `${data.code} — ${data.name}` : data.name;
          }
        })
        .catch(() => {})
    );
  }
  if (purity_id) {
    tasks.push(
      supabase
        .from("purity_options")
        .select("label")
        .eq("id", purity_id)
        .single()
        .then(({ data }) => (result.purityLabel = data?.label || null))
        .catch(() => {})
    );
  }
  if (color_id) {
    tasks.push(
      supabase
        .from("color_options")
        .select("label")
        .eq("id", color_id)
        .single()
        .then(({ data }) => (result.colorLabel = data?.label || null))
        .catch(() => {})
    );
  }

  await Promise.all(tasks);
  return result;
}

// ---------- PDF Builder ----------
async function buildPdf(order, company) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // font
  let font = null;
  let usedFontName = "";
  try {
    if (fs.existsSync(FONT_PRIMARY)) {
      font = await pdfDoc.embedFont(fs.readFileSync(FONT_PRIMARY));
      usedFontName = "NotoSans-Regular.ttf";
    } else if (fs.existsSync(FONT_FALLBACK)) {
      font = await pdfDoc.embedFont(fs.readFileSync(FONT_FALLBACK));
      usedFontName = "DejaVuSans.ttf";
    }
  } catch {}
  if (!font) {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    usedFontName = "Helvetica";
  }

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const draw = (text, x, y, size = 11) =>
    page.drawText(String(text ?? "-"), { x, y, size, font, color: rgb(0, 0, 0) });

  // 🏢 HEADER
  const companyName = company?.legal_name || "Zlatarna Krizek doo";
  const address = [company?.address_line, company?.city, company?.country].filter(Boolean).join(", ");
  const contactParts = [];
  if (company?.email) contactParts.push(company.email);
  if (company?.phone) contactParts.push(company.phone);
  if (company?.tax_id) contactParts.push(`OIB: ${company.tax_id}`);
  const contact = contactParts.join(" | ");

  let y = height - 40;
  draw(companyName, 40, y, 16);
  if (address) draw(address, 40, y - 18, 10);
  if (contact) draw(contact, 40, y - 32, 10);

  y -= 60;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.1, 0.1, 0.1) });
  y -= 30;

  // Naslov + datumi
  draw(`RADNI NALOG ${order.order_no ?? ""}`, 40, y, 18);
  y -= 22;
  draw(`Datum narudžbe: ${formatDate(order.order_date)}`, 40, y);
  draw(`Rok izrade: ${formatDate(order.due_date)}`, 300, y);
  y -= 24;

  const section = (title) => {
    y -= 12;
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    y -= 20;
    draw(title, 40, y, 13);
    y -= 18;
  };

  // 👤 KUPAC
  section("KUPAC");
  draw(`Ime: ${coalesce(order.customer_name, "-")}`, 60, y); y -= 18;
  draw(`Email: ${coalesce(order.customer_email, "-")}`, 60, y); y -= 18;
  draw(`Telefon: ${coalesce(order.customer_phone, "-")}`, 60, y); y -= 6;

  // 📦 SPECIFIKACIJE
  section("SPECIFIKACIJE");
  const specs = [
    ["Kategorija", order.categoryDerived],
    ["Model", order.modelDerived],
    ["Čistoća", order.purityDerived],
    ["Boja", order.colorDerived],
    ["Količina", order.quantity],
    ["Status", order.status],
  ];
  for (const [k, v] of specs) { draw(`${k}: ${coalesce(v, "-")}`, 60, y); y -= 18; }
  y -= 6;

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
  for (const [k, v] of details) { draw(`${k}: ${coalesce(v, "-")}`, 60, y); y -= 18; }

  // 💬 NAPOMENE
  section("DODATNE NAPOMENE");
  y = multiLine(page, font, coalesce(order.additional_comment, "-"), 60, y, 11, 460, 16) - 10;

  // 🖼️ SKICA
  if (order.sketch_url) {
    section("SKICA");
    try {
      const buf = await fetch(order.sketch_url).then((r) => r.arrayBuffer());
      let img;
      try { img = await pdfDoc.embedPng(buf); } catch { img = await pdfDoc.embedJpg(buf); }
      const W = 180, H = 180;
      page.drawImage(img, { x: 60, y: y - H, width: W, height: H });
      y -= H + 10;
    } catch {
      draw("⚠️ Skica nije učitana", 60, y); y -= 18;
    }
  }

  // 🧩 QR (bez paketa)
  try {
    const qrValue = `https://orcafx.vercel.app/orders/${encodeURIComponent(order.order_no || "")}`;
    const qrPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(qrValue)}`;
    const qrBuf = await fetch(qrPngUrl).then((r) => r.arrayBuffer());
    const qrImg = await pdfDoc.embedPng(qrBuf);
    page.drawImage(qrImg, { x: width - 130, y: 50, width: 90, height: 90 });
    draw("QR → digitalni nalog", width - 160, 40, 8);
  } catch {}

  // Footer
  draw(`Generated by ORCAFX • Font: ${usedFontName} • ${new Date().toLocaleString("hr-HR")}`, 40, 40, 9);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes).toString("base64");
}

// ---------- Email ----------
async function sendEmail(to, pdfBase64, order_no) {
  const payload = {
    sender: { name: "Zlatarna Krizek", email: "noreply@krizek.hr" },
    to: [{ email: to }],
    subject: `Radni nalog ${order_no}`,
    htmlContent: `<p>Poštovani,</p><p>U privitku se nalazi radni nalog <b>${order_no}</b>.</p><p>Lijep pozdrav,<br>Zlatarna Križek</p>`,
    attachment: [{ name: `${order_no}.pdf`, base64Content: pdfBase64 }],
  };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": BREVO_API_KEY },
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${txt}`);
  return JSON.parse(txt);
}

// ---------- Handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { workOrderId, emailToSend } = req.body || {};
  if (!workOrderId || !emailToSend)
    return res.status(400).json({ ok: false, error: "Missing parameters: workOrderId, emailToSend" });

  try {
    // 1) Work order
    const { data: wo, error: woErr } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", workOrderId)
      .single();
    if (woErr || !wo) throw new Error("Work order not found");

    // 2) Pokušaj dohvatiti custom_order po linku (ako kolona postoji i popunjena)
    let co = null;
    if (wo.custom_order_id) {
      const { data, error } = await supabase
        .from("custom_orders")
        .select(
          "category_id, purity_id, color_id, model_id, " +
          "product_type, purity, color, model, " +
          "male_size, female_size, stones, engraving_1, engraving_2, joint_engraving, additional_comment, sketch_url, " +
          "customer_name, customer_email, customer_phone"
        )
        .eq("id", wo.custom_order_id)
        .single();
      if (!error) co = data;
    }

    // 3) Ako nema linka, fallback: najnoviji custom_order s istim emailom
    if (!co && wo.customer_email) {
      const { data: list } = await supabase
        .from("custom_orders")
        .select(
          "id, category_id, purity_id, color_id, model_id, " +
          "product_type, purity, color, model, " +
          "male_size, female_size, stones, engraving_1, engraving_2, joint_engraving, additional_comment, sketch_url, " +
          "customer_name, customer_email, customer_phone, created_at"
        )
        .eq("customer_email", wo.customer_email)
        .order("created_at", { ascending: false })
        .limit(1);
      if (list && list.length) co = list[0];
    }

    // 4) Lookup labela iz ID-ova ako imamo co
    let categoryLabel = null, modelName = null, purityLabel = null, colorLabel = null;
    if (co) {
      const labels = await lookupLabels({
        category_id: co.category_id,
        model_id: co.model_id,
        purity_id: co.purity_id,
        color_id: co.color_id,
      });
      categoryLabel = labels.categoryLabel;
      modelName = labels.modelName;
      purityLabel = labels.purityLabel;
      colorLabel = labels.colorLabel;
    }

    // 5) Company
    const { data: company } = await supabase
      .from("company_profile")
      .select("legal_name, address_line, city, country, email, phone, tax_id, logo_url")
      .limit(1)
      .single();

    // 6) Merge i derivacije
    const merged = { ...(wo || {}), ...(co || {}) };
    const orderForPdf = {
      order_no: merged.order_no || wo.order_no,
      order_date: merged.order_date || wo.order_date,
      due_date: merged.due_date || wo.due_date,
      status: merged.status || wo.status,
      quantity: merged.quantity || wo.quantity || 1,

      customer_name: coalesce(merged.customer_name, wo.customer_name),
      customer_email: coalesce(merged.customer_email, wo.customer_email),
      customer_phone: coalesce(merged.customer_phone, wo.customer_phone),

      categoryDerived: coalesce(wo.product_type, merged.product_type, categoryLabel),
      modelDerived: coalesce(wo.model, merged.model, modelName),
      purityDerived: coalesce(wo.purity, merged.purity, purityLabel),
      colorDerived: coalesce(wo.color, merged.color, colorLabel),

      male_size: merged.male_size,
      female_size: merged.female_size,
      stones: merged.stones,
      engraving_1: merged.engraving_1,
      engraving_2: merged.engraving_2,
      joint_engraving: merged.joint_engraving,
      additional_comment: merged.additional_comment,

      sketch_url: merged.sketch_url,
    };

    // 7) PDF
    const pdfBase64 = await buildPdf(orderForPdf, company);

    // 8) Print only?
    if (emailToSend === "printonly@local") {
      return res.status(200).json({ ok: true, pdfBase64, order_no: orderForPdf.order_no });
    }

    // 9) Mail
    const result = await sendEmail(emailToSend, pdfBase64, orderForPdf.order_no);

    // 10) Log success
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

