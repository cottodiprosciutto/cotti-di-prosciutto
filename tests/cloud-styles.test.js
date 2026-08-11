const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../assets/styles.css'), 'utf8');

test('stili cloud evidenziano login, cataloghi e scadenze', () => {
  for (const selector of ['.auth-panel', '.catalog-form', '.renewal-row.expired', '.renewal-row.today', '.renewal-status', '.inline-link']) {
    assert.ok(css.includes(selector), `${selector} mancante`);
  }
});

test('lista scadenze resta consultabile anche con molti elementi', () => {
  assert.match(css, /\.renewal-list\s*\{[^}]*max-height:\s*620px[^}]*overflow-y:\s*auto/s);
});

test('stili distinguono supermercati da rinnovare, rinnovati e statistiche combinazione', () => {
  for (const selector of ['.supermarket-renewal-row.expired', '.supermarket-renewal-row.today', '.supermarket-renewal-row.renewed', '.combination-stats-grid']) {
    assert.ok(css.includes(selector), `${selector} mancante`);
  }
});
