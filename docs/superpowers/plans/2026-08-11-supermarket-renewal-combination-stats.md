# Supermarket Renewal & Combination Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiornare la sezione Nuova offerta affinché segnali il rinnovo a livello di supermercato e mostri statistiche temporali per la combinazione supermercato-prosciutto selezionata.

**Architecture:** Mantenere l'app statica GitHub Pages con Supabase come archivio. La logica statistica resta pura in `js/analytics.js`; `js/app.js` si occupa di rendering e interazioni. Il rinnovo viene calcolato sull'ultima offerta cronologica di ciascun supermercato, indipendentemente dal prodotto.

**Tech Stack:** HTML, CSS, JavaScript ES2020, SVG charts locali, Supabase JS v2, Node.js built-in test runner.

## Global Constraints

- Nessun backend custom: compatibile con GitHub Pages.
- Lettura pubblica e scrittura protetta da Supabase RLS.
- Nuove offerte con Data offerta uguale alla data di inserimento.
- I dati storici mantengono Data offerta = Data scadenza - 10 giorni.
- Pari merito invariati nelle classifiche esistenti.

---

### Task 1: Logica rinnovo supermercato

**Files:**
- Modify: `js/analytics.js`
- Modify: `tests/analytics-cloud.test.js`

**Interfaces:**
- Produces: `supermarketRenewalStatus(rows, today, supermarketNames)`

- [ ] Aggiungere test che dimostrano che un'offerta successiva di un prodotto diverso rinnova il supermercato.
- [ ] Aggiungere test per `expired`, `today`, `renewed` e `never`.
- [ ] Verificare il RED.
- [ ] Implementare la funzione usando l'ultima `offerDate` per supermercato e la relativa `expiryDate`.
- [ ] Verificare il GREEN.

### Task 2: Statistiche combinazione

**Files:**
- Modify: `js/analytics.js`
- Modify: `tests/analytics-cloud.test.js`

**Interfaces:**
- Produces: `combinationStats(rows, supermarket, product, today)`

- [ ] Aggiungere test per conteggi, prezzi, ultimo/precedente, intervallo medio e conteggi mese/trimestre/anno.
- [ ] Verificare il RED.
- [ ] Implementare statistiche pure e trend cronologico.
- [ ] Verificare il GREEN.

### Task 3: UI cloud coerente e nuova area gestione

**Files:**
- Modify: `index.html`
- Modify: `assets/styles.css`
- Modify: `js/app.js`
- Modify: `tests/cloud-html-smoke.test.js`
- Modify: `tests/app-smoke.test.js`

**Interfaces:**
- Consumes: `supermarketRenewalStatus`, `combinationStats`
- Produces: pannello `#supermarket-renewal-board`, `#combination-stats`, `#combination-trend-chart`.

- [ ] Aggiungere smoke test per login Supabase, cataloghi, ordinamento data e nuovi pannelli.
- [ ] Verificare il RED.
- [ ] Sostituire la sezione gestione locale obsoleta con UI cloud coerente.
- [ ] Rendere il rinnovo centrato sul supermercato e mostrare lo stato di tutti i supermercati.
- [ ] Renderizzare statistiche e grafico combinazione alla selezione dei due cataloghi.
- [ ] Collegare gli event listener ai due select e al prefill per supermercato.
- [ ] Verificare il GREEN.

### Task 4: Pacchetto e documentazione

**Files:**
- Modify: `README.md`
- Modify: `TODO-LIVE.md`
- Generate: `CDP_2026_Gestionale.html`
- Generate: ZIP finale

- [ ] Aggiornare README con la nuova logica di rinnovo.
- [ ] Aggiornare TODO live senza cambiare architettura Supabase/GitHub Pages.
- [ ] Rigenerare la versione single-file.
- [ ] Eseguire `npm test` e controlli sintattici JS.
- [ ] Verificare che lo ZIP contenga tutti i file e nessuna secret key.
