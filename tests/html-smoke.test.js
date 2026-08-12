const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

test('la pagina contiene gestione, statistiche live e form offerta cloud', () => {
  for (const id of ['manage', 'live', 'offer-form', 'offer-supermarket', 'offer-product', 'offer-type', 'offer-price', 'offer-expiry', 'offer-date', 'user-offers-table', 'live-period-select', 'live-kpis', 'live-trend-chart', 'live-top-products', 'live-top-supermarkets']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `manca #${id}`);
  }
});

test('la pagina espone export JSON e CSV e non dipende da IndexedDB', () => {
  for (const id of ['export-backup', 'export-csv']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `manca #${id}`);
  }
  assert.doesNotMatch(html, /js\/storage\.js/);
});

test('gli script Supabase e cloud store vengono caricati prima della app', () => {
  const sdk = html.indexOf('@supabase/supabase-js@2');
  const model = html.indexOf('js/data-model.js');
  const store = html.indexOf('js/supabase-store.js');
  const app = html.indexOf('js/app.js');
  assert.ok(sdk >= 0 && model >= 0 && store >= 0 && app >= 0);
  assert.ok(sdk < store && model < store && store < app);
});

test('la pagina usa solo lo switch superiore per taglio o vaschetta e gestisce immagini', () => {
  for (const id of ['mode-switch', 'offer-variant', 'brand-form', 'brand-logo', 'catalog-product-brand', 'catalog-product-image', 'product-card-grid']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `manca #${id}`);
  }
  for (const id of ['mode-gate', 'mode-taglio', 'mode-vaschetta']) {
    assert.doesNotMatch(html, new RegExp(`id=["']${id}["']`), `#${id} non deve più essere presente`);
  }
});
