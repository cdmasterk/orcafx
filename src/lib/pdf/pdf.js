// Jednostavan PDF generator preko pdfmake-lite (bez CDN-a: instaliraj pdfmake)
// npm i pdfmake
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

export function pdfProcurement(doc, items) {
  const body = [
    [{ text: "Šifra", bold: true }, { text: "Naziv", bold: true }, { text: "Količina", bold: true, alignment: "right" }, { text: "NC", bold: true, alignment: "right" }, { text: "VP", bold: true, alignment: "right" }, { text: "MPC", bold: true, alignment: "right" }]
  ];

  items.forEach(it => {
    body.push([
      it.product_code || "",
      it.product_name || "",
      { text: fmt(it.quantity), alignment: "right" },
      { text: money(it.price_nc), alignment: "right" },
      { text: money(it.price_vp), alignment: "right" },
      { text: money(it.price_mpc), alignment: "right" }
    ]);
  });

  const dd = {
    content: [
      { text: "NABAVA (PROCUREMENT)", style: "h1" },
      {
        columns: [
          [
            { text: `Dokument: ${doc.id || "-"}` },
            { text: `Dobavljač: ${doc.supplier_name || "-"}` },
            { text: `Račun: ${doc.invoice_number || "-"}` },
          ],
          [
            { text: `Skladište: ${doc.warehouse_name || "-"}`, alignment: "right" },
            { text: `Datum: ${fmtDate(doc.created_at)}`, alignment: "right" }
          ]
        ]
      },
      { text: " ", margin: [0,10] },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto"],
          body
        },
        layout: "lightHorizontalLines"
      }
    ],
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0,0,0,8] }
    },
    defaultStyle: { fontSize: 9 }
  };

  pdfMake.createPdf(dd).download(`Procurement_${doc.id || ""}.pdf`);
}

export function pdfTransfer(doc, items) {
  const body = [
    [{ text: "Šifra", bold: true }, { text: "Naziv", bold: true }, { text: "Količina", bold: true, alignment: "right" }, { text: "NC", bold: true, alignment: "right" }, { text: "VP", bold: true, alignment: "right" }, { text: "MPC", bold: true, alignment: "right" }]
  ];

  items.forEach(it => {
    body.push([
      it.product_code || "",
      it.product_name || "",
      { text: fmt(it.quantity), alignment: "right" },
      { text: money(it.price_nc), alignment: "right" },
      { text: money(it.price_vp), alignment: "right" },
      { text: money(it.price_mpc), alignment: "right" }
    ]);
  });

  const dd = {
    content: [
      { text: "PRIJENOS (TRANSFER)", style: "h1" },
      {
        columns: [
          [
            { text: `Dokument: ${doc.id || "-"}` },
            { text: `Referenca: ${doc.reference_no || "-"}` },
          ],
          [
            { text: `Iz: ${doc.from_warehouse_name || "-"}`, alignment: "right" },
            { text: `U: ${doc.to_warehouse_name || "-"}`, alignment: "right" },
            { text: `Datum: ${fmtDate(doc.created_at)}`, alignment: "right" }
          ]
        ]
      },
      { text: " ", margin: [0,10] },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto"],
          body
        },
        layout: "lightHorizontalLines"
      }
    ],
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0,0,0,8] }
    },
    defaultStyle: { fontSize: 9 }
  };

  pdfMake.createPdf(dd).download(`Transfer_${doc.id || ""}.pdf`);
}

function fmt(n){ return (n ?? 0).toString(); }
function money(n){ return (n ?? 0).toFixed(2); }
function fmtDate(d){ try{ return new Date(d).toLocaleString(); } catch { return ""; } }
