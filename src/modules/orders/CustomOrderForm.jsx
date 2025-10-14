import React, { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./Orders.css";

const unify = (r) => ({
  id: r.id || null,
  code: r.code || r.sku || r.name || "",
  grams: r.grams ?? r.weight_g ?? r.weight ?? null,
  brand: r.brand || r.maker || r.vendor || "",
});

export default function CustomOrderForm({ onCreated }) {
  const [userEmail, setUserEmail] = useState("");
  const [posCode, setPosCode] = useState("");

  const [categories, setCategories] = useState([]);
  const [purities, setPurities] = useState([]);
  const [colors, setColors] = useState([]);
  const [models, setModels] = useState([]);

  const [selectedModel, setSelectedModel] = useState(null);

  const [form, setForm] = useState({
    order_no: "",
    order_date: "",      // "" => omit u payloadu (DB default now())
    due_date: null,      // null => OK za timestamptz
    quantity: 1,
    has_sketch: false,

    category_id: null,
    purity_id: null,
    color_id: null,
    model_id: null,

    // legacy tekstualna polja (radi čitljivosti u tablicama)
    product_type: "",
    purity: "",
    color: "",
    model: "",

    customer_name: "",
    male_size: "",
    engraving_1: "",
    joint_engraving: "",
    female_size: "",
    engraving_2: "",
    stones: "",
    additional_comment: "",

    workshop_name: "",
    store_location: "",  // auto
    entered_by: "",      // auto

    prepayment: false,
    prepayment_amount: 0,
    status: "PENDING",
  });

  const [items, setItems] = useState([
    { product_id: "", product_code: "", description: "", qty: 1, grams: "" },
  ]);

  // ====== AUTOFILL user/store ======
  useEffect(() => {
    (async () => {
      const { data: { user } = {} } = await supabase.auth.getUser();
      const email = user?.email || "";
      const store = user?.user_metadata?.pos_code || "";
      setUserEmail(email);
      setPosCode(store);
      setForm((f) => ({ ...f, entered_by: email, store_location: store }));
    })();
  }, []);

  // ====== FETCH reference ======
  useEffect(() => {
    (async () => {
      try {
        const [{ data: c }, { data: pu }, { data: co }] = await Promise.all([
          supabase.from("categories").select("id,name").order("name"),
          supabase.from("purity_options").select("id,label,metal,sort").order("sort"),
          supabase.from("color_options").select("id,label,sort").order("sort"),
        ]);
        setCategories(c || []);
        setPurities(pu || []);
        setColors(co || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Dinamička lista modela po kategoriji
  useEffect(() => {
    (async () => {
      if (!form.category_id) { setModels([]); return; }
      const { data } = await supabase
        .from("product_models")
        .select("id, code, name, engraving_max_chars, engraving_positions, default_purity, default_color")
        .or(`category_id.eq.${form.category_id},category_id.is.null`)
        .order("name");
      setModels(data || []);
    })();
  }, [form.category_id]);

  const onPickModel = (id) => {
    const m = models.find((x) => x.id === id) || null;
    setSelectedModel(m);
    setForm((f) => ({
      ...f,
      model_id: id || null,
      model: m?.name || "",
      purity: m?.default_purity || f.purity,
      color: m?.default_color || f.color,
    }));
  };

  // ====== Product search (za stavke) ======
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false);
  const [itemsAvailable, setItemsAvailable] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    (async () => {
      try { await supabase.from("items").select("id").limit(1); setItemsAvailable(true); } catch { setItemsAvailable(false); }
    })();
  }, []);

  useEffect(() => {
    const h = setTimeout(async () => {
      const s = q.trim();
      if (s.length < 2) { setList([]); return; }
      try {
        try {
          const { data, error } = await supabase
            .from("products").select("id, code, grams, brand")
            .or(`code.ilike.%${s}%,name.ilike.%${s}%,brand.ilike.%${s}%`)
            .order("code").limit(20);
          if (error) throw error;
          if (data?.length) { setList(data.map(unify)); setShow(true); return; }
        } catch {
          const { data } = await supabase
            .from("products").select("id, code, grams, brand")
            .ilike("code", `%${s}%`).order("code").limit(20);
          if (data?.length) { setList(data.map(unify)); setShow(true); return; }
        }
      } catch {}
      if (itemsAvailable) {
        let acc = [];
        try { const { data } = await supabase.from("items").select("*").ilike("code", `%${s}%`).limit(20); if (data?.length) acc=acc.concat(data); } catch {}
        try { const { data } = await supabase.from("items").select("*").ilike("sku", `%${s}%`).limit(20); if (data?.length) acc=acc.concat(data); } catch {}
        try { const { data } = await supabase.from("items").select("*").ilike("name", `%${s}%`).limit(20); if (data?.length) acc=acc.concat(data); } catch {}
        const uniq = [];
        const seen = new Set();
        for (const r of acc.map(unify)) {
          const key = `${r.id}-${r.code}`;
          if (!seen.has(key)) { seen.add(key); uniq.push(r); }
          if (uniq.length>=20) break;
        }
        setList(uniq); setShow(true);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [q, itemsAvailable]);

  useEffect(() => {
    const onClick = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setItem = (idx, patch) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItemRow = () =>
    setItems((arr) => [...arr, { product_id: "", product_code: "", description: "", qty: 1, grams: "" }]);
  const rmItemRow = (idx) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const pickProduct = (idx, row) => {
    setItem(idx, { product_id: row.id || "", product_code: row.code || "", grams: row.grams || "", description: "" });
    toast.success("✅ Item selected");
    setShow(false);
  };

  // ====== Validacija gravure po modelu ======
  const engravingMax = selectedModel?.engraving_max_chars || null;
  const overLimit = useMemo(() => {
    if (!engravingMax) return false;
    const total =
      (form.engraving_1 || "").length +
      (form.engraving_2 || "").length +
      (form.joint_engraving || "").length;
    return total > engravingMax;
  }, [engravingMax, form.engraving_1, form.engraving_2, form.joint_engraving]);

  const omitEmpty = (obj) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === "" || v === undefined) continue;
      out[k] = v;
    }
    return out;
  };

  const createOrder = async () => {
    if (overLimit) {
      toast.warn(`Gravura prekoračuje maksimalno ${engravingMax} znakova`);
      return;
    }
    try {
      const legacyPurity = purities.find((p) => p.id === form.purity_id)?.label || form.purity || null;
      const legacyColor = colors.find((c) => c.id === form.color_id)?.label || form.color || null;

      let order = {
        ...form,
        product_type: undefined,
        purity: legacyPurity,
        color: legacyColor,
        model: selectedModel?.name || form.model || null,

        quantity: Number(form.quantity || 1),
        prepayment_amount: Number(form.prepayment_amount || 0),
        has_sketch: !!form.has_sketch,
      };

      if (!order.order_date) delete order.order_date; // DB default now()
      if (order.due_date === "" || order.due_date === undefined) order.due_date = null;

      order = omitEmpty(order);
      if (!order.order_no) delete order.order_no;

      const payloadItems = items.map((it) => ({
        product_id: it.product_id || null,
        product_code: it.product_code || null,
        description: it.description || null,
        qty: Number(it.qty || 1),
        grams: it.grams === "" ? null : Number(it.grams),
        notes: null,
      }));

      const { data, error } = await supabase.rpc("fn_co_create_full", {
        p_order: order,
        p_items: payloadItems,
      });
      if (error) throw error;

      toast.success("✅ Custom order kreiran");

      // reset
      setSelectedModel(null);
      setForm((f) => ({
        ...f,
        order_no: "",
        order_date: "",
        due_date: null,
        quantity: 1,
        has_sketch: false,

        category_id: null,
        purity_id: null,
        color_id: null,
        model_id: null,

        purity: "",
        color: "",
        model: "",
        customer_name: "",
        male_size: "",
        engraving_1: "",
        joint_engraving: "",
        female_size: "",
        engraving_2: "",
        stones: "",
        additional_comment: "",
        workshop_name: "",
        prepayment: false,
        prepayment_amount: 0,
        status: "PENDING",
      }));
      setItems([{ product_id: "", product_code: "", description: "", qty: 1, grams: "" }]);
      if (onCreated) onCreated(data);
    } catch (e) {
      toast.error(`❌ Greška: ${e.message || e}`);
    }
  };

  return (
    <div className="orders-grid">
      {/* LEFT: FORMA */}
      <div className="card">
        <h3>➕ Nova Custom narudžba</h3>

        <div className="row3">
          <div className="field">
            <label>Order no (opc.)</label>
            <input
              className="input"
              placeholder="CO-000123 (prazno = auto)"
              value={form.order_no}
              onChange={(e) => setF("order_no", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Order date</label>
            <input
              className="input"
              type="datetime-local"
              value={form.order_date ? form.order_date.slice(0, 16) : ""}
              onChange={(e) => {
                const v = e.target.value;
                setF("order_date", v ? new Date(v).toISOString() : "");
              }}
            />
            <div className="small muted">Prazno = auto now()</div>
          </div>
          <div className="field">
            <label>Due date</label>
            <input
              className="input"
              type="datetime-local"
              value={form.due_date ? new Date(form.due_date).toISOString().slice(0, 16) : ""}
              onChange={(e) => {
                const v = e.target.value;
                setF("due_date", v ? new Date(v).toISOString() : null);
              }}
            />
          </div>
        </div>

        <div className="row3">
          <div className="field">
            <label>Customer</label>
            <input className="input" value={form.customer_name} onChange={(e) => setF("customer_name", e.target.value)} />
          </div>
          <div className="field">
            <label>Quantity</label>
            <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setF("quantity", Number(e.target.value || 1))} />
          </div>
          <div className="field">
            <label>Has sketch?</label>
            <select className="input" value={form.has_sketch ? "yes" : "no"} onChange={(e) => setF("has_sketch", e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        {/* Specifikacije */}
        <div className="section-title">Specifikacije</div>
        <div className="row4">
          <div className="field">
            <label>Category</label>
            <select className="input" value={form.category_id || ""} onChange={(e) => setF("category_id", e.target.value || null)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Purity</label>
            <select className="input" value={form.purity_id || ""} onChange={(e) => setF("purity_id", e.target.value || null)}>
              <option value="">—</option>
              {purities.map((p) => (
                <option key={p.id} value={p.id}>{p.label}{p.metal ? ` (${p.metal})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Color</label>
            <select className="input" value={form.color_id || ""} onChange={(e) => setF("color_id", e.target.value || null)}>
              <option value="">—</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <select className="input" value={form.model_id || ""} onChange={(e) => onPickModel(e.target.value || null)}>
              <option value="">—</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ""}{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legacy (size/engraving) + stones */}
        <div className="row3">
          <div className="field">
            <label>Male size</label>
            <input className="input" value={form.male_size} onChange={(e) => setF("male_size", e.target.value)} />
          </div>
          <div className="field">
            <label>Female size</label>
            <input className="input" value={form.female_size} onChange={(e) => setF("female_size", e.target.value)} />
          </div>
          <div className="field">
            <label>Stones</label>
            <input className="input" value={form.stones} onChange={(e) => setF("stones", e.target.value)} />
          </div>
        </div>

        <div className="row2">
          <div className="field"><label>Engraving 1</label><input className="input" value={form.engraving_1} onChange={(e) => setF("engraving_1", e.target.value)} /></div>
          <div className="field"><label>Engraving 2</label><input className="input" value={form.engraving_2} onChange={(e) => setF("engraving_2", e.target.value)} /></div>
        </div>
        <div className="field"><label>Joint engraving</label><input className="input" value={form.joint_engraving} onChange={(e) => setF("joint_engraving", e.target.value)} /></div>
        {selectedModel?.engraving_max_chars ? (
          <div className="small" style={{ color: ((form.engraving_1.length + form.engraving_2.length + form.joint_engraving.length) > selectedModel.engraving_max_chars) ? "#b91c1c" : "#6b7280" }}>
            Engraving limit: {selectedModel.engraving_max_chars} chars (total).
          </div>
        ) : null}

        <div className="row3">
          <div className="field"><label>Workshop</label><input className="input" value={form.workshop_name} onChange={(e) => setF("workshop_name", e.target.value)} /></div>
          <div className="field"><label>Store (POS)</label><input className="input" value={form.store_location} onChange={(e) => setF("store_location", e.target.value)} /></div>
          <div className="field"><label>Entered by</label><input className="input" value={form.entered_by} onChange={(e) => setF("entered_by", e.target.value)} /></div>
        </div>

        <div className="row3">
          <div className="field">
            <label>Prepayment?</label>
            <select className="input" value={form.prepayment ? "yes" : "no"} onChange={(e) => setF("prepayment", e.target.value === "yes")}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
          <div className="field">
            <label>Prepayment amount (€)</label>
            <input className="input" type="number" step="0.01" value={form.prepayment_amount} onChange={(e) => setF("prepayment_amount", Number(e.target.value || 0))} />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="input" value={form.status} onChange={(e) => setF("status", e.target.value)}>
              <option>PENDING</option><option>IN_PROGRESS</option><option>READY</option><option>DELIVERED</option><option>CANCELLED</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Additional comment</label>
          <textarea className="input" rows={2} value={form.additional_comment} onChange={(e) => setF("additional_comment", e.target.value)} />
        </div>

        <div className="section-title">Stavke</div>
        <ItemList
          items={items}
          setItems={setItems}
          pickProduct={pickProduct}
          q={q}
          setQ={setQ}
          list={list}
          setList={setList}
          show={show}
          setShow={setShow}
          resultsRef={resultsRef}
          addItemRow={addItemRow}
          rmItemRow={rmItemRow}
        />

        <div className="section-title">Akcije</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={createOrder}>💾 Kreiraj narudžbu</button>
          <span className="small">
            Auto-popuna: <span className="kbd">{posCode || "POS?"}</span> / <span className="kbd">{userEmail || "user?"}</span>
          </span>
        </div>
      </div>

      {/* RIGHT: SAŽETAK */}
      <div className="summary">
        <div className="card">
          <h3>🧾 Sažetak</h3>
          <div className="line"><span>Order no</span><b>{form.order_no || "AUTO"}</b></div>
          <div className="line"><span>Customer</span><b>{form.customer_name || "-"}</b></div>
          <div className="line"><span>Qty</span><b>{form.quantity}</b></div>
          <div className="line"><span>Due</span><b>{form.due_date ? new Date(form.due_date).toLocaleString() : "-"}</b></div>
          <div className="line"><span>Status</span><b>{form.status}</b></div>
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>💳 Prepayment</h4>
          <div className="line"><span>Enabled</span><b>{form.prepayment ? "Yes" : "No"}</b></div>
          <div className="line"><span>Amount</span><b>{Number(form.prepayment_amount || 0).toFixed(2)} €</b></div>
          <div className="progress">
            <div style={{ width: `${Number(form.prepayment_amount || 0) > 0 ? 100 : 0}%` }} />
          </div>
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>🔩 Specs</h4>
          <div className="small">Category: <b>{categories.find((c) => c.id === form.category_id)?.name || "-"}</b></div>
          <div className="small">Purity: <b>{purities.find((p) => p.id === form.purity_id)?.label || "-"}</b></div>
          <div className="small">Color: <b>{colors.find((c) => c.id === form.color_id)?.label || "-"}</b></div>
          <div className="small">Model: <b>{selectedModel?.name || "-"}</b></div>
          {selectedModel?.engraving_max_chars ? (
            <div className="small">Engraving max: <b>{selectedModel.engraving_max_chars}</b></div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ItemList({
  items, setItems, pickProduct,
  q, setQ, list, setList, show, setShow, resultsRef,
  addItemRow, rmItemRow
}) {
  const setItem = (idx, patch) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  return (
    <div className="field" style={{ position: "relative" }}>
      <div className="item-row" style={{ fontWeight: 600, fontSize: 12, color: "#64748b" }}>
        <span>Product / Description</span><span>Qty</span><span>Grams</span><span>Pick</span>
      </div>
      {items.map((it, idx) => (
        <div key={idx} className="item-row">
          <input
            className="input"
            placeholder="product code ili opis…"
            value={it.product_code || it.description}
            onChange={(e) => setItem(idx, it.product_id ? { product_code: e.target.value } : { description: e.target.value })}
          />
          <input className="input" type="number" step="0.01" value={it.qty} onChange={(e) => setItem(idx, { qty: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="(opc.)" value={it.grams} onChange={(e) => setItem(idx, { grams: e.target.value })} />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" onClick={() => setQ((it.product_code || it.description || "")) || setShow(true)}>🔎</button>
            {items.length > 1 && (<button className="btn" onClick={() => rmItemRow(idx)}>✖</button>)}
            {idx === items.length - 1 && (<button className="btn" onClick={addItemRow}>➕</button>)}
          </div>
        </div>
      ))}
      {show && list.length > 0 && (
        <div ref={resultsRef} className="card" style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, maxHeight: 260, overflow: "auto" }}>
          {list.map((r, i) => (
            <div
              key={`${r.id}-${i}`}
              style={{ display: "flex", justifyContent: "space-between", padding: "8px", cursor: "pointer" }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickProduct(items.length - 1, r)}
            >
              <div><b>{r.code}</b> <span className="small">{r.brand}</span></div>
              <div className="small">{r.grams ? `${r.grams}g` : "-"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
