import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./RepairCatalog.css";

export default function RepairCatalog() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRepair, setNewRepair] = useState({
    repair_code: "",
    repair_name: "",
    base_price: "",
    vat_rate: 25,
  });
  const [massValue, setMassValue] = useState("");

  // 🔹 Fetch repairs
  const fetchRepairs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repair_catalog")
      .select("*")
      .order("repair_code", { ascending: true });

    if (error) {
      toast.error("❌ Greška kod dohvaćanja servisa");
      console.error(error);
    } else setRepairs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  // 🔹 Dodavanje novog servisa
  const handleAdd = async () => {
    if (!newRepair.repair_code || !newRepair.repair_name) {
      toast.warning("Unesi kod i naziv servisa!");
      return;
    }

    const { error } = await supabase.from("repair_catalog").insert([newRepair]);
    if (error) {
      toast.error("❌ Greška kod unosa: " + error.message);
    } else {
      toast.success("✅ Servis dodan!");
      setNewRepair({ repair_code: "", repair_name: "", base_price: "", vat_rate: 25 });
      fetchRepairs();
    }
  };

  // 🔹 Brisanje servisa
  const handleDelete = async (id) => {
    if (!window.confirm("Obrisati ovaj servis?")) return;
    const { error } = await supabase.from("repair_catalog").delete().eq("id", id);
    if (error) toast.error("❌ Greška kod brisanja: " + error.message);
    else {
      toast.success("🗑️ Servis obrisan!");
      fetchRepairs();
    }
  };

  // 🔹 Mass update (postotak / iznos)
  const handleMassUpdate = async (mode, value) => {
    if (!value || isNaN(value)) {
      toast.error("Unesi broj!");
      return;
    }

    let sql = "";

    if (mode === "add") {
      sql = `UPDATE repair_catalog SET base_price = base_price + ${value}`;
    } else if (mode === "subtract") {
      sql = `UPDATE repair_catalog SET base_price = base_price - ${value}`;
    } else if (mode === "percent_plus") {
      const factor = 1 + Number(value) / 100;
      sql = `UPDATE repair_catalog SET base_price = base_price * ${factor}`;
    } else if (mode === "percent_minus") {
      const factor = 1 - Number(value) / 100;
      sql = `UPDATE repair_catalog SET base_price = base_price * ${factor}`;
    }

    try {
      const { error } = await supabase.rpc("exec_sql", { sql });
      if (error) throw error;
      toast.success("✅ Cijene ažurirane!");
      setMassValue("");
      fetchRepairs();
    } catch (err) {
      console.error(err);
      toast.error("❌ Greška: " + err.message);
    }
  };

  return (
    <div className="repair-catalog">
      <h2>🧰 Repair Catalog</h2>
      <p>Upravljaj popravcima, cijenama i PDV-om.</p>

      {/* ➕ Dodavanje novog servisa */}
      <div className="repair-form">
        <input
          type="text"
          placeholder="Šifra (npr. SRV-001)"
          value={newRepair.repair_code}
          onChange={(e) => setNewRepair({ ...newRepair, repair_code: e.target.value })}
        />
        <input
          type="text"
          placeholder="Naziv popravka"
          value={newRepair.repair_name}
          onChange={(e) => setNewRepair({ ...newRepair, repair_name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Osnovna cijena"
          value={newRepair.base_price}
          onChange={(e) => setNewRepair({ ...newRepair, base_price: e.target.value })}
        />
        <input
          type="number"
          placeholder="PDV %"
          value={newRepair.vat_rate}
          onChange={(e) => setNewRepair({ ...newRepair, vat_rate: e.target.value })}
        />
        <button onClick={handleAdd}>➕ Dodaj</button>
      </div>

      {/* 💰 Masovno ažuriranje */}
      <div className="mass-update">
        <input
          type="number"
          placeholder="Iznos ili %"
          value={massValue}
          onChange={(e) => setMassValue(e.target.value)}
        />
        <button onClick={() => handleMassUpdate("add", massValue)}>+ €</button>
        <button onClick={() => handleMassUpdate("subtract", massValue)}>- €</button>
        <button onClick={() => handleMassUpdate("percent_plus", massValue)}>+ %</button>
        <button onClick={() => handleMassUpdate("percent_minus", massValue)}>- %</button>
      </div>

      {/* 📋 Lista servisa */}
      {loading ? (
        <p>Učitavam...</p>
      ) : (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Šifra</th>
              <th>Naziv</th>
              <th>Cijena (€)</th>
              <th>PDV %</th>
              <th>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map((r) => (
              <tr key={r.id}>
                <td>{r.repair_code}</td>
                <td>{r.repair_name}</td>
                <td>{Number(r.base_price).toFixed(2)}</td>
                <td>{r.vat_rate}</td>
                <td>
                  <button onClick={() => handleDelete(r.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
