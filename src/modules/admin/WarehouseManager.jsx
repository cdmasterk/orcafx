import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function WarehouseManager() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ warehouse_id: "", product_id: "", quantity: "", type: "IN", related_warehouse: "", note: "" });
  const [log, setLog] = useState([]);

  const load = async () => {
    const [w, p, t] = await Promise.all([
      supabase.from("warehouses").select("id,name,stores!fk_wh_store(name)"),
      supabase.from("products").select("id,name,sku"),
      supabase
        .from("warehouse_transactions")
        .select("*, warehouses!fk_tx_wh(name), products!fk_tx_prod(name)")
        .order("created_at",{ascending:false})
        .limit(50)
    ]);
    if (!w.error) setWarehouses(w.data||[]);
    if (!p.error) setProducts(p.data||[]);
    if (!t.error) setLog(t.data||[]);
  };

  useEffect(()=>{ load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      warehouse_id: form.warehouse_id,
      product_id: form.product_id,
      quantity: Number(form.quantity),
      type: form.type,
      related_warehouse: form.type === "TRANSFER" ? form.related_warehouse || null : null,
      note: form.note || null
    };

    if (form.type === "TRANSFER") {
      // OUT iz A
      const outTx = { ...payload, type: "OUT" };
      const { error: e1 } = await supabase.from("warehouse_transactions").insert([outTx]);
      if (e1) return alert(e1.message);
      // IN u B
      const inTx = { ...payload, warehouse_id: form.related_warehouse, type: "IN", related_warehouse: form.warehouse_id };
      const { error: e2 } = await supabase.from("warehouse_transactions").insert([inTx]);
      if (e2) return alert(e2.message);
    } else {
      const { error } = await supabase.from("warehouse_transactions").insert([payload]);
      if (error) return alert(error.message);
    }

    setForm({ warehouse_id: "", product_id: "", quantity: "", type: "IN", related_warehouse: "", note: "" });
    load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">📦 Warehouse Manager</h1>

      <form onSubmit={submit} className="bg-white border rounded p-4 mb-6 grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Warehouse</label>
          <select className="border rounded p-2 w-full" value={form.warehouse_id} onChange={e=>setForm({...form,warehouse_id:e.target.value})}>
            <option value="">Select...</option>
            {warehouses.map(w=><option key={w.id} value={w.id}>{w.name} {w.stores?.name ? `(${w.stores.name})`:""}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Product</label>
          <select className="border rounded p-2 w-full" value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}>
            <option value="">Select...</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Quantity</label>
          <input className="border rounded p-2 w-full" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} type="number" step="0.0001" />
        </div>

        <div>
          <label className="block text-sm mb-1">Type</label>
          <select className="border rounded p-2 w-full" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
            <option value="IN">IN (Ulaz)</option>
            <option value="OUT">OUT (Izdatnica)</option>
            <option value="TRANSFER">TRANSFER (Prebacivanje)</option>
          </select>
        </div>

        {form.type === "TRANSFER" && (
          <div>
            <label className="block text-sm mb-1">To Warehouse</label>
            <select className="border rounded p-2 w-full" value={form.related_warehouse} onChange={e=>setForm({...form,related_warehouse:e.target.value})}>
              <option value="">Select...</option>
              {warehouses
                .filter(w=>w.id!==form.warehouse_id)
                .map(w=><option key={w.id} value={w.id}>{w.name} {w.stores?.name ? `(${w.stores.name})`:""}</option>)}
            </select>
          </div>
        )}

        <div className="md:col-span-3">
          <label className="block text-sm mb-1">Note</label>
          <input className="border rounded p-2 w-full" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        </div>

        <div className="md:col-span-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
        </div>
      </form>

      <div className="bg-white border rounded">
        <div className="grid grid-cols-6 font-medium border-b p-3">
          <div>Time</div><div>Warehouse</div><div>Product</div><div>Type</div><div>Qty</div><div>Note</div>
        </div>
        {log.map(tx=>(
          <div key={tx.id} className="grid grid-cols-6 p-3 border-b text-sm">
            <div>{new Date(tx.created_at).toLocaleString()}</div>
            <div>{tx.warehouses?.name || tx.warehouse_id}</div>
            <div>{tx.products?.name || tx.product_id}</div>
            <div>{tx.type}{tx.related_warehouse ? ` → (${String(tx.related_warehouse).slice(0,6)})`:""}</div>
            <div>{tx.quantity}</div>
            <div>{tx.note || ""}</div>
          </div>
        ))}
        {log.length===0 && <div className="p-3">No transactions.</div>}
      </div>
    </div>
  );
}
