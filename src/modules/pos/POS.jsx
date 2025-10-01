import React, { useState, useEffect, useRef } from "react";
import ProductList from "./ProductList";
import ServiceList from "./ServiceList";
import Cart from "./Cart";
import Invoices from "./Invoices";
import Receipt from "./Receipt";
import { useReactToPrint } from "react-to-print";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./POS.css";

// helper: dohvat ili otvaranje aktivne smjene
async function getOrCreateSession(posId, cashierId) {
  // provjeri postoji li otvorena smjena za korisnika
  const { data: existing, error: fetchErr } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("pos_id", posId)
    .eq("cashier_id", cashierId)
    .eq("status", "OPEN")
    .limit(1);

  if (fetchErr) throw fetchErr;
  if (existing && existing.length > 0) return existing[0];

  // ako nema, otvori novu
  const { data: session, error: insertErr } = await supabase
    .from("cash_sessions")
    .insert({
      pos_id: posId,
      cashier_id: cashierId,
      opened_by: cashierId,
      status: "OPEN",
      initial_float: 0
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

  // auth user + aktivna smjena
  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  // modal za plaćanje
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cardType, setCardType] = useState(null);

  // podaci za ispis
  const [printedInvoice, setPrintedInvoice] = useState(null);
  const [printItems, setPrintItems] = useState([]);

  // ref za receipt print
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  // auto print kad invoice spreman
  useEffect(() => {
    if (printedInvoice && printItems.length > 0) {
      handlePrint();
    }
  }, [printedInvoice, printItems, handlePrint]);

  // auth user i aktivna smjena
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

  // dohvaćanje itema
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("id, code, name, price, stock, type")
      .order("code");

    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja artikala: " + error.message);
    } else {
      setProducts((data || []).filter((i) => i.type === "PRODUCT"));
      setServices((data || []).filter((i) => i.type === "SERVICE"));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // dodavanje u košaricu
  const addToCart = (item) => {
    const existing = cart.find((c) => c.code === item.code);
    if (existing) {
      if (item.type === "PRODUCT") {
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
    setCart(
      cart.map((c) =>
        c.code === code ? { ...c, quantity } : c
      )
    );
  };

  // checkout pokreće modal za odabir plaćanja
  const handleCheckout = () => {
    if (!cart.length) {
      toast.warning("Košarica je prazna.");
      return;
    }
    setShowPaymentModal(true);
  };

  // potvrda plaćanja
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

      for (const item of cart) {
        if (item.type === "PRODUCT") {
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

      // pripremi za ispis
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

  // storno zadnjeg računa
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

  return (
    <div className="pos">
      {/* Hidden receipt for print */}
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
                <label>
                  <input
                    type="radio"
                    name="cardType"
                    value="VISA"
                    checked={cardType === "VISA"}
                    onChange={(e) => setCardType(e.target.value)}
                  /> Visa
                </label>
                <label>
                  <input
                    type="radio"
                    name="cardType"
                    value="MC"
                    checked={cardType === "MC"}
                    onChange={(e) => setCardType(e.target.value)}
                  /> Mastercard
                </label>
                <label>
                  <input
                    type="radio"
                    name="cardType"
                    value="AMEX"
                    checked={cardType === "AMEX"}
                    onChange={(e) => setCardType(e.target.value)}
                  /> Amex
                </label>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={confirmPayment}>Potvrdi</button>
              <button onClick={() => setShowPaymentModal(false)}>Odustani</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="pos-tabs">
        <button
          className={activeTab === "sales" ? "active" : ""}
          onClick={() => setActiveTab("sales")}
        >
          Prodaja
        </button>
        <button
          className={activeTab === "invoices" ? "active" : ""}
          onClick={() => setActiveTab("invoices")}
        >
          Računi
        </button>
      </div>

      {/* Content */}
      <div className="pos-content">
        {activeTab === "sales" && (
          <div className="pos-grid">
            <div className="pos-products">
              <div className="pos-subtabs">
                <button
                  className={activeSubTab === "products" ? "active" : ""}
                  onClick={() => setActiveSubTab("products")}
                >
                  📦 Proizvodi
                </button>
                <button
                  className={activeSubTab === "services" ? "active" : ""}
                  onClick={() => setActiveSubTab("services")}
                >
                  🔧 Usluge
                </button>
              </div>

              {loading ? (
                <p>Učitavam...</p>
              ) : activeSubTab === "products" ? (
                <ProductList products={products} onAdd={addToCart} />
              ) : (
                <ServiceList services={services} onAdd={addToCart} />
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
      </div>
    </div>
  );
}
