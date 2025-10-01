import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import "./DailySalesReport.css";

export default function DailySalesReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_daily_sales");
    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja dnevne prodaje: " + error.message);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // PDF export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("📅 Daily Sales Report", 14, 15);

    const tableData = filteredRows.map((r) => [
      new Date(r.sale_date).toLocaleDateString("hr-HR"),
      `${r.ukupno?.toFixed(2)} €`,
      `${r.gotovina?.toFixed(2)} €`,
      `${r.kartice?.toFixed(2)} €`,
      `${r.bonovi?.toFixed(2)} €`,
      `${r.virmani?.toFixed(2)} €`,
    ]);

    doc.autoTable({
      head: [["Datum", "Ukupno", "Gotovina", "Kartice", "Bonovi", "Virmani"]],
      body: tableData,
      startY: 25,
    });

    doc.save("DailySalesReport.pdf");
  };

  // Excel export
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRows.map((r) => ({
        Datum: new Date(r.sale_date).toLocaleDateString("hr-HR"),
        Ukupno: r.ukupno?.toFixed(2),
        Gotovina: r.gotovina?.toFixed(2),
        Kartice: r.kartice?.toFixed(2),
        Bonovi: r.bonovi?.toFixed(2),
        Virmani: r.virmani?.toFixed(2),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Sales");
    XLSX.writeFile(workbook, "DailySalesReport.xlsx");
  };

  // Search po datumu
  const filteredRows = rows.filter((r) =>
    new Date(r.sale_date)
      .toLocaleDateString("hr-HR")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="daily-sales-report">
      <h2>📅 Daily Sales Report</h2>

      <div className="report-actions">
        <input
          type="text"
          placeholder="🔎 Pretraga po datumu (dd.mm.yyyy)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={exportPDF} disabled={!filteredRows.length}>
          📄 Export PDF
        </button>
        <button onClick={exportExcel} disabled={!filteredRows.length}>
          📊 Export Excel
        </button>
      </div>

      {loading && <p>Učitavam...</p>}
      {!loading && filteredRows.length === 0 && <p>Nema podataka o prodaji.</p>}

      {filteredRows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Ukupno</th>
              <th>Gotovina</th>
              <th>Kartice</th>
              <th>Bonovi</th>
              <th>Virmani</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.sale_date}>
                <td>{new Date(r.sale_date).toLocaleDateString("hr-HR")}</td>
                <td>{r.ukupno?.toFixed(2)} €</td>
                <td>{r.gotovina?.toFixed(2)} €</td>
                <td>{r.kartice?.toFixed(2)} €</td>
                <td>{r.bonovi?.toFixed(2)} €</td>
                <td>{r.virmani?.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
