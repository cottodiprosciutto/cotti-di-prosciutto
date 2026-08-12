(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CDPLocalStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const OFFERS_KEY = 'cdp.local.offers.v1';
  const CATALOGS_KEY = 'cdp.local.catalogs.v1';
  const SESSION_KEY = 'cdp.local.admin.session.v1';

  function storage() {
    if (!root.localStorage) throw new Error('Archiviazione locale non disponibile nel browser');
    return root.localStorage;
  }

  function sessionStorageRef() {
    if (!root.sessionStorage) throw new Error('Sessione locale non disponibile nel browser');
    return root.sessionStorage;
  }

  function readJson(key, fallback) {
    try {
      const raw = storage().getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) { storage().setItem(key, JSON.stringify(value)); }

  function id(prefix) {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return `${prefix}-${root.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function modeOf(value) {
    const mode = String(value || 'taglio').trim().toLowerCase();
    if (!['taglio', 'vaschetta'].includes(mode)) throw new Error('Modalità prodotto non valida');
    return mode;
  }

  function isLocalEnvironment(locationLike = root.location || {}) {
    const protocol = String(locationLike.protocol || '').toLowerCase();
    const hostname = String(locationLike.hostname || '').toLowerCase();
    return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  }

  function authenticate(username, password, config = root.CDP_CONFIG || {}) {
    const expectedUser = String(config.localAdminUsername || '').trim();
    const expectedPassword = String(config.localAdminPassword || '');
    if (!expectedUser || !expectedPassword) return false;
    return String(username || '').trim() === expectedUser && String(password || '') === expectedPassword;
  }

  function loadOffers() {
    const offers = readJson(OFFERS_KEY, []);
    if (!Array.isArray(offers)) return [];
    return offers.map((offer) => ({
      ...offer,
      mode: modeOf(offer.mode || 'taglio'),
      weightGrams: offer.weightGrams == null ? null : Number(offer.weightGrams),
      comparisonPrice: Number(offer.comparisonPrice || offer.price || 0)
    }));
  }

  function saveOffers(offers) { writeJson(OFFERS_KEY, Array.isArray(offers) ? offers : []); }

  function loadCatalogExtras() {
    const catalogs = readJson(CATALOGS_KEY, { supermarkets: [], products: [], brands: [], variants: [] });
    return {
      supermarkets: Array.isArray(catalogs?.supermarkets) ? catalogs.supermarkets : [],
      products: Array.isArray(catalogs?.products) ? catalogs.products.map((item) => ({
        ...item,
        mode: modeOf(item.mode || 'taglio'),
        brand_id: item.brand_id || item.brandId || null,
        image_path: item.image_path || item.imagePath || ''
      })) : [],
      brands: Array.isArray(catalogs?.brands) ? catalogs.brands : [],
      variants: Array.isArray(catalogs?.variants) ? catalogs.variants.map((item) => ({ ...item, weight_grams: Number(item.weight_grams || item.weightGrams) })) : []
    };
  }

  function saveCatalogExtras(catalogs) {
    writeJson(CATALOGS_KEY, {
      supermarkets: Array.isArray(catalogs?.supermarkets) ? catalogs.supermarkets : [],
      products: Array.isArray(catalogs?.products) ? catalogs.products : [],
      brands: Array.isArray(catalogs?.brands) ? catalogs.brands : [],
      variants: Array.isArray(catalogs?.variants) ? catalogs.variants : []
    });
  }

  function addSupermarket(name) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome supermercato obbligatorio');
    const catalogs = loadCatalogExtras();
    const duplicate = catalogs.supermarkets.find((item) => item.name.toLocaleLowerCase('it') === normalized.toLocaleLowerCase('it'));
    if (duplicate) return duplicate;
    const created = { id: id('local-supermarket'), name: normalized };
    catalogs.supermarkets.push(created);
    saveCatalogExtras(catalogs);
    return created;
  }

  function addBrand(name) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome marchio obbligatorio');
    const catalogs = loadCatalogExtras();
    const duplicate = catalogs.brands.find((item) => item.name.toLocaleLowerCase('it') === normalized.toLocaleLowerCase('it'));
    if (duplicate) return duplicate;
    const created = { id: id('local-brand'), name: normalized, logo_path: '' };
    catalogs.brands.push(created);
    saveCatalogExtras(catalogs);
    return created;
  }

  function addProduct(name, defaultType, options = {}) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome prosciutto obbligatorio');
    const mode = modeOf(options.mode || 'taglio');
    const catalogs = loadCatalogExtras();
    const duplicate = catalogs.products.find((item) => item.mode === mode && item.name.toLocaleLowerCase('it') === normalized.toLocaleLowerCase('it'));
    if (duplicate) return duplicate;
    const created = {
      id: id('local-product'),
      name: normalized,
      default_type: String(defaultType || '').trim() || '',
      mode,
      brand_id: options.brandId || null,
      image_path: options.imagePath || ''
    };
    catalogs.products.push(created);
    saveCatalogExtras(catalogs);
    return created;
  }

  function addVariant(productId, weightGrams) {
    const product = String(productId || '').trim();
    const weight = Number(weightGrams);
    if (!product) throw new Error('Prodotto obbligatorio');
    if (!Number.isInteger(weight) || weight <= 0) throw new Error('Peso non valido');
    const catalogs = loadCatalogExtras();
    const duplicate = catalogs.variants.find((item) => String(item.product_id) === product && Number(item.weight_grams) === weight);
    if (duplicate) return duplicate;
    const created = { id: id('local-variant'), product_id: product, weight_grams: weight };
    catalogs.variants.push(created);
    saveCatalogExtras(catalogs);
    return created;
  }

  function setBrandLogo(brandId, dataUrl) {
    const catalogs = loadCatalogExtras();
    const brand = catalogs.brands.find((item) => String(item.id) === String(brandId));
    if (!brand) throw new Error('Marchio non trovato');
    brand.logo_path = String(dataUrl || '');
    saveCatalogExtras(catalogs);
    return brand;
  }

  function setProductImage(productId, dataUrl) {
    const catalogs = loadCatalogExtras();
    const product = catalogs.products.find((item) => String(item.id) === String(productId));
    if (!product) throw new Error('Prodotto non trovato');
    product.image_path = String(dataUrl || '');
    saveCatalogExtras(catalogs);
    return product;
  }

  function updateProduct(productId, patch = {}) {
    const catalogs = loadCatalogExtras();
    const product = catalogs.products.find((item) => String(item.id) === String(productId));
    if (!product) throw new Error('Prodotto non trovato');
    if (Object.prototype.hasOwnProperty.call(patch, 'brandId')) product.brand_id = patch.brandId || null;
    if (Object.prototype.hasOwnProperty.call(patch, 'defaultType')) product.default_type = String(patch.defaultType || '').trim();
    saveCatalogExtras(catalogs);
    return product;
  }

  function periodFields(offerDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(offerDate || ''));
    if (!match) throw new Error('Data offerta non valida');
    const year = Number(match[1]);
    const month = Number(match[2]);
    return { month: `${year}-${String(month).padStart(2, '0')}`, quarter: `${year}-Q${Math.floor((month - 1) / 3) + 1}`, year: String(year) };
  }

  function addOffer(input) {
    const offerDate = String(input.offerDate || '').trim();
    const expiryDate = String(input.expiryDate || '').trim();
    const mode = modeOf(input.mode || 'taglio');
    const weightGrams = input.weightGrams == null || input.weightGrams === '' ? null : Number(input.weightGrams);
    if (mode === 'vaschetta' && (!Number.isInteger(weightGrams) || weightGrams <= 0)) throw new Error('Peso obbligatorio per i cotti in vaschetta');
    const price = Number(input.price);
    const comparisonPrice = mode === 'vaschetta' ? Math.round((price * 1000 / weightGrams) * 100) / 100 : price;
    const created = {
      id: id('local-offer'),
      supermarketId: String(input.supermarketId || ''),
      productId: String(input.productId || ''),
      variantId: input.variantId ? String(input.variantId) : null,
      supermarket: String(input.supermarket || '').trim(),
      product: String(input.product || '').trim(),
      mode,
      type: String(input.type || '').trim(),
      price,
      weightGrams,
      comparisonPrice,
      offerDate,
      expiryDate,
      ...periodFields(offerDate),
      origin: 'manual',
      isUser: true,
      createdAt: new Date().toISOString()
    };
    const offers = loadOffers();
    offers.push(created);
    saveOffers(offers);
    return created;
  }

  function deleteOffer(offerId) {
    const before = loadOffers();
    const after = before.filter((item) => String(item.id) !== String(offerId));
    saveOffers(after);
    return after.length !== before.length;
  }

  function openSession(username) { sessionStorageRef().setItem(SESSION_KEY, JSON.stringify({ username: String(username || '').trim(), openedAt: new Date().toISOString() })); }
  function sessionUser() {
    try { const raw = sessionStorageRef().getItem(SESSION_KEY); return raw ? (JSON.parse(raw)?.username || '') : ''; } catch (_) { return ''; }
  }
  function hasSession() { return !!sessionUser(); }
  function clearSession() { try { sessionStorageRef().removeItem(SESSION_KEY); } catch (_) { /* noop */ } }
  function clearAll() {
    try { storage().removeItem(OFFERS_KEY); storage().removeItem(CATALOGS_KEY); } catch (_) { /* noop */ }
    clearSession();
  }

  return {
    isLocalEnvironment, authenticate, loadOffers, loadCatalogExtras,
    addSupermarket, addBrand, addProduct, addVariant, setBrandLogo, setProductImage, updateProduct,
    addOffer, deleteOffer, openSession, sessionUser, hasSession, clearSession, clearAll
  };
});
