(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CDPDataModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

  function normalizeHistoricalRows(rows) {
    return rows.map((row, index) => {
      const offerDate = deriveOfferDate(row.expiryDate);
      return {
        ...row,
        id: `historic-${row.sourceRow ?? index + 1}`,
        offerDate,
        ...periodFields(offerDate),
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

    return {
      id: id || generateId(),
      supermarket: normalizeText(input.supermarket, 'Supermercato'),
      product: normalizeText(input.product, 'Prodotto'),
      type: normalizeText(input.type, 'Tipologia'),
      price: parsePrice(input.price),
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
    const normalized = createManualOffer({
      supermarket: offer.supermarket,
      product: offer.product,
      type: offer.type,
      price: offer.price,
      expiryDate: offer.expiryDate,
      createdAt: offer.createdAt
    }, offer.offerDate, offer.id);
    return normalized;
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
    normalizeHistoricalRows,
    createManualOffer,
    buildBackup,
    parseBackup,
    localIsoDate,
    shiftDays
  };
});
