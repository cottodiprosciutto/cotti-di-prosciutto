-- CDP v1 -> v2: fotografia PRE-MIGRAZIONE.
-- Eseguire nel SQL Editor Supabase PRIMA di upgrade-2026-08-12.sql.
-- Copiare i risultati: serviranno per verificare che i dati al taglio non siano cambiati.

select 'offers' as entity, count(*)::bigint as total from public.offers
union all
select 'products', count(*)::bigint from public.products
union all
select 'supermarkets', count(*)::bigint from public.supermarkets
union all
select 'admin_users', count(*)::bigint from public.admin_users
order by entity;

select
  min(offer_date) as first_offer_date,
  max(offer_date) as last_offer_date,
  min(expiry_date) as first_expiry_date,
  max(expiry_date) as last_expiry_date
from public.offers;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('supermarkets', 'products', 'offers', 'admin_users')
order by tablename, policyname;
