# Supabase — CDP

## Nuova installazione

Ordine:

1. `schema.sql`
2. `seed.sql`
3. crea l'utente in Authentication
4. copia l'UUID
5. modifica/esegui `enable-admin.sql`

## Progetto già online: upgrade Taglio + Vaschetta

Non rieseguire schema/seed sul database esistente. Segui `../AGGIORNAMENTO_V2_TAGLIO_VASCHETTA.md`.

Ordine sintetico:

1. `preflight-v1.sql`
2. `upgrade-2026-08-12.sql`
3. crea bucket `brand-logos` e `product-images`
4. `storage-policies.sql`
5. pubblica e verifica il frontend v2
6. `import-vaschetta-2026.sql`
7. `verify-v2.sql`

Lo schema rende pubblica la lettura di supermercati, marchi, prodotti, varianti e offerte. INSERT/UPDATE/DELETE sono consentiti agli utenti autenticati soltanto quando `public.is_admin()` restituisce `true`.

`admin_users` non è leggibile dal frontend.
