// ✉️ Brevo Mail Sender
async function sendEmail(to, pdfBase64, order_no) {
  if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

  // očisti eventualni prefiks ako ga pdf-lib ikad doda
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

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
        <p>Postovani,</p>
        <p>U privitku se nalazi vas radni nalog <b>${order_no}</b>.</p>
        <p>Lijep pozdrav,<br>ORCAFX ERP sustav</p>
      `,
      attachment: [
        {
          name: `${order_no}.pdf`,
          content: cleanBase64,
          type: "application/pdf",
        },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo error: ${text}`);
  return JSON.parse(text);
}
