# CDP Offer Manager — Design

## Obiettivo

Evolvere la dashboard statica CDP 2026 in un gestionale locale che sostituisca il foglio Excel per l'inserimento quotidiano delle offerte, mantenendo tutte le analisi esistenti e aggiornandole immediatamente dopo ogni modifica dei dati.

## Persistenza e portabilità

- Nessun backend e nessun database server.
- Le nuove offerte vengono salvate nel browser tramite IndexedDB.
- I 781 record storici restano inclusi nel sito come dataset base e non vengono duplicati in IndexedDB.
- IndexedDB conserva solo le offerte inserite dall'utente.
- È disponibile un backup JSON delle offerte personali da esportare e importare su un altro PC.
- È disponibile anche l'esportazione CSV del dataset completo corrente per interoperabilità.
- Le offerte inserite manualmente possono essere eliminate; i record storici sono di sola lettura.

## Regola temporale

- Per ogni record storico la Data offerta viene derivata come `Data scadenza - 10 giorni`.
- Per ogni nuova offerta la Data offerta è automaticamente la data locale del giorno in cui viene salvata.
- Le statistiche mensili, trimestrali e annuali usano sempre la Data offerta, non la Data scadenza.
- Ogni record normalizzato espone `offerDate`, `month`, `quarter` e `year` derivati dalla Data offerta.

## Inserimento nuova offerta

Campi:
- Supermercato: obbligatorio, con suggerimenti dai supermercati esistenti ma possibilità di inserirne uno nuovo.
- Prodotto: obbligatorio, con suggerimenti dai prodotti esistenti ma possibilità di inserirne uno nuovo.
- Tipologia: obbligatoria, con suggerimenti dalle tipologie esistenti ma possibilità di inserirne una nuova.
- Prezzo: obbligatorio, maggiore di zero.
- Data scadenza: obbligatoria e non antecedente alla Data offerta.
- Data offerta: visualizzata nel form ma compilata automaticamente alla data corrente.

Dopo il salvataggio:
- il record viene scritto in IndexedDB;
- il dataset in memoria viene ricostruito;
- dashboard, Top 10, classifiche prodotto/supermercato, statistiche temporali, filtri e tabelle vengono ricalcolati immediatamente senza ricaricare la pagina.

## Sezioni

### Dashboard
Mantiene i KPI e le statistiche già presenti, ma tutti i calcoli temporali usano la Data offerta. Evidenzia anche il numero di offerte aggiunte dall'utente.

### Nuova offerta
Form di inserimento, ultime offerte personali e azioni di eliminazione. Include comandi per backup JSON, import JSON, export CSV e reset delle sole offerte personali.

### Statistiche live
Nuova area con selettore Mese / Trimestre / Anno e selettore del periodo disponibile.
Per il periodo selezionato mostra:
- numero offerte;
- prodotti distinti;
- supermercati distinti;
- prezzo medio;
- minimo e massimo;
- variazione del numero offerte rispetto al periodo precedente;
- variazione del prezzo medio rispetto al periodo precedente;
- Top 5 prodotti con rank denso e pari merito;
- Top 5 supermercati per frequenza con rank denso e pari merito;
- andamento interno al periodo: giornaliero per mese, mensile per trimestre, mensile per anno;
- distribuzione per tipologia.

### Top 10, Prodotti e Supermercati
Mantengono le analisi già realizzate e si aggiornano sul dataset corrente.

### Dati
Tabella completa con Data offerta, Data scadenza, origine (Storico/Inserita), filtri e paginazione.

## Stile grafico

Tema "prosciutto cotto style" sobrio e moderno:
- fondo crema caldo;
- bordeaux e rosso cotto come colori principali;
- rosa salume come accento;
- card bianche/avorio con bordi rosati;
- marchio CSS con fette ellittiche sovrapposte;
- pattern molto leggero di fette nel background;
- grafici coerenti con la palette;
- layout responsive e leggibile anche su schermi piccoli.

## Architettura

- `data/cdp-data.js`: dataset storico immutabile.
- `js/data-model.js`: normalizzazione date, creazione offerte manuali, serializzazione backup.
- `js/storage.js`: accesso IndexedDB.
- `js/analytics.js`: aggregazioni e statistiche pure.
- `js/charts.js`: grafici SVG locali.
- `js/app.js`: stato UI, rendering, eventi e orchestrazione degli aggiornamenti.
- `assets/styles.css`: tema visuale e responsive.

## Errori e sicurezza dati

- Errori di validazione vengono mostrati accanto al form senza perdere i valori inseriti.
- Se IndexedDB non è disponibile, l'app segnala chiaramente che la persistenza locale non può funzionare.
- Import backup rifiuta file non validi o versioni non riconosciute.
- Reset e cancellazione richiedono conferma browser.
- Nessun dato viene inviato in rete.

## Verifica

- Test Node sulle funzioni pure di data model e analytics.
- Test della derivazione Data offerta = scadenza - 10 giorni.
- Test di aggregazione per mese, trimestre e anno.
- Test dei pari merito.
- Test del backup/import.
- Smoke check dell'HTML per verificare la presenza delle sezioni e degli script necessari.
