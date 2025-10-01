import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import InvoicePrint from "./InvoicePrint";
import Receipt from "./Receipt"; // ✅ novo
import { useReactToPrint } from "react-to-print"; // ✅ novo
import "./Invoices.css";

export default function Invoices({ onRefresh }) {
  const [invoices, setInvoices] = useState([]);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // 🔧 ref za receipt print
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  // Dohvaćanje računa
  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("issued_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja računa: " + error.message);
    } else {
      setInvoices(data || []);
      toast.info("Računi učitani.");
    }
    setLoading(false);
  };

  // Dohvaćanje stavki
  const fetchInvoiceItems = async (invoiceId) => {
    const { data, error } = await supabase
      .from("invoice_items")
      .select(
        `
        id,
        invoice_id,
        item_code,
        quantity,
        price,
        items ( name, type )
      `
      )
      .eq("invoice_id", invoiceId);

    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja stavki: " + error.message);
    } else {
      setItems(data || []);
      toast.success("Stavke računa učitane.");
    }
  };

  // Storno računa
  const handleStorno = async (invoiceId) => {
    if (!window.confirm("Jesi siguran da želiš stornirati ovaj račun?")) return;

    try {
      const { error } = await supabase.rpc("storno_invoice", {
        p_invoice_id: invoiceId,
      });
      if (error) throw error;

      toast.success("Račun je uspješno storniran.");
      setExpandedInvoice(null);
      setItems([]);
      fetchInvoices();

      if (typeof onRefresh === "function") {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Greška kod storna: " + err.message);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const toggleExpand = (invoice) => {
    if (expandedInvoice?.id === invoice.id) {
      setExpandedInvoice(null);
      setItems([]);
    } else {
      setExpandedInvoice(invoice);
      fetchInvoiceItems(invoice.id);
    }
  };

  // Primjena filtera i pretrage
  const filteredInvoices = invoices
    .filter((inv) =>
      (inv.invoice_no || inv.id)
        .toString()
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .filter((inv) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "ACTIVE") return inv.status !== "STORNO";
      if (statusFilter === "STORNO") return inv.status === "STORNO";
      return true;
    });

  return (
    <div className="invoices">
      <div className="invoices-header">
        <h3>📑 Računi</h3>
        <div className="filters">
          <input
            type="text"
            placeholder="🔎 Pretraga po broju..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Svi</option>
            <option value="ACTIVE">Aktivni</option>
            <option value="STORNO">Stornirani</option>
          </select>
        </div>
      </div>

      {loading && <p>Učitavam...</p>}

      <table className="invoices-table">
        <thead>
          <tr>
            <th>Broj</th>
            <th>Datum</th>
            <th>Iznos</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map((inv) => (
            <React.Fragment key={inv.id}>
              <tr
                className={expandedInvoice?.id === inv.id ? "expanded" : ""}
                onClick={() => toggleExpand(inv)}
              >
                <td>{inv.invoice_no || inv.id}</td>
                <td>{new Date(inv.issued_at).toLocaleString("hr-HR")}</td>
                <td>{inv.total?.toFixed(2)} €</td>
                <td>
                  {inv.status === "STORNO" ? (
                    <span className="storno-label">STORNIRAN</span>
                  ) : (
                    <button
                      className="btn danger small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStorno(inv.id);
                      }}
                    >
                      Storno
                    </button>
                  )}
                </td>
              </tr>

              {expandedInvoice?.id === inv.id && (
                <tr className="invoice-items-row">
                  <td colSpan="4">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Šifra</th>
                          <th>Naziv</th>
                          <th>Tip</th>
                          <th>Cijena</th>
                          <th>Količina</th>
                          <th>Iznos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.item_code}</td>
                            <td>{it.items?.name}</td>
                            <td>{it.items?.type}</td>
                            <td>{it.price.toFixed(2)} €</td>
                            <td>{it.quantity}</td>
                            <td>
                              {(it.price * it.quantity).toFixed(2)} €
                            </td>
                          </tr>
                        ))}
                        <tr className="subtotal-row">
                          <td colSpan="5">Ukupno</td>
                          <td>{expandedInvoice.total?.toFixed(2)} €</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* ✅ PDF ispis */}
                    <div style={{ marginTop: "10px" }}>
                      <InvoicePrint invoice={expandedInvoice} items={items} />
                    </div>

                    {/* ✅ POS receipt ispis */}
                    <div style={{ marginTop: "10px" }}>
                      <Receipt
                        ref={componentRef}
                        invoice={expandedInvoice}
                        items={items}
                      />
                      <button onClick={handlePrint} className="btn small">
                        🖨️ Ispis POS računa
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
