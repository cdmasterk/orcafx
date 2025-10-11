// src/modules/finance/LiveStatus.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import "./LiveStatus.css";

/**
 * LiveStatus
 * - polls price_recalc_log for last run (every `pollMs`)
 * - displays short "hacky" live UI in top-right corner
 *
 * Usage: <LiveStatus pollMs={5000} />
 */
export default function LiveStatus({ pollMs = 5000 }) {
  const [last, setLast] = useState(null);
  const [liveTick, setLiveTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer = null;

    async function fetchLast() {
      try {
        const { data, error } = await supabase
          .from("price_recalc_log")
          .select("triggered_at, triggered_by, was_triggered, success, details, recalculated_count")
          .order("triggered_at", { ascending: false })
          .limit(1);

        if (!error && data?.length) {
          if (mounted.current) setLast(data[0]);
        }
      } catch (e) {
        // swallow - UI will simply not update
        // console.error("LiveStatus fetch error", e);
      }
    }

    // initial fetch
    fetchLast();

    // poll
    timer = setInterval(async () => {
      setLiveTick((t) => (t + 1) % 100000); // drives small animations
      await fetchLast();
    }, pollMs);

    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [pollMs]);

  const status = (() => {
    if (!last) return { label: "no data", className: "neutral", subtitle: "" };
    if (!last.was_triggered) return { label: "idle", className: "idle", subtitle: "skipped" };
    if (last.success) return { label: "ONLINE", className: "online", subtitle: `${last.recalculated_count || 0} Products` };
    return { label: "ERROR", className: "error", subtitle: last.details || "" };
  })();

  const timeStr = last ? new Date(last.triggered_at).toLocaleString() : "—";

  return (
    <div className={`live-status ${status.className}`}>
      <div className="ls-top">
        <div className="ls-pulse" aria-hidden />
        <div className="ls-label">
          <div className="ls-title">{status.label}</div>
          <div className="ls-sub">{status.subtitle}</div>
        </div>
        <div className="ls-bars" aria-hidden>
          <span style={{ animationDelay: `${(liveTick % 3) * 0.08}s` }} />
          <span style={{ animationDelay: `${(liveTick % 5) * 0.06}s` }} />
          <span style={{ animationDelay: `${(liveTick % 7) * 0.04}s` }} />
        </div>
      </div>

      <div className="ls-bottom">
        <div className="ls-time">last price change: {timeStr}</div>
        <button
          className="ls-action"
          onClick={async () => {
            // manual trigger via proxy endpoint - uses same proxy you already created
            try {
              const res = await fetch("/api/recalculate-prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              const json = await res.json();
              if (json?.success) {
                // instant optimistic update
                setLast((prev) => ({ ...prev, triggered_at: new Date().toISOString(), was_triggered: true, success: true, recalculated_count: json.recalculated || prev?.recalculated_count || 0, details: "Manual" }));
              } else {
                setLast((prev) => ({ ...prev, details: String(json?.error || json) }));
              }
            } catch (err) {
              setLast((prev) => ({ ...prev, details: String(err) }));
            }
          }}
          title="Trigger now"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
