const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.join(__dirname, '../supabase/schema.sql');
const seedPath = path.join(__dirname, '../supabase/seed.sql');

test('schema Supabase contiene cataloghi, offerte, admin e RLS', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  for (const token of ['public.supermarkets', 'public.products', 'public.offers', 'public.admin_users', 'create or replace function public.is_admin', 'enable row level security', 'create policy']) {
    assert.match(sql.toLowerCase(), new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const table of ['supermarkets', 'brands', 'products', 'product_variants', 'offers']) {
    assert.match(sql, new RegExp(`grant select on [^;]*public\\.${table}[^;]* to anon, authenticated`, 'i'));
  }
  assert.match(sql, /supabase_realtime/i);
});

test('seed include esattamente 781 chiavi storiche distinte', () => {
  const sql = fs.readFileSync(seedPath, 'utf8');
  const keys = [...sql.matchAll(/historic-(\d+)/g)].map(m => m[0]);
  assert.equal(new Set(keys).size, 781);
});

test('schema finale supporta modalità, marchi, varianti e immagini', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8').toLowerCase();
  for (const token of ['public.brands', 'public.product_variants', "mode text", 'brand_id', 'image_path', 'logo_path', 'variant_id', "'vaschetta'"]) {
    assert.ok(sql.includes(token), `manca ${token}`);
  }
});

test('import vaschetta è completo e crea i cataloghi necessari prima delle offerte', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/import-vaschetta-2026.sql'), 'utf8');
  const keys = [...sql.matchAll(/'vaschetta-(\d+)'/g)].map((match) => match[0]);
  assert.equal(new Set(keys).size, 108);
  assert.match(sql, /insert into public\.supermarkets\(name\)/i);
  assert.match(sql, /insert into public\.brands\(name\)/i);
  assert.match(sql, /insert into public\.products\(name, default_type, mode, brand_id\)/i);
  assert.match(sql, /insert into public\.product_variants\(product_id, weight_grams\)/i);
  assert.match(sql, /on conflict \(source_key\) do update/i);
});
