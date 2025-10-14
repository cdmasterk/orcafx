import React, { useEffect, useState } from "react";
import "./FinanceHubWidgets.css";

const LS_KEY = "finance_help_open_v1";

export default function HelpPanel() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "0") setOpen(false);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(LS_KEY, next ? "1" : "0");
  };

  return (
    <div className="widget-card help-card">
      <div className="help-head" onClick={toggle} role="button" tabIndex={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📘</span>
          <h3 className="widget-title" style={{ margin: 0 }}>
            ORCAFX – Finance Hub: brze upute
          </h3>
        </div>
        <button className="btn ghost">{open ? "▼ Sakrij" : "▶ Prikaži"}</button>
      </div>

      {open && (
        <div className="help-body">
          <details open>
            <summary>🔗 Redoslijed rada (preporuka)</summary>
            <ol style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>Kreiraj <b>Kategorije</b></li>
              <li>Kreiraj <b>Kolekcije</b> (po želji poveži na kategorije)</li>
              <li>Postavi <b>PDV stope</b> (HR)</li>
              <li>Postavi <b>Pravila marži</b> (DEFAULT + specifična po collection/category/purity/brand)</li>
              <li>Unesi <b>Cjenike komponenti</b> (diamond/pearl/coral/other)</li>
              <li>Koristi <b>Kalkulator</b> za snapshot cijene proizvoda</li>
              <li>Provjeri <b>Trenutno važeće cijene</b></li>
            </ol>
          </details>

          <details>
            <summary>🧾 PDV stope (TaxRatesManager)</summary>
            <ul style={{ marginTop: 8 }}>
              <li>Dodaj zemlju (npr. HR), naziv (PDV 25%), stopu (0.25), datum početka.</li>
              <li>Aktivnu stopu sustav koristi u kalkulaciji (polje “PDV zemlja”).</li>
              <li>Stare stope možeš deaktivirati (audit ostaje).</li>
            </ul>
          </details>

          <details>
            <summary>📐 Pravila marži (PricingRulesManager)</summary>
            <ul style={{ marginTop: 8 }}>
              <li>Scope: bilo koja kombinacija <code>collection</code>, <code>brand</code>, <code>category_id</code>, <code>purity</code>.</li>
              <li>Odabir pravila: prvo po <b>specifičnosti</b>, zatim po <b>priority</b> (niži = jači). Ako ništa ne pogodi → DEFAULT.</li>
              <li>Marže: <b>VP</b> i <b>MP</b> (bez PDV), opcionalno dodatni markup (stone/labor).</li>
            </ul>
          </details>

          <details>
            <summary>🗂️ Kategorije i 🧩 Kolekcije</summary>
            <ul style={{ marginTop: 8 }}>
              <li><b>Kategorija</b> = tip proizvoda (Prsteni, Ogrlice…)</li>
              <li><b>Kolekcija</b> = marketinška grupa; može imati <i>parent</i> <b>category_id</b>.</li>
              <li>U Kalkulatoru, kad odabereš kolekciju, kategorija se može auto-popuniti (ako korisnik nije ručno već izabrao).</li>
            </ul>
          </details>

          <details>
            <summary>💎 Cjenici komponenti (ComponentPriceLists)</summary>
            <ul style={{ marginTop: 8 }}>
              <li>Tip: diamond / pearl / coral / other; kvaliteta (npr. VVS-G); jedinica (ct / g / pcs); cijena/jed.</li>
              <li>Deaktiviraj stare redove; zadnji aktivni sustav koristi za izračun.</li>
            </ul>
          </details>

          <details>
            <summary>🧮 Kalkulacija cijene (PriceSheetCalculator)</summary>
            <ul style={{ marginTop: 8 }}>
              <li><b>Proizvod</b> biraj iz pickera (search) i klikni “⬇ Učitaj” za auto-popunu <i>metal/purity/grams</i> (ako postoje u proizvodu).</li>
              <li><b>Dodatni troškovi</b> – dva načina:
                <ul>
                  <li><b>Ručni unos</b> (fiksno): upiši iznos u polja “Kamenje/Biseri/Koralj/Ostale/Rad”.</li>
                  <li><b>Iz cjenika (auto):</b> ostavi polje prazno, unesi <i>quality + qty</i> i klikni “📐 Iz cjenika”.</li>
                  <li>Ako je <b>qty = 0</b> ili prazno → dodaje se <b>0</b>.</li>
                </ul>
              </li>
              <li><b>Formula</b>:
                <div style={{ marginTop: 6 }}>
                  <code>NC = (€/g × grami × faktor čistoće) + Kamenje + Biseri + Koralj + Ostalo + Rad</code><br />
                  <code>VP (bez PDV) = NC × (1 + margin_wholesale)</code><br />
                  <code>MP (bez PDV) = NC × (1 + margin_retail)</code><br />
                  <code>MP s PDV = MP × (1 + PDV)</code>
                </div>
              </li>
              <li><b>Snapshot</b> sprema verziju cijene i deaktivira staru; POS/Warehouse/Production koriste “aktivnu cijenu”.</li>
            </ul>
          </details>

          <details>
            <summary>📈 Trenutno važeće cijene (CurrentPricesTable)</summary>
            <ul style={{ marginTop: 8 }}>
              <li>Pregled aktivnih snapshot-a (code, purity, g, metal, NC, VP, MP, MP s PDV, timestamp).</li>
              <li>Pretraži po <code>product_code</code> i klikni “🔎 Traži”.</li>
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
