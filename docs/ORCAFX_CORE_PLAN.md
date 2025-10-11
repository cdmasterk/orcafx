# ORCAFX — Core Plan  
_Last updated: October 2025_

---

## MVP — 🖥️ Sales (POS & Web POS)
- [x] Dinamične cijene (integracija Metal Prices €/g u artikle)
- [ ] Dodati fiskalizaciju (API za Hrvatsku)
- [x] Računi: print/export PDF + automatsko spremanje u Supabase
- [ ] UX: brzi prečaci (tipkovnica, barcode)
- [ ] Dodati “Custom Orders” tab u POS (veza s proizvodnjom)
- [x] Storno mehanizam (povećanje stocka pri poništenju računa)

---

## MVP — 🔧 Service
- [x] Statuse servisa: zaprimljen, u obradi, završen, naplaćen
- [x] Automatsko slanje u POS Cart kod naplate
- [ ] Izvještaj: lista aktivnih servisa + filtriranje po statusu
- [x] Email notifikacija pri završetku servisa

---

## MVP — 💰 Buyback
- [x] Povezati otkupnu cijenu s Metal Prices API (Au 24k / Ag 999)
- [x] Automatski izračun otkupne cijene po gramu/čistoći
- [ ] Izdavanje računa otkupa (dokument / PDF)
- [ ] Povezivanje otkupa s financijskim izvještajem

---

## MVP — 📦 Inventory & Supply Chain
- [x] Evidencija centralnog skladišta
- [x] Evidencija poslovnica (VG, Dubrovnik, webshop)
- [x] Transfer robe (iz centralnog u poslovnicu)
- [ ] Povrat robe (iz poslovnice u centralno)
- [x] Automatsko smanjenje stocka kroz POS prodaju i storno vraćanje
- [ ] Evidencija kamena (ct / karati) i sirovina po gramima
- [x] Update `updated_at` na transfer i promjene stocka
- [ ] Dashboard za praćenje zaliha po skladištima

---

## MVP — 💳 Finance & Invoicing
- [x] Metal Prices API (fetch + Supabase zapis + cron)
- [x] Auto price recalculation (Supabase + Vercel + cron)
- [x] Finance Hub (UI) s live statusom gore desno
- [ ] Finance Settings (marže + intervali recalculacije)
- [x] Export računa za knjigovodstvo (Excel / PDF)
- [ ] Import bank izvadaka (CSV / MT940) → povezivanje uplata s računima
- [x] Dashboard: graf prihoda/troškova
- [ ] Sustav notifikacija pri greškama cron jobova

---

## MVP — 📑 Custom Orders
- [x] Definiran proces: outsourced vs in-house
- [ ] SQL tablica i backend funkcije
- [ ] Forma za unos narudžbi (materijal, model, opis)
- [ ] Statusi: zaprimljeno / u izradi / gotovo / isporučeno
- [ ] Veza sa skladištem i proizvodnjom
- [ ] Izvještaj aktivnih custom narudžbi

---

## Phase 2 — ⚒️ Production / Manufacturing
- [ ] Workflow proizvodnje (planiranje, radni nalozi)
- [ ] Veza sa stockom (materijali → output proizvodi)
- [ ] Automatsko kreiranje zaduženja skladišta kod izrade proizvoda
- [ ] Evidencija vremena i troškova proizvodnje

---

## Phase 2 — 👥 HR & Workforce
- [ ] Evidencija zaposlenika
- [ ] Radno vrijeme i smjene
- [ ] Osnovni obračun plaća
- [ ] Povezivanje radnih sati s troškovima proizvodnje

---

## Phase 2 — 🤝 CRM & Loyalty
- [ ] Baza kupaca
- [ ] Loyalty program (bodovi, popusti)
- [ ] Segmentacija i personalizirane ponude
- [ ] CRM Dashboard – aktivnosti, kupovine, komunikacija

---

## Phase 2 — 📈 Reports & Analytics
- [x] Dashboard (Finance, POS)
- [ ] Izvještaji prodaje po artiklima i lokacijama
- [ ] Trendovi otkupa
- [ ] Analiza servisa
- [ ] Log aktivnih cron i recalc događaja

---

## Phase 3 — 🏦 Banking & Payments
- [ ] Integracija s bankovnim API
- [ ] Kartično plaćanje (POS terminal API)
- [ ] Automatska veza uplata → računi
- [ ] Online plaćanja (Stripe / PayPal bridge)

---

## Phase 3 — 🌍 E-commerce Bridge
- [ ] Sinkronizacija webshop artikala
- [ ] Automatsko povlačenje narudžbi
- [ ] Usklađivanje cijena webshop ↔ ORCAFX
- [ ] Webshop inventory sync (2-way)

---

## Phase 3 — 📜 Government & Compliance
- [ ] Fiskalizacija (ako nije dovršeno u MVP)
- [ ] Porezni izvještaji i PDV evidencija
- [ ] Evidencija ulaznih računa i dobavljača
- [ ] Export za knjigovodstvo / financije u standardnim formatima

---

## Phase 4 — 🤖 AI Predictive Layer & Intelligent Agents

### 🎯 Core AI Capabilities
- [x] Metal prices predikcija (temelj za AI modul)
- [ ] Predikcija prodaje, potražnje i sezonalnosti
- [ ] Automatski prijedlozi za narudžbe i nabavu
- [ ] AI forecast dashboard s usporedbom plan vs. stvarnost
- [ ] Upozorenja na odstupanja (price alert, margin drop)

---

### 🧠 AI Agent Framework
Integrirani ORCA AI sustav sastavljen od domen-specifičnih agenata koji međusobno komuniciraju  
i reagiraju na poslovne događaje u realnom vremenu (event-driven architecture).

#### 💰 FinanceAgent
- Analizira prihode, troškove i marže po artiklima, lokacijama i vremenskim razdobljima  
- Predlaže korekcije marži na temelju tržišnih fluktuacija  
- Upozorava na odstupanja od ciljanih profitnih margina  
- Predlaže automatsku rekalkulaciju cijena (sync s `trigger_price_recalc`)

#### 🏭 WarehouseAgent
- Prati stanje skladišta u realnom vremenu  
- Predviđa nedostatke materijala (zlato, kamenje, komponente)  
- Generira prijedloge za nabavu i optimizira stock  
- Detektira neusklađenosti između fizičkog i digitalnog stanja zaliha

#### 🧾 ReportAgent
- Generira automatske mjesečne izvještaje (P&L, prodaja, otkup, servisi)  
- Prepoznaje trendove i iznimke (npr. nagli pad prodaje u jednoj poslovnici)  
- Može sam pokretati SQL analize ili dohvaćati podatke iz više tablica  
- Vizualizira rezultate u Dashboardu (grafovi, heatmaps)

#### 👥 HRAgent
- Analizira radne sate, produktivnost i troškove rada  
- Predlaže optimizaciju smjena u proizvodnji i servisu  
- Prepoznaje “bottleneck” točke u procesu

#### 💬 CommunicationAgent
- Prima AI upite korisnika u natural language obliku  
- Komunicira s drugim agentima i prikazuje rezultate u dijaloškom formatu  
- Može automatski pokrenuti radnju (npr. “povećaj maržu na srebro za 2%”)

---

### ⚙️ Integracija i Upravljanje Agentima
- [ ] AI Management Hub (dashboard za nadzor agenata)
- [ ] Logging sustav (aktivnosti, odluke, preporuke)
- [ ] Konfiguracija parametara (granice marži, prag upozorenja)
- [ ] Autorizacija po ulogama (tko može odobriti AI prijedlog)
- [ ] “Human-in-the-loop” – potvrda AI odluka prije izvršenja

---

## Phase 4 — 🔐 Roles (RBAC)
- [ ] Admin — sve
- [ ] Manager — Settings + izvještaji
- [ ] Administrative — ograničeni pristup
- [ ] Sales / Service — samo prodaja i servisi

---

## ⚙️ System Integrations & Automation
- [x] Supabase Edge Functions (fetch_metal_prices, trigger_price_recalc, archive)
- [x] Vercel Cron Jobs (fetch, recalc, cleanup)
- [x] CronJob.org scheduler – metal prices sync
- [x] Live Status widget (“Hack Mode” Finance Hub)
- [ ] Notification Hub za error / success evente
- [x] SQL cleanup auto-archiving older than 365 days
- [ ] API proxy log monitoring (trigger log & alerts)
