import React, { useState } from "react";
import "./R1Form.css";

export default function R1Form({ onCancel, onSave }) {
  const [form, setForm] = useState({ company:"", address:"", oib:"" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.company || !form.address || !form.oib) {
      alert("Ispunite sva polja.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="modal">
      <form className="modal-body" onSubmit={submit}>
        <h3>R1 podaci</h3>
        <div className="row">
          <label>Naziv tvrtke</label>
          <input value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
        </div>
        <div className="row">
          <label>Adresa</label>
          <input value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
        </div>
        <div className="row">
          <label>OIB</label>
          <input value={form.oib} onChange={e=>setForm({...form, oib:e.target.value})} />
        </div>
        <div className="modal-actions">
          <button className="btn" type="submit">Spremi</button>
          <button className="btn btn-outline" type="button" onClick={onCancel}>Zatvori</button>
        </div>
      </form>
    </div>
  );
}
