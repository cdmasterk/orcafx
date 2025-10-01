import React, { useState } from "react";
import "./ProductList.css"; // koristi isti CSS

export default function ServiceList({ services, onAdd }) {
  const [query, setQuery] = useState("");

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="list-container">
      <input
        type="text"
        placeholder="🔎 Pretraga usluga..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="list-search"
      />

      {filtered.length === 0 ? (
        <p>Nema usluga.</p>
      ) : (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Šifra</th>
              <th>Naziv</th>
              <th>Cijena</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => onAdd(s)}
                className="clickable-row"
              >
                <td>{s.code}</td>
                <td>{s.name}</td>
                <td>{s.price.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
