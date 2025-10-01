import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./SessionsReport.css";

export default function SessionsReport() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [closingSession, setClosingSession] = useState(null);
  const [finalBalance, setFinalBalance] = useState("");

  // dohvat smjena
  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_sessions_report");
    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja smjena: " + error.message);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // otvori modal
  const openCloseModal = (session) => {
    setClosingSession(session);
    setFinalBalance("");
    setShowModal(true);
  };

  // potvrdi zatvaranje
  const confirmClose = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const cashierId = auth?.user?.id;

      const { error } = await supabase.rpc("close_session", {
        p_session_id: closingSession.session_id,
        p_cashier_id: cashierId,
        p_final_balance: finalBalance ? parseFloat(finalBalance) : null,
      });

      if (error) throw error;

      toast.success("Smjena zatvorena!");
      setShowModal(false);
      setClosingSession(null);
      setFinalBalance("");
      fetchSessions();
    } catch (err) {
      console.error(err);
      toast.error("Greška kod zatvaranja smjene: " + err.message);
    }
  };

  return (
    <div className="sessions-report">
      <h2>📊 Pregled smjena</h2>
      {loading && <p>Učitavam...</p>}
      {!loading && sessions.length === 0 && <p>Nema smjena za prikaz.</p>}

      {sessions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>POS</th>
              <th>Blagajnik</th>
              <th>Otvorena</th>
              <th>Zatvorena</th>
              <th>Status</th>
              <th>Početni polog</th>
              <th>Završni saldo</th>
              <th>Računa</th>
              <th>Ukupno</th>
              <th>Gotovina</th>
              <th>Kartice</th>
              <th>Bonovi</th>
              <th>Virmani</th>
              <th>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id}>
                <td>{s.pos_id}</td>
                <td>{s.cashier_email || s.cashier_id}</td>
                <td>{new Date(s.opened_at).toLocaleString("hr-HR")}</td>
                <td>
                  {s.closed_at
                    ? new Date(s.closed_at).toLocaleString("hr-HR")
                    : "-"}
                </td>
                <td>
                  {s.status === "OPEN" ? (
                    <span className="open-label">OTVORENA</span>
                  ) : (
                    <span className="closed-label">ZATVORENA</span>
                  )}
                </td>
                <td>{s.initial_float?.toFixed(2)} €</td>
                <td>
                  {s.final_balance !== null
                    ? s.final_balance.toFixed(2) + " €"
                    : "-"}
                </td>
                <td>{s.broj_racuna}</td>
                <td>{s.ukupno?.toFixed(2)} €</td>
                <td>{s.gotovina?.toFixed(2)} €</td>
                <td>{s.kartice?.toFixed(2)} €</td>
                <td>{s.bonovi?.toFixed(2)} €</td>
                <td>{s.virmani?.toFixed(2)} €</td>
                <td>
                  {s.status === "OPEN" && (
                    <button
                      className="btn danger small"
                      onClick={() => openCloseModal(s)}
                    >
                      Zatvori
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal za zatvaranje smjene */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Zatvaranje smjene</h3>
            <p>
              POS: <b>{closingSession?.pos_id}</b> — Blagajnik:{" "}
              <b>{closingSession?.cashier_email || closingSession?.cashier_id}</b>
            </p>

            <p>
              Početni polog:{" "}
              <b>{closingSession?.initial_float?.toFixed(2)} €</b>
            </p>

            <label>
              Završni saldo gotovine (€):
              <input
                type="number"
                value={finalBalance}
                onChange={(e) => setFinalBalance(e.target.value)}
              />
            </label>

            {finalBalance && (
              <p className="bank-calc">
                Za uplatu u banku:{" "}
                <b>
                  {(
                    parseFloat(finalBalance) -
                    (closingSession?.initial_float || 0)
                  ).toFixed(2)}{" "}
                  €
                </b>
              </p>
            )}

            <div className="modal-actions">
              <button className="btn confirm" onClick={confirmClose}>
                Potvrdi
              </button>
              <button
                className="btn cancel"
                onClick={() => setShowModal(false)}
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
