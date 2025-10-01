import React, { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./Receipt.css";

const Receipt = forwardRef(({ invoice, items }, ref) => {
  // ✅ QR sadržaj s fiskalnim podacima
  const qrData = `
    OIB: 123456789
    Račun: ${invoice.invoice_no || invoice.id}
    Datum: ${new Date(invoice.issued_at).toLocaleString("hr-HR")}
    Ukupno: ${invoice.total?.toFixed(2)} €
    Način plaćanja: ${invoice.payment_method || "N/A"} ${invoice.payment_subtype || ""}
    ZKI: ${invoice.zki || "—"}
    JIR: ${invoice.jir || "—"}
  `;

  return (
    <div className="receipt" ref={ref}>
      <h2>ZLATARNA KRIŽEK</h2>
      <p className="small">Adresa, 10000 Zagreb</p>
      <p className="small">OIB: 123456789</p>
      <hr />

      <p><strong>Račun:</strong> {invoice.invoice_no || invoice.id}</p>
      <p><strong>Datum:</strong> {new Date(invoice.issued_at).toLocaleString("hr-HR")}</p>
      <p><strong>Blagajnik:</strong> {invoice.cashier_id || "—"}</p>
      <p><strong>Kasa:</strong> {invoice.cash_session_id || "—"}</p>
      <hr />

      <table className="receipt-table">
        <thead>
          <tr>
            <th>Artikl</th>
            <th>Količ.</th>
            <th>Iznos</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.items?.name || it.item_code}</td>
              <td>{it.quantity}</td>
              <td>{(it.price * it.quantity).toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <h3>Ukupno: {invoice.total?.toFixed(2)} €</h3>
      <hr />

      {/* ✅ Način plaćanja */}
      <p>
        <strong>Plaćanje:</strong>{" "}
        {invoice.payment_method === "CASH" && "Gotovina"}
        {invoice.payment_method === "CARD" && "Kartica"}
        {invoice.payment_method === "VOUCHER" && "Poklon bon"}
        {invoice.payment_method === "TRANSFER" && "Virman"}
        {invoice.payment_subtype ? ` (${invoice.payment_subtype})` : ""}
      </p>

      {/* ✅ ZKI i JIR */}
      <p><strong>ZKI:</strong> {invoice.zki || "—"}</p>
      <p><strong>JIR:</strong> {invoice.jir || "—"}</p>

      {/* ✅ QR kod */}
      <div className="qr">
        <QRCodeCanvas value={qrData} size={120} />
      </div>

      <p className="center">Hvala na kupnji!</p>
    </div>
  );
});

export default Receipt;
