import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key exists:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  throw new Error("Supabase URL or Anon Key is not set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
