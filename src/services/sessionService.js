import { supabase } from "../supabaseClient";

// vraća aktivnu smjenu ili otvara novu
export async function getOrCreateSession(posId, cashierId) {
  // postoji li otvorena
  const { data: existing, error: fetchErr } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("pos_id", posId)
    .eq("cashier_id", cashierId)
    .is("closed_at", null)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (existing) return existing;

  // nema aktivne → otvori novu
  const { data: session, error: insertErr } = await supabase
    .from("cash_sessions")
    .insert({
      pos_id: posId,
      cashier_id: cashierId,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  return session;
}
