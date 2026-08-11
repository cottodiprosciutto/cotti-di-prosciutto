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
    const quarter = Math.floor((month - 1) / 3) + 1;
    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      quarter: `${year}-Q${quarter}`,
      year: String(year)
    };
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
      client = root.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return { configured: isConfigured(config), sdkAvailable: !!(root.supabase && root.supabase.createClient), client };
  }

  function getClient() {
    if (!client) configure(config);
    if (!isConfigured(config)) throw new Error('Supabase non configurato: compila js/config.js');
    if (!client) throw new Error('SDK Supabase non disponibile');
    return client;
  }

  function relationValue(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function normalizeOfferRow(row) {
    const supermarket = relationValue(row.supermarket || row.supermarkets) || {};
    const product = relationValue(row.product || row.products) || {};
    const offerDate = row.offer_date || row.offerDate;
    const expiryDate = row.expiry_date || row.expiryDate;
    const origin = row.source || row.origin || 'manual';
    return {
      id: String(row.id),
      supermarketId: supermarket.id ? String(supermarket.id) : String(row.supermarket_id || row.supermarketId || ''),
      productId: product.id ? String(product.id) : String(row.product_id || row.productId || ''),
      supermarket: supermarket.name || row.supermarket || '',
      product: product.name || row.product || '',
      type: row.type || product.default_type || '',
      price: Number(row.price),
      offerDate,
      expiryDate,
      ...periodFields(offerDate),
      origin,
      isUser: origin !== 'historical',
      createdAt: row.created_at || row.createdAt || ''
    };
  }

  const OFFER_SELECT = 'id,type,price,offer_date,expiry_date,source,created_at,supermarket:supermarkets(id,name),product:products(id,name,default_type)';

  async function loadDataset() {
    const { data, error } = await getClient().from('offers').select(OFFER_SELECT).order('offer_date', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeOfferRow);
  }

  async function loadCatalogs() {
    const db = getClient();
    const [supermarketsResult, productsResult] = await Promise.all([
      db.from('supermarkets').select('id,name').order('name', { ascending: true }),
      db.from('products').select('id,name,default_type').order('name', { ascending: true })
    ]);
    if (supermarketsResult.error) throw supermarketsResult.error;
    if (productsResult.error) throw productsResult.error;
    return { supermarkets: supermarketsResult.data || [], products: productsResult.data || [] };
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({ email: String(email || '').trim(), password: String(password || '') });
    if (error) throw error;
    return data?.session || null;
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  }

  async function isAdmin() {
    const { data, error } = await getClient().rpc('is_admin');
    if (error) throw error;
    return data === true;
  }

  async function addOffer(input) {
    const payload = {
      supermarket_id: input.supermarketId,
      product_id: input.productId,
      type: String(input.type || '').trim(),
      price: Number(input.price),
      offer_date: input.offerDate,
      expiry_date: input.expiryDate,
      source: 'manual'
    };
    const { data, error } = await getClient().from('offers').insert(payload).select(OFFER_SELECT).single();
    if (error) throw error;
    return normalizeOfferRow(data);
  }

  async function deleteOffer(id) {
    const { error } = await getClient().from('offers').delete().eq('id', id);
    if (error) throw error;
  }

  async function addSupermarket(name) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome supermercato obbligatorio');
    const { data, error } = await getClient().from('supermarkets').insert({ name: normalized }).select('id,name').single();
    if (error) throw error;
    return data;
  }

  async function addProduct(name, defaultType) {
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Nome prosciutto obbligatorio');
    const { data, error } = await getClient().from('products').insert({ name: normalized, default_type: String(defaultType || '').trim() || null }).select('id,name,default_type').single();
    if (error) throw error;
    return data;
  }

  function subscribe(onChange) {
    const db = getClient();
    unsubscribe();
    const channel = db.channel(`cdp-live-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supermarkets' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
      .subscribe();
    subscriptions = [channel];
    return () => unsubscribe();
  }

  function unsubscribe() {
    if (!client || !subscriptions.length) return;
    subscriptions.forEach((channel) => client.removeChannel(channel));
    subscriptions = [];
  }

  return {
    isConfigured,
    configure,
    normalizeOfferRow,
    loadDataset,
    loadCatalogs,
    getSession,
    signIn,
    signOut,
    isAdmin,
    addOffer,
    deleteOffer,
    addSupermarket,
    addProduct,
    subscribe,
    unsubscribe
  };
});
