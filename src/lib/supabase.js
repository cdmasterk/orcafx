// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables", {
    supabaseUrl,
    supabaseKeyExists: !!supabaseKey,
  });
  throw new Error("Supabase URL or Anon Key is not set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
