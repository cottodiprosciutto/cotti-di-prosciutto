const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const A = require('../js/analytics.js');
const M = require('../js/data-model.js');

function loadRows() {
  const source = fs.readFileSync(path.join(__dirname, '../data/cdp-data.js'), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.CDP_DATA.rows;
}

const rows = M.normalizeHistoricalRows(loadRows());

test('dataset contiene i 781 record validi attesi', () => {
  assert.equal(rows.length, 781);
});

test('riepilogo generale coincide con il report statistico', () => {
  const summary = A.summarize(rows);
  assert.equal(summary.products, 49);
  assert.equal(summary.supermarkets, 24);
  assert.ok(Math.abs(summary.averagePrice - 15.163764404609475) < 1e-9);
  assert.equal(summary.topProducts[0].name, 'Galbani - Fetta Golosa');
  assert.equal(summary.topProducts[0].count, 85);
  assert.equal(summary.highestAverageProduct.name, 'Capitelli - San Giovanni');
  assert.equal(summary.highestAverageSupermarket.name, 'Deco Gourmet');
  assert.equal(summary.lowestAverageSupermarket.name, 'Il Centesimo');
});

test('top 5 per supermercato mantiene i pari merito con rank denso', () => {
  const ranking = A.topProductsForSupermarket(rows, 'Conad', 5);
  const rank5 = ranking.filter((item) => item.rank === 5);
  assert.ok(rank5.length >= 2);
  assert.ok(rank5.some((item) => item.name === 'Casa Modena - Gran Magro'));
  assert.ok(rank5.some((item) => item.name === 'Ferrarini - Effe'));
});

test('top supermercati per prodotto mantiene tutti i pari merito', () => {
  const ranking = A.topSupermarketsForProduct(rows, 'Galbani - Fetta Golosa', 5);
  const rank1 = ranking.filter((item) => item.rank === 1);
  assert.deepEqual(rank1.map((item) => item.name), ['Conad', 'Conad City', 'Conad Superstore']);
});


test('periodKeys restituisce periodi distinti ordinati dal più recente', () => {
  const sample = [
    { offerDate: '2026-01-15', month: '2026-01', quarter: '2026-Q1', year: '2026' },
    { offerDate: '2025-12-30', month: '2025-12', quarter: '2025-Q4', year: '2025' },
    { offerDate: '2026-02-01', month: '2026-02', quarter: '2026-Q1', year: '2026' }
  ];
  assert.deepEqual(A.periodKeys(sample, 'month'), ['2026-02', '2026-01', '2025-12']);
  assert.deepEqual(A.periodKeys(sample, 'quarter'), ['2026-Q1', '2025-Q4']);
  assert.deepEqual(A.periodKeys(sample, 'year'), ['2026', '2025']);
});

test('rowsForPeriod filtra correttamente mese trimestre e anno', () => {
  const sample = [
    { id: 1, month: '2026-01', quarter: '2026-Q1', year: '2026' },
    { id: 2, month: '2026-02', quarter: '2026-Q1', year: '2026' },
    { id: 3, month: '2025-12', quarter: '2025-Q4', year: '2025' }
  ];
  assert.deepEqual(A.rowsForPeriod(sample, 'month', '2026-01').map(r => r.id), [1]);
  assert.deepEqual(A.rowsForPeriod(sample, 'quarter', '2026-Q1').map(r => r.id), [1, 2]);
  assert.deepEqual(A.rowsForPeriod(sample, 'year', '2026').map(r => r.id), [1, 2]);
});

test('previousPeriodKey gestisce i passaggi tra anno mese e trimestre', () => {
  assert.equal(A.previousPeriodKey('month', '2026-01'), '2025-12');
  assert.equal(A.previousPeriodKey('month', '2026-08'), '2026-07');
  assert.equal(A.previousPeriodKey('quarter', '2026-Q1'), '2025-Q4');
  assert.equal(A.previousPeriodKey('quarter', '2026-Q3'), '2026-Q2');
  assert.equal(A.previousPeriodKey('year', '2026'), '2025');
});

test('periodSummary aggrega il periodo selezionato', () => {
  const sample = [
    { month: '2026-08', quarter: '2026-Q3', year: '2026', product: 'A', supermarket: 'S1', type: 'Base', price: 10 },
    { month: '2026-08', quarter: '2026-Q3', year: '2026', product: 'B', supermarket: 'S1', type: 'Scelto', price: 20 },
    { month: '2026-07', quarter: '2026-Q3', year: '2026', product: 'A', supermarket: 'S2', type: 'Base', price: 30 }
  ];
  const result = A.periodSummary(sample, 'month', '2026-08');
  assert.equal(result.count, 2);
  assert.equal(result.products, 2);
  assert.equal(result.supermarkets, 1);
  assert.equal(result.averagePrice, 15);
  assert.equal(result.minPrice, 10);
  assert.equal(result.maxPrice, 20);
});

test('trendWithinPeriod usa giorni nel mese e mesi per trimestre o anno', () => {
  const sample = [
    { offerDate: '2026-08-01', month: '2026-08', quarter: '2026-Q3', year: '2026', price: 10 },
    { offerDate: '2026-08-01', month: '2026-08', quarter: '2026-Q3', year: '2026', price: 20 },
    { offerDate: '2026-08-03', month: '2026-08', quarter: '2026-Q3', year: '2026', price: 30 },
    { offerDate: '2026-07-10', month: '2026-07', quarter: '2026-Q3', year: '2026', price: 40 }
  ];
  assert.deepEqual(A.trendWithinPeriod(sample, 'month', '2026-08'), [
    { key: '2026-08-01', count: 2, averagePrice: 15 },
    { key: '2026-08-03', count: 1, averagePrice: 30 }
  ]);
  assert.deepEqual(A.trendWithinPeriod(sample, 'quarter', '2026-Q3'), [
    { key: '2026-07', count: 1, averagePrice: 40 },
    { key: '2026-08', count: 3, averagePrice: 20 }
  ]);
});

test('yearlyStats aggrega le offerte per anno della data offerta', () => {
  const sample = [
    { year: '2025', product: 'A', supermarket: 'S1', price: 10 },
    { year: '2026', product: 'A', supermarket: 'S1', price: 20 },
    { year: '2026', product: 'B', supermarket: 'S2', price: 30 }
  ];
  assert.deepEqual(A.yearlyStats(sample), [
    { year: '2025', count: 1, products: 1, supermarkets: 1, averagePrice: 10, medianPrice: 10, minPrice: 10, maxPrice: 10 },
    { year: '2026', count: 2, products: 2, supermarkets: 2, averagePrice: 25, medianPrice: 25, minPrice: 20, maxPrice: 30 }
  ]);
});

test('filterRows supporta origine e ricerca sulla data offerta', () => {
  const sample = [
    { supermarket: 'Conad', product: 'A', type: 'Base', expiryDate: '2026-08-20', offerDate: '2026-08-10', month: '2026-08', origin: 'historical', price: 10 },
    { supermarket: 'Coop', product: 'B', type: 'Scelto', expiryDate: '2026-08-21', offerDate: '2026-08-11', month: '2026-08', origin: 'manual', price: 12 }
  ];
  assert.deepEqual(A.filterRows(sample, { origin: 'manual' }).map(r => r.product), ['B']);
  assert.deepEqual(A.filterRows(sample, { query: '2026-08-10' }).map(r => r.product), ['A']);
});
