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
