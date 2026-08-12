const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

test('la app usa dataset storico come fallback e Supabase come fonte cloud', () => {
  assert.match(source, /CDPDataModel/);
  assert.match(source, /CDPCloudStore/);
  assert.match(source, /normalizeHistoricalRows/);
  assert.match(source, /Cloud\.loadSnapshot/);
  assert.match(source, /Cloud\.subscribe/);
});

test('la app implementa login admin, cataloghi e CRUD offerte', () => {
  assert.match(source, /signIn/);
  assert.match(source, /isAdmin/);
  assert.match(source, /addSupermarket/);
  assert.match(source, /addProduct/);
  assert.match(source, /addOffer/);
  assert.match(source, /deleteOffer/);
});

test('la app implementa coda rinnovi, sort date e statistiche live', () => {
  assert.match(source, /supermarketRenewalStatus/);
  assert.match(source, /filter-sort/);
  assert.match(source, /function\s+renderLive\s*\(/);
  assert.match(source, /periodSummary/);
  assert.match(source, /previousPeriodKey/);
});

test('la app implementa export JSON e CSV', () => {
  assert.match(source, /cdp-cloud-backup/);
  assert.match(source, /application\/json/);
  assert.match(source, /text\/csv/);
});

test('la app usa il rinnovo a livello supermercato e le statistiche della combinazione', () => {
  assert.match(source, /supermarketRenewalStatus/);
  assert.match(source, /combinationStats/);
  assert.match(source, /function\s+renderSupermarketRenewalBoard\s*\(/);
  assert.match(source, /function\s+renderCombinationStats\s*\(/);
});

test('la app supporta login e persistenza locale senza Supabase', () => {
  assert.match(source, /CDPLocalStore/);
  assert.match(source, /localMode/);
  assert.match(source, /Local\.authenticate/);
  assert.match(source, /Local\.addOffer/);
  assert.match(source, /Local\.addSupermarket/);
  assert.match(source, /Local\.addProduct/);
});

test('la app rende pubblica la sezione Analisi combinazioni', () => {
  assert.match(source, /function\s+renderPublicCombinationStats\s*\(/);
  assert.match(source, /public-combination-supermarket/);
  assert.match(source, /public-combination-product/);
  assert.match(source, /combinations:\s*'Analisi combinazioni'/);
});

test('la app pulisce i pannelli dipendenti dai dati quando una modalità non ha offerte', () => {
  assert.match(source, /Nessun supermercato con offerte disponibile per questa modalità\./);
  assert.match(source, /C\.horizontalBar\(\$\('#supermarket-products-chart'\), \[\], \{\}\)/);
  assert.match(source, /C\.line\(\$\('#live-trend-chart'\), \[\], \{\}\)/);
  assert.match(source, /C\.horizontalBar\(\$\('#live-count-chart'\), \[\], \{\}\)/);
  assert.match(source, /\$\('#live-history-table'\)\.innerHTML = ''/);
});


test('la modalità si cambia solo dalla barra superiore e non gestisce più il popup iniziale', () => {
  assert.match(source, /\[data-mode-switch\]/);
  assert.doesNotMatch(source, /\[data-mode\](?!-switch)/);
  assert.doesNotMatch(source, /mode-gate/);
});

test('gli errori auth non disattivano una connessione database Supabase funzionante', () => {
  assert.match(source, /async function\s+initializeCloudAuth\s*\(/);
  const start = source.indexOf('async function initializeCloudAuth');
  const end = source.indexOf('\n  function initializeCloudRealtime', start + 1);
  const body = source.slice(start, end === -1 ? source.length : end);
  assert.doesNotMatch(body, /state\.cloudMode\s*=\s*false/);
  assert.match(body, /Autenticazione Supabase non disponibile/);
});

test('il fallback database mostra la causa Supabase nel banner', () => {
  assert.match(source, /Supabase dati non disponibili/);
  assert.match(source, /cloudErrorMessage/);
});


test('il rendering dashboard definisce currentAggregates prima di usarla', () => {
  assert.match(source, /function\s+currentAggregates\s*\(/);
  const definition = source.indexOf('function currentAggregates');
  const usage = source.indexOf('currentAggregates()');
  assert.ok(definition >= 0 && usage >= 0 && definition < usage);
});
