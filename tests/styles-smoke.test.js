const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../assets/styles.css'), 'utf8');

test('il tema usa una palette prosciutto cotto calda', () => {
  for (const token of ['--ham', '--ham-dark', '--cream', '--rose', '--burgundy']) {
    assert.match(css, new RegExp(token.replace('--', '--')));
  }
});

test('sono presenti gli stili delle nuove aree gestionali', () => {
  for (const selector of ['.ham-hero', '.manage-grid', '.segmented', '.comparison-strip', '.backup-action', '.origin-badge', '.toast']) {
    assert.ok(css.includes(selector), `manca ${selector}`);
  }
});

test('il tema contiene lo switch superiore e le card prodotto con immagini', () => {
  for (const selector of ['.mode-switch', '.product-card-grid', '.product-card', '.product-media', '.brand-logo']) {
    assert.ok(css.includes(selector), `manca ${selector}`);
  }
  assert.ok(!css.includes('.mode-gate'), 'gli stili del popup iniziale non devono più essere presenti');
  assert.ok(!css.includes('.mode-choice-grid'), 'gli stili delle scelte iniziali non devono più essere presenti');
});
