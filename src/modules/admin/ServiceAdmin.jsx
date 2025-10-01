import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./ServiceAdmin.css";

export default function ServiceAdmin() {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ code: "", name: "", price: "" });
  const [editingService, setEditingService] = useState(null);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, code, name, price")
      .eq("type", "SERVICE")
      .order("code");

    if (error) {
      console.error(error);
      toast.error("Greška kod dohvaćanja usluga");
    } else {
      setServices(data || []);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ➕ Dodavanje
  const addService = async () => {
    if (!newService.code || !newService.name || !newService.price) {
      toast.warning("Ispunite sva polja");
      return;
    }

    const { error } = await supabase.from("items").insert([
      {
        code: newService.code,
        name: newService.name,
        price: parseFloat(newService.price),
        type: "SERVICE",
      },
    ]);

    if (error) {
      console.error(error);
      toast.error("Greška kod dodavanja usluge");
    } else {
      toast.success("Usluga dodana!");
      setNewService({ code: "", name: "", price: "" });
      fetchServices();
    }
  };

  // 🗑️ Brisanje
  const deleteService = async (id) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      console.error(error);
      toast.error("Greška kod brisanja usluge");
    } else {
      toast.success("Usluga obrisana!");
      fetchServices();
    }
  };

  // ✏️ Edit
  const startEdit = (service) => setEditingService({ ...service });
  const cancelEdit = () => setEditingService(null);

  const saveEdit = async () => {
    const { error } = await supabase
      .from("items")
      .update({
        code: editingService.code,
        name: editingService.name,
        price: parseFloat(editingService.price),
      })
      .eq("id", editingService.id);

    if (error) {
      console.error(error);
      toast.error("Greška kod ažuriranja usluge");
    } else {
      toast.success("Usluga ažurirana!");
      setEditingService(null);
      fetchServices();
    }
  };

  // 📤 Export u Excel
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      services.map((s) => ({
        Šifra: s.code,
        Naziv: s.name,
        Cijena: s.price,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usluge");
    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "Usluge.xlsx");
  };

  // 📥 Import iz Excel-a
  const importExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const formatted = rows.map((r) => ({
        code: r["Šifra"],
        name: r["Naziv"],
        price: parseFloat(r["Cijena"]),
        type: "SERVICE",
      }));

      const { error } = await supabase.from("items").insert(formatted);

      if (error) {
        console.error(error);
        toast.error("Greška kod importa usluga");
      } else {
        toast.success("Usluge uspješno uvezene!");
        fetchServices();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="service-admin">
      <h2>🔧 Service Admin</h2>

      {/* Import/Export */}
      <div className="import-export">
        <button onClick={exportExcel}>📤 Export u Excel</button>
        <label className="import-label">
          📥 Import iz Excel-a
          <input type="file" accept=".xlsx, .xls" onChange={importExcel} hidden />
        </label>
      </div>

      {/* Forma za dodavanje */}
      <div className="service-form">
        <input
          type="text"
          placeholder="Šifra"
          value={newService.code}
          onChange={(e) => setNewService({ ...newService, code: e.target.value })}
        />
        <input
          type="text"
          placeholder="Naziv"
          value={newService.name}
          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Cijena"
          value={newService.price}
          onChange={(e) => setNewService({ ...newService, price: e.target.value })}
        />
        <button onClick={addService}>➕ Dodaj uslugu</button>
      </div>

      {/* Tablica usluga */}
      <table>
        <thead>
          <tr>
            <th>Šifra</th>
            <th>Naziv</th>
            <th>Cijena</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              {editingService?.id === s.id ? (
                <>
                  <td>
                    <input
                      type="text"
                      value={editingService.code}
                      onChange={(e) =>
                        setEditingService({ ...editingService, code: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editingService.name}
                      onChange={(e) =>
                        setEditingService({ ...editingService, name: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editingService.price}
                      onChange={(e) =>
                        setEditingService({ ...editingService, price: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <button className="btn-save" onClick={saveEdit}>💾 Spremi</button>
                    <button className="btn-cancel" onClick={cancelEdit}>✖️ Odustani</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.price.toFixed(2)} €</td>
                  <td>
                    <button className="btn-edit" onClick={() => startEdit(s)}>✏️ Uredi</button>
                    <button className="btn-delete" onClick={() => deleteService(s.id)}>🗑️ Obriši</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
