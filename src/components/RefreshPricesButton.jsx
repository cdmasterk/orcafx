import React, { useState } from "react";
import "./RefreshPricesButton.css";

export default function RefreshPricesButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    setStatus("");
    setIsError(false);

    try {
      const response = await fetch(
        "https://vbrzdxbbijwgkfexfdfk.functions.supabase.co/fetch_metal_prices",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setStatus("✅ Prices updated successfully!");
    } catch (err) {
      console.error("Refresh error:", err);
      setStatus("❌ Failed to update prices.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="refresh-button"
      >
        {loading ? "Updating..." : "🔄 Refresh Prices"}
      </button>

      {status && (
        <p
          className={`refresh-status ${isError ? "error" : "success"}`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
