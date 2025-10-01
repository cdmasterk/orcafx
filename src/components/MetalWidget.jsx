import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./MetalWidget.css";

export default function MetalWidget() {
  const [price, setPrice] = useState(null);

  const fetchLatest = async () => {
    const { data, error } = await supabase
      .from("metal_prices")
      .select("fetched_at, gold_g, silver_g")
      .order("fetched_at", { ascending: false })
      .limit(1);

    if (!error && data.length > 0) {
      setPrice(data[0]);
    }
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 60000); // refresh UI svake minute
    return () => clearInterval(interval);
  }, []);

  if (!price) return <div className="metal-widget">Učitavam cijene...</div>;

  return (
    <div className="metal-widget">
      <h4>📈 Tržišne cijene</h4>
      <p>🟡 Zlato: {price.gold_g.toFixed(2)} €/g</p>
      <p>⚪ Srebro: {price.silver_g.toFixed(2)} €/g</p>
      <small>
        Ažurirano:{" "}
        {new Date(price.fetched_at).toLocaleDateString("hr-HR")}{" "}
        {new Date(price.fetched_at).toLocaleTimeString("hr-HR")}
      </small>
    </div>
  );
}
