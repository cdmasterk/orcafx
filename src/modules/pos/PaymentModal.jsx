import React, { useState } from "react";
import "./PaymentModal.css";

export default function PaymentModal({ total, onCancel, onConfirm }) {
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [voucher, setVoucher] = useState("");
  const [cardType, setCardType] = useState("Maestro");

  const sum = (parseFloat(cash||0) + parseFloat(card||0) + parseFloat(voucher||0)).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      cash: Number(cash || 0),
      card: Number(card || 0),
      voucher: Number(voucher || 0),
      cardType
    });
  };

  return (
    <div className="modal">
      <form className="modal-body" onSubmit={handleSubmit}>
        <h3>Naplata</h3>
        <div className="row">
          <label>Gotovina (€)</label>
          <input type="number" step="0.01" value={cash} onChange={e=>setCash(e.target.value)} />
        </div>
        <div className="row">
          <label>Kartica (€)</label>
          <input type="number" step="0.01" value={card} onChange={e=>setCard(e.target.value)} />
        </div>
        <div className="row">
          <label>Tip kartice</label>
          <select value={cardType} onChange={e=>setCardType(e.target.value)}>
            <option>Maestro</option>
            <option>Mastercard</option>
            <option>Visa</option>
            <option>Amex</option>
            <option>Diners</option>
          </select>
        </div>
        <div className="row">
          <label>Poklon bon (€)</label>
          <input type="number" step="0.01" value={voucher} onChange={e=>setVoucher(e.target.value)} />
        </div>

        <div className="summary">
          <div><span>Iznos računa:</span><b>{total.toFixed(2)} €</b></div>
          <div><span>Uplate:</span><b>{sum} €</b></div>
        </div>

        <div className="modal-actions">
          <button className="btn" type="submit">Izdaj račun</button>
          <button className="btn btn-outline" type="button" onClick={onCancel}>Odustani</button>
        </div>
      </form>
    </div>
  );
}
