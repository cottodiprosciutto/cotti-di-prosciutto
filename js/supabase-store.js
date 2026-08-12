(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CDPCloudStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  let config = root.CDP_CONFIG || {};
  let client = null;
  let subscriptions = [];

  function periodFields(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) throw new Error('Data offerta non valida');
    const year = Number(match[1]);
    const month = Number(match[2]);
    return { month: `${year}-${String(month).padStart(2, '0')}`, quarter: `${year}-Q${Math.floor((month - 1) / 3) + 1}`, year: String(year) };
  }

  function isConfigured(candidate = config) {
    const url = String(candidate?.supabaseUrl || '').trim();
    const key = String(candidate?.supabasePublishableKey || '').trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return false;
    if (!key || /YOUR_|PLACEHOLDER/i.test(key)) return false;
    return key.startsWith('sb_publishable_') || key.startsWith('eyJ');
  }

  function configure(nextConfig) {
    config = nextConfig || root.CDP_CONFIG || {};
    client = null;
    if (isConfigured(config) && root.supabase && typeof root.supabase.createClient === 'function') {
      client = root.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    }
    return { configured: isConfigured(config), sdkAvailable: !!(root.supabase && root.supabase.createClient), client };
  }

  function getClient() {
    if (!client) configure(config);
    if (!isConfigured(config)) throw new Error('Supabase non configurato: compila js/config.js');
    if (!client) throw new Error('SDK Supabase non disponibile');
    return client;
  }

  function relationValue(value) { return Array.isArray(value) ? value[0] : value; }

  function normalizeOfferRow(row) {
    const supermarket = relationValue(row.supermarket || row.supermarkets) || {};
    const product = relationValue(row.product || row.products) || {};
    const variant = relationValue(row.variant || row.product_variants) || {};
    const brand = relationValue(product.brand || product.brands) || {};
    const offerDate = row.offer_date || row.offerDate;
    const expiryDate = row.expiry_date || row.expiryDate;
    const origin = row.source || row.origin || 'manual';
    const mode = String(product.mode || row.mode || 'taglio');
    const price = Number(row.price);
    const weightGrams = variant.weight_grams == null ? null : Number(variant.weight_grams);
    const comparisonPrice = mode === 'vaschetta' && weightGrams ? Math.round((price * 1000 / weightGrams) * 100) / 100 : price;
    return {
      id: String(row.id),
      supermarketId: supermarket.id ? String(supermarket.id) : String(row.supermarket_id || row.supermarketId || ''),
      productId: product.id ? String(product.id) : String(row.product_id || row.productId || ''),
      variantId: variant.id ? String(variant.id) : (row.variant_id ? String(row.variant_id) : null),
      supermarket: supermarket.name || row.supermarket || '',
      product: product.name || row.product || '',
      mode,
      type: row.type || product.default_type || '',
      price,
      weightGrams,
      comparisonPrice,
      brand: brand.id ? { id: String(brand.id), name: brand.name || '', logo_path: brand.logo_path || '' } : null,
      productImagePath: product.image_path || '',
      offerDate,
      expiryDate,
      ...periodFields(offerDate),
      origin,
      isUser: origin !== 'historical',
      createdAt: row.created_at || row.createdAt || ''
    };
  }

  const OFFER_SELECT = 'id,supermarket_id,product_id,variant_id,type,price,offer_date,expiry_date,source,created_at';

  function assembleSnapshot(raw = {}) {
    const supermarkets = raw.supermarkets || [];
    const brands = raw.brands || [];
    const variants = raw.variants || [];
    const supermarketById = new Map(supermarkets.map((item) => [String(item.id), item]));
    const brandById = new Map(brands.map((item) => [String(item.id), item]));
    const variantById = new Map(variants.map((item) => [String(item.id), item]));
    const products = (raw.products || []).map((item) => ({
      ...item,
      brand: item.brand_id ? (brandById.get(String(item.brand_id)) || null) : null
    }));
    const productById = new Map(products.map((item) => [String(item.id), item]));
    const rows = (raw.offers || []).map((row) => normalizeOfferRow({
      ...row,
      supermarket: supermarketById.get(String(row.supermarket_id)) || null,
      product: productById.get(String(row.product_id)) || null,
      variant: row.variant_id ? (variantById.get(String(row.variant_id)) || null) : null
    }));
    return { rows, catalogs: { supermarkets, products, brands, variants } };
  }

  async function loadSnapshot() {
    const db = getClient();
    const [offersResult, supermarketsResult, productsResult, brandsResult, variantsResult] = await Promise.all([
      db.from('offers').select('*').order('offer_date', { ascending: true }),
      db.from('supermarkets').select('*').order('name', { ascending: true }),
      db.from('products').select('*').order('name', { ascending: true }),
      db.from('brands').select('*').order('name', { ascending: true }),
      db.from('product_variants').select('*').order('weight_grams', { ascending: true })
    ]);
    const results = [
      ['offers', offersResult],
      ['supermarkets', supermarketsResult],
      ['products', productsResult],
      ['brands', brandsResult],
      ['product_variants', variantsResult]
    ];
    for (const [table, result] of results) {
      if (result.error) {
        const detail = result.error.message || result.error.details || 'errore sconosciuto';
        throw new Error(`Errore Supabase sulla tabella ${table}: ${detail}`);
      }
    }
    return assembleSnapshot({
      offers: offersResult.data || [],
      supermarkets: supermarketsResult.data || [],
      products: productsResult.data || [],
      brands: brandsResult.data || [],
      variants: variantsResult.data || []
    });
  }

  async function loadDataset() { return (await loadSnapshot()).rows; }
  async function loadCatalogs() { return (await loadSnapshot()).catalogs; }

  async function getSession() { const { data, error } = await getClient().auth.getSession(); if (error) throw error; return data?.session || null; }
  async function signIn(email, password) { const { data, error } = await getClient().auth.signInWithPassword({ email: String(email || '').trim(), password: String(password || '') }); if (error) throw error; return data?.session || null; }
  async function signOut() { const { error } = await getClient().auth.signOut(); if (error) throw error; }
  async function isAdmin() { const { data, error } = await getClient().rpc('is_admin'); if (error) throw error; return data === true; }

  async function addOffer(input) {
    const payload = {
      supermarket_id: input.supermarketId,
      product_id: input.productId,
      variant_id: input.variantId || null,
      type: String(input.type || '').trim() || null,
      price: Number(input.price),
      offer_date: input.offerDate,
      expiry_date: input.expiryDate,
      source: 'manual'
    };
    const { data, error } = await getClient().from('offers').insert(payload).select(OFFER_SELECT).single();
    if (error) throw error;
    return data;
  }

  async function deleteOffer(id) { const { error } = await getClient().from('offers').delete().eq('id', id); if (error) throw error; }

  async function addSupermarket(name) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome supermercato obbligatorio');
    const { data, error } = await getClient().from('supermarkets').insert({ name: normalized }).select('id,name').single();
    if (error) throw error;
    return data;
  }

  async function addBrand(name) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome marchio obbligatorio');
    const { data, error } = await getClient().from('brands').insert({ name: normalized }).select('id,name,slug,logo_path').single();
    if (error) throw error;
    return data;
  }

  async function addProduct(name, defaultType, options = {}) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome prosciutto obbligatorio');
    const payload = {
      name: normalized,
      default_type: String(defaultType || '').trim() || null,
      mode: options.mode || 'taglio',
      brand_id: options.brandId || null
    };
    const { data, error } = await getClient().from('products').insert(payload).select('id,name,default_type,mode,brand_id,image_path').single();
    if (error) throw error;
    return data;
  }

  async function updateProduct(id, patch = {}) {
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'brandId')) payload.brand_id = patch.brandId || null;
    if (Object.prototype.hasOwnProperty.call(patch, 'imagePath')) payload.image_path = patch.imagePath || null;
    if (Object.prototype.hasOwnProperty.call(patch, 'defaultType')) payload.default_type = String(patch.defaultType || '').trim() || null;
    const { data, error } = await getClient().from('products').update(payload).eq('id', id).select('id,name,default_type,mode,brand_id,image_path').single();
    if (error) throw error;
    return data;
  }

  async function addVariant(productId, weightGrams) {
    const weight = Number(weightGrams);
    if (!Number.isInteger(weight) || weight <= 0) throw new Error('Peso non valido');
    const { data, error } = await getClient().from('product_variants').insert({ product_id: productId, weight_grams: weight }).select('id,product_id,weight_grams').single();
    if (error) throw error;
    return data;
  }

  function safeFileName(file) {
    const raw = String(file?.name || 'image').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return raw || 'image';
  }

  async function uploadFile(bucket, ownerId, file) {
    if (!file) throw new Error('Seleziona una immagine');
    if (!/^image\/(jpeg|png|webp)$/i.test(String(file.type || ''))) throw new Error('Formato immagine non supportato');
    if (Number(file.size || 0) > 3 * 1024 * 1024) throw new Error('Immagine troppo grande: massimo 3 MB');
    const path = `${ownerId}/${Date.now()}-${safeFileName(file)}`;
    const { error } = await getClient().storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  }

  async function uploadBrandLogo(brandId, file) {
    const path = await uploadFile('brand-logos', brandId, file);
    const { data, error } = await getClient().from('brands').update({ logo_path: path }).eq('id', brandId).select('id,name,slug,logo_path').single();
    if (error) throw error;
    return data;
  }

  async function uploadProductImage(productId, file) {
    const path = await uploadFile('product-images', productId, file);
    return updateProduct(productId, { imagePath: path });
  }

  function publicAssetUrl(bucket, path) {
    if (!path) return '';
    if (/^data:image\//i.test(String(path))) return String(path);
    const { data } = getClient().storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '';
  }

  function subscribe(onChange) {
    const db = getClient();
    unsubscribe();
    let channel = db.channel(`cdp-live-${Date.now()}`);
    ['offers', 'supermarkets', 'products', 'brands', 'product_variants'].forEach((table) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
    });
    channel.subscribe();
    subscriptions = [channel];
    return () => unsubscribe();
  }

  function unsubscribe() {
    if (!client || !subscriptions.length) return;
    subscriptions.forEach((channel) => client.removeChannel(channel));
    subscriptions = [];
  }

  return {
    isConfigured, configure, normalizeOfferRow, assembleSnapshot, loadSnapshot, loadDataset, loadCatalogs,
    getSession, signIn, signOut, isAdmin,
    addOffer, deleteOffer, addSupermarket, addBrand, addProduct, updateProduct, addVariant,
    uploadBrandLogo, uploadProductImage, publicAssetUrl,
    subscribe, unsubscribe
  };
});
