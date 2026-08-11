# CDP Offer Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare la dashboard statica CDP 2026 in un gestionale locale con inserimento persistente delle offerte e statistiche live per mese, trimestre e anno.

**Architecture:** Il dataset storico resta statico e viene normalizzato in memoria attribuendo la Data offerta pari alla Data scadenza meno 10 giorni. Le nuove offerte sono salvate in IndexedDB e unite al dataset storico; ogni mutazione ricostruisce le aggregazioni e ridisegna la UI. Tutto rimane HTML/CSS/JavaScript vanilla e offline.

**Tech Stack:** HTML5, CSS3, JavaScript ES2020, IndexedDB, SVG, Node.js built-in test runner.

## Global Constraints

- Nessun backend o database server.
- Le statistiche temporali usano Data offerta.
- Record storico: Data offerta = Data scadenza - 10 giorni.
- Record nuovo: Data offerta = data locale di inserimento.
- Rank Top 5 denso con tutti i pari merito.
- Dati esportabili/importabili per trasferimento su un altro PC.
- Grafica prosciutto cotto style, responsive, senza dipendenze esterne.

---

### Task 1: Data model temporale e backup

**Files:**
- Create: `js/data-model.js`
- Create: `tests/data-model.test.js`

**Interfaces:**
- Produces: `deriveOfferDate(expiryDate)`, `periodFields(offerDate)`, `normalizeHistoricalRows(rows)`, `createManualOffer(input, today)`, `buildBackup(userOffers)`, `parseBackup(payload)`.

- [ ] Scrivere test fallenti per sottrazione di 10 giorni, periodi, creazione manuale e backup.
- [ ] Eseguire `node --test tests/data-model.test.js` e verificare RED.
- [ ] Implementare il minimo necessario in `js/data-model.js`.
- [ ] Eseguire il test e verificare GREEN.

### Task 2: Analytics live per periodo

**Files:**
- Modify: `js/analytics.js`
- Modify: `tests/analytics.test.js`

**Interfaces:**
- Produces: `periodKeys(rows, granularity)`, `rowsForPeriod(rows, granularity, key)`, `previousPeriodKey(granularity, key)`, `periodSummary(rows, granularity, key)`, `trendWithinPeriod(rows, granularity, key)`.

- [ ] Scrivere test fallenti per mese, trimestre, anno e periodo precedente.
- [ ] Eseguire i test e verificare RED.
- [ ] Implementare le funzioni pure.
- [ ] Eseguire tutti i test e verificare GREEN.

### Task 3: Persistenza IndexedDB

**Files:**
- Create: `js/storage.js`

**Interfaces:**
- Produces async: `loadUserOffers()`, `saveUserOffer(offer)`, `deleteUserOffer(id)`, `replaceUserOffers(offers)`, `clearUserOffers()`.

- [ ] Implementare un wrapper IndexedDB con database `cdp-offers`, store `offers`, chiave `id`.
- [ ] Gestire errori di apertura/transazione con Promise reject esplicito.

### Task 4: Struttura HTML gestionale

**Files:**
- Modify: `index.html`
- Create: `tests/html-smoke.test.js`

**Interfaces:**
- Consumes: data model, storage, analytics, charts, app.
- Produces: sezioni `dashboard`, `manage`, `live`, `trends`, `products`, `supermarkets`, `data` e controlli con ID stabili usati da `app.js`.

- [ ] Scrivere smoke test fallente per nuovi ID e script.
- [ ] Eseguire test e verificare RED.
- [ ] Aggiornare HTML con form, statistiche live, backup/import e nuova navigazione.
- [ ] Eseguire smoke test e verificare GREEN.

### Task 5: Orchestrazione UI e aggiornamenti in tempo reale

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `CDPDataModel`, `CDPStorage`, `CDPAnalytics`, `CDPCharts`.
- Produces: inizializzazione asincrona, rendering completo e refresh dopo CRUD/import/reset.

- [ ] Convertire lo stato da costanti statiche a `state.rows` derivato da storico + offerte utente.
- [ ] Implementare il form nuova offerta con data inserimento automatica e validazione.
- [ ] Implementare eliminazione offerte personali.
- [ ] Implementare export/import JSON e export CSV.
- [ ] Implementare render statistiche live con Mese/Trimestre/Anno e confronto periodo precedente.
- [ ] Aggiornare tutti i render esistenti affinché usino il dataset corrente.
- [ ] Aggiornare tabella dati con Data offerta e Origine.

### Task 6: Restyling prosciutto cotto

**Files:**
- Modify: `assets/styles.css`
- Modify: `js/charts.js`

**Interfaces:**
- Produces: tema caldo, brand mark CSS, segmented controls, form, action buttons, toast/status, tabelle e grafici coerenti.

- [ ] Sostituire palette fredda con crema/bordeaux/rosa cotto.
- [ ] Aggiungere pattern e marchio a fette senza asset esterni.
- [ ] Stilizzare form, pulsanti, filtri, badge origine e pannelli live.
- [ ] Verificare responsive a 1100/760/480 px.

### Task 7: Bundle portabile e verifica finale

**Files:**
- Modify: `README.md`
- Create: `CDP_2026_Gestionale.html`
- Create: `/mnt/data/CDP_2026_Gestionale_Sito.zip`

**Interfaces:**
- Produces: progetto multi-file e singolo HTML autoconclusivo.

- [ ] Aggiornare README con uso, persistenza, backup e trasferimento PC.
- [ ] Eseguire `node --test tests/*.test.js` e verificare zero failure.
- [ ] Generare il singolo HTML incorporando CSS, dati e JS nell'ordine corretto.
- [ ] Verificare sintatticamente gli script JavaScript con Node.
- [ ] Creare ZIP del progetto completo.
- [ ] Eseguire smoke check su file bundle e dimensioni/asset.
