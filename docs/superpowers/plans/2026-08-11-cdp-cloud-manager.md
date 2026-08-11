# CDP Cloud Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere il gestionale CDP pubblicabile su GitHub Pages con persistenza Supabase, login admin, cataloghi modificabili, coda scadenze e ordinamento per data.

**Architecture:** Frontend statico senza build. `supabase-store.js` incapsula Auth/Data API/Realtime e normalizza i record nel formato già consumato da analytics e grafici. In assenza di configurazione Supabase, l'app usa il dataset statico in sola lettura.

**Tech Stack:** HTML5, CSS3, JavaScript ES5/ES6 browser, Supabase JS v2 via CDN, PostgreSQL/RLS, Node.js test runner.

## Global Constraints
- GitHub Pages deve poter pubblicare direttamente la root senza build.
- Nessuna secret/service role key nel frontend.
- `offer_date` dei nuovi record è il giorno di inserimento.
- I 781 record storici usano `expiry_date - 10 giorni`.
- Solo admin autenticato può mutare dati; SELECT resta pubblico.
- La coda scadenze usa solo l'ultima offerta per coppia supermercato/prodotto.
- Rank denso e pari merito restano invariati.

---

### Task 1: Supabase data layer
**Files:** `js/supabase-store.js`, `js/config.example.js`, `tests/supabase-store.test.js`
**Produces:** API per configurazione, lettura, login/logout, CRUD offerte/cataloghi e Realtime.

- [ ] Scrivere test fail per normalizzazione record, configurazione e API esposte.
- [ ] Implementare il minimo necessario.
- [ ] Verificare test verdi.

### Task 2: Coda scadenze e ordinamento
**Files:** `js/analytics.js`, `tests/analytics-cloud.test.js`
**Produces:** `renewalQueue(rows, today)` e ordinamento archivio configurabile.

- [ ] Scrivere test fail per ultima offerta per coppia e stati scaduta/oggi.
- [ ] Implementare coda e sorter.
- [ ] Verificare test verdi.

### Task 3: Interfaccia cloud/admin
**Files:** `index.html`, `assets/styles.css`, `js/app.js`, test smoke.
**Produces:** login, stato cloud, cataloghi, coda rinnovi, sort data e gestione CRUD.

- [ ] Scrivere smoke test fail per nuovi elementi UI e integrazione store.
- [ ] Implementare markup/stili/app wiring.
- [ ] Verificare test verdi.

### Task 4: Database e seed
**Files:** `supabase/schema.sql`, `supabase/seed.sql`, `supabase/README.md`, test SQL smoke.
**Produces:** schema RLS sicuro e import completo dello storico.

- [ ] Scrivere test fail sulla presenza di tabelle/policy/781 seed.
- [ ] Generare schema e seed.
- [ ] Verificare test verdi.

### Task 5: Go-live package
**Files:** `README.md`, `TODO-LIVE.md`, `.nojekyll`, `package.json`, ZIP finale.
**Produces:** pacchetto deployabile e checklist completa.

- [ ] Aggiungere test documentali.
- [ ] Aggiornare documentazione e script test.
- [ ] Eseguire suite completa e smoke HTTP locale.
- [ ] Creare ZIP finale.
