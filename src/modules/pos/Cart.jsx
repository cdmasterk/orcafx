import React from "react";
import "./Cart.css";

export default function Cart({
  cart,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  onStorno,
  lastInvoice,
}) {
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="cart">
      <h3>Košarica</h3>
      {cart.length === 0 ? (
        <p>Prazna košarica.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Šifra</th>
              <th>Naziv</th>
              <th>Cijena</th>
              <th>Količina</th>
              <th>Ukupno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.code}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.price.toFixed(2)} €</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateQuantity(item.code, parseInt(e.target.value, 10))
                    }
                  />
                </td>
                <td>{(item.price * item.quantity).toFixed(2)} €</td>
                <td>
                  <button
                    className="btn small danger"
                    onClick={() => onRemove(item.code)}
                  >
                    Ukloni
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="cart-footer">
        <strong>Ukupno: {total.toFixed(2)} €</strong>
        <div className="actions">
          <button className="btn primary" onClick={onCheckout}>
            Naplata
          </button>
          {lastInvoice && (
            <button className="btn danger" onClick={onStorno}>
              Storno
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
