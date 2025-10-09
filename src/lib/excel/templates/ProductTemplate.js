import * as XLSX from "xlsx";

export function downloadProductTemplate() {
  const wsData = [
    ["category_code", "price_tier", "name", "purity", "color", "price_nc", "price_vp", "price_mpc"],
    ["A", "A", "Privjesak srce", "585", "žuto", 120, 180, 225],
    ["B", "A", "Lančić klasični", "585", "bijelo", 240, 360, 450],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "Product_Template.xlsx");
}
