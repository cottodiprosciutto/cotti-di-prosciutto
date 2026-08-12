const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const standalonePath = path.join(__dirname, '../CDP_2026_Gestionale.html');

test('standalone include switch modalità, immagini e controller senza il popup iniziale', () => {
  const html = fs.readFileSync(standalonePath, 'utf8');
  for (const token of ['id="mode-switch"', 'id="product-card-grid"', 'CDPModeController', '.mode-switch']) {
    assert.ok(html.includes(token), `manca ${token}`);
  }
  assert.ok(!html.includes('id="mode-gate"'), 'il popup iniziale non deve essere presente');
  assert.doesNotMatch(html, /src="js\//);
  assert.doesNotMatch(html, /href="assets\/styles\.css"/);
});
