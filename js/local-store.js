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

  function writeJson(key, value) {
    storage().setItem(key, JSON.stringify(value));
  }

  function id(prefix) {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return `${prefix}-${root.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    return Array.isArray(offers) ? offers : [];
  }

  function saveOffers(offers) {
    writeJson(OFFERS_KEY, Array.isArray(offers) ? offers : []);
  }

  function loadCatalogExtras() {
    const catalogs = readJson(CATALOGS_KEY, { supermarkets: [], products: [] });
    return {
      supermarkets: Array.isArray(catalogs?.supermarkets) ? catalogs.supermarkets : [],
      products: Array.isArray(catalogs?.products) ? catalogs.products : []
    };
  }

  function saveCatalogExtras(catalogs) {
    writeJson(CATALOGS_KEY, {
      supermarkets: Array.isArray(catalogs?.supermarkets) ? catalogs.supermarkets : [],
      products: Array.isArray(catalogs?.products) ? catalogs.products : []
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

  function addProduct(name, defaultType) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome prosciutto obbligatorio');
    const catalogs = loadCatalogExtras();
    const duplicate = catalogs.products.find((item) => item.name.toLocaleLowerCase('it') === normalized.toLocaleLowerCase('it'));
    if (duplicate) return duplicate;
    const created = { id: id('local-product'), name: normalized, default_type: String(defaultType || '').trim() || '' };
    catalogs.products.push(created);
    saveCatalogExtras(catalogs);
    return created;
  }

  function periodFields(offerDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(offerDate || ''));
    if (!match) throw new Error('Data offerta non valida');
    const year = Number(match[1]);
    const month = Number(match[2]);
    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      quarter: `${year}-Q${Math.floor((month - 1) / 3) + 1}`,
      year: String(year)
    };
  }

  function addOffer(input) {
    const offerDate = String(input.offerDate || '').trim();
    const expiryDate = String(input.expiryDate || '').trim();
    const created = {
      id: id('local-offer'),
      supermarketId: String(input.supermarketId || ''),
      productId: String(input.productId || ''),
      supermarket: String(input.supermarket || '').trim(),
      product: String(input.product || '').trim(),
      type: String(input.type || '').trim(),
      price: Number(input.price),
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

  function openSession(username) {
    sessionStorageRef().setItem(SESSION_KEY, JSON.stringify({ username: String(username || '').trim(), openedAt: new Date().toISOString() }));
  }

  function sessionUser() {
    try {
      const raw = sessionStorageRef().getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.username || '';
    } catch (_) {
      return '';
    }
  }

  function hasSession() {
    return !!sessionUser();
  }

  function clearSession() {
    try { sessionStorageRef().removeItem(SESSION_KEY); } catch (_) { /* noop */ }
  }

  function clearAll() {
    try {
      storage().removeItem(OFFERS_KEY);
      storage().removeItem(CATALOGS_KEY);
    } catch (_) { /* noop */ }
    clearSession();
  }

  return {
    isLocalEnvironment,
    authenticate,
    loadOffers,
    loadCatalogExtras,
    addSupermarket,
    addProduct,
    addOffer,
    deleteOffer,
    openSession,
    sessionUser,
    hasSession,
    clearSession,
    clearAll
  };
});
