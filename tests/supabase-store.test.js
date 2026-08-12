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
  assert.equal(row.id, 'offer-1');
  assert.equal(row.supermarketId, 's1');
  assert.equal(row.productId, 'p1');
  assert.equal(row.supermarket, 'Conad');
  assert.equal(row.product, 'Rovagnati - GranBiscotto');
  assert.equal(row.mode, 'taglio');
  assert.equal(row.type, 'Alta Qualità');
  assert.equal(row.price, 12.9);
  assert.equal(row.comparisonPrice, 12.9);
  assert.equal(row.offerDate, '2026-08-11');
  assert.equal(row.expiryDate, '2026-08-21');
  assert.equal(row.month, '2026-08');
  assert.equal(row.quarter, '2026-Q3');
  assert.equal(row.year, '2026');
  assert.equal(row.origin, 'manual');
  assert.equal(row.isUser, true);
  assert.equal(row.createdAt, '2026-08-11T10:00:00Z');
});

test('espone le operazioni cloud richieste', () => {
  for (const name of ['configure', 'loadDataset', 'loadCatalogs', 'getSession', 'signIn', 'signOut', 'addOffer', 'deleteOffer', 'addSupermarket', 'addProduct', 'subscribe']) {
    assert.equal(typeof Store[name], 'function', `${name} deve essere una funzione`);
  }
});

test('normalizza una offerta vaschetta con marchio, immagine e grammatura', () => {
  const row = Store.normalizeOfferRow({
    id: 'offer-v1',
    type: null,
    price: '1.59',
    offer_date: '2026-08-12',
    expiry_date: '2026-08-20',
    source: 'historical',
    supermarket: { id: 's1', name: 'Coop' },
    product: {
      id: 'p1', name: 'GranTerre - Liberamente', mode: 'vaschetta', image_path: 'p1/foto.webp',
      brand: { id: 'b1', name: 'GranTerre', logo_path: 'b1/logo.webp' }
    },
    variant: { id: 'v1', weight_grams: 110 }
  });
  assert.equal(row.mode, 'vaschetta');
  assert.equal(row.variantId, 'v1');
  assert.equal(row.weightGrams, 110);
  assert.equal(row.price, 1.59);
  assert.equal(row.comparisonPrice, 14.45);
  assert.equal(row.brand.name, 'GranTerre');
  assert.equal(row.productImagePath, 'p1/foto.webp');
});

test('espone gestione marchi, varianti e immagini cloud', () => {
  for (const name of ['addBrand', 'addVariant', 'updateProduct', 'uploadBrandLogo', 'uploadProductImage', 'publicAssetUrl']) {
    assert.equal(typeof Store[name], 'function', `${name} deve essere una funzione`);
  }
});
