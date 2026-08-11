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
  assert.match(sql, /grant select on public\.supermarkets, public\.products, public\.offers to anon, authenticated/i);
  assert.match(sql, /supabase_realtime/i);
});

test('seed include esattamente 781 chiavi storiche distinte', () => {
  const sql = fs.readFileSync(seedPath, 'utf8');
  const keys = [...sql.matchAll(/historic-(\d+)/g)].map(m => m[0]);
  assert.equal(new Set(keys).size, 781);
});
