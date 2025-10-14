import React, { useState } from "react";

export default function Tabs({ tabs }) {
  const [active, setActive] = useState(tabs?.[0]?.key || "");
  return (
    <div className="tabs">
      <div className="tabs-nav">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${active === t.key ? "active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabs-body">
        {tabs.map(t => (
          <div key={t.key} style={{ display: active === t.key ? "block" : "none" }}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
