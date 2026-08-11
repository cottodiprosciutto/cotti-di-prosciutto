# CDP Cloud Manager — Design

## Obiettivo
Trasformare il gestionale locale CDP in una web app statica pubblicabile su GitHub Pages, con Supabase come archivio centralizzato e autenticazione. Tutti possono consultare dashboard e statistiche; solo l'utente amministratore può creare, modificare o eliminare offerte, supermercati e prosciutti.

## Architettura
- GitHub Pages ospita HTML/CSS/JavaScript statici.
- Supabase fornisce PostgreSQL, Auth, Data API e Realtime.
- Il browser usa esclusivamente Project URL + Publishable Key; nessuna service/secret key viene inclusa nel frontend.
- RLS consente SELECT pubblico e mutazioni solo all'amministratore registrato nella tabella `admin_users`.
- Se Supabase non è configurato, il sito entra in modalità demo read-only usando i 781 dati storici incorporati.

## Modello dati
- `supermarkets(id, name, created_at)` catalogo insegne.
- `products(id, name, default_type, created_at)` catalogo prosciutti.
- `offers(id, supermarket_id, product_id, type, price, offer_date, expiry_date, source, created_at, updated_at)` rilevazioni/offerte.
- `admin_users(user_id, created_at)` allowlist degli account autorizzati alla gestione.
- `is_admin()` funzione SQL `security definer` utilizzata dalle policy RLS.

## Dati storici
I 781 record originali vengono forniti in `supabase/seed.sql`. Per ciascun record storico `offer_date = expiry_date - 10 giorni`. Il frontend mantiene anche il dataset incorporato come fallback demo.

## Area gestione
- Login email/password Supabase.
- Form nuova offerta: supermercato, prosciutto, tipologia, prezzo, data offerta automatica = data odierna, scadenza.
- Pulsanti dedicati per aggiungere un nuovo supermercato e un nuovo prosciutto al catalogo.
- Possibilità di eliminare le offerte create nel database.
- Aggiornamento immediato delle statistiche dopo ogni mutazione e tramite subscription Realtime.

## Offerte da rinnovare
Nella sezione Nuova offerta compare una coda operativa. Per ogni coppia supermercato + prosciutto viene considerata solo la rilevazione con scadenza più recente. Se tale scadenza è uguale alla data odierna viene marcata `Scade oggi`; se è precedente viene marcata `Scaduta`. Un pulsante `Riaggiungi` precompila supermercato, prosciutto e tipologia nel form.

## Archivio
La sezione Tutti i dati mantiene filtri e paginazione e aggiunge ordinamento per:
- Data offerta: più recente / meno recente
- Data scadenza: più recente / meno recente

## Statistiche
Restano disponibili dashboard, Top 10, analisi per prodotto/supermercato e statistiche live per mese, trimestre e anno. Tutte usano `offer_date`.

## Portabilità e backup
Il sito espone export CSV e JSON dell'intero dataset remoto. Il database centralizzato sostituisce IndexedDB come fonte primaria.

## Distribuzione
La cartella è pronta per GitHub Pages, usa path relativi e include `.nojekyll`, `README.md` e `TODO-LIVE.md` con la checklist Supabase/GitHub.
