# CDP — Gestionale offerte prosciutto cotto

Dashboard e gestionale statico per sostituire il foglio Excel CDP. Il progetto può funzionare in due modalità.

## 1. Modalità locale senza Supabase

Apri `CDP_2026_Gestionale.html` direttamente nel browser oppure avvia `start.sh` / `start-windows.bat`.

Credenziali locali predefinite:

- **Utente:** `admin`
- **Password:** `Cotto2026!`

Le credenziali si modificano in `js/config.js`, proprietà `localAdminUsername` e `localAdminPassword`.

La modalità admin locale è abilitata esclusivamente quando il sito viene aperto tramite `file://`, `localhost`, `127.0.0.1` o loopback IPv6. Su GitHub Pages queste credenziali non abilitano la gestione.

Le nuove offerte, i nuovi supermercati e i nuovi prosciutti vengono salvati nel `localStorage` del browser. Per questo conviene eseguire periodicamente **Esporta JSON** e/o **Esporta CSV**.

> Le credenziali locali sono incorporate nel frontend e quindi non sono una misura di sicurezza reale. Servono solo a separare la consultazione dalla gestione sul proprio PC. Per la versione online usa Supabase Auth + RLS.

## 2. Modalità online con Supabase

Compila `js/config.js` con `supabaseUrl` e `supabasePublishableKey`. Quando Supabase è configurato e raggiungibile, il gestionale usa automaticamente il database cloud e il login Supabase.

Gli script SQL sono nella cartella `supabase/`:

- `schema.sql`
- `seed.sql`
- `enable-admin.sql`

Segui `TODO-LIVE.md` per la pubblicazione su GitHub Pages.

## Sezioni principali

- Dashboard
- Nuova offerta e stato rinnovo per supermercato
- Statistiche live per mese, trimestre e anno
- **Analisi combinazioni pubblica** Supermercato × Prosciutto
- Andamento Top 10 prodotti
- Prodotti
- Supermercati
- Tutti i dati con ordinamento per data

## Test

```bash
npm test
```
