import React, { useState } from "react";

export default function WidgetAccordion({ title, defaultOpen=false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="widget-card">
      <div className="accordion-head" onClick={()=>setOpen(o=>!o)}>
        <h3 className="widget-title" style={{margin:0}}>{title}</h3>
        <button className="btn ghost">{open ? "▼" : "▶"}</button>
      </div>
      {open && <div style={{marginTop:10}}>{children}</div>}
    </div>
  );
}
