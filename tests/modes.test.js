const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/data-model.js');
const A = require('../js/analytics.js');

test('normalizza le modalità prodotto supportate', () => {
  assert.equal(M.normalizeMode('taglio'), 'taglio');
  assert.equal(M.normalizeMode(' VASCHETTA '), 'vaschetta');
  assert.throws(() => M.normalizeMode('altro'), /modalità/i);
});

test('calcola il prezzo equivalente al kg per una vaschetta', () => {
  assert.equal(M.pricePerKg(1.59, 110), 14.45);
  assert.equal(M.pricePerKg(2.99, 200), 14.95);
  assert.throws(() => M.pricePerKg(1.99, 0), /peso/i);
});

test('le righe storiche incorporate restano sempre al taglio', () => {
  const [row] = M.normalizeHistoricalRows([{ supermarket: 'Conad', product: 'A', type: 'Base', expiryDate: '2026-08-20', price: 9.9 }]);
  assert.equal(row.mode, 'taglio');
  assert.equal(row.weightGrams, null);
  assert.equal(row.comparisonPrice, 9.9);
});

test('una nuova offerta in vaschetta richiede grammatura e calcola il prezzo al kg', () => {
  const offer = M.createManualOffer({
    supermarket: 'Coop',
    product: 'GranTerre - Liberamente',
    mode: 'vaschetta',
    weightGrams: 110,
    type: '',
    price: '1,59',
    expiryDate: '2026-08-20'
  }, '2026-08-12', 'v-1');
  assert.equal(offer.mode, 'vaschetta');
  assert.equal(offer.weightGrams, 110);
  assert.equal(offer.price, 1.59);
  assert.equal(offer.comparisonPrice, 14.45);
  assert.equal(offer.type, '');
});

test('una nuova offerta al taglio non richiede grammatura', () => {
  const offer = M.createManualOffer({
    supermarket: 'Conad', product: 'Rovagnati - GranBiscotto', mode: 'taglio', type: 'Alta Qualità', price: 19.9, expiryDate: '2026-08-20'
  }, '2026-08-12', 't-1');
  assert.equal(offer.mode, 'taglio');
  assert.equal(offer.weightGrams, null);
  assert.equal(offer.comparisonPrice, 19.9);
});

test('i periodi live vengono generati automaticamente fino alla data corrente', () => {
  const rows = [
    { month: '2026-11', quarter: '2026-Q4', year: '2026', offerDate: '2026-11-15' }
  ];
  const months = A.periodKeysThroughDate(rows, 'month', '2027-02-03');
  assert.deepEqual(months.slice(0, 4), ['2027-02', '2027-01', '2026-12', '2026-11']);
  const quarters = A.periodKeysThroughDate(rows, 'quarter', '2027-04-03');
  assert.deepEqual(quarters.slice(0, 3), ['2027-Q2', '2027-Q1', '2026-Q4']);
  const years = A.periodKeysThroughDate(rows, 'year', '2028-01-01');
  assert.deepEqual(years.slice(0, 3), ['2028', '2027', '2026']);
});

test('le statistiche usano il prezzo equivalente per la vaschetta', () => {
  const rows = [
    { product: 'A', supermarket: 'X', type: '', price: 1.5, comparisonPrice: 15, expiryDate: '2026-08-20' },
    { product: 'A', supermarket: 'Y', type: '', price: 2.0, comparisonPrice: 10, expiryDate: '2026-08-21' }
  ];
  const [stat] = A.productStats(rows);
  assert.equal(stat.averagePrice, 12.5);
  assert.equal(stat.averagePackagePrice, 1.75);
});
