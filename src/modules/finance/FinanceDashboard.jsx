import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./Finance.css";
import "./FinanceHubWidgets.css";


import HelpPanel from "./HelpPanel";

// Pricing & setup widgeti
import TaxRatesManager from "./TaxRatesManager";
import PricingRulesManager from "./PricingRulesManager";
import CategoriesManager from "./CategoriesManager";
import CollectionsManager from "./CollectionsManager";
import ComponentPriceLists from "./ComponentPriceLists";
import BOMManager from "../products/BOMManager";

// Kalkulator & pregled
import PriceSheetCalculator from "./PriceSheetCalculator";
import CurrentPricesTable from "./CurrentPricesTable";

// UI layout helperi
import Tabs from "./ui/Tabs";
import WidgetAccordion from "./WidgetAccordion";

// NEW: floating overlay
import FloatingLiveStatus from "./ui/FloatingLiveStatus";

export default function FinanceDashboard() {
  const [prices, setPrices] = useState(null);
  const [lastRecalc, setLastRecalc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compact, setCompact] = useState(true);

  // NEW: top-level header tabs
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "pricing" | "bom"

  // 🔹 Fetch last metal prices
  const fetchMetalPrices = async () => {
    const { data, error } = await supabase
      .from("metal_prices")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(1);
    if (error) {
      console.error(error);
      return;
    }
    if (data && data.length > 0) setPrices(data[0]);
  };

  // 🔹 Fetch last recalculation log
  const fetchLastRecalc = async () => {
    const { data, error } = await supabase
      .from("price_recalc_log")
      .select("*")
      .order("triggered_at", { ascending: false })
      .limit(1);
    if (error) {
      console.error(error);
      return;
    }
    if (data && data.length > 0) setLastRecalc(data[0]);
  };

  // 🔹 Manual trigger (proxy to avoid CORS)
  const handleRecalc = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recalculate-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("✅ Recalculation triggered successfully!");
        fetchLastRecalc();
      } else {
        toast.error("❌ Failed to trigger recalculation");
        console.error(result);
      }
    } catch (err) {
      toast.error("❌ Network or server error");
      console.error("Recalc fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetalPrices();
    fetchLastRecalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={`finance-dashboard ${compact ? "compact" : ""}`}>
        {/* Header + top-right tabs */}
        <div
          className="finance-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <h1 style={{ margin: 0 }}>💰 Finance Hub</h1>
          <div className="tabs" style={{ display: "flex", gap: 8 }}>
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === "pricing" ? "active" : ""}`}
              onClick={() => setActiveTab("pricing")}
            >
              Pricing
            </button>
            <button
              className={`tab-btn ${activeTab === "bom" ? "active" : ""}`}
              onClick={() => setActiveTab("bom")}
            >
              BOM
            </button>
          </div>
        </div>

        {/* ======= OVERVIEW (default) ======= */}
        {activeTab === "overview" && (
          <>
            {/* Help + Layout Controls */}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <HelpPanel />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => setCompact((c) => !c)}>
                  {compact ? "🌿 Normal density" : "🧊 Compact density"}
                </button>
              </div>
            </div>

            {/* Status sekcija (metali + recalc) */}
            <section className="finance-section">
              <h2>📊 Metal Prices (Latest)</h2>
              {prices ? (
                <div className="price-card">
                  <p>Gold: {prices.gold_g?.toFixed(2)} €/g</p>
                  <p>Silver: {prices.silver_g?.toFixed(2)} €/g</p>
                  <p>Fetched at: {new Date(prices.fetched_at).toLocaleString()}</p>
                </div>
              ) : (
                <p>No data yet</p>
              )}
            </section>

            <section className="finance-section">
              <h2>⚙️ Last Recalculation</h2>
              {lastRecalc ? (
                <div className="log-card">
                  <p>
                    <strong>Status:</strong>{" "}
                    {lastRecalc.success ? "✅ Success" : "❌ Failed"}
                  </p>
                  <p>
                    <strong>Triggered:</strong>{" "}
                    {new Date(lastRecalc.triggered_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Triggered By:</strong> {lastRecalc.triggered_by}
                  </p>
                  <p>
                    <strong>Details:</strong> {lastRecalc.details}
                  </p>
                </div>
              ) : (
                <p>No logs yet</p>
              )}
              {/* removed inline <LiveStatus /> to avoid layout push */}
              <button className="recalc-btn" onClick={handleRecalc} disabled={loading}>
                {loading ? "Recalculating..." : "🔁 Recalculate Now"}
              </button>
            </section>
          </>
        )}

        {/* ======= PRICING (keeps your inner tabs exactly) ======= */}
        {activeTab === "pricing" && (
          <section className="finance-section">
            <h2>💹 Pricing</h2>

            <Tabs
              tabs={[
                {
                  key: "setup",
                  label: "⚙️ Setup",
                  content: (
                    <div className="finance-grid">
                      <div>
                        <WidgetAccordion title="PDV stope" defaultOpen={false}>
                          <TaxRatesManager />
                        </WidgetAccordion>
                        <WidgetAccordion title="Pravila marži" defaultOpen={true}>
                          <PricingRulesManager />
                        </WidgetAccordion>
                      </div>

                      <div>
                        <WidgetAccordion title="Kategorije" defaultOpen={false}>
                          <CategoriesManager />
                        </WidgetAccordion>
                        <WidgetAccordion title="Kolekcije" defaultOpen={false}>
                          <CollectionsManager />
                        </WidgetAccordion>
                        <WidgetAccordion title="Cjenici komponenti" defaultOpen={false}>
                          <ComponentPriceLists />
                        </WidgetAccordion>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "calc",
                  label: "🧮 Kalkulator",
                  content: (
                    <div className="finance-grid">
                      <div style={{ gridColumn: "1 / -1" }}>
                        <PriceSheetCalculator />
                        {/* ostavljam BOM i ovdje, po tvojoj želji */}
                        <BOMManager />
                      </div>
                    </div>
                  ),
                },
                {
                  key: "prices",
                  label: "📈 Trenutne cijene",
                  content: (
                    <div className="finance-grid">
                      <div style={{ gridColumn: "1 / -1" }}>
                        <CurrentPricesTable />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </section>
        )}

        {/* ======= BOM (quick access tab) ======= */}
        {activeTab === "bom" && (
          <section className="finance-section">
            <h2>📦 Bill of Materials</h2>
            <div className="finance-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <BOMManager />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Floating LiveStatus overlay (won't push layout or hide tabs) */}
      <FloatingLiveStatus defaultOpen={false} pollMs={5000} placement="bottom-right" />
    </>
  );
}
