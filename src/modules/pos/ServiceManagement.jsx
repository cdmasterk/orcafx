import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./ServiceManagement.css";

export default function ServiceManagement() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStore, setFilterStore] = useState("ALL");

  const fetchRepairs = async () => {
    setLoading(true);
    let query = supabase
      .from("repairs")
      .select("*, warehouses(name)")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error("❌ Greška kod dohvaćanja popravaka");
    } else {
      setRepairs(data);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.rpc("update_repair_status", {
      p_repair_id: id,
      p_status: newStatus,
      p_user_id: user.id,
    });
    if (error) {
      toast.error("Greška: " + error.message);
    } else {
      toast.success("✅ Status ažuriran");
      fetchRepairs();
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const filtered = repairs.filter((r) => {
    const statusOk = filterStatus === "ALL" || r.status === filterStatus;
    const storeOk = filterStore === "ALL" || r.warehouse_id === filterStore;
    return statusOk && storeOk;
  });

  const colors = {
    RECEIVED: "#cce5ff",
    IN_PROGRESS: "#fff3cd",
    READY: "#d4edda",
    DELIVERED: "#e2e3e5",
    CANCELLED: "#f8d7da",
  };

  return (
    <div className="service-management">
      <h2>🔧 Service Management</h2>
      <p>Centralni pregled svih servisnih naloga i statusa popravaka.</p>

      <div className="filters">
        <label>
          Status:
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Svi</option>
            <option value="RECEIVED">Primljen</option>
            <option value="IN_PROGRESS">U tijeku</option>
            <option value="READY">Završen</option>
            <option value="DELIVERED">Isporučen</option>
            <option value="CANCELLED">Otkazan</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Učitavam...</p>
      ) : (
        <table className="styled-table">
          <thead>
            <tr>
              <th>Broj</th>
              <th>Kupac</th>
              <th>Opis</th>
              <th>Cijena</th>
              <th>Status</th>
              <th>Lokacija</th>
              <th>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ background: colors[r.status] }}>
                <td>{r.repair_no}</td>
                <td>{r.customer_name}</td>
                <td>{r.item_description}</td>
                <td>{r.total_price?.toFixed(2)} €</td>
                <td>{r.status}</td>
                <td>{r.warehouses?.name || "Nepoznato"}</td>
                <td>
                  <select
                    value={r.status}
                    onChange={(e) =>
                      handleStatusChange(r.id, e.target.value)
                    }
                  >
                    <option value="RECEIVED">Primljen</option>
                    <option value="IN_PROGRESS">U tijeku</option>
                    <option value="READY">Završen</option>
                    <option value="DELIVERED">Isporučen</option>
                    <option value="CANCELLED">Otkazan</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
