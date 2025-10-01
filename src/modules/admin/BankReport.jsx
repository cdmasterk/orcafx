import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./BankReport.css";

export default function BankReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_bank_deposit_report");
    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja bank reporta: " + error.message);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // 📄 Export u PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("🏦 Bank Deposit Report", 14, 15);

    const tableData = rows.map((r) => [
      r.pos_id,
      r.cashier_email,
      new Date(r.opened_at).toLocaleString("hr-HR"),
      new Date(r.closed_at).toLocaleString("hr-HR"),
      `${r.initial_float?.toFixed(2)} €`,
      `${r.final_balance?.toFixed(2)} €`,
      `${(r.bank_deposit || 0).toFixed(2)} €`,
    ]);

    doc.autoTable({
      head: [
        ["POS", "Blagajnik", "Otvorena", "Zatvorena", "Početni polog", "Završni saldo", "Za banku"],
      ],
      body: tableData,
      startY: 25,
    });

    doc.save("BankDepositReport.pdf");
  };

  return (
    <div className="bank-report">
      <h2>🏦 Bank Deposit Report</h2>
      <div className="report-actions">
        <button onClick={exportPDF} disabled={!rows.length}>
          📄 Export PDF
        </button>
      </div>

      {loading && <p>Učitavam...</p>}
      {!loading && rows.length === 0 && <p>Nema zatvorenih smjena.</p>}

      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>POS</th>
              <th>Blagajnik</th>
              <th>Otvorena</th>
              <th>Zatvorena</th>
              <th>Početni polog</th>
              <th>Završni saldo</th>
              <th>Za banku</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.session_id}>
                <td>{r.pos_id}</td>
                <td>{r.cashier_email}</td>
                <td>{new Date(r.opened_at).toLocaleString("hr-HR")}</td>
                <td>{new Date(r.closed_at).toLocaleString("hr-HR")}</td>
                <td>{r.initial_float?.toFixed(2)} €</td>
                <td>{r.final_balance?.toFixed(2)} €</td>
                <td className="bank-deposit">
                  {(r.bank_deposit || 0).toFixed(2)} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
