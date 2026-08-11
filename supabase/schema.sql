-- CDP Cloud Manager - schema Supabase
-- Eseguire una volta nel SQL Editor di Supabase prima di seed.sql.

create extension if not exists pgcrypto;

create table if not exists public.supermarkets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  default_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  source_key text unique,
  supermarket_id uuid not null references public.supermarkets(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (length(trim(type)) > 0),
  price numeric(10,2) not null check (price > 0),
  offer_date date not null default current_date,
  expiry_date date not null,
  source text not null default 'manual' check (source in ('historical', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_expiry_after_offer check (expiry_date >= offer_date)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists offers_offer_date_idx on public.offers (offer_date desc);
create index if not exists offers_expiry_date_idx on public.offers (expiry_date desc);
create index if not exists offers_supermarket_idx on public.offers (supermarket_id);
create index if not exists offers_product_idx on public.offers (product_id);

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
create trigger offers_touch_updated_at
before update on public.offers
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.supermarkets enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.admin_users enable row level security;

-- Ricreazione idempotente delle policy.
drop policy if exists supermarkets_public_read on public.supermarkets;
drop policy if exists supermarkets_admin_insert on public.supermarkets;
drop policy if exists supermarkets_admin_update on public.supermarkets;
drop policy if exists supermarkets_admin_delete on public.supermarkets;
create policy supermarkets_public_read on public.supermarkets for select to anon, authenticated using (true);
create policy supermarkets_admin_insert on public.supermarkets for insert to authenticated with check (public.is_admin());
create policy supermarkets_admin_update on public.supermarkets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy supermarkets_admin_delete on public.supermarkets for delete to authenticated using (public.is_admin());

drop policy if exists products_public_read on public.products;
drop policy if exists products_admin_insert on public.products;
drop policy if exists products_admin_update on public.products;
drop policy if exists products_admin_delete on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (true);
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

drop policy if exists offers_public_read on public.offers;
drop policy if exists offers_admin_insert on public.offers;
drop policy if exists offers_admin_update on public.offers;
drop policy if exists offers_admin_delete on public.offers;
create policy offers_public_read on public.offers for select to anon, authenticated using (true);
create policy offers_admin_insert on public.offers for insert to authenticated with check (public.is_admin());
create policy offers_admin_update on public.offers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy offers_admin_delete on public.offers for delete to authenticated using (public.is_admin());

-- Privilegi Data API: RLS resta il vero confine di autorizzazione.
grant select on public.supermarkets, public.products, public.offers to anon, authenticated;
grant insert, update, delete on public.supermarkets, public.products, public.offers to authenticated;
revoke all on public.admin_users from anon, authenticated;

-- Realtime idempotente per i tre cataloghi/dati usati dal frontend.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offers') then
    alter publication supabase_realtime add table public.offers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'supermarkets') then
    alter publication supabase_realtime add table public.supermarkets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products') then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;
