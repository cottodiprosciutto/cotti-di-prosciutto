# CDP 2026 dashboard — Design

## Obiettivo

Creare una dashboard statica a pagina singola per visualizzare i dati del file `CDP 2026(1).xlsx` e le elaborazioni del report `CDP_2026_Panoramica_Statistica.xlsx`, senza backend o database.

## Architettura

Il sito usa HTML/CSS/JavaScript vanilla. I 781 record validi sono esportati in un file JavaScript statico (`data/cdp-data.js`) per consentire l'apertura anche tramite `file://` senza problemi CORS. Le statistiche vengono calcolate nel browser con funzioni pure in `js/analytics.js`; i grafici sono SVG generati da `js/charts.js` e non richiedono dipendenze esterne.

## Sezioni

- Dashboard: KPI, statistiche richieste, Top 10 e commenti.
- Andamento Top 10: un grafico mensile per ciascuno dei 10 prodotti più frequenti.
- Prodotti: statistiche del singolo prodotto e Top 5 supermercati con rank denso e pari merito.
- Supermercati: statistiche della singola insegna e Top 5 prodotti con rank denso e pari merito.
- Tempo: analisi mensile, trimestrale e per tipologia.
- Dati: tabella completa con ricerca, filtri e paginazione.

## Regole dati

- Ogni riga valida è una presenza/offerta.
- Gli andamenti temporali usano il mese della Data di scadenza.
- I Top 5 usano rank denso e includono tutte le righe con rank da 1 a 5, anche se i pari merito portano il totale oltre cinque elementi.
- I dati sono read-only e statici.

## UX

Layout responsive con sidebar, card KPI, tabelle scorrevoli, grafici SVG e filtri. Il sito deve funzionare sia servito da HTTP sia aperto direttamente da disco.
