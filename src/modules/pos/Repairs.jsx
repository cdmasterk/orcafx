import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./Repairs.css";

export default function Repairs({ addToCart }) {
  const [repairs, setRepairs] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [newRepair, setNewRepair] = useState({
    repair_no: "",
    customer_name: "",
    customer_email: "",
    repair_catalog_id: "",
    description: "",
    total_price: "",
  });
  const [loading, setLoading] = useState(false);
  const [showMailConfirm, setShowMailConfirm] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingRepair, setPendingRepair] = useState(null);

  // 📦 Učitavanje kataloga i popravaka
  useEffect(() => {
    fetchCatalog();
    fetchRepairs();
  }, []);

  const fetchCatalog = async () => {
    const { data, error } = await supabase
      .from("repair_catalog")
      .select("id, repair_code, repair_name, base_price, vat_rate, active")
      .eq("active", true)
      .order("repair_name", { ascending: true });

    if (error) {
      toast.error("❌ Greška kod dohvaćanja kataloga popravaka");
      return;
    }

    const processed = (data || []).map((r) => ({
      ...r,
      gross_price: Number(r.base_price) * (1 + (Number(r.vat_rate) || 0) / 100),
    }));
    setCatalog(processed);
  };

  const fetchRepairs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repairs")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("❌ Greška kod dohvaćanja popravaka");
      setLoading(false);
      return;
    }

    const ordered = data.sort((a, b) => {
      const order = ["PENDING", "RECEIVED", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

    setRepairs(ordered);
    setLoading(false);
  };

  // 🔢 Generiranje šifre popravka
  const generateRepairCode = async () => {
    const { data, error } = await supabase.rpc("generate_next_code_preview", {
      p_prefix: "REP",
      p_tier: "STD",
    });
    if (error) {
      console.error(error);
      toast.error("❌ Greška kod generiranja šifre");
      return "";
    }
    return data;
  };

  // ➕ Novi popravak
  const handleCreateRepair = async (e) => {
    e.preventDefault();

    const { customer_name, customer_email, description, total_price, repair_catalog_id, repair_no } = newRepair;
    if (!customer_name || !repair_catalog_id) {
      toast.error("❌ Unesite kupca i odaberite popravak");
      return;
    }

    let code = repair_no;
    if (!code) {
      code = await generateRepairCode();
      if (!code) return;
    }

    const { error } = await supabase.from("repairs").insert([
      {
        repair_no: code,
        customer_name,
        customer_email: customer_email || null,
        description,
        total_price: total_price || 0,
        status: "PENDING",
      },
    ]);

    if (error) {
      toast.error("❌ Greška kod spremanja popravka");
      console.error(error);
    } else {
      toast.success("✅ Popravak dodan");
      setNewRepair({
        repair_no: "",
        customer_name: "",
        customer_email: "",
        repair_catalog_id: "",
        description: "",
        total_price: "",
      });
      fetchRepairs();
    }
  };

  // 🔁 Kad se odabere popravak iz kataloga
  const handleCatalogChange = async (id) => {
    const selected = catalog.find((c) => c.id === id);
    if (!selected) return;

    const code = await generateRepairCode();
    if (code) {
      setNewRepair((prev) => ({
        ...prev,
        repair_catalog_id: id,
        repair_no: code,
        description: selected.repair_name,
        total_price: selected.gross_price.toFixed(2),
      }));
    }
  };

  // 🧠 Promjena statusa
  const handleStatusChange = (id, newStatus) => {
    const repair = repairs.find((r) => r.id === id);
    if (!repair) return toast.error("❌ Popravak nije pronađen");
    if (newStatus === "READY") {
      setPendingRepair({ id, newStatus, repair });
      setShowMailConfirm(true);
    } else {
      updateStatus(id, newStatus, false);
    }
  };

  // 📬 Update statusa i e-mail
  const updateStatus = async (id, newStatus, sendMail = false) => {
    try {
      const { data: repair, error } = await supabase
        .from("repairs")
        .update({
          status: newStatus,
          completed_at: newStatus === "READY" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Status ažuriran: ${newStatus}`);

      if (sendMail && repair?.customer_email) {
        setSendingMail(true);

        const subject = "Vaš popravak je gotov!";
        const text = `Poštovani ${repair.customer_name || "kupče"}, Vaš popravak "${repair.description}" je gotov i spreman za preuzimanje.`;
        const html = `
          <div style="font-family:sans-serif;color:#333;">
            <h2>Poštovani ${repair.customer_name || "kupče"},</h2>
            <p>Vaš popravak <strong>${repair.description}</strong> je gotov i spreman za preuzimanje.</p>
            <p>Hvala na povjerenju!<br><strong>Zlatarna Križek tim</strong></p>
          </div>`;

        const resp = await fetch("/api/sendMail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: repair.customer_email, subject, text, html }),
        });

        setSendingMail(false);
        if (resp.ok) {
          toast.success(`📧 Email poslan kupcu ${repair.customer_email}`);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else {
          toast.error("❌ Neuspješno slanje emaila.");
        }
      }

      fetchRepairs();
    } catch (err) {
      setSendingMail(false);
      toast.error("❌ Greška kod ažuriranja statusa: " + err.message);
    }
  };

  const confirmSendMail = async (send) => {
    if (send)
      await updateStatus(pendingRepair.id, pendingRepair.newStatus, true);
    else await updateStatus(pendingRepair.id, pendingRepair.newStatus, false);
    setShowMailConfirm(false);
    setPendingRepair(null);
  };

  // 💰 Naplata
  const handleCharge = (repair) => {
    if (repair.status !== "READY") {
      toast.warning("Popravak još nije spreman za naplatu!");
      return;
    }

    const cartItem = {
      code: repair.repair_no,
      name: `Popravak: ${repair.description}`,
      price: repair.total_price || 0,
      quantity: 1,
      type: "service",
    };
    addToCart(cartItem);
    toast.success(`✅ Dodano u košaricu: ${cartItem.name}`);
  };

  return (
    <div className="repairs-wrapper">
      <h3 className="repairs-header">🧰 Popravci</h3>

      {/* ➕ Novi popravak */}
      <form className="repair-form" onSubmit={handleCreateRepair}>
        <input
          type="text"
          placeholder="Kupac"
          value={newRepair.customer_name}
          onChange={(e) => setNewRepair({ ...newRepair, customer_name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newRepair.customer_email}
          onChange={(e) => setNewRepair({ ...newRepair, customer_email: e.target.value })}
        />
        <input type="text" placeholder="Šifra popravka" value={newRepair.repair_no} readOnly />
        <select
          value={newRepair.repair_catalog_id}
          onChange={(e) => handleCatalogChange(e.target.value)}
        >
          <option value="">— Odaberi popravak —</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.repair_name} ({c.gross_price.toFixed(2)} €)
            </option>
          ))}
        </select>
        <input type="text" placeholder="Opis" value={newRepair.description} readOnly />
        <input
          type="number"
          placeholder="Cijena (€)"
          value={newRepair.total_price}
          onChange={(e) => setNewRepair({ ...newRepair, total_price: e.target.value })}
        />
        <button type="submit">💾 Spremi</button>
      </form>

      {/* 📋 Lista popravaka */}
      <div className="repairs-list">
        {loading ? (
          <p>Učitavam...</p>
        ) : repairs.length === 0 ? (
          <p>Nema evidentiranih popravaka.</p>
        ) : (
          <table className="styled-table">
            <thead>
              <tr>
                <th>Broj</th>
                <th>Kupac</th>
                <th>Opis</th>
                <th>Status</th>
                <th>Cijena</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((r) => (
                <tr key={r.id}>
                  <td>{r.repair_no}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.description}</td>
                  <td>{r.status}</td>
                  <td>{(r.total_price || 0).toFixed(2)} €</td>
                  <td>
                    <button className="ready-btn" onClick={() => handleStatusChange(r.id, "READY")}>
                      ✅ Završeno
                    </button>
                    <button className="charge-btn" onClick={() => handleCharge(r)}>
                      💰 Naplati
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 📧 Modal */}
      {showMailConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>📧 Želite li poslati e-mail kupcu?</h4>
            <p>
              Kupac: <strong>{pendingRepair?.repair.customer_name}</strong>
              <br />
              Email: <strong>{pendingRepair?.repair.customer_email}</strong>
              <br />
              Popravak: <em>{pendingRepair?.repair.description}</em>
            </p>
            <div className="modal-actions">
              <button onClick={() => confirmSendMail(true)}>✅ Pošalji e-mail</button>
              <button onClick={() => confirmSendMail(false)}>🚫 Ne šalji</button>
            </div>
          </div>
        </div>
      )}

      {sendingMail && (
        <div className="mail-loader-overlay">
          <div className="mail-loader">
            <div className="spinner" />
            <p>Šaljem e-mail kupcu...</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="mail-success-overlay">
          <div className="mail-success">
            <div className="checkmark">✔️</div>
            <p>Email uspješno poslan!</p>
          </div>
        </div>
      )}
    </div>
  );
}
