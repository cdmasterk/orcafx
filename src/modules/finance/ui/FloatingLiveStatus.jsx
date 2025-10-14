import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LiveStatus from "../LiveStatus";

export default function FloatingLiveStatus({
  defaultOpen = false,
  pollMs = 5000,
  placement = "bottom-right", // "bottom-right" | "bottom-left" | "top-right" | "top-left"
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const posClass =
    placement === "top-right"
      ? "fls top right"
      : placement === "top-left"
      ? "fls top left"
      : placement === "bottom-left"
      ? "fls bottom left"
      : "fls bottom right";

  const panel = (
    <div className={`floating-live ${posClass}`} aria-live="polite">
      {open ? (
        <div className="fls-panel">
          <div className="fls-header">
            <span className="fls-title">Live Status</span>
            <button className="fls-btn" onClick={() => setOpen(false)} title="Minimize">—</button>
          </div>
          <div className="fls-body">
            <LiveStatus pollMs={pollMs} />
          </div>
        </div>
      ) : (
        <button
          className="fls-pill"
          onClick={() => setOpen(true)}
          title="Show Live Status"
        >
          ● Live
        </button>
      )}
    </div>
  );

  // Use portal so it never participates in page layout
  return mounted ? createPortal(panel, document.body) : null;
}
