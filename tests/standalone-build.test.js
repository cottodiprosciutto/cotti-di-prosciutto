const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const standalonePath = path.join(__dirname, '../CDP_2026_Gestionale.html');

test('standalone include modalità, immagini e controller senza dipendere dai file JS/CSS locali', () => {
  const html = fs.readFileSync(standalonePath, 'utf8');
  for (const token of ['id="mode-gate"', 'id="mode-switch"', 'id="product-card-grid"', 'CDPModeController', '.mode-choice-grid']) {
    assert.ok(html.includes(token), `manca ${token}`);
  }
  assert.doesNotMatch(html, /src="js\//);
  assert.doesNotMatch(html, /href="assets\/styles\.css"/);
});
