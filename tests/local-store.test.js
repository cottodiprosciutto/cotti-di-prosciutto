const test = require('node:test');
const assert = require('node:assert/strict');

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

global.localStorage = new MemoryStorage();
global.sessionStorage = new MemoryStorage();
const Local = require('../js/local-store.js');

test('login locale accetta solo le credenziali configurate', () => {
  const config = { localAdminUsername: 'admin', localAdminPassword: 'cotto2026' };
  assert.equal(Local.authenticate('admin', 'cotto2026', config), true);
  assert.equal(Local.authenticate('admin', 'sbagliata', config), false);
});

test('modalità locale è permessa solo da file o localhost', () => {
  assert.equal(Local.isLocalEnvironment({ protocol: 'file:', hostname: '' }), true);
  assert.equal(Local.isLocalEnvironment({ protocol: 'http:', hostname: 'localhost' }), true);
  assert.equal(Local.isLocalEnvironment({ protocol: 'http:', hostname: '127.0.0.1' }), true);
  assert.equal(Local.isLocalEnvironment({ protocol: 'https:', hostname: 'utente.github.io' }), false);
});

test('offerte e cataloghi locali persistono nel browser', () => {
  Local.clearAll();
  const supermarket = Local.addSupermarket('Nuovo Market');
  const product = Local.addProduct('Marca - Cotto Test', 'Alta Qualità');
  const offer = Local.addOffer({
    supermarketId: supermarket.id,
    productId: product.id,
    supermarket: supermarket.name,
    product: product.name,
    type: 'Alta Qualità',
    price: 12.9,
    offerDate: '2026-08-11',
    expiryDate: '2026-08-21'
  });

  assert.equal(Local.loadOffers().length, 1);
  assert.equal(Local.loadOffers()[0].id, offer.id);
  assert.equal(Local.loadCatalogExtras().supermarkets[0].name, 'Nuovo Market');
  assert.equal(Local.loadCatalogExtras().products[0].name, 'Marca - Cotto Test');

  Local.deleteOffer(offer.id);
  assert.equal(Local.loadOffers().length, 0);
});

test('sessione admin locale può essere aperta e chiusa', () => {
  Local.clearSession();
  assert.equal(Local.hasSession(), false);
  Local.openSession('admin');
  assert.equal(Local.hasSession(), true);
  assert.equal(Local.sessionUser(), 'admin');
  Local.clearSession();
  assert.equal(Local.hasSession(), false);
});
