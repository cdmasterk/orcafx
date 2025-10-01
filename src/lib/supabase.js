import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vbrzdxbbijwgkfexfdfk.supabase.co";
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY; 
// ⚠️ mora biti REACT_APP_SUPABASE_KEY da bi CRA pročitao iz .env

export const supabase = createClient(supabaseUrl, supabaseKey);
