const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/charts.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../assets/styles.css'), 'utf8');

test('i grafici lineari includono una superficie morbida sotto la linea', () => {
  assert.match(source, /chart-area/);
  assert.match(css, /\.chart-area/);
});
