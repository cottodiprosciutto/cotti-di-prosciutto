const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/data-model.js');

test('deriva la data offerta storica sottraendo esattamente 10 giorni dalla scadenza', () => {
  assert.equal(M.deriveOfferDate('2026-08-20'), '2026-08-10');
  assert.equal(M.deriveOfferDate('2026-01-05'), '2025-12-26');
  assert.equal(M.deriveOfferDate('2024-03-05'), '2024-02-24');
});

test('deriva mese trimestre e anno dalla data offerta', () => {
  assert.deepEqual(M.periodFields('2026-08-10'), {
    month: '2026-08',
    quarter: '2026-Q3',
    year: '2026'
  });
  assert.deepEqual(M.periodFields('2025-12-31'), {
    month: '2025-12',
    quarter: '2025-Q4',
    year: '2025'
  });
});

test('normalizza i record storici usando la data offerta derivata e marca la provenienza', () => {
  const rows = [{
    supermarket: 'Conad',
    product: 'Prodotto A',
    type: 'Alta Qualità',
    expiryDate: '2026-01-05',
    month: '2026-01',
    quarter: '2026-Q1',
    price: 12.9,
    sourceRow: 12
  }];
  const [row] = M.normalizeHistoricalRows(rows);
  assert.equal(row.id, 'historic-12');
  assert.equal(row.offerDate, '2025-12-26');
  assert.equal(row.month, '2025-12');
  assert.equal(row.quarter, '2025-Q4');
  assert.equal(row.year, '2025');
  assert.equal(row.origin, 'historical');
  assert.equal(row.isUser, false);
});

test('crea una nuova offerta usando la data di inserimento come data offerta', () => {
  const offer = M.createManualOffer({
    supermarket: ' Nuovo Market ',
    product: ' Prosciutto Test ',
    type: ' Scelto ',
    price: '10,90',
    expiryDate: '2026-08-20'
  }, '2026-08-11', 'manual-test-id');

  assert.equal(offer.id, 'manual-test-id');
  assert.equal(offer.supermarket, 'Nuovo Market');
  assert.equal(offer.product, 'Prosciutto Test');
  assert.equal(offer.type, 'Scelto');
  assert.equal(offer.price, 10.9);
  assert.equal(offer.offerDate, '2026-08-11');
  assert.equal(offer.month, '2026-08');
  assert.equal(offer.quarter, '2026-Q3');
  assert.equal(offer.year, '2026');
  assert.equal(offer.origin, 'manual');
  assert.equal(offer.isUser, true);
});

test('rifiuta nuove offerte con scadenza precedente alla data offerta', () => {
  assert.throws(() => M.createManualOffer({
    supermarket: 'Conad',
    product: 'Prodotto',
    type: 'Base',
    price: 9.9,
    expiryDate: '2026-08-10'
  }, '2026-08-11', 'id'), /scadenza/i);
});

test('backup e import preservano solo offerte manuali valide', () => {
  const original = [M.createManualOffer({
    supermarket: 'Conad', product: 'Prodotto', type: 'Base', price: 9.9, expiryDate: '2026-08-20'
  }, '2026-08-11', 'manual-1')];
  const backup = M.buildBackup(original, '2026-08-11T10:00:00.000Z');
  assert.equal(backup.format, 'cdp-offers-backup');
  assert.equal(backup.version, 1);
  assert.equal(backup.offers.length, 1);
  const parsed = M.parseBackup(JSON.stringify(backup));
  assert.deepEqual(parsed, original);
});

test('import rifiuta backup con formato non riconosciuto', () => {
  assert.throws(() => M.parseBackup(JSON.stringify({ format: 'altro', version: 1, offers: [] })), /backup/i);
});
