import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "../admin/Admin.css";
import "./WarehouseTransfer.css";

export default function WarehouseTransfer() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { product_id: "", quantity: "", price_nc: "", price_vp: "", price_mpc: "" },
  ]);
  const [vat, setVat] = useState(25); // default
  const [loading, setLoading] = useState(false);

  // === Fetch initial data ===
  useEffect(() => {
    const fetchData = async () => {
      const { data: wh } = await supabase.from("warehouses").select("id, name");
      const { data: pr } = await supabase.from("products").select("id, code, name");
      const { data: ci } = await supabase.from("company_info").select("vat_rate").limit(1).single();
      setWarehouses(wh || []);
      setProducts(pr || []);
      if (ci?.vat_rate) setVat(ci.vat_rate);
    };
    fetchData();
  }, []);

  // === Add item row ===
  const handleAddItem = () => {
    setItems([...items, { product_id: "", quantity: "", price_nc: "", price_vp: "", price_mpc: "" }]);
  };

  // === Handle item field change ===
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    // auto-calc MPC from VP when VAT exists
    if (field === "price_vp") {
      const vp = parseFloat(value) || 0;
      updated[index].price_mpc = (vp * (1 + vat / 100)).toFixed(2);
    }

    setItems(updated);
  };

  // === Submit transfer ===
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fromWarehouse || !toWarehouse)
      return toast.error("⚠️ Odaberi oba skladišta!");

    if (fromWarehouse === toWarehouse)
      return toast.warn("⚠️ Izvorno i odredišno skladište moraju biti različita!");

    setLoading(true);

    const { data: transfer, error: err1 } = await supabase
      .from("stock_transfers")
      .insert([
        {
          from_warehouse_id: fromWarehouse,
          to_warehouse_id: toWarehouse,
          reference_no: reference,
          notes,
        },
      ])
      .select("id")
      .single();

    if (err1) {
      toast.error("❌ Greška pri kreiranju transfera!");
      setLoading(false);
      return;
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity) continue;

      const insertRes = await supabase.from("stock_transfer_items").insert([
        {
          transfer_id: transfer.id,
          product_id: item.product_id,
          quantity: parseFloat(item.quantity),
          price_nc: parseFloat(item.price_nc) || 0,
          price_vp: parseFloat(item.price_vp) || 0,
          price_mpc: parseFloat(item.price_mpc) || 0,
        },
      ]);

      if (insertRes.error)
        console.warn("Insert error:", insertRes.error.message);
    }

    toast.success("✅ Transfer uspješno izvršen!");
    setFromWarehouse("");
    setToWarehouse("");
    setReference("");
    setNotes("");
    setItems([{ product_id: "", quantity: "", price_nc: "", price_vp: "", price_mpc: "" }]);
    setLoading(false);
  };

  return (
    <div className="admin-container">
      <h2 className="admin-title">🔄 Warehouse Transfer</h2>
      <p className="admin-subtitle">Prijenos robe između skladišta</p>

      <form onSubmit={handleSubmit} className="stock-filters" style={{ marginBottom: 20 }}>
        <select
          value={fromWarehouse}
          onChange={(e) => setFromWarehouse(e.target.value)}
        >
          <option value="">-- Iz skladišta --</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          value={toWarehouse}
          onChange={(e) => setToWarehouse(e.target.value)}
        >
          <option value="">-- U skladište --</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Referenca (opcionalno)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <input
          type="text"
          placeholder="Napomena"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Izvršavanje..." : "💾 Izvrši transfer"}
        </button>
      </form>

      <table className="stock-table">
        <thead>
          <tr>
            <th>Proizvod</th>
            <th>Količina</th>
            <th>NC</th>
            <th>VP</th>
            <th>MPC</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>
                <select
                  value={item.product_id}
                  onChange={(e) => handleItemChange(i, "product_id", e.target.value)}
                >
                  <option value="">-- Odaberi proizvod --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(i, "quantity", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price_nc}
                  onChange={(e) => handleItemChange(i, "price_nc", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price_vp}
                  onChange={(e) => handleItemChange(i, "price_vp", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price_mpc}
                  onChange={(e) => handleItemChange(i, "price_mpc", e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handleAddItem} style={{ marginTop: 12 }}>
        ➕ Dodaj red
      </button>
    </div>
  );
}
