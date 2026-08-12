-- Upgrade sicuro per un progetto CDP già online.
-- Eseguire UNA VOLTA prima di pubblicare il frontend v2 e prima di importare le offerte vaschetta.
begin;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists brands_name_ci_uidx on public.brands (lower(name));

alter table public.products add column if not exists mode text;
alter table public.products add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.products add column if not exists image_path text;
alter table public.products add column if not exists updated_at timestamptz not null default now();
update public.products set mode = 'taglio' where mode is null;
alter table public.products alter column mode set default 'taglio';
alter table public.products alter column mode set not null;
alter table public.products drop constraint if exists products_mode_check;
alter table public.products add constraint products_mode_check check (mode in ('taglio', 'vaschetta'));
alter table public.products drop constraint if exists products_name_key;
alter table public.products drop constraint if exists products_mode_name_key;
alter table public.products add constraint products_mode_name_key unique (mode, name);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  weight_grams integer not null check (weight_grams > 0),
  created_at timestamptz not null default now(),
  constraint product_variants_product_weight_key unique (product_id, weight_grams),
  constraint product_variants_id_product_key unique (id, product_id)
);

alter table public.offers add column if not exists variant_id uuid;
alter table public.offers alter column type drop not null;
alter table public.offers drop constraint if exists offers_variant_matches_product;
alter table public.offers add constraint offers_variant_matches_product
  foreign key (variant_id, product_id) references public.product_variants(id, product_id) on delete restrict;

create index if not exists products_mode_idx on public.products (mode);
create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists offers_variant_idx on public.offers (variant_id);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists brands_touch_updated_at on public.brands;
create trigger brands_touch_updated_at before update on public.brands for each row execute function public.touch_updated_at();

alter table public.brands enable row level security;
alter table public.product_variants enable row level security;

drop policy if exists brands_public_read on public.brands;
drop policy if exists brands_admin_insert on public.brands;
drop policy if exists brands_admin_update on public.brands;
drop policy if exists brands_admin_delete on public.brands;
create policy brands_public_read on public.brands for select to anon, authenticated using (true);
create policy brands_admin_insert on public.brands for insert to authenticated with check (public.is_admin());
create policy brands_admin_update on public.brands for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy brands_admin_delete on public.brands for delete to authenticated using (public.is_admin());

drop policy if exists product_variants_public_read on public.product_variants;
drop policy if exists product_variants_admin_insert on public.product_variants;
drop policy if exists product_variants_admin_update on public.product_variants;
drop policy if exists product_variants_admin_delete on public.product_variants;
create policy product_variants_public_read on public.product_variants for select to anon, authenticated using (true);
create policy product_variants_admin_insert on public.product_variants for insert to authenticated with check (public.is_admin());
create policy product_variants_admin_update on public.product_variants for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_variants_admin_delete on public.product_variants for delete to authenticated using (public.is_admin());

grant select on public.brands, public.product_variants to anon, authenticated;
grant insert, update, delete on public.brands, public.product_variants to authenticated;

-- Collega i prodotti al taglio già presenti ai rispettivi marchi.
with mapping(product_name, brand_name) as (
  values
    ('Beretta - Gran Sigillo','Beretta'),('Beretta - Raffinato','Beretta'),('Bombieri - Blu','Bombieri'),
    ('Capitelli - San Giovanni','Capitelli'),('Casa Modena - Gran Magro','Casa Modena'),('Casa Modena - Gran Rosa','Casa Modena'),
    ('Citterio - Gran Gusto','Citterio'),('Coati - Blu','Coati'),('Coati - Gioioso','Coati'),('Coati - Gran Bordò','Coati'),
    ('Coati - Lenta Cottura','Coati'),('Coati - Nobile','Coati'),('Coati - Royale','Coati'),('Comal - Rosafino Rosso','Comal'),
    ('Conad - Prosciutto Cotto ','Conad'),('Coop - Fior Fiore','Coop'),('Cotto - AQ Penny','Penny'),('Crai - Zaffiro','Crai'),
    ('Despar - AQ','Despar'),('F.LLI Riva - Maialino d''oro','F.LLI Riva'),('Ferrarini - Effe','Ferrarini'),
    ('Fiorucci - Vellutato','Fiorucci'),('Galbani - Fetta Golosa','Galbani'),('Galbani - Fetta Italiana','Galbani'),
    ('Gardani - Premium','Gardani'),('Gran Prosciutto - Eros','Gran Prosciutto'),('Grancotto - Welless','Grancotto'),
    ('GranTerre - GranTenerone','GranTerre'),('I Firmati MD - Cotto AQ','MD'),('Ibis - Cuor Di Natura','Ibis'),
    ('Ibis - Gran Cotto D''Emilia','Ibis'),('Ibis - Rosa Velo','Ibis'),('Kometa - AQ','Kometa'),('Leoncini - Botticella','Leoncini'),
    ('Leoncini - Nazionale','Leoncini'),('Leoncini - Scaligiero','Leoncini'),('Martelli - Bongustaio','Martelli'),
    ('Morgante - PC Scelto Praga','Morgante'),('Motta - Scudiero','Motta'),('Negroni - Prima Stella','Negroni'),
    ('Nonna Tita - AQ','Nonna Tita'),('Parmacotto','Parmacotto'),('Romano - PC','Romano'),('Rovagnati - GranBiscotto','Rovagnati'),
    ('Santini - Artista','Santini'),('Sapori e Dintorni - Conad','Conad'),('Selex - AQ','Selex'),('Veroni - Alta Resa','Veroni'),
    ('Veroni - Il Boschetto','Veroni')
), names as (
  select distinct brand_name from mapping
)
insert into public.brands(name)
select brand_name from names
on conflict do nothing;

with mapping(product_name, brand_name) as (
  values
    ('Beretta - Gran Sigillo','Beretta'),('Beretta - Raffinato','Beretta'),('Bombieri - Blu','Bombieri'),
    ('Capitelli - San Giovanni','Capitelli'),('Casa Modena - Gran Magro','Casa Modena'),('Casa Modena - Gran Rosa','Casa Modena'),
    ('Citterio - Gran Gusto','Citterio'),('Coati - Blu','Coati'),('Coati - Gioioso','Coati'),('Coati - Gran Bordò','Coati'),
    ('Coati - Lenta Cottura','Coati'),('Coati - Nobile','Coati'),('Coati - Royale','Coati'),('Comal - Rosafino Rosso','Comal'),
    ('Conad - Prosciutto Cotto ','Conad'),('Coop - Fior Fiore','Coop'),('Cotto - AQ Penny','Penny'),('Crai - Zaffiro','Crai'),
    ('Despar - AQ','Despar'),('F.LLI Riva - Maialino d''oro','F.LLI Riva'),('Ferrarini - Effe','Ferrarini'),
    ('Fiorucci - Vellutato','Fiorucci'),('Galbani - Fetta Golosa','Galbani'),('Galbani - Fetta Italiana','Galbani'),
    ('Gardani - Premium','Gardani'),('Gran Prosciutto - Eros','Gran Prosciutto'),('Grancotto - Welless','Grancotto'),
    ('GranTerre - GranTenerone','GranTerre'),('I Firmati MD - Cotto AQ','MD'),('Ibis - Cuor Di Natura','Ibis'),
    ('Ibis - Gran Cotto D''Emilia','Ibis'),('Ibis - Rosa Velo','Ibis'),('Kometa - AQ','Kometa'),('Leoncini - Botticella','Leoncini'),
    ('Leoncini - Nazionale','Leoncini'),('Leoncini - Scaligiero','Leoncini'),('Martelli - Bongustaio','Martelli'),
    ('Morgante - PC Scelto Praga','Morgante'),('Motta - Scudiero','Motta'),('Negroni - Prima Stella','Negroni'),
    ('Nonna Tita - AQ','Nonna Tita'),('Parmacotto','Parmacotto'),('Romano - PC','Romano'),('Rovagnati - GranBiscotto','Rovagnati'),
    ('Santini - Artista','Santini'),('Sapori e Dintorni - Conad','Conad'),('Selex - AQ','Selex'),('Veroni - Alta Resa','Veroni'),
    ('Veroni - Il Boschetto','Veroni')
)
update public.products p
set brand_id = b.id
from mapping m
join public.brands b on lower(b.name) = lower(m.brand_name)
where p.mode = 'taglio' and p.name = m.product_name and p.brand_id is null;

-- Realtime per nuove tabelle.
do $$
declare t text;
begin
  foreach t in array array['brands','product_variants'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;
