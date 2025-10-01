import { createClient } from "@supabase/supabase-js";

// CRA vidi samo REACT_APP_ varijable
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  throw new Error("Supabase URL or Anon Key is not set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
