(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CDPModeController = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeMode(value) {
    const mode = String(value || 'taglio').trim().toLowerCase();
    return mode === 'vaschetta' ? 'vaschetta' : 'taglio';
  }

  function variantsForProduct(variants, productId) {
    return (variants || [])
      .filter((item) => String(item.product_id || item.productId || '') === String(productId || ''))
      .sort((a, b) => Number(a.weight_grams || a.weightGrams || 0) - Number(b.weight_grams || b.weightGrams || 0));
  }

  function scope(rows, catalogs, modeValue) {
    const mode = normalizeMode(modeValue);
    const products = (catalogs?.products || []).filter((item) => normalizeMode(item.mode) === mode);
    const ids = new Set(products.map((item) => String(item.id)));
    return {
      rows: (rows || []).filter((row) => normalizeMode(row.mode) === mode),
      catalogs: {
        supermarkets: [...(catalogs?.supermarkets || [])],
        products,
        brands: [...(catalogs?.brands || [])],
        variants: (catalogs?.variants || []).filter((item) => ids.has(String(item.product_id || item.productId || '')))
      }
    };
  }

  function priceDescriptor(row) {
    const mode = normalizeMode(row?.mode);
    const comparison = Number(row?.comparisonPrice ?? row?.price ?? 0);
    if (mode === 'vaschetta') {
      return {
        packagePrice: Number(row?.price || 0),
        comparisonPrice: comparison,
        weightGrams: row?.weightGrams == null ? null : Number(row.weightGrams),
        unit: '€/kg'
      };
    }
    return { packagePrice: null, comparisonPrice: comparison, weightGrams: null, unit: '€/kg' };
  }

  return { normalizeMode, scope, variantsForProduct, priceDescriptor };
});
