import { supabase } from "../lib/supabase";

// PRODUCTS
export async function getProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) throw error;
  return data;
}

// INVOICES
export async function createInvoice(invoice, items, payments) {
  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .insert([invoice])
    .select()
    .single();
  if (invError) throw invError;

  const invoiceId = inv.id;

  if (items?.length) {
    const itemsWithId = items.map(it => ({ ...it, invoice_id: invoiceId }));
    const { error: itemsError } = await supabase.from("invoice_items").insert(itemsWithId);
    if (itemsError) throw itemsError;
  }

  if (payments?.length) {
    const paymentsWithId = payments.map(p => ({ ...p, invoice_id: invoiceId }));
    const { error: payError } = await supabase.from("payments").insert(paymentsWithId);
    if (payError) throw payError;
  }

  return inv;
}

// STORNO zadnjeg računa
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

// CASH SESSION
export async function openCashSession(userId, initialFloat) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert([{ opened_by: userId, initial_float: initialFloat, status: "OPEN" }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closeCashSession(sessionId, userId, finalBalance) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .update({
      closed_by: userId,
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
