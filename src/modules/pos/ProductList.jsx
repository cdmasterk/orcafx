import React, { useState } from "react";
import "./ProductList.css";

export default function ProductList({ products, onAdd }) {
  const [query, setQuery] = useState("");

  const filtered = products.filter(
    (p) =>
      p.code.toLowerCase().includes(query.toLowerCase()) ||
      p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="list-container">
      <input
        type="text"
        placeholder="🔎 Pretraga po šifri ili nazivu..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="list-search"
      />

      {filtered.length === 0 ? (
        <p>Nema proizvoda.</p>
      ) : (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Šifra</th>
              <th>Naziv</th>
              <th>Cijena</th>
              <th>Zaliha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => onAdd(p)}
                className="clickable-row"
              >
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.price.toFixed(2)} €</td>
                <td>{p.stock ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
