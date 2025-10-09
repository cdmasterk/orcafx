// src/modules/pos/Repairs.jsx
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./Repairs.css";

const UNFINISHED = ["PENDING", "RECEIVED", "IN_PROGRESS"];
const FINISHED = ["READY", "DELIVERED", "CANCELLED"];

function sortRepairs(a, b) {
  const aUnf = UNFINISHED.includes(a.status);
  const bUnf = UNFINISHED.includes(b.status);
  if (aUnf !== bUnf) return aUnf ? -1 : 1;
  const aDate = a.received_at ? new Date(a.received_at).getTime() : 0;
  const bDate = b.received_at ? new Date(b.received_at).getTime() : 0;
  return bDate - aDate;
}

export default function Repairs({ addToCart }) {
  const [repairs, setRepairs] = useState([]);
  const [catalog, setCatalog] = useState([]); // dropdown iz repair_catalog
  const [loading, setLoading] = useState(false);
  const [showMailConfirm, setShowMailConfirm] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingRepair, setPendingRepair] = useState(null);

  const [newRepair, setNewRepair] = useState({
    customer_name: "",
    customer_email: "",
    item_code: "",
    repair_catalog_id: "",
    description: "",
    total_price: "",
  });

  useEffect(() => {
    fetchCatalog();
    fetchRepairs();
  }, []);

  const fetchCatalog = async () => {
    const { data, error } = await supabase
      .from("repair_catalog")
      .select("id, repair_name, repair_code, base_price, active")
      .eq("active", true)
      .order("repair_name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("❌ Greška kod dohvaćanja kataloga popravaka");
      return;
    }
    setCatalog(data || []);
  };

  const fetchRepairs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repairs")
      .select("*")
      .order("received_at", { ascending: false });

    if (error) {
      toast.error("❌ Greška kod dohvaćanja popravaka");
      setLoading(false);
      return;
    }
    setRepairs((data || []).sort(sortRepairs));
    setLoading(false);
  };

  // === Auto generiranje šifre (RPC s fallbackom) ===
  const generateRepairCode = async () => {
    try {
      const { data, error } = await supabase.rpc("generate_next_code_preview", {
        context: "repairs",
      });
      if (error || !data) throw new Error("rpc error");
      return String(data);
    } catch {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      return `REP-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
        d.getDate()
      )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    }
  };

  // === Kad odaberemo tip popravka iz dropdowna ===
  const handleCatalogChange = (id) => {
    const c = catalog.find((x) => x.id === id);
    setNewRepair((prev) => ({
      ...prev,
      repair_catalog_id: id,
      description: c?.repair_name || "",
      total_price: c?.base_price ?? "",
    }));
  };

  // === Kreiranje novog popravka ===
  const handleCreateRepair = async (e) => {
    e.preventDefault();
    const {
      customer_name,
      customer_email,
      item_code,
      repair_catalog_id,
      description,
      total_price,
    } = newRepair;

    if (!customer_name) return toast.error("❌ Unesite ime kupca");
    if (!repair_catalog_id)
      return toast.error("❌ Odaberite popravak iz kataloga");

    try {
      const repair_code = await generateRepairCode();

      const { error } = await supabase.from("repairs").insert([
        {
          repair_code,
          repair_no: repair_code,
          customer_name,
          customer_email: customer_email || null,
          item_code: item_code || null,
          item_description: description,
          total_price: total_price ? Number(total_price) : null,
          status: "RECEIVED",
          received_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast.success("✅ Popravak dodan");
      setNewRepair({
        customer_name: "",
        customer_email: "",
        item_code: "",
        repair_catalog_id: "",
        description: "",
        total_price: "",
      });
      fetchRepairs();
    } catch (err) {
      toast.error("❌ Greška kod spremanja popravka");
    }
  };

  // === Promjena statusa ===
  const handleStatusChange = async (id, newStatus) => {
    const repair = repairs.find((r) => r.id === id);
    if (!repair) return toast.error("❌ Popravak nije pronađen");

    if (newStatus === "READY") {
      setPendingRepair({ id, newStatus, repair });
      setShowMailConfirm(true);
      return;
    }

    await updateStatus(id, newStatus, false);
  };

  // === Update statusa i eventualno slanje maila ===
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
        const cname = repair.customer_name || "kupče";
        const desc =
          repair.item_description || repair.description || repair.item_code;
        const text = `Poštovani ${cname},\n\nVaš ${desc} je gotov i spreman za preuzimanje.\n\nHvala na povjerenju!\nZlatarna Križek`;
        const html = `
          <div style="font-family:sans-serif;color:#333;">
            <h2>Poštovani ${cname},</h2>
            <p>Vaš <strong>${desc}</strong> je gotov i spreman za preuzimanje.</p>
            <p>Hvala na povjerenju!<br><strong>Zlatarna Križek tim</strong></p>
          </div>
        `;

        const resp = await fetch("/api/sendMail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: repair.customer_email,
            subject,
            text,
            html,
          }),
        });

        setSendingMail(false);

        if (resp.ok) {
          toast.success(`📧 Email poslan kupcu ${repair.customer_email}`);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        } else toast.error("❌ Neuspješno slanje emaila.");
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

  const handleCharge = (repair) => {
    if (repair.status !== "READY") {
      toast.warning("Popravak još nije spreman za naplatu!");
      return;
    }

    const cartItem = {
      code: repair.repair_code || repair.repair_no,
      name: `Popravak: ${repair.item_description || repair.description}`,
      price: repair.total_price || 0,
      quantity: 1,
      type: "service",
    };

    addToCart(cartItem);
    toast.success(`✅ Dodano u košaricu: ${cartItem.name}`);
  };

  const sortedRepairs = useMemo(() => (repairs || []).sort(sortRepairs), [repairs]);

  return (
    <div className="repairs-wrapper">
      <h3 className="repairs-header">🧰 Popravci</h3>

      {/* ➕ Forma s dropdownom iz repair_catalog */}
      <form className="repair-form" onSubmit={handleCreateRepair}>
        <input
          type="text"
          placeholder="Kupac"
          value={newRepair.customer_name}
          onChange={(e) =>
            setNewRepair({ ...newRepair, customer_name: e.target.value })
          }
        />
        <input
          type="email"
          placeholder="Email (opcionalno)"
          value={newRepair.customer_email}
          onChange={(e) =>
            setNewRepair({ ...newRepair, customer_email: e.target.value })
          }
        />
        <select
          value={newRepair.repair_catalog_id}
          onChange={(e) => handleCatalogChange(e.target.value)}
        >
          <option value="">— Odaberi popravak —</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.repair_name} ({c.base_price} €)
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Opis (auto)"
          value={newRepair.description}
          readOnly
        />
        <input
          type="number"
          placeholder="Cijena (€)"
          value={newRepair.total_price}
          onChange={(e) =>
            setNewRepair({ ...newRepair, total_price: e.target.value })
          }
        />
        <button type="submit">💾 Spremi</button>
      </form>

      {/* 📋 Lista popravaka */}
      <div className="repairs-list">
        {loading ? (
          <p>Učitavam...</p>
        ) : sortedRepairs.length === 0 ? (
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
              {sortedRepairs.map((r) => (
                <tr key={r.id}>
                  <td>{r.repair_code || r.repair_no}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.item_description || r.description}</td>
                  <td>{r.status}</td>
                  <td>{(r.total_price || 0).toFixed(2)} €</td>
                  <td>
                    <button
                      className="ready-btn"
                      onClick={() => handleStatusChange(r.id, "READY")}
                    >
                      ✅ Završeno
                    </button>
                    <button
                      className="charge-btn"
                      onClick={() => handleCharge(r)}
                    >
                      💰 Naplati
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 📧 Modal potvrde e-maila */}
      {showMailConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>📧 Želite li poslati e-mail kupcu?</h4>
            <p>
              Kupac: <strong>{pendingRepair?.repair.customer_name}</strong>
              <br />
              Email: <strong>{pendingRepair?.repair.customer_email || "—"}</strong>
              <br />
              Popravak:{" "}
              <em>
                {pendingRepair?.repair.item_description ||
                  pendingRepair?.repair.description}
              </em>
            </p>
            <div className="modal-actions">
              <button onClick={() => confirmSendMail(true)}>✅ Pošalji e-mail</button>
              <button onClick={() => confirmSendMail(false)}>🚫 Ne šalji</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌀 Loader overlay */}
      {sendingMail && (
        <div className="mail-loader-overlay">
          <div className="mail-loader">
            <div className="spinner" />
            <p>Šaljem e-mail kupcu...</p>
          </div>
        </div>
      )}

      {/* ✅ Success overlay */}
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
