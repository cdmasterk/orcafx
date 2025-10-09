import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./CompanySettings.css";

const empty = {
  legal_name: "",
  address_line: "",
  city: "",
  country: "",
  tax_id: "",
  iban: "",
  phone: "",
  email: "",
  logo_url: "",
  vat_rate: 25.0,
  currency: "EUR",
  fiscal_region: "",
  note: "",
};

export default function CompanySettings() {
  const [row, setRow] = useState(empty);
  const [id, setId] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("company_info")
      .select("*")
      .limit(1)
      .single();

    if (!error && data) {
      setRow(data);
      setId(data.id);
    }
  }

  async function save(e) {
    e.preventDefault();
    setMsg("");

    if (id) {
      const { error } = await supabase
        .from("company_info")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) setMsg("❌ " + error.message);
      else setMsg("✅ Updated successfully");
    } else {
      const { data, error } = await supabase
        .from("company_info")
        .insert([{ ...row }])
        .select();
      if (error) setMsg("❌ " + error.message);
      else {
        setMsg("✅ Created successfully");
        setId(data[0].id);
      }
    }
  }

  return (
    <div className="company-settings-container">
      <h1 className="company-settings-title">🏢 Company Settings</h1>

      {/* 🔹 Header preview */}
      <div className="company-header-card">
        {row.logo_url ? (
          <img src={row.logo_url} alt="Logo" className="company-logo-preview" />
        ) : (
          <div className="company-logo-placeholder">LOGO</div>
        )}
        <div className="company-header-info">
          <h2>{row.legal_name || "Your company name"}</h2>
          <p>
            {row.address_line && `${row.address_line}, `}
            {row.city && `${row.city} `}
            {row.country && `(${row.country})`}
          </p>
          <p className="company-header-meta">
            OIB: {row.tax_id || "—"} | IBAN: {row.iban || "—"}
          </p>
        </div>
      </div>

      {/* 🔹 Main form */}
      <form onSubmit={save} className="company-settings-form">
        {/* LEFT */}
        <div className="company-card">
          <h3>General Info</h3>
          {["legal_name", "address_line", "city", "country", "tax_id", "iban"].map(
            (k) => (
              <div key={k} className="company-field">
                <label>{k.replace("_", " ").toUpperCase()}</label>
                <input
                  value={row[k] || ""}
                  onChange={(e) => setRow({ ...row, [k]: e.target.value })}
                />
              </div>
            )
          )}
        </div>

        {/* RIGHT */}
        <div className="company-card">
          <h3>Contact & Fiscal</h3>
          {[
            "phone",
            "email",
            "logo_url",
            "vat_rate",
            "currency",
            "fiscal_region",
          ].map((k) => (
            <div key={k} className="company-field">
              <label>{k.replace("_", " ").toUpperCase()}</label>
              <input
                type={k === "vat_rate" ? "number" : "text"}
                step={k === "vat_rate" ? "0.01" : undefined}
                value={row[k] || ""}
                onChange={(e) => setRow({ ...row, [k]: e.target.value })}
              />
            </div>
          ))}
          <div className="company-field">
            <label>Note</label>
            <textarea
              value={row.note || ""}
              onChange={(e) => setRow({ ...row, note: e.target.value })}
              placeholder="Additional note for invoices or documents..."
            />
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="company-save">
          <button type="submit">💾 Save</button>
        </div>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>
    </div>
  );
}
