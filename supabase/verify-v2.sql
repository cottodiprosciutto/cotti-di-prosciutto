-- CDP v2: verifiche DOPO upgrade + deploy frontend + import vaschetta.

-- 1. Distribuzione prodotti per modalità.
select mode, count(*) as products
from public.products
group by mode
order by mode;

-- 2. Distribuzione offerte per modalità.
select p.mode, count(*) as offers
from public.offers o
join public.products p on p.id = o.product_id
group by p.mode
order by p.mode;

-- 3. Valori attesi dal file CDPV 2026(2).xlsx.
select count(*) as vaschetta_products
from public.products
where mode = 'vaschetta';
-- Atteso: 21

select count(*) as vaschetta_variants
from public.product_variants v
join public.products p on p.id = v.product_id
where p.mode = 'vaschetta';
-- Atteso: 27

select count(*) as vaschetta_offers
from public.offers o
join public.products p on p.id = o.product_id
where p.mode = 'vaschetta';
-- Atteso: 108

select count(*) as vaschetta_offers_without_variant
from public.offers o
join public.products p on p.id = o.product_id
where p.mode = 'vaschetta'
  and o.variant_id is null;
-- Atteso: 0

-- 4. Nessun prodotto senza modalità.
select count(*) as products_without_mode
from public.products
where mode is null;
-- Atteso: 0

-- 5. Le offerte vaschetta devono puntare a una variante dello stesso prodotto.
select count(*) as variant_product_mismatches
from public.offers o
join public.products p on p.id = o.product_id
left join public.product_variants v on v.id = o.variant_id
where p.mode = 'vaschetta'
  and (v.id is null or v.product_id <> o.product_id);
-- Atteso: 0

-- 6. Conteggio chiavi import Excel. Rende semplice verificare anche riesecuzioni idempotenti.
select count(*) as imported_vaschetta_source_keys
from public.offers
where source_key like 'vaschetta-%';
-- Atteso: 108

-- 7. Copertura marchio: è consentito che qualche vecchio prodotto al taglio non sia mappato,
--    ma i 21 prodotti vaschetta devono avere tutti il marchio.
select count(*) as vaschetta_products_without_brand
from public.products
where mode = 'vaschetta'
  and brand_id is null;
-- Atteso: 0
