import React, { useState, useEffect, useRef } from "react";
import ProductList from "./ProductList";
import ServiceList from "./ServiceList";
import Cart from "./Cart";
import Invoices from "./Invoices";
import Receipt from "./Receipt";
import Repairs from "./Repairs";
import ServiceManagement from "./ServiceManagement";
import { useReactToPrint } from "react-to-print";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./POS.css";

async function getOrCreateSession(posId, cashierId) {
  const { data: existing, error: fetchErr } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("pos_id", posId)
    .eq("cashier_id", cashierId)
    .eq("status", "OPEN")
    .limit(1);

  if (fetchErr) throw fetchErr;
  if (existing && existing.length > 0) return existing[0];

  const { data: session, error: insertErr } = await supabase
    .from("cash_sessions")
    .insert({
      pos_id: posId,
      cashier_id: cashierId,
      opened_by: cashierId,
      status: "OPEN",
      initial_float: 0,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  return session;
}

export default function POS() {
  const [activeTab, setActiveTab] = useState("sales");
  const [activeSubTab, setActiveSubTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cardType, setCardType] = useState(null);

  const [printedInvoice, setPrintedInvoice] = useState(null);
  const [printItems, setPrintItems] = useState([]);

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  // auto print
  useEffect(() => {
    if (printedInvoice && printItems.length > 0) {
      handlePrint();
    }
  }, [printedInvoice, printItems, handlePrint]);

  // auth + session
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user);
        try {
          const session = await getOrCreateSession("POS-001", data.user.id);
          setActiveSession(session);
        } catch (err) {
          console.error("Greška kod dohvaćanja/otvaranja smjene:", err);
          toast.error("Greška kod otvaranja smjene");
        }
      }
    });
  }, []);

  // fetch items
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("id, code, name, price_nc, price_vp, price_mp, stock, type, warehouse_id")
      .order("code");

    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja artikala: " + error.message);
    } else {
      const normalized = (data || []).map((i) => ({
        ...i,
        price: Number(i.price_mp ?? i.price_vp ?? i.price_nc ?? 0),
        type: (i.type || "").toLowerCase(),
      }));

      setProducts(normalized.filter((i) => i.type === "product"));
      setServices(normalized.filter((i) => i.type === "service"));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Cart
  const addToCart = (item) => {
    const existing = cart.find((c) => c.code === item.code);
    if (existing) {
      if (item.type === "product") {
        if (existing.quantity + 1 > (item.stock || 0)) {
          toast.warning("Nema dovoljno na skladištu!");
          return;
        }
      }
      setCart(
        cart.map((c) =>
          c.code === item.code ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (code) => {
    setCart(cart.filter((c) => c.code !== code));
  };

  const updateQuantity = (code, quantity) => {
    setCart(cart.map((c) => (c.code === code ? { ...c, quantity } : c)));
  };

  // Checkout
  const handleCheckout = () => {
    if (!cart.length) {
      toast.warning("Košarica je prazna.");
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!user || !activeSession) {
      toast.error("Nema aktivne smjene ili korisnika.");
      return;
    }
    try {
      const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          total,
          payment_method: paymentMethod,
          payment_subtype: cardType,
          cashier_id: user.id,
          cash_session_id: activeSession.id,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      const items = cart.map((i) => ({
        invoice_id: invoice.id,
        item_code: i.code,
        quantity: i.quantity,
        price: i.price,
      }));

      const { error: itemsErr } = await supabase
        .from("invoice_items")
        .insert(items);
      if (itemsErr) throw itemsErr;

      // stock update
      for (const item of cart) {
        if (item.type === "product") {
          const { error } = await supabase.rpc("decrement_stock", {
            p_code: item.code,
            p_quantity: item.quantity,
          });
          if (error) throw error;
        }
      }

      setLastInvoice(invoice.id);
      toast.success(`Račun ${invoice.invoice_no || invoice.id} izdan!`);
      fetchItems();

      setPrintedInvoice({
        ...invoice,
        total,
        zki: "TEST-ZKI-1234567890",
        jir: "TEST-JIR-0987654321",
      });
      setPrintItems([...cart]);
      setCart([]);
      setShowPaymentModal(false);
      setCardType(null);
    } catch (err) {
      console.error(err);
      toast.error("Greška kod naplate: " + err.message);
    }
  };

  const handleStorno = async () => {
    if (!lastInvoice) {
      toast.warning("Nema računa za stornirati.");
      return;
    }
    try {
      const { error } = await supabase.rpc("storno_invoice", {
        p_invoice_id: lastInvoice,
      });
      if (error) throw error;

      toast.success("Račun storniran i zalihe vraćene!");
      setLastInvoice(null);
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Greška kod storna: " + err.message);
    }
  };

  // 📨 Email Notification when repair status READY
  useEffect(() => {
    const repairListener = supabase
      .channel("repair-status-listener")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "repairs",
          filter: "status=eq.READY",
        },
        async (payload) => {
          const r = payload.new;
          if (r?.customer_email) {
            const text = `Poštovani ${r.customer_name},\n\nVaš popravak (${r.repair_no}) je završen i spreman za preuzimanje u poslovnici ${r.warehouse_id || "odabranoj"}.\n\nHvala što ste koristili naše usluge.\n\nZlatarna Križek`;
            await fetch("/api/sendMail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: r.customer_email,
                subject: `Popravak ${r.repair_no} spreman za preuzimanje`,
                text,
              }),
            });
            toast.info(`📧 Email poslan kupcu ${r.customer_name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repairListener);
    };
  }, []);

  // ===============================
  // 🖥️ Render
  // ===============================
  return (
    <div className="pos">
      <div style={{ display: "none" }}>
        {printedInvoice && (
          <Receipt
            ref={componentRef}
            invoice={printedInvoice}
            items={printItems}
          />
        )}
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Odaberi način plaćanja</h3>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">💵 Gotovina</option>
              <option value="CARD">💳 Kartica</option>
              <option value="VOUCHER">🎁 Poklon bon</option>
              <option value="TRANSFER">🔄 Virman</option>
            </select>

            {paymentMethod === "CARD" && (
              <div className="sub-options">
                {["VISA", "MC", "AMEX"].map((type) => (
                  <label key={type}>
                    <input
                      type="radio"
                      name="cardType"
                      value={type}
                      checked={cardType === type}
                      onChange={(e) => setCardType(e.target.value)}
                    />{" "}
                    {type}
                  </label>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={confirmPayment}>Potvrdi</button>
              <button onClick={() => setShowPaymentModal(false)}>
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="pos-tabs">
        <button className={activeTab === "sales" ? "active" : ""} onClick={() => setActiveTab("sales")}>Prodaja</button>
        <button className={activeTab === "invoices" ? "active" : ""} onClick={() => setActiveTab("invoices")}>Računi</button>
        <button className={activeTab === "service" ? "active" : ""} onClick={() => setActiveTab("service")}>Service Management</button>
      </div>

      <div className="pos-content">
        {activeTab === "sales" && (
          <div className="pos-grid">
            <div className="pos-products">
              <div className="pos-subtabs">
                <button className={activeSubTab === "products" ? "active" : ""} onClick={() => setActiveSubTab("products")}>📦 Proizvodi</button>
                <button className={activeSubTab === "services" ? "active" : ""} onClick={() => setActiveSubTab("services")}>🔧 Usluge</button>
                <button className={activeSubTab === "repairs" ? "active" : ""} onClick={() => setActiveSubTab("repairs")}>🧰 Popravci</button>
              </div>

              {loading ? (
                <p>Učitavam...</p>
              ) : activeSubTab === "products" ? (
                <ProductList products={products} onAdd={addToCart} />
              ) : activeSubTab === "services" ? (
                <ServiceList services={services} onAdd={addToCart} />
              ) : (
                <Repairs addToCart={addToCart} />
              )}
            </div>

            <div className="pos-cart">
              <Cart
                cart={cart}
                onRemove={removeFromCart}
                onUpdateQuantity={updateQuantity}
                onCheckout={handleCheckout}
                onStorno={handleStorno}
                lastInvoice={lastInvoice}
              />
            </div>
          </div>
        )}

        {activeTab === "invoices" && <Invoices onRefresh={fetchItems} />}
        {activeTab === "service" && <ServiceManagement />}
      </div>
    </div>
  );
}
