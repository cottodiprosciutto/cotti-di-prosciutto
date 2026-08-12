# Aggiornamento CDP v2 — Taglio + Vaschetta

Questa guida serve per aggiornare **il progetto Supabase/GitHub Pages già online** senza cancellare lo storico al taglio.

## Risultato dell'aggiornamento

- scelta iniziale **Al taglio / In vaschetta**;
- switch permanente tra le due modalità;
- stesso gestionale, stesse sezioni e stessa filosofia;
- 21 prodotti vaschetta e 108 offerte importate da `CDPV 2026(2).xlsx`;
- 27 varianti di grammatura;
- prezzo confezione e prezzo equivalente €/kg per la vaschetta;
- catalogo `brands` con logo;
- immagine del prodotto;
- Storage Supabase per `brand-logos` e `product-images`;
- statistiche mese/trimestre/anno generate automaticamente, senza anni o quarter hardcoded;
- rinnovi separati per `supermercato + modalità`;
- compatibilità con la modalità locale.

---

## Regola fondamentale sul rollout

**Non eseguire `import-vaschetta-2026.sql` prima di aver pubblicato il frontend v2.**

La sequenza sicura è:

1. backup;
2. fotografia dei conteggi v1;
3. upgrade dello schema Supabase;
4. creazione Storage;
5. deploy frontend v2, con tutti i filtri per `mode`;
6. verifica del Taglio online;
7. solo a questo punto import delle 108 offerte Vaschetta;
8. verifica finale.

Lo schema v2 è additivo e assegna `mode='taglio'` ai prodotti esistenti. Prima dell'import vaschetta, quindi, il dataset rimane quello già online.

---

# FASE 1 — Backup e fotografia del database attuale

## 1.1 Backup

Prima di modificare Supabase, crea un backup del progetto. Se usi Supabase CLI puoi conservare almeno schema e dati:

```bash
supabase login
supabase link --project-ref IL_TUO_PROJECT_REF
supabase db dump --linked -f backup-schema-2026-08-12.sql
supabase db dump --linked --data-only -f backup-data-2026-08-12.sql
```

Se gestisci il progetto solo dal Dashboard, verifica comunque che sia disponibile un backup/ripristino adeguato al tuo piano prima di proseguire.

## 1.2 Pre-flight

Nel **Supabase Dashboard → SQL Editor**, esegui:

```text
supabase/preflight-v1.sql
```

Salva il risultato dei conteggi, in particolare:

- offerte al momento dell'upgrade;
- prodotti;
- supermercati;
- amministratori.

Non usare `781` come unico riferimento se nel frattempo hai aggiunto offerte manuali online: il numero corretto è quello che ottieni ora dal tuo database di produzione.

---

# FASE 2 — Aggiornamento schema Supabase esistente

## 2.1 Esegui solo lo script di upgrade

Per il database già online **NON eseguire `schema.sql` e `seed.sql`**.

Esegui invece nel SQL Editor:

```text
supabase/upgrade-2026-08-12.sql
```

Lo script:

- crea `brands`;
- aggiunge `products.mode`;
- imposta tutti i prodotti già presenti a `taglio`;
- aggiunge `products.brand_id`;
- aggiunge `products.image_path`;
- crea `product_variants`;
- aggiunge `offers.variant_id`;
- permette `offers.type = NULL` per le vaschette;
- mantiene il vincolo variante → stesso prodotto;
- crea gli indici necessari;
- abilita RLS sulle nuove tabelle;
- applica le stesse regole admin già usate dal progetto (`public.is_admin()`);
- collega dove possibile i vecchi prodotti al taglio ai marchi normalizzati;
- abilita Realtime per i nuovi cataloghi.

## 2.2 Verifica immediata prima del frontend

Esegui:

```sql
select mode, count(*)
from public.products
group by mode;
```

In questa fase deve comparire **solo `taglio`**.

Controlla inoltre che il totale offerte sia identico al valore salvato nel pre-flight:

```sql
select count(*) from public.offers;
```

Se è diverso, fermati prima di proseguire.

---

# FASE 3 — Supabase Storage per loghi e foto prodotto

## 3.1 Crea i bucket

Nel Dashboard vai in **Storage** e crea due bucket:

### Bucket 1

```text
brand-logos
```

### Bucket 2

```text
product-images
```

Per entrambi usa:

- bucket pubblico: **Sì**;
- file size limit: **3 MB**;
- MIME consentiti:
  - `image/jpeg`
  - `image/png`
  - `image/webp`

Il bucket pubblico serve alla visualizzazione delle immagini sul sito. Le scritture restano protette dalle policy.

## 3.2 Policy Storage

Dopo aver creato entrambi i bucket, esegui nel SQL Editor:

```text
supabase/storage-policies.sql
```

Le policy permettono upload/update/delete solo agli utenti autenticati che soddisfano `public.is_admin()`.

---

# FASE 4 — Aggiorna il repository GitHub con il frontend v2

## 4.1 Preserva la configurazione reale

Il pacchetto distribuito mantiene `js/config.js` con placeholder. Nel tuo repository online **mantieni i valori reali che già usi**:

```javascript
window.CDP_CONFIG = {
  supabaseUrl: 'https://IL_TUO_PROJECT.supabase.co',
  supabasePublishableKey: 'LA_TUA_PUBLISHABLE_KEY',
  localAdminUsername: 'admin',
  localAdminPassword: 'LA_TUA_PASSWORD_LOCALE'
};
```

Non mettere mai nel frontend `service_role`, `sb_secret_...`, password database o altri segreti privilegiati.

## 4.2 File principali modificati/aggiunti

Sostituisci nel repository la versione attuale con quella contenuta nel pacchetto v2. Le parti principali sono:

```text
index.html
assets/styles.css
js/app.js
js/analytics.js
js/data-model.js
js/local-store.js
js/supabase-store.js
js/mode-controller.js
scripts/build-standalone.js
CDP_2026_Gestionale.html
supabase/*
tests/*
package.json
```

Non devi duplicare il sito in due cartelle: il filtro `mode` governa la stessa SPA.

## 4.3 Test locale

Dalla root:

```bash
npm test
```

Per rigenerare anche la versione HTML standalone e rieseguire l'intera suite:

```bash
npm run build
```

## 4.4 Verifica prima del push

Apri il sito localmente e controlla:

- all'avvio compare la scelta Taglio/Vaschetta;
- `Al taglio` mostra lo storico esistente;
- passando a `In vaschetta`, prima dell'import, l'interfaccia mostra stati vuoti e non dati del Taglio;
- tornando a Taglio i conteggi sono invariati;
- l'area admin continua a richiedere Supabase Auth online;
- le credenziali locali funzionano solo su `file://`/localhost come prima.

## 4.5 Push su GitHub Pages

Nel repository già collegato:

```bash
git add .
git commit -m "feat: add taglio and vaschetta management"
git push
```

Non devi ricreare GitHub Pages: se è già configurato sulla branch/cartella attuale, il push aggiorna il sito secondo il meccanismo di deploy che stai già usando.

---

# FASE 5 — Controllo del Taglio ONLINE prima dell'import Vaschetta

Apri GitHub Pages anche in incognito e verifica:

1. Dashboard Taglio;
2. Prodotti Taglio;
3. Supermercati Taglio;
4. Statistiche live Taglio;
5. Analisi combinazioni;
6. Tutti i dati;
7. rinnovi per supermercato;
8. login Supabase admin;
9. inserimento/eliminazione di una singola offerta di prova, se vuoi fare un test CRUD completo.

Il numero di offerte al taglio deve coincidere con quello salvato nella fase pre-flight, salvo l'eventuale record di prova che hai creato intenzionalmente.

**Non procedere all'import vaschetta se il Taglio non è corretto.**

---

# FASE 6 — Import dei dati CDPV 2026 in vaschetta

Quando il frontend v2 è già online ed è verificato, esegui nel SQL Editor:

```text
supabase/import-vaschetta-2026.sql
```

Lo script è idempotente e contiene i dati estratti dal foglio `Cotti` del file `CDPV 2026(2).xlsx`.

Importa/riusa:

- **22 supermercati** coinvolti;
- **13 marchi normalizzati**;
- **21 prodotti vaschetta**;
- **27 varianti prodotto/grammatura**;
- **108 offerte**.

Per le righe future rispetto al 12 agosto 2026 è stata applicata la regola approvata:

```text
data_offerta = min(data_scadenza - 10 giorni, 12/08/2026)
```

Le nuove offerte inserite dal sito, invece, usano la data effettiva di inserimento.

---

# FASE 7 — Verifica SQL completa

Esegui:

```text
supabase/verify-v2.sql
```

I controlli specifici Vaschetta devono dare:

```text
prodotti vaschetta                21
varianti vaschetta                27
offerte vaschetta                108
offerte vaschetta senza variante   0
prodotti senza mode                0
mismatch variante/prodotto         0
source_key vaschetta              108
prodotti vaschetta senza marchio   0
```

Per il Taglio confronta il totale con il valore pre-flight, invece di affidarti a un numero storico fisso.

---

# FASE 8 — Test funzionali Vaschetta

Sul sito online seleziona **In vaschetta** e verifica:

- Dashboard con soli dati vaschetta;
- 21 prodotti;
- grammature corrette;
- prezzo confezione;
- equivalente €/kg;
- statistiche che confrontano i prodotti usando €/kg;
- storico combinazione supermercato + prodotto;
- nuova offerta con grammatura obbligatoria;
- rinnovi calcolati per supermercato e modalità;
- Taglio e Vaschetta non si influenzano a vicenda.

Esempio di controllo prezzo:

```text
1,59 € / 110 g = 14,45 €/kg circa
```

---

# FASE 9 — Loghi e immagini

Dopo aver effettuato il login admin:

1. vai nella gestione cataloghi;
2. crea/usa il marchio;
3. carica il logo;
4. associa il marchio ai prodotti;
5. carica l'immagine del prodotto/prosciutto/vaschetta.

Il database salva solo il **path Storage**, non l'URL completo. Il frontend ricava l'URL pubblico dal bucket.

Sono accettati:

- JPEG;
- PNG;
- WebP;
- massimo 3 MB.

I prodotti privi di immagine continuano a funzionare e mostrano un placeholder.

---

# FASE 10 — Verifica mesi, quarter e anni automatici

La v2 non usa array hardcoded di mesi, quarter o anni.

La funzione delle statistiche genera i periodi dalla prima data disponibile fino al più recente tra:

- data corrente;
- ultima data offerta disponibile.

Di conseguenza:

- a gennaio 2027 comparirà automaticamente `2027`, `Q1 2027`, `Gennaio 2027`;
- ad aprile comparirà `Q2`;
- a luglio `Q3`;
- a ottobre `Q4`;
- lo stesso meccanismo continua nel 2028 e negli anni successivi.

La suite automatica include un test che attraversa più anni proprio per evitare regressioni su questo comportamento.

---

# Rollback / emergenza

## Prima dell'import vaschetta

Fino alla Fase 5 il rollback frontend è semplice: puoi ripristinare la versione precedente del repository perché non sono ancora presenti offerte vaschetta. Lo schema v2 ha aggiunto colonne/tabelle senza cancellare lo storico.

## Dopo l'import vaschetta

**Non pubblicare nuovamente il vecchio frontend v1 lasciando le offerte vaschetta nel database**, perché la v1 non filtra per `mode` e potrebbe mescolare i dati.

Se serve un vero rollback post-import, usa il backup creato all'inizio oppure rimuovi prima i dati vaschetta con una procedura controllata e verificata. Il backup resta la strada più sicura.

---

# Checklist finale

- [ ] backup creato
- [ ] `preflight-v1.sql` salvato
- [ ] `upgrade-2026-08-12.sql` eseguito
- [ ] tutti i vecchi prodotti risultano `taglio`
- [ ] totale offerte Taglio invariato
- [ ] bucket `brand-logos` creato
- [ ] bucket `product-images` creato
- [ ] `storage-policies.sql` eseguito
- [ ] `js/config.js` mantiene URL + publishable key reali
- [ ] `npm run build` passa
- [ ] frontend v2 pubblicato
- [ ] Taglio online verificato PRIMA dell'import
- [ ] `import-vaschetta-2026.sql` eseguito
- [ ] `verify-v2.sql` restituisce 21 / 27 / 108 / 0 errori
- [ ] Vaschetta online verificata
- [ ] upload logo admin verificato
- [ ] upload immagine prodotto verificato
- [ ] statistiche mese/quarter/anno verificate
- [ ] rinnovi Taglio/Vaschetta indipendenti
- [ ] prova in incognito completata
