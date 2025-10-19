import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./WorkOrder.css";

export default function WorkOrderForm({ onCreated }) {
  const [form, setForm] = useState({
    customer_name: "",
    product_type: "",
    category_id: "",
    collection_id: "",
    production_type: "internal",
    supplier_id: "",
    description: "",
    estimated_cost: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const order_no = `WO-${Date.now()}`;
    const { error } = await supabase.from("work_orders").insert([
      { ...form, order_no },
    ]);

    if (error) toast.error("❌ Greška kod spremanja naloga");
    else {
      toast.success("✅ Radni nalog kreiran");
      setForm({
        customer_name: "",
        product_type: "",
        category_id: "",
        collection_id: "",
        production_type: "internal",
        supplier_id: "",
        description: "",
        estimated_cost: "",
        notes: "",
      });
      onCreated?.();
    }

    setLoading(false);
  };

  return (
    <form className="workorder-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>Kupac</label>
        <input
          name="customer_name"
          value={form.customer_name}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label>Tip proizvoda</label>
        <input
          name="product_type"
          value={form.product_type}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label>Kategorija</label>
        <select
          name="category_id"
          value={form.category_id}
          onChange={handleChange}
        >
          <option value="">Odaberi...</option>
        </select>
      </div>

      <div className="form-row">
        <label>Kolekcija</label>
        <select
          name="collection_id"
          value={form.collection_id}
          onChange={handleChange}
        >
          <option value="">Odaberi...</option>
        </select>
      </div>

      <div className="form-row">
        <label>Izrada</label>
        <select
          name="production_type"
          value={form.production_type}
          onChange={handleChange}
        >
          <option value="internal">Interna radionica</option>
          <option value="external">Vanjska radionica</option>
        </select>
      </div>

      {form.production_type === "external" && (
        <div className="form-row">
          <label>Vanjska radionica</label>
          <input
            name="supplier_id"
            value={form.supplier_id}
            onChange={handleChange}
            placeholder="UUID radionice"
          />
        </div>
      )}

      <div className="form-row">
        <label>Opis</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label>Procijenjeni trošak (€)</label>
        <input
          type="number"
          name="estimated_cost"
          value={form.estimated_cost}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <label>Bilješke</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Spremam..." : "Kreiraj nalog"}
      </button>
    </form>
  );
}
