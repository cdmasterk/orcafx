import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./PriceTiersManager.css";

export default function PriceTiersManager() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTier, setNewTier] = useState({
    tier_code: "",
    tier_name: "",
    vp_markup: "",
    mp_markup: "",
    active: true,
  });

  // 🔹 Dohvati price tiers
  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    const { data, error } = await supabase
      .from("price_tiers")
      .select("*")
      .order("tier_code", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("❌ Greška pri dohvaćanju razreda");
      return;
    }
    setTiers(data || []);
  };

  // 🔹 Spremi izmjene
  const handleSave = async (tier) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("price_tiers")
        .update({
          tier_name: tier.tier_name,
          vp_markup: Number(tier.vp_markup),
          mp_markup: Number(tier.mp_markup),
          active: tier.active,
        })
        .eq("tier_code", tier.tier_code);

      if (error) throw error;
      toast.success(`✅ ${tier.tier_code} spremljen`);
      fetchTiers();
    } catch (err) {
      toast.error("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Novi razred
  const handleAddTier = async (e) => {
    e.preventDefault();
    if (!newTier.tier_code || !newTier.tier_name) {
      toast.warning("⚠️ Ispuni polja Code i Naziv");
      return;
    }

    try {
      const { error } = await supabase.from("price_tiers").insert([
        {
          tier_code: newTier.tier_code.toUpperCase(),
          tier_name: newTier.tier_name,
          vp_markup: Number(newTier.vp_markup || 0),
          mp_markup: Number(newTier.mp_markup || 0),
          active: newTier.active,
        },
      ]);
      if (error) throw error;
      toast.success("✅ Novi cjenovni razred dodan");
      setNewTier({
        tier_code: "",
        tier_name: "",
        vp_markup: "",
        mp_markup: "",
        active: true,
      });
      fetchTiers();
    } catch (err) {
      toast.error("❌ " + err.message);
    }
  };

  // 🔹 OnChange za postojeće
  const handleChange = (idx, key, value) => {
    const updated = [...tiers];
    updated[idx][key] = key.includes("markup") ? value.replace(",", ".") : value;
    setTiers(updated);
  };

  return (
    <div className="tiers-container">
      <h2>💰 Price Tiers Manager</h2>
      <p>
        Upravljaj maržama po cjenovnim razredima. Ove vrijednosti se koriste u
        automatskom izračunu VP i MP cijena u Procurement modulu.
      </p>

      <table className="tiers-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Naziv</th>
            <th>VP marža (%)</th>
            <th>MP marža (%)</th>
            <th>Aktivan</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t, idx) => (
            <tr key={t.tier_code}>
              <td>{t.tier_code}</td>
              <td>
                <input
                  value={t.tier_name}
                  onChange={(e) =>
                    handleChange(idx, "tier_name", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={t.vp_markup}
                  onChange={(e) =>
                    handleChange(idx, "vp_markup", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={t.mp_markup}
                  onChange={(e) =>
                    handleChange(idx, "mp_markup", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={t.active}
                  onChange={(e) =>
                    handleChange(idx, "active", e.target.checked)
                  }
                />
              </td>
              <td>
                <button
                  className="btn-save"
                  onClick={() => handleSave(t)}
                  disabled={loading}
                >
                  💾
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>➕ Dodaj novi razred</h3>
      <form className="new-tier-form" onSubmit={handleAddTier}>
        <input
          placeholder="Code (npr. A)"
          value={newTier.tier_code}
          onChange={(e) =>
            setNewTier({ ...newTier, tier_code: e.target.value })
          }
        />
        <input
          placeholder="Naziv (npr. Luxury)"
          value={newTier.tier_name}
          onChange={(e) =>
            setNewTier({ ...newTier, tier_name: e.target.value })
          }
        />
        <input
          placeholder="VP marža (0.15 = 15%)"
          value={newTier.vp_markup}
          onChange={(e) =>
            setNewTier({ ...newTier, vp_markup: e.target.value })
          }
        />
        <input
          placeholder="MP marža (0.30 = 30%)"
          value={newTier.mp_markup}
          onChange={(e) =>
            setNewTier({ ...newTier, mp_markup: e.target.value })
          }
        />
        <button type="submit" className="btn-add">
          ✅ Dodaj
        </button>
      </form>
    </div>
  );
}
