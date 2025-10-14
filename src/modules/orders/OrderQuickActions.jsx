import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function OrderQuickActions() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("custom_orders").select("*").eq("id", orderId).single();
      setOrder(data || null);
    })();
  }, [orderId]);

  const call = async (fn) => {
    const rpc = fn === "start" ? "fn_co_start" : fn === "ready" ? "fn_co_ready" : "fn_co_delivered";
    const { error } = await supabase.rpc(rpc, { p_order_id: orderId });
    if (!error) {
      const { data } = await supabase.from("custom_orders").select("*").eq("id", orderId).single();
      setOrder(data || null);
      alert("✅ OK");
    } else {
      alert("❌ " + error.message);
    }
  };

  return (
    <div style={{ padding:16 }}>
      <h2>⚡ Quick Actions</h2>
      <div style={{ marginBottom:8 }}>Order: {order?.order_no || orderId}</div>
      <div>Status: <b>{order?.status || "-"}</b></div>
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <button onClick={()=>call("start")} style={btn}>▶️ Start</button>
        <button onClick={()=>call("ready")} style={btn}>✅ Ready</button>
        <button onClick={()=>call("delivered")} style={btn}>📦 Delivered</button>
      </div>
    </div>
  );
}

const btn = { border:"1px solid #e5e7eb", background:"#fff", borderRadius:10, padding:"8px 10px", cursor:"pointer" };
