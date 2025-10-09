# ORCAFX — Core Plan

## MVP — 🖥️ Sales (POS & Web POS)
- [ ] Dodati fiskalizaciju (API za Hrvatsku)
- [ ] Dinamične cijene (integracija metal prices €/g u artikle)
- [ ] Računi: print/export PDF + automatsko spremanje u Supabase
- [ ] UX: brzi prečaci (tipkovnica, barcode)

## MVP — 🔧 Service
- [ ] Dodati statuse servisa (zaprimljen, u obradi, završen, naplaćen)
- [ ] Automatsko slanje u POS Cart kod naplate
- [ ] Izvještaj: lista aktivnih servisa + filtriranje po statusu

## MVP — 💰 Buyback
- [ ] Povezati otkupnu cijenu s metal prices API (Au 24k, Ag 999)
- [ ] Automatski izračun otkupne cijene po gramu/čistoći
- [ ] Izdavanje računa otkupa (dokument)

## MVP — 📦 Inventory & Supply Chain
- [ ] Evidencija centralnog skladišta
- [ ] Evidencija poslovnica (VG, Dubrovnik, webshop)
- [ ] Transfer robe (iz centralnog u poslovnicu)
- [ ] Povrat robe (iz poslovnice u centralno)
- [ ] Automatsko smanjenje stocka kroz POS prodaju i storno vraćanje

## MVP — 💳 Finance & Invoicing
- [ ] Export računa za knjigovodstvo (Excel/PDF)
- [ ] Import bank izvadaka (CSV, MT940) → povezivanje uplata s računima
- [ ] Dashboard: graf prihoda/troškova

## MVP — 📑 Custom Orders
- [ ] Forma za unos narudžbi (materijal, model, opis)
- [ ] Statusi: zaprimljeno, u izradi, gotovo, isporučeno
- [ ] Veza sa skladištem i proizvodnjom

---

## Phase 2 — ⚒️ Production / Manufacturing
- [ ] Workflow proizvodnje (planiranje, radni nalozi)
- [ ] Veza sa stockom (materijali, output proizvodi)

## Phase 2 — 👥 HR & Workforce
- [ ] Evidencija zaposlenika
- [ ] Radno vrijeme i smjene
- [ ] Obračun plaća (osnovno)

## Phase 2 — 🤝 CRM & Loyalty
- [ ] Baza kupaca
- [ ] Loyalty program (bodovi, popusti)

## Phase 2 — 📈 Reports & Analytics
- [ ] Izvještaji prodaje
- [ ] Trendovi otkupa
- [ ] Analiza servisa

---

## Phase 3 — 🏦 Banking & Payments
- [ ] Integracija s bankovnim API
- [ ] Kartično plaćanje (POS terminal API)

## Phase 3 — 🌍 E-commerce Bridge
- [ ] Sinkronizacija webshop artikala
- [ ] Automatsko povlačenje narudžbi

## Phase 3 — 📜 Government & Compliance
- [ ] Fiskalizacija (ako nije dovršeno u MVP)
- [ ] Porezni izvještaji

---

## Phase 4 — 🤖 Predictive Analytics
- [ ] Predikcija cijena metala
- [ ] Predikcija prodaje

## Phase 4 — 🧠 Business Coach
- [ ] AI preporuke za upravljanje zalihama i financijama

## Phase 4 — 🗨️ Natural Language Queries
- [ ] Pitanja tipa "Koliko smo prodali prošli mjesec?" → AI upit prema DB

## Phase 4 — Roles (RBAC)
- [ ] Admin — sve
- [ ] Manager — Settings + izvještaji
- [ ] Administrative — ograničeni pristup
- [ ] Sales/Service — samo prodaja i servisi
