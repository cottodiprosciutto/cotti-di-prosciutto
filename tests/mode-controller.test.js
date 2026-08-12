const test = require('node:test');
const assert = require('node:assert/strict');
const MC = require('../js/mode-controller.js');

test('filtra offerte e cataloghi senza mescolare taglio e vaschetta', () => {
  const rows = [
    { id: 't1', mode: 'taglio', product: 'GranBiscotto' },
    { id: 'v1', mode: 'vaschetta', product: 'GranBiscotto', variantId: 'g100' }
  ];
  const catalogs = {
    supermarkets: [{ id: 's1', name: 'Conad' }],
    brands: [{ id: 'b1', name: 'Rovagnati' }],
    products: [
      { id: 'pt', name: 'GranBiscotto', mode: 'taglio' },
      { id: 'pv', name: 'GranBiscotto', mode: 'vaschetta' }
    ],
    variants: [
      { id: 'g100', product_id: 'pv', weight_grams: 100 },
      { id: 'g200', product_id: 'pv', weight_grams: 200 }
    ]
  };

  const taglio = MC.scope(rows, catalogs, 'taglio');
  assert.deepEqual(taglio.rows.map(x => x.id), ['t1']);
  assert.deepEqual(taglio.catalogs.products.map(x => x.id), ['pt']);
  assert.deepEqual(taglio.catalogs.variants, []);
  assert.equal(taglio.catalogs.supermarkets.length, 1);
  assert.equal(taglio.catalogs.brands.length, 1);

  const vaschetta = MC.scope(rows, catalogs, 'vaschetta');
  assert.deepEqual(vaschetta.rows.map(x => x.id), ['v1']);
  assert.deepEqual(vaschetta.catalogs.products.map(x => x.id), ['pv']);
  assert.deepEqual(vaschetta.catalogs.variants.map(x => x.id), ['g100', 'g200']);
});

test('varianti prodotto sono ordinate per grammatura', () => {
  const variants = [
    { id: '2', product_id: 'p', weight_grams: 200 },
    { id: '1', product_id: 'p', weight_grams: 80 },
    { id: 'x', product_id: 'other', weight_grams: 50 }
  ];
  assert.deepEqual(MC.variantsForProduct(variants, 'p').map(x => x.weight_grams), [80, 200]);
});

test('descrizione prezzo vaschetta mantiene confezione e confronto al kg', () => {
  assert.deepEqual(MC.priceDescriptor({ mode: 'vaschetta', price: 1.59, comparisonPrice: 14.45, weightGrams: 110 }), {
    packagePrice: 1.59,
    comparisonPrice: 14.45,
    weightGrams: 110,
    unit: '€/kg'
  });
  assert.deepEqual(MC.priceDescriptor({ mode: 'taglio', price: 12.9 }), {
    packagePrice: null,
    comparisonPrice: 12.9,
    weightGrams: null,
    unit: '€/kg'
  });
});
