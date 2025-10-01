import { supabase } from "../lib/supabase";

// -------------------------
// PRODUCTS
// -------------------------

// Dohvati sve proizvode
export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
}

// -------------------------
// INVOICES
// -------------------------

// Kreiraj račun s artiklima i plaćanjima
export async function createInvoice(invoice, items, payments) {
  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .insert([invoice])
    .select()
    .single();
  if (invError) throw invError;

  const invoiceId = inv.id;

  if (items?.length) {
    const itemsWithId = items.map((it) => ({
      ...it,
      invoice_id: invoiceId
    }));
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsWithId);
    if (itemsError) throw itemsError;
  }

  if (payments?.length) {
    const paymentsWithId = payments.map((p) => ({
      ...p,
      invoice_id: invoiceId
    }));
    const { error: payError } = await supabase
      .from("payments")
      .insert(paymentsWithId);
    if (payError) throw payError;
  }

  return inv;
}

// Storno zadnjeg računa
export async function stornoLastInvoice() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data.length) throw new Error("Nema računa za storno");

  const last = data[0];
  const { error: updError } = await supabase
    .from("invoices")
    .update({ status: "STORNO" })
    .eq("id", last.id);
  if (updError) throw updError;

  return last;
}

// -------------------------
// CASH SESSIONS
// -------------------------

// Otvori dan – samo ako je user logiran
export async function openCashSession(initialFloat) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Morate biti prijavljeni da otvorite kasu.");

  const { data, error } = await supabase
    .from("cash_sessions")
    .insert([{ opened_by: user.id, initial_float: initialFloat, status: "OPEN" }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Zatvori dan
export async function closeCashSession(sessionId, finalBalance) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Morate biti prijavljeni da zatvorite kasu.");

  const { data, error } = await supabase
    .from("cash_sessions")
    .update({
      closed_by: user.id,
      closed_at: new Date().toISOString(),
      final_balance: finalBalance,
      status: "CLOSED"
    })
    .eq("id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Dohvati trenutno otvorenu kasu
export async function getOpenCashSession() {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // not found
  return data;
}

// -------------------------
// REPORTS
// -------------------------

// Dnevni promet
export async function getDailySales() {
  const { data, error } = await supabase.from("v_sales_daily").select("*");
  if (error) throw error;
  return data;
}

// Mjesečni promet
export async function getMonthlySales() {
  const { data, error } = await supabase.from("v_sales_monthly").select("*");
  if (error) throw error;
  return data;
}

// Kvartalni promet
export async function getQuarterlySales() {
  const { data, error } = await supabase.from("v_sales_quarterly").select("*");
  if (error) throw error;
  return data;
}

// Godišnji promet
export async function getYearlySales() {
  const { data, error } = await supabase.from("v_sales_yearly").select("*");
  if (error) throw error;
  return data;
}

// Pregled zatvaranja dana
export async function getCashSessionSummary() {
  const { data, error } = await supabase
    .from("v_cash_session_summary")
    .select("*");
  if (error) throw error;
  return data;
}
