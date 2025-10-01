import React, { useEffect, useState } from "react";
import { openCashSession, closeCashSession, getOpenCashSession } from "../../services/posService";

export default function CashSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [float, setFloat] = useState("");

  useEffect(() => {
    (async () => {
      const sess = await getOpenCashSession();
      setSession(sess);
    })();
  }, []);

  const handleOpen = async () => {
    if (!float || isNaN(float)) {
      alert("Unesi početni polog u €.");
      return;
    }
    setLoading(true);
    try {
      const sess = await openCashSession(parseFloat(float));
      setSession(sess);
    } catch (err) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    const final = prompt("Unesi konačno stanje gotovine u kasi (€):");
    if (!final || isNaN(final)) return;
    setLoading(true);
    try {
      const closed = await closeCashSession(session.id, parseFloat(final));
      setSession(null);
      alert("Kasa zatvorena.");
    } catch (err) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cash-session-box">
      <h3>Blagajna</h3>
      {session ? (
        <div>
          <p><b>Otvorena:</b> {new Date(session.opened_at).toLocaleString()}</p>
          <p><b>Polog:</b> {session.initial_float} €</p>
          <button disabled={loading} onClick={handleClose}>
            Zatvori kasu
          </button>
        </div>
      ) : (
        <div>
          <input
            type="number"
            placeholder="Polog u €"
            value={float}
            onChange={(e) => setFloat(e.target.value)}
          />
          <button disabled={loading} onClick={handleOpen}>
            Otvori kasu
          </button>
        </div>
      )}
    </div>
  );
}
