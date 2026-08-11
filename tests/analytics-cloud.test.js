const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/analytics.js');

test('renewalQueue usa solo la scadenza più recente per coppia supermercato-prodotto', () => {
  const rows = [
    { id: '1', supermarket: 'Conad', product: 'A', type: 'Base', expiryDate: '2026-08-01', offerDate: '2026-07-22' },
    { id: '2', supermarket: 'Conad', product: 'A', type: 'Base', expiryDate: '2026-08-20', offerDate: '2026-08-10' },
    { id: '3', supermarket: 'Coop', product: 'B', type: 'Scelto', expiryDate: '2026-08-10', offerDate: '2026-07-31' },
    { id: '4', supermarket: 'MD', product: 'C', type: 'Alta Qualità', expiryDate: '2026-08-11', offerDate: '2026-08-01' }
  ];
  const queue = A.renewalQueue(rows, '2026-08-11');
  assert.deepEqual(queue.map(x => [x.id, x.status]), [['4', 'today'], ['3', 'expired']]);
});

test('renewalQueue mostra prima le scadenze di oggi e poi le scadute più recenti', () => {
  const rows = [
    { id: 'a', supermarket: 'S1', product: 'A', expiryDate: '2026-08-09', offerDate: '2026-07-30' },
    { id: 'b', supermarket: 'S2', product: 'B', expiryDate: '2026-08-01', offerDate: '2026-07-22' },
    { id: 'c', supermarket: 'S3', product: 'C', expiryDate: '2026-08-11', offerDate: '2026-08-01' }
  ];
  const queue = A.renewalQueue(rows, '2026-08-11');
  assert.equal(queue[0].id, 'c');
  assert.equal(queue[0].daysExpired, 0);
  assert.equal(queue[1].id, 'a');
  assert.equal(queue[1].daysExpired, 2);
  assert.equal(queue[2].id, 'b');
  assert.equal(queue[2].daysExpired, 10);
});

test('sortRows ordina per data offerta e data scadenza in entrambe le direzioni', () => {
  const rows = [
    { id: 'a', offerDate: '2026-08-10', expiryDate: '2026-08-20' },
    { id: 'b', offerDate: '2026-08-11', expiryDate: '2026-08-12' },
    { id: 'c', offerDate: '2026-08-09', expiryDate: '2026-08-30' }
  ];
  assert.deepEqual(A.sortRows(rows, 'offerDateDesc').map(x => x.id), ['b', 'a', 'c']);
  assert.deepEqual(A.sortRows(rows, 'offerDateAsc').map(x => x.id), ['c', 'a', 'b']);
  assert.deepEqual(A.sortRows(rows, 'expiryDateDesc').map(x => x.id), ['c', 'a', 'b']);
  assert.deepEqual(A.sortRows(rows, 'expiryDateAsc').map(x => x.id), ['b', 'a', 'c']);
});

test('supermarketRenewalStatus considera rinnovato il supermercato anche se cambia prosciutto', () => {
  const rows = [
    { id: '1', supermarket: 'Conad', product: 'Prosciutto A', offerDate: '2026-07-20', expiryDate: '2026-07-30', price: 10 },
    { id: '2', supermarket: 'Conad', product: 'Prosciutto B', offerDate: '2026-08-01', expiryDate: '2026-08-20', price: 12 },
    { id: '3', supermarket: 'Coop', product: 'Prosciutto C', offerDate: '2026-07-31', expiryDate: '2026-08-10', price: 11 },
    { id: '4', supermarket: 'MD', product: 'Prosciutto D', offerDate: '2026-08-01', expiryDate: '2026-08-11', price: 9 }
  ];

  const statuses = A.supermarketRenewalStatus(rows, '2026-08-11', ['Conad', 'Coop', 'MD', 'Esselunga']);
  const byName = Object.fromEntries(statuses.map((item) => [item.supermarket, item]));

  assert.equal(byName.Conad.status, 'renewed');
  assert.equal(byName.Conad.latestProduct, 'Prosciutto B');
  assert.equal(byName.Conad.latestOfferDate, '2026-08-01');
  assert.equal(byName.Conad.latestExpiryDate, '2026-08-20');
  assert.equal(byName.Conad.previousExpired.product, 'Prosciutto A');
  assert.equal(byName.Coop.status, 'expired');
  assert.equal(byName.Coop.daysExpired, 1);
  assert.equal(byName.MD.status, 'today');
  assert.equal(byName.Esselunga.status, 'never');
});

test('supermarketRenewalStatus ordina prima i supermercati da rinnovare', () => {
  const rows = [
    { id: '1', supermarket: 'ScadutoDaTempo', product: 'A', offerDate: '2026-07-01', expiryDate: '2026-07-20', price: 10 },
    { id: '2', supermarket: 'ScadutoIeri', product: 'B', offerDate: '2026-07-31', expiryDate: '2026-08-10', price: 10 },
    { id: '3', supermarket: 'ScadeOggi', product: 'C', offerDate: '2026-08-01', expiryDate: '2026-08-11', price: 10 },
    { id: '4', supermarket: 'Rinnovato', product: 'D', offerDate: '2026-08-10', expiryDate: '2026-08-20', price: 10 }
  ];
  const statuses = A.supermarketRenewalStatus(rows, '2026-08-11');
  assert.deepEqual(statuses.map((item) => item.supermarket), ['ScadutoDaTempo', 'ScadutoIeri', 'ScadeOggi', 'Rinnovato']);
});

test('combinationStats calcola storico e statistiche temporali della combinazione selezionata', () => {
  const rows = [
    { id: '1', supermarket: 'Conad', product: 'GranBiscotto', offerDate: '2026-07-20', expiryDate: '2026-07-30', price: 10 },
    { id: '2', supermarket: 'Conad', product: 'GranBiscotto', offerDate: '2026-08-01', expiryDate: '2026-08-12', price: 12 },
    { id: '3', supermarket: 'Conad', product: 'GranBiscotto', offerDate: '2026-08-10', expiryDate: '2026-08-20', price: 14 },
    { id: '4', supermarket: 'Conad', product: 'Altro', offerDate: '2026-08-09', expiryDate: '2026-08-19', price: 7 },
    { id: '5', supermarket: 'Coop', product: 'GranBiscotto', offerDate: '2026-08-08', expiryDate: '2026-08-18', price: 20 }
  ];

  const stats = A.combinationStats(rows, 'Conad', 'GranBiscotto', '2026-08-11');
  assert.equal(stats.count, 3);
  assert.equal(stats.averagePrice, 12);
  assert.equal(stats.minPrice, 10);
  assert.equal(stats.maxPrice, 14);
  assert.equal(stats.lastPrice, 14);
  assert.equal(stats.previousPrice, 12);
  assert.equal(stats.priceDelta, 2);
  assert.equal(stats.lastOfferDate, '2026-08-10');
  assert.equal(stats.lastExpiryDate, '2026-08-20');
  assert.equal(stats.daysSinceLastOffer, 1);
  assert.equal(stats.averageRenewalDays, 10.5);
  assert.equal(stats.currentMonthCount, 2);
  assert.equal(stats.currentQuarterCount, 3);
  assert.equal(stats.currentYearCount, 3);
  assert.deepEqual(stats.trend.map((item) => [item.offerDate, item.price]), [
    ['2026-07-20', 10],
    ['2026-08-01', 12],
    ['2026-08-10', 14]
  ]);
});
