import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // ⚠️ jer je kod tebe supabaseClient direktno u /src

export function useItems(type = "PRODUCT") {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", type)
        .order("name", { ascending: true });

      if (error) {
        setError(error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }

    fetchItems();
  }, [type]);

  return { items, loading, error };
}
