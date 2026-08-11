const test = require('node:test');
const assert = require('node:assert/strict');
const Store = require('../js/supabase-store.js');

test('riconosce una configurazione Supabase valida e rifiuta i placeholder', () => {
  assert.equal(Store.isConfigured({ supabaseUrl: 'https://abc.supabase.co', supabasePublishableKey: 'sb_publishable_test' }), true);
  assert.equal(Store.isConfigured({ supabaseUrl: 'https://YOUR_PROJECT.supabase.co', supabasePublishableKey: 'YOUR_PUBLISHABLE_KEY' }), false);
});

test('normalizza una riga Supabase nel modello usato dalla dashboard', () => {
  const row = Store.normalizeOfferRow({
    id: 'offer-1',
    type: 'Alta Qualità',
    price: '12.90',
    offer_date: '2026-08-11',
    expiry_date: '2026-08-21',
    source: 'manual',
    created_at: '2026-08-11T10:00:00Z',
    supermarket: { id: 's1', name: 'Conad' },
    product: { id: 'p1', name: 'Rovagnati - GranBiscotto', default_type: 'Alta Qualità' }
  });
  assert.deepEqual(row, {
    id: 'offer-1', supermarketId: 's1', productId: 'p1', supermarket: 'Conad', product: 'Rovagnati - GranBiscotto',
    type: 'Alta Qualità', price: 12.9, offerDate: '2026-08-11', expiryDate: '2026-08-21',
    month: '2026-08', quarter: '2026-Q3', year: '2026', origin: 'manual', isUser: true,
    createdAt: '2026-08-11T10:00:00Z'
  });
});

test('espone le operazioni cloud richieste', () => {
  for (const name of ['configure', 'loadDataset', 'loadCatalogs', 'getSession', 'signIn', 'signOut', 'addOffer', 'deleteOffer', 'addSupermarket', 'addProduct', 'subscribe']) {
    assert.equal(typeof Store[name], 'function', `${name} deve essere una funzione`);
  }
});
