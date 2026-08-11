const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

test('la UI contiene login cloud, cataloghi e rinnovo supermercati', () => {
  for (const id of ['auth-panel', 'auth-form', 'catalog-supermarket-form', 'catalog-product-form', 'supermarket-renewal-board']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('la sezione dati contiene ordinamento per data', () => {
  assert.match(html, /id=["']filter-sort["']/);
  assert.match(html, /Data offerta — più recente/);
  assert.match(html, /Data scadenza — meno recente/);
});

test('Supabase viene caricato prima della app', () => {
  const sdk = html.indexOf('@supabase/supabase-js@2');
  const cfg = html.indexOf('js/config.js');
  const store = html.indexOf('js/supabase-store.js');
  const app = html.indexOf('js/app.js');
  assert.ok(sdk >= 0 && cfg > sdk && store > cfg && app > store);
});

test('Nuova offerta contiene stato rinnovo mentre le statistiche combinazione sono pubbliche', () => {
  for (const id of ['supermarket-renewal-board', 'supermarket-renewal-summary']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `manca #${id}`);
  }
  assert.match(html, /Supermercati da rinnovare/);
  assert.match(html, /id=["']combinations["']/);
  assert.match(html, /Statistiche combinazione/);
});

test('le statistiche combinazione sono in una sezione pubblica dedicata', () => {
  assert.match(html, /data-section=["']combinations["']/);
  assert.match(html, /id=["']combinations["']/);
  for (const id of ['public-combination-supermarket', 'public-combination-product', 'public-combination-stats', 'public-combination-trend-chart', 'public-combination-history']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `manca #${id}`);
  }
});

test('la pagina carica lo store locale prima della app', () => {
  const localStore = html.indexOf('js/local-store.js');
  const app = html.indexOf('js/app.js');
  assert.ok(localStore >= 0 && app > localStore);
});
