-- Import idempotente CDPV 2026(2).xlsx: 108 offerte in vaschetta.
-- Eseguire DOPO upgrade-2026-08-12.sql e dopo il deploy del frontend che filtra per modalità.
begin;

-- Riusa i supermercati esistenti e crea soltanto eventuali insegne mancanti.
insert into public.supermarkets(name) values
  ('Conad'),
  ('Conad City'),
  ('Conad Superstore'),
  ('Coop'),
  ('Crai'),
  ('Deco'),
  ('Deco Gourmet'),
  ('Deco Superstore'),
  ('Despar'),
  ('Eurospar'),
  ('Famila'),
  ('Il Centesimo'),
  ('InCoop'),
  ('Interspar'),
  ('IperCoop'),
  ('Max'),
  ('PaghiPoco'),
  ('Sisa'),
  ('Spazio Conad'),
  ('SuperConveniente'),
  ('Superstore Coop'),
  ('Tocal')
on conflict (name) do nothing;

insert into public.brands(name) values
  ('Aia'),
  ('Beretta'),
  ('Citterio'),
  ('Conad'),
  ('Coop'),
  ('Despar'),
  ('Ferrarini'),
  ('Galbani'),
  ('GranTerre'),
  ('Negroni'),
  ('Parmacotto'),
  ('Rovagnati'),
  ('Villani')
on conflict do nothing;

with catalog(product_name, brand_name) as (
  values
    ('Aia - Aequilibrium', 'Aia'),
    ('Beretta - AltaQualità', 'Beretta'),
    ('Beretta - FrescaSalumeria', 'Beretta'),
    ('Citterio - Sofficette', 'Citterio'),
    ('Citterio - Tagliofresco', 'Citterio'),
    ('Conad - Piacersi', 'Conad'),
    ('Conad - Sapori e Dintorni', 'Conad'),
    ('Coop - Alta Qualità', 'Coop'),
    ('Despar - AQ', 'Despar'),
    ('Galbani - FettaGolosa', 'Galbani'),
    ('GranTerre - GranTenerone', 'GranTerre'),
    ('GranTerre - Liberamente', 'GranTerre'),
    ('Il Ferrarini - Alta Qualità', 'Ferrarini'),
    ('Negroni - Stella', 'Negroni'),
    ('Parmacotto - Accatatevillo', 'Parmacotto'),
    ('Parmacotto - Alta Qualità', 'Parmacotto'),
    ('Rovagnati - AltaQualità', 'Rovagnati'),
    ('Rovagnati - GranBiscotto', 'Rovagnati'),
    ('Rovagnati - I Firmati', 'Rovagnati'),
    ('Rovagnati - Snello', 'Rovagnati'),
    ('Villani - Fiordaliso', 'Villani')

)
insert into public.products(name, default_type, mode, brand_id)
select c.product_name, null, 'vaschetta', b.id
from catalog c join public.brands b on lower(b.name)=lower(c.brand_name)
on conflict (mode, name) do update set brand_id=excluded.brand_id;

with variants(product_name, weight_grams) as (
  values
    ('Aia - Aequilibrium', 100),
    ('Beretta - AltaQualità', 200),
    ('Beretta - FrescaSalumeria', 120),
    ('Beretta - FrescaSalumeria', 240),
    ('Citterio - Sofficette', 200),
    ('Citterio - Tagliofresco', 70),
    ('Citterio - Tagliofresco', 80),
    ('Citterio - Tagliofresco', 100),
    ('Citterio - Tagliofresco', 110),
    ('Conad - Piacersi', 100),
    ('Conad - Sapori e Dintorni', 120),
    ('Coop - Alta Qualità', 150),
    ('Despar - AQ', 120),
    ('Galbani - FettaGolosa', 100),
    ('GranTerre - GranTenerone', 110),
    ('GranTerre - Liberamente', 110),
    ('Il Ferrarini - Alta Qualità', 200),
    ('Negroni - Stella', 110),
    ('Parmacotto - Accatatevillo', 100),
    ('Parmacotto - Alta Qualità', 100),
    ('Rovagnati - AltaQualità', 110),
    ('Rovagnati - GranBiscotto', 120),
    ('Rovagnati - I Firmati', 100),
    ('Rovagnati - I Firmati', 110),
    ('Rovagnati - Snello', 100),
    ('Rovagnati - Snello', 200),
    ('Villani - Fiordaliso', 110)

)
insert into public.product_variants(product_id, weight_grams)
select p.id, v.weight_grams
from variants v join public.products p on p.mode='vaschetta' and p.name=v.product_name
on conflict (product_id, weight_grams) do nothing;

with seed(source_key, supermarket_name, product_name, weight_grams, price, offer_date, expiry_date) as (
  values
    ('vaschetta-2', 'Conad', 'Rovagnati - I Firmati', 100, 2.99, '2026-07-04', '2026-07-14'),
    ('vaschetta-3', 'Conad City', 'Rovagnati - I Firmati', 100, 2.99, '2026-07-04', '2026-07-14'),
    ('vaschetta-4', 'Conad Superstore', 'Rovagnati - I Firmati', 100, 2.99, '2026-07-04', '2026-07-14'),
    ('vaschetta-5', 'SuperConveniente', 'Beretta - FrescaSalumeria', 120, 1.89, '2026-07-05', '2026-07-15'),
    ('vaschetta-6', 'Max', 'Negroni - Stella', 110, 1.99, '2026-07-05', '2026-07-15'),
    ('vaschetta-7', 'Famila', 'Galbani - FettaGolosa', 100, 1.89, '2026-07-05', '2026-07-15'),
    ('vaschetta-8', 'Famila', 'GranTerre - Liberamente', 110, 1.79, '2026-07-05', '2026-07-15'),
    ('vaschetta-9', 'Coop', 'GranTerre - Liberamente', 110, 1.59, '2026-07-09', '2026-07-19'),
    ('vaschetta-10', 'InCoop', 'GranTerre - Liberamente', 110, 1.59, '2026-07-09', '2026-07-19'),
    ('vaschetta-11', 'IperCoop', 'Beretta - AltaQualità', 200, 2.99, '2026-07-09', '2026-07-19'),
    ('vaschetta-12', 'Superstore Coop', 'GranTerre - Liberamente', 110, 1.59, '2026-07-09', '2026-07-19'),
    ('vaschetta-13', 'Eurospar', 'Parmacotto - Accatatevillo', 100, 1.49, '2026-07-09', '2026-07-19'),
    ('vaschetta-14', 'Despar', 'Parmacotto - Accatatevillo', 100, 1.49, '2026-07-09', '2026-07-19'),
    ('vaschetta-15', 'Interspar', 'Parmacotto - Accatatevillo', 100, 1.49, '2026-07-09', '2026-07-19'),
    ('vaschetta-16', 'Deco Gourmet', 'Rovagnati - GranBiscotto', 120, 3.59, '2026-07-10', '2026-07-20'),
    ('vaschetta-17', 'Deco Superstore', 'Rovagnati - Snello', 200, 2.98, '2026-07-10', '2026-07-20'),
    ('vaschetta-18', 'Tocal', 'Galbani - FettaGolosa', 100, 1.99, '2026-07-10', '2026-07-20'),
    ('vaschetta-19', 'Deco', 'Rovagnati - Snello', 200, 2.98, '2026-07-10', '2026-07-20'),
    ('vaschetta-20', 'SuperConveniente', 'Rovagnati - AltaQualità', 110, 1.99, '2026-07-10', '2026-07-20'),
    ('vaschetta-21', 'PaghiPoco', 'Galbani - FettaGolosa', 100, 1.99, '2026-07-10', '2026-07-20'),
    ('vaschetta-22', 'Crai', 'Citterio - Tagliofresco', 70, 1.49, '2026-07-12', '2026-07-22'),
    ('vaschetta-23', 'SuperConveniente', 'Rovagnati - Snello', 100, 1.79, '2026-07-12', '2026-07-22'),
    ('vaschetta-24', 'Spazio Conad', 'Beretta - FrescaSalumeria', 240, 3.89, '2026-07-13', '2026-07-23'),
    ('vaschetta-25', 'Conad', 'Rovagnati - Snello', 200, 3.29, '2026-07-16', '2026-07-26'),
    ('vaschetta-26', 'Conad', 'Aia - Aequilibrium', 100, 1.99, '2026-07-16', '2026-07-26'),
    ('vaschetta-27', 'Conad Superstore', 'Rovagnati - Snello', 200, 3.29, '2026-07-16', '2026-07-26'),
    ('vaschetta-28', 'Conad Superstore', 'Aia - Aequilibrium', 100, 1.99, '2026-07-16', '2026-07-26'),
    ('vaschetta-29', 'Spazio Conad', 'Citterio - Sofficette', 200, 3.65, '2026-07-16', '2026-07-26'),
    ('vaschetta-30', 'Max', 'Galbani - FettaGolosa', 100, 1.99, '2026-07-18', '2026-07-28'),
    ('vaschetta-31', 'Famila', 'GranTerre - Liberamente', 110, 1.50, '2026-07-18', '2026-07-28'),
    ('vaschetta-32', 'Sisa', 'Citterio - Tagliofresco', 80, 1.79, '2026-07-19', '2026-07-29'),
    ('vaschetta-33', 'Il Centesimo', 'Galbani - FettaGolosa', 100, 1.50, '2026-07-20', '2026-07-30'),
    ('vaschetta-34', 'Deco Superstore', 'GranTerre - Liberamente', 110, 1.89, '2026-07-20', '2026-07-30'),
    ('vaschetta-35', 'Superstore Coop', 'Aia - Aequilibrium', 100, 1.69, '2026-07-20', '2026-07-30'),
    ('vaschetta-36', 'Deco', 'Citterio - Tagliofresco', 110, 1.99, '2026-07-20', '2026-07-30'),
    ('vaschetta-37', 'Coop', 'Aia - Aequilibrium', 100, 1.69, '2026-07-20', '2026-07-30'),
    ('vaschetta-38', 'IperCoop', 'Beretta - FrescaSalumeria', 120, 1.99, '2026-07-20', '2026-07-30'),
    ('vaschetta-39', 'Eurospar', 'Despar - AQ', 120, 1.49, '2026-07-20', '2026-07-30'),
    ('vaschetta-40', 'Interspar', 'Despar - AQ', 120, 1.49, '2026-07-20', '2026-07-30'),
    ('vaschetta-41', 'Despar', 'Rovagnati - I Firmati', 110, 1.49, '2026-07-20', '2026-07-30'),
    ('vaschetta-42', 'Despar', 'Despar - AQ', 120, 1.49, '2026-07-20', '2026-07-30'),
    ('vaschetta-43', 'Eurospar', 'Rovagnati - I Firmati', 110, 1.49, '2026-07-20', '2026-07-30'),
    ('vaschetta-44', 'Interspar', 'Rovagnati - I Firmati', 110, 1.49, '2026-07-20', '2026-07-30'),
    ('vaschetta-45', 'Eurospar', 'Aia - Aequilibrium', 100, 1.99, '2026-07-20', '2026-07-30'),
    ('vaschetta-46', 'Interspar', 'Aia - Aequilibrium', 100, 1.99, '2026-07-20', '2026-07-30'),
    ('vaschetta-47', 'Tocal', 'GranTerre - Liberamente', 110, 1.89, '2026-07-20', '2026-07-30'),
    ('vaschetta-48', 'SuperConveniente', 'Parmacotto - Accatatevillo', 100, 1.79, '2026-07-20', '2026-07-30'),
    ('vaschetta-49', 'SuperConveniente', 'Parmacotto - Accatatevillo', 100, 1.89, '2026-07-20', '2026-07-30'),
    ('vaschetta-50', 'Crai', 'Galbani - FettaGolosa', 100, 2.19, '2026-07-26', '2026-08-05'),
    ('vaschetta-51', 'Spazio Conad', 'Negroni - Stella', 110, 2.09, '2026-07-27', '2026-08-06'),
    ('vaschetta-52', 'Spazio Conad', 'Rovagnati - Snello', 100, 1.69, '2026-07-27', '2026-08-06'),
    ('vaschetta-53', 'Max', 'Negroni - Stella', 110, 1.99, '2026-07-27', '2026-08-06'),
    ('vaschetta-54', 'Famila', 'GranTerre - GranTenerone', 110, 1.69, '2026-07-27', '2026-08-06'),
    ('vaschetta-55', 'Conad City', 'Conad - Piacersi', 100, 1.79, '2026-07-30', '2026-08-09'),
    ('vaschetta-56', 'Conad', 'Conad - Sapori e Dintorni', 120, 3.99, '2026-07-30', '2026-08-09'),
    ('vaschetta-57', 'Conad', 'Conad - Piacersi', 100, 1.79, '2026-07-30', '2026-08-09'),
    ('vaschetta-58', 'Conad Superstore', 'Conad - Sapori e Dintorni', 120, 3.99, '2026-07-30', '2026-08-09'),
    ('vaschetta-59', 'Conad Superstore', 'Conad - Piacersi', 100, 1.79, '2026-07-30', '2026-08-09'),
    ('vaschetta-60', 'Despar', 'Rovagnati - Snello', 100, 2.49, '2026-07-30', '2026-08-09'),
    ('vaschetta-61', 'Despar', 'Negroni - Stella', 110, 2.49, '2026-07-30', '2026-08-09'),
    ('vaschetta-62', 'Interspar', 'Rovagnati - Snello', 100, 2.49, '2026-07-30', '2026-08-09'),
    ('vaschetta-63', 'Interspar', 'Negroni - Stella', 110, 2.49, '2026-07-30', '2026-08-09'),
    ('vaschetta-64', 'Eurospar', 'Rovagnati - Snello', 100, 2.49, '2026-07-30', '2026-08-09'),
    ('vaschetta-65', 'Eurospar', 'Negroni - Stella', 110, 2.49, '2026-07-30', '2026-08-09'),
    ('vaschetta-66', 'InCoop', 'Negroni - Stella', 110, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-67', 'PaghiPoco', 'GranTerre - Liberamente', 110, 1.69, '2026-07-31', '2026-08-10'),
    ('vaschetta-68', 'Coop', 'Negroni - Stella', 110, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-69', 'Superstore Coop', 'Negroni - Stella', 110, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-70', 'IperCoop', 'Rovagnati - AltaQualità', 110, 1.49, '2026-07-31', '2026-08-10'),
    ('vaschetta-71', 'Coop', 'Coop - Alta Qualità', 150, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-72', 'Superstore Coop', 'Coop - Alta Qualità', 150, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-73', 'IperCoop', 'Coop - Alta Qualità', 150, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-74', 'Deco Gourmet', 'Parmacotto - Alta Qualità', 100, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-75', 'Deco Superstore', 'Parmacotto - Alta Qualità', 100, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-76', 'Deco', 'Beretta - FrescaSalumeria', 120, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-77', 'Tocal', 'Citterio - Tagliofresco', 80, 1.69, '2026-07-31', '2026-08-10'),
    ('vaschetta-78', 'SuperConveniente', 'Rovagnati - AltaQualità', 110, 1.99, '2026-07-31', '2026-08-10'),
    ('vaschetta-79', 'SuperConveniente', 'GranTerre - Liberamente', 110, 1.89, '2026-07-31', '2026-08-10'),
    ('vaschetta-80', 'Conad', 'Il Ferrarini - Alta Qualità', 200, 3.59, '2026-08-01', '2026-08-11'),
    ('vaschetta-81', 'Conad City', 'Il Ferrarini - Alta Qualità', 200, 3.59, '2026-08-01', '2026-08-11'),
    ('vaschetta-82', 'Conad Superstore', 'Il Ferrarini - Alta Qualità', 200, 3.59, '2026-08-01', '2026-08-11'),
    ('vaschetta-83', 'Sisa', 'Galbani - FettaGolosa', 100, 2.29, '2026-08-02', '2026-08-12'),
    ('vaschetta-84', 'Crai', 'Citterio - Tagliofresco', 110, 2.49, '2026-08-09', '2026-08-19'),
    ('vaschetta-85', 'Max', 'GranTerre - GranTenerone', 110, 1.89, '2026-08-09', '2026-08-19'),
    ('vaschetta-86', 'Famila', 'Galbani - FettaGolosa', 100, 1.99, '2026-08-09', '2026-08-19'),
    ('vaschetta-87', 'Spazio Conad', 'GranTerre - Liberamente', 110, 2.59, '2026-08-10', '2026-08-20'),
    ('vaschetta-88', 'Despar', 'Il Ferrarini - Alta Qualità', 200, 3.49, '2026-08-10', '2026-08-20'),
    ('vaschetta-89', 'Eurospar', 'Il Ferrarini - Alta Qualità', 200, 3.49, '2026-08-10', '2026-08-20'),
    ('vaschetta-90', 'Interspar', 'Il Ferrarini - Alta Qualità', 200, 3.49, '2026-08-10', '2026-08-20'),
    ('vaschetta-91', 'Deco Gourmet', 'Citterio - Tagliofresco', 100, 1.99, '2026-08-10', '2026-08-20'),
    ('vaschetta-92', 'Deco Superstore', 'Citterio - Tagliofresco', 100, 1.99, '2026-08-10', '2026-08-20'),
    ('vaschetta-93', 'Deco', 'GranTerre - Liberamente', 110, 1.89, '2026-08-10', '2026-08-20'),
    ('vaschetta-94', 'Coop', 'Rovagnati - AltaQualità', 110, 1.59, '2026-08-10', '2026-08-20'),
    ('vaschetta-95', 'InCoop', 'Rovagnati - AltaQualità', 110, 1.59, '2026-08-10', '2026-08-20'),
    ('vaschetta-96', 'Superstore Coop', 'Rovagnati - AltaQualità', 110, 1.59, '2026-08-10', '2026-08-20'),
    ('vaschetta-97', 'IperCoop', 'GranTerre - Liberamente', 110, 1.59, '2026-08-10', '2026-08-20'),
    ('vaschetta-98', 'SuperConveniente', 'Parmacotto - Accatatevillo', 100, 1.79, '2026-08-10', '2026-08-20'),
    ('vaschetta-99', 'SuperConveniente', 'Beretta - FrescaSalumeria', 120, 1.99, '2026-08-10', '2026-08-20'),
    ('vaschetta-100', 'PaghiPoco', 'Villani - Fiordaliso', 110, 3.49, '2026-08-10', '2026-08-20'),
    ('vaschetta-101', 'Il Centesimo', 'GranTerre - GranTenerone', 110, 1.79, '2026-08-10', '2026-08-20'),
    ('vaschetta-102', 'Conad', 'Beretta - FrescaSalumeria', 240, 3.99, '2026-08-12', '2026-08-23'),
    ('vaschetta-103', 'Conad City', 'Beretta - FrescaSalumeria', 240, 3.99, '2026-08-12', '2026-08-23'),
    ('vaschetta-104', 'Conad Superstore', 'Rovagnati - I Firmati', 100, 2.59, '2026-08-12', '2026-08-23'),
    ('vaschetta-105', 'Conad Superstore', 'Aia - Aequilibrium', 100, 1.99, '2026-08-12', '2026-08-23'),
    ('vaschetta-106', 'Conad', 'Rovagnati - I Firmati', 100, 2.59, '2026-08-12', '2026-08-23'),
    ('vaschetta-107', 'Conad', 'Aia - Aequilibrium', 100, 1.99, '2026-08-12', '2026-08-23'),
    ('vaschetta-108', 'Conad Superstore', 'Beretta - FrescaSalumeria', 240, 3.99, '2026-08-12', '2026-08-23'),
    ('vaschetta-109', 'Tocal', 'Villani - Fiordaliso', 110, 2.79, '2026-08-12', '2026-08-31')

)
insert into public.offers(source_key, supermarket_id, product_id, variant_id, type, price, offer_date, expiry_date, source)
select s.source_key, sm.id, p.id, pv.id, null, s.price::numeric(10,2), s.offer_date::date, s.expiry_date::date, 'historical'
from seed s
join public.supermarkets sm on sm.name=s.supermarket_name
join public.products p on p.mode='vaschetta' and p.name=s.product_name
join public.product_variants pv on pv.product_id=p.id and pv.weight_grams=s.weight_grams
on conflict (source_key) do update set
 supermarket_id=excluded.supermarket_id, product_id=excluded.product_id, variant_id=excluded.variant_id, type=excluded.type,
 price=excluded.price, offer_date=excluded.offer_date, expiry_date=excluded.expiry_date, source=excluded.source;

commit;

-- Verifiche attese:
-- select count(*) from public.offers o join public.products p on p.id=o.product_id where p.mode='vaschetta'; -- 108
-- select count(*) from public.products where mode='vaschetta'; -- 21