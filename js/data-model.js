(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CDPDataModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const MODES = ['taglio', 'vaschetta'];

  function assertIsoDate(value, label = 'Data') {
    if (!ISO_DATE.test(String(value || ''))) throw new Error(`${label} non valida`);
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error(`${label} non valida`);
    }
    return date;
  }

  function formatUtcDate(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function shiftDays(value, days) {
    const date = assertIsoDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return formatUtcDate(date);
  }

  function deriveOfferDate(expiryDate) {
    return shiftDays(expiryDate, -10);
  }

  function periodFields(offerDate) {
    const date = assertIsoDate(offerDate, 'Data offerta');
    const year = date.getUTCFullYear();
    const monthNumber = date.getUTCMonth() + 1;
    const quarterNumber = Math.floor((monthNumber - 1) / 3) + 1;
    return {
      month: `${year}-${String(monthNumber).padStart(2, '0')}`,
      quarter: `${year}-Q${quarterNumber}`,
      year: String(year)
    };
  }

  function normalizeMode(value) {
    const mode = String(value || 'taglio').trim().toLocaleLowerCase('it');
    if (!MODES.includes(mode)) throw new Error('Modalità prodotto non valida');
    return mode;
  }

  function normalizeWeight(value, required = false) {
    if (value === null || value === undefined || String(value).trim() === '') {
      if (required) throw new Error('Peso obbligatorio per i cotti in vaschetta');
      return null;
    }
    const grams = Number(value);
    if (!Number.isInteger(grams) || grams <= 0) throw new Error('Peso non valido');
    return grams;
  }

  function pricePerKg(price, weightGrams) {
    const numericPrice = parsePrice(price);
    const grams = normalizeWeight(weightGrams, true);
    return Math.round((numericPrice * 1000 / grams) * 100) / 100;
  }

  function normalizeHistoricalRows(rows) {
    return rows.map((row, index) => {
      const offerDate = deriveOfferDate(row.expiryDate);
      const price = parsePrice(row.price);
      return {
        ...row,
        id: `historic-${row.sourceRow ?? index + 1}`,
        offerDate,
        ...periodFields(offerDate),
        mode: 'taglio',
        weightGrams: null,
        variantId: null,
        comparisonPrice: price,
        origin: 'historical',
        isUser: false
      };
    });
  }

  function normalizeText(value, label) {
    const text = String(value ?? '').trim();
    if (!text) throw new Error(`${label} obbligatorio`);
    return text;
  }

  function parsePrice(value) {
    const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim().replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) throw new Error('Prezzo non valido');
    return Math.round(numeric * 100) / 100;
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `manual-${crypto.randomUUID()}`;
    return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createManualOffer(input, today, id) {
    const offerDate = String(today || '').trim();
    assertIsoDate(offerDate, 'Data offerta');
    const expiryDate = String(input.expiryDate || '').trim();
    assertIsoDate(expiryDate, 'Data scadenza');
    if (expiryDate < offerDate) throw new Error('La data di scadenza non può essere precedente alla data offerta');

    const mode = normalizeMode(input.mode);
    const price = parsePrice(input.price);
    const weightGrams = normalizeWeight(input.weightGrams, mode === 'vaschetta');
    const type = mode === 'taglio' ? normalizeText(input.type, 'Tipologia') : String(input.type || '').trim();

    return {
      id: id || generateId(),
      supermarket: normalizeText(input.supermarket, 'Supermercato'),
      product: normalizeText(input.product, 'Prodotto'),
      mode,
      type,
      price,
      weightGrams,
      variantId: input.variantId ? String(input.variantId) : null,
      comparisonPrice: mode === 'vaschetta' ? pricePerKg(price, weightGrams) : price,
      expiryDate,
      offerDate,
      ...periodFields(offerDate),
      origin: 'manual',
      isUser: true,
      createdAt: input.createdAt || new Date().toISOString()
    };
  }

  function validateManualOffer(offer) {
    if (!offer || typeof offer !== 'object') throw new Error('Backup non valido: offerta mancante');
    return createManualOffer({
      supermarket: offer.supermarket,
      product: offer.product,
      mode: offer.mode || 'taglio',
      type: offer.type,
      price: offer.price,
      weightGrams: offer.weightGrams,
      variantId: offer.variantId,
      expiryDate: offer.expiryDate,
      createdAt: offer.createdAt
    }, offer.offerDate, offer.id);
  }

  function buildBackup(userOffers, exportedAt) {
    return {
      format: 'cdp-offers-backup',
      version: 1,
      exportedAt: exportedAt || new Date().toISOString(),
      offers: (userOffers || []).filter((offer) => offer && offer.isUser !== false).map(validateManualOffer)
    };
  }

  function parseBackup(payload) {
    let parsed;
    try {
      parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (error) {
      throw new Error('Backup non valido: JSON illeggibile');
    }
    if (!parsed || parsed.format !== 'cdp-offers-backup' || parsed.version !== 1 || !Array.isArray(parsed.offers)) {
      throw new Error('Backup non valido o versione non supportata');
    }
    return parsed.offers.map(validateManualOffer);
  }

  function localIsoDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return {
    deriveOfferDate,
    periodFields,
    normalizeMode,
    normalizeWeight,
    pricePerKg,
    normalizeHistoricalRows,
    createManualOffer,
    buildBackup,
    parseBackup,
    localIsoDate,
    shiftDays
  };
});
