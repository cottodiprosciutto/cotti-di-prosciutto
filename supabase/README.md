# Supabase setup

Ordine di esecuzione:

1. `schema.sql`
2. `seed.sql`
3. crea il tuo utente in Authentication
4. copia l'UUID dell'utente
5. modifica ed esegui `enable-admin.sql`

Lo schema rende pubblica solo la lettura di `supermarkets`, `products` e `offers`.
INSERT/UPDATE/DELETE sono consentiti agli utenti autenticati soltanto quando `public.is_admin()` restituisce `true`.

`admin_users` non è leggibile dal frontend.

Per maggiori dettagli usa `../TODO-LIVE.md`.
