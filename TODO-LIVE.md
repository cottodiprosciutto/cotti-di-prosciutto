# TODO — Pubblicare CDP con Supabase + GitHub Pages

Questa checklist porta il progetto dalla modalità locale alla versione online. Il frontend resta statico; Supabase gestisce database, autenticazione e permessi.

## 0. Prima di andare online

- [ ] Estrai il progetto e avvialo in locale con `./start.sh`, `start-windows.bat` oppure apri `CDP_2026_Gestionale.html`.
- [ ] Verifica il login locale con **utente `admin`** e **password `Cotto2026!`**.
- [ ] Se vuoi cambiare le credenziali locali, modifica `localAdminUsername` e `localAdminPassword` in `js/config.js`.
- [ ] Verifica che **Analisi combinazioni** sia accessibile senza login.
- [ ] Prova un inserimento locale, un nuovo supermercato e un nuovo prosciutto.
- [ ] Esporta un backup JSON/CSV di prova.

> Le credenziali locali sono nel frontend e quindi sono visibili a chi legge il codice. Sono accettate solo da `file://`, `localhost`, `127.0.0.1` e loopback IPv6. **Non proteggono la versione pubblica**: online la sicurezza deve essere affidata a Supabase Auth + RLS.

## A. Crea il database Supabase

- [ ] Crea un progetto Supabase, ad esempio `cdp-prosciutti`.
- [ ] In `SQL Editor` esegui tutto `supabase/schema.sql`.
- [ ] Esegui `supabase/seed.sql` per importare lo storico.
- [ ] Verifica i conteggi iniziali:

```sql
select count(*) as offerte from public.offers;
select count(*) as supermercati from public.supermarkets;
select count(*) as prosciutti from public.products;
```

Valori attesi prima di nuovi inserimenti:

```text
offerte      781
supermercati 24
prosciutti   49
```

## B. Crea il tuo amministratore Supabase

- [ ] Vai in `Authentication → Users` e crea/invita il tuo utente.
- [ ] Completa la password tramite l'email ricevuta.
- [ ] Copia il tuo `User ID` UUID.
- [ ] Apri `supabase/enable-admin.sql`.
- [ ] Sostituisci `YOUR_USER_UUID` con il tuo UUID ed esegui lo script nel SQL Editor.
- [ ] Disabilita le registrazioni pubbliche (`Allow new users to sign up`).
- [ ] Non abilitare anonymous sign-ins.

## C. Collega il frontend a Supabase

- [ ] Recupera **Project URL** e **Publishable Key** (`sb_publishable_...`).
- [ ] Non usare mai `service_role`, secret key o altre chiavi privilegiate nel frontend.
- [ ] Modifica `js/config.js`:

```javascript
window.CDP_CONFIG = {
  supabaseUrl: 'https://IL_TUO_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'sb_publishable_...',
  localAdminUsername: 'admin',
  localAdminPassword: 'Cotto2026!'
};
```

- [ ] Avvia il sito in locale e controlla che in alto compaia `Supabase online · aggiornamento realtime`.
- [ ] Accedi usando **email/password Supabase**, non le credenziali locali.

## D. Test funzionali prima della pubblicazione

- [ ] Senza login: Dashboard, Statistiche live, Analisi combinazioni, Prodotti, Supermercati e Dati devono essere consultabili.
- [ ] Senza login: inserimento, eliminazione e gestione cataloghi non devono essere disponibili.
- [ ] Con login admin: aggiungi un supermercato di prova.
- [ ] Con login admin: aggiungi un prosciutto di prova.
- [ ] Con login admin: aggiungi un'offerta e verifica l'aggiornamento immediato delle statistiche.
- [ ] Verifica `Supermercati da rinnovare`: una nuova offerta per lo stesso supermercato deve marcarlo **Rinnovato anche se il prosciutto cambia**.
- [ ] Verifica lo stato **Scade oggi**.
- [ ] Apri **Analisi combinazioni** senza login e verifica Supermercato × Prosciutto, storico prezzi, media/min/max, frequenza media, mese/trimestre/anno e ultime rilevazioni.
- [ ] In `Tutti i dati` prova i quattro ordinamenti per Data offerta/Data scadenza.
- [ ] Elimina l'offerta di prova.

## E. Pubblica il codice su GitHub

- [ ] Crea un repository, ad esempio `cdp-prosciutti`.
- [ ] Non aggiungere collaboratori con permessi di scrittura se vuoi essere l'unico a modificare il codice.
- [ ] Dalla cartella del progetto:

```bash
git init
git add .
git commit -m "Initial CDP manager"
git branch -M main
git remote add origin git@github.com:TUO_USERNAME/cdp-prosciutti.git
git push -u origin main
```

- [ ] Controlla il repository: è normale che **Project URL, Publishable Key e credenziali locali** siano visibili nel frontend.
- [ ] Controlla invece che **NON** compaiano password Supabase, service-role key, `sb_secret_...` o segreti del database.

## F. Attiva GitHub Pages

- [ ] Vai in `Settings → Pages`.
- [ ] Scegli `Deploy from a branch`.
- [ ] Branch: `main`.
- [ ] Cartella: `/(root)`.
- [ ] Salva e attendi il deploy.
- [ ] Annota l'URL, ad esempio:

```text
https://TUO_USERNAME.github.io/cdp-prosciutti/
```

## G. Configura gli URL Auth di Supabase

- [ ] In Supabase vai in `Authentication → URL Configuration`.
- [ ] Imposta il `Site URL` con l'URL GitHub Pages esatto.
- [ ] Aggiungi lo stesso URL alle `Redirect URLs`.
- [ ] Mantieni lo slash finale e l'eventuale sottocartella del repository.

## H. Verifica la sicurezza online

- [ ] Apri GitHub Pages in incognito: il sito deve essere in sola consultazione.
- [ ] Verifica che le credenziali locali `admin / Cotto2026!` **non** abilitino l'admin su GitHub Pages.
- [ ] Accedi con il tuo account Supabase: la gestione deve attivarsi.
- [ ] Prova una INSERT/DELETE senza sessione: Supabase deve rifiutarla tramite RLS.
- [ ] Controlla che il tuo UUID sia l'unico presente in `public.admin_users` se vuoi essere l'unico amministratore.

## I. Verifica Realtime

- [ ] Apri il sito in due schede o browser.
- [ ] Accedi come admin in una sola scheda.
- [ ] Inserisci un'offerta.
- [ ] Verifica che l'altra scheda aggiorni dataset e statistiche senza refresh manuale.

## L. Backup e manutenzione

- [ ] Fai periodicamente `Esporta JSON` e/o `Esporta CSV`.
- [ ] Prima di ogni aggiornamento esegui:

```bash
npm test
```

- [ ] Poi pubblica le modifiche:

```bash
git add .
git commit -m "Update CDP"
git push
```

## Checklist finale rapida

- [ ] 781 offerte storiche importate
- [ ] 24 supermercati iniziali
- [ ] 49 prosciutti iniziali
- [ ] tuo UUID in `public.admin_users`
- [ ] signup pubblico disabilitato
- [ ] Project URL + Publishable Key configurati
- [ ] nessuna chiave Supabase privilegiata nel repository
- [ ] GitHub Pages attivo
- [ ] URL Auth Supabase configurati
- [ ] lettura pubblica funzionante
- [ ] Analisi combinazioni pubblica funzionante
- [ ] modifica online possibile solo con il tuo login Supabase
- [ ] credenziali locali non valide su GitHub Pages
- [ ] rinnovo calcolato per supermercato indipendentemente dal prosciutto
- [ ] statistiche Mese/Trimestre/Anno verificate
- [ ] ordinamento date verificato
- [ ] Realtime verificato
- [ ] backup JSON/CSV verificato
