-- CDP Cloud Manager - schema Supabase v2 (Taglio + Vaschetta)
-- Per una nuova installazione eseguire prima di seed.sql e import-vaschetta-2026.sql.

create extension if not exists pgcrypto;

create table if not exists public.supermarkets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists brands_name_ci_uidx on public.brands (lower(name));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  default_type text,
  mode text not null default 'taglio' check (mode in ('taglio', 'vaschetta')),
  brand_id uuid references public.brands(id) on delete set null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_mode_name_key unique (mode, name)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  weight_grams integer not null check (weight_grams > 0),
  created_at timestamptz not null default now(),
  constraint product_variants_product_weight_key unique (product_id, weight_grams),
  constraint product_variants_id_product_key unique (id, product_id)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  supermarket_id uuid not null references public.supermarkets(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid,
  type text check (type is null or length(trim(type)) > 0),
  price numeric(10,2) not null check (price > 0),
  offer_date date not null default current_date,
  expiry_date date not null,
  source text not null default 'manual' check (source in ('historical', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_expiry_after_offer check (expiry_date >= offer_date),
  constraint offers_variant_matches_product foreign key (variant_id, product_id)
    references public.product_variants(id, product_id) on delete restrict
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists offers_offer_date_idx on public.offers (offer_date desc);
create index if not exists offers_expiry_date_idx on public.offers (expiry_date desc);
create index if not exists offers_supermarket_idx on public.offers (supermarket_id);
create index if not exists offers_product_idx on public.offers (product_id);
create index if not exists offers_variant_idx on public.offers (variant_id);
create index if not exists products_mode_idx on public.products (mode);
create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists offers_touch_updated_at on public.offers;
create trigger offers_touch_updated_at before update on public.offers for each row execute function public.touch_updated_at();
drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists brands_touch_updated_at on public.brands;
create trigger brands_touch_updated_at before update on public.brands for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.supermarkets enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.offers enable row level security;
alter table public.admin_users enable row level security;

-- Supermercati
drop policy if exists supermarkets_public_read on public.supermarkets;
drop policy if exists supermarkets_admin_insert on public.supermarkets;
drop policy if exists supermarkets_admin_update on public.supermarkets;
drop policy if exists supermarkets_admin_delete on public.supermarkets;
create policy supermarkets_public_read on public.supermarkets for select to anon, authenticated using (true);
create policy supermarkets_admin_insert on public.supermarkets for insert to authenticated with check (public.is_admin());
create policy supermarkets_admin_update on public.supermarkets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy supermarkets_admin_delete on public.supermarkets for delete to authenticated using (public.is_admin());

-- Marchi
drop policy if exists brands_public_read on public.brands;
drop policy if exists brands_admin_insert on public.brands;
drop policy if exists brands_admin_update on public.brands;
drop policy if exists brands_admin_delete on public.brands;
create policy brands_public_read on public.brands for select to anon, authenticated using (true);
create policy brands_admin_insert on public.brands for insert to authenticated with check (public.is_admin());
create policy brands_admin_update on public.brands for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy brands_admin_delete on public.brands for delete to authenticated using (public.is_admin());

-- Prodotti
drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_insert on public.products;
drop policy if exists products_admin_update on public.products;
drop policy if exists products_admin_delete on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (true);
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

-- Varianti/grammature
drop policy if exists product_variants_public_read on public.product_variants;
drop policy if exists product_variants_admin_insert on public.product_variants;
drop policy if exists product_variants_admin_update on public.product_variants;
drop policy if exists product_variants_admin_delete on public.product_variants;
create policy product_variants_public_read on public.product_variants for select to anon, authenticated using (true);
create policy product_variants_admin_insert on public.product_variants for insert to authenticated with check (public.is_admin());
create policy product_variants_admin_update on public.product_variants for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_variants_admin_delete on public.product_variants for delete to authenticated using (public.is_admin());

-- Offerte
drop policy if exists offers_public_read on public.offers;
drop policy if exists offers_admin_insert on public.offers;
drop policy if exists offers_admin_update on public.offers;
drop policy if exists offers_admin_delete on public.offers;
create policy offers_public_read on public.offers for select to anon, authenticated using (true);
create policy offers_admin_insert on public.offers for insert to authenticated with check (public.is_admin());
create policy offers_admin_update on public.offers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy offers_admin_delete on public.offers for delete to authenticated using (public.is_admin());

grant select on public.supermarkets, public.brands, public.products, public.product_variants, public.offers to anon, authenticated;
grant insert, update, delete on public.supermarkets, public.brands, public.products, public.product_variants, public.offers to authenticated;
revoke all on public.admin_users from anon, authenticated;

-- Realtime idempotente.
do $$
declare t text;
begin
  foreach t in array array['offers','supermarkets','products','brands','product_variants'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
