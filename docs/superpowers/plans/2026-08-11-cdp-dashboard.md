# CDP 2026 Dashboard Implementation Plan

> **For agentic workers:** implementare le attività in ordine e verificare ogni deliverable prima di passare al successivo.

**Goal:** realizzare una dashboard statica e offline-friendly per i dati CDP 2026.

**Architecture:** dati serializzati in un file JavaScript locale; analytics pure in JavaScript; rendering UI e grafici SVG senza dipendenze esterne.

**Tech Stack:** HTML5, CSS3, JavaScript ES2019+, SVG, Node.js built-in test runner.

## Global Constraints

- Nessun backend o database.
- Nessuna dipendenza runtime esterna.
- Apertura diretta di `index.html` supportata.
- Rank denso con pari merito nei Top 5.
- Grafici temporali basati sulla Data di scadenza.

### Task 1: Dati statici e analytics
- Creare `data/cdp-data.js` con i 781 record validi.
- Creare `js/analytics.js` con aggregazioni, statistiche e ranking denso.
- Verificare record, medie e ranking con `tests/analytics.test.js`.

### Task 2: Shell e stile responsive
- Creare `index.html` con le sei sezioni previste.
- Creare `assets/styles.css` con sidebar, KPI, panel, tabelle e breakpoint responsive.

### Task 3: Grafici SVG
- Creare `js/charts.js` per linee e barre orizzontali.
- Gestire stato vuoto e tooltip nativi SVG.

### Task 4: Rendering applicativo
- Creare `js/app.js` per dashboard, Top 10, prodotti, supermercati, tempo e dati filtrabili.
- Collegare selettori, filtri e paginazione.

### Task 5: Verifica e documentazione
- Eseguire `node --test tests/analytics.test.js`.
- Verificare l'avvio via HTTP e l'assenza di errori JavaScript.
- Documentare avvio e struttura in `README.md`.
