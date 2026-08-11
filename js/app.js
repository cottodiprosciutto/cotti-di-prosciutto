(function () {
  'use strict';

  const data = window.CDP_DATA;
  const M = window.CDPDataModel;
  const Cloud = window.CDPCloudStore;
  const Local = window.CDPLocalStore;
  const A = window.CDPAnalytics;
  const C = window.CDPCharts;

  if (!data || !M || !Cloud || !Local || !A || !C) {
    document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif">Impossibile inizializzare CDP: dati o script mancanti.</p>';
    return;
  }

  const historicalRows = M.normalizeHistoricalRows(data.rows);
  const fmtEuro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNumber = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
  const fmtInt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
  const fmtPct = new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dateFmt = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat('it-IT', { month: 'short', year: 'numeric' });
  const monthLongFmt = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });

  const state = {
    userOffers: [],
    rows: historicalRows.slice(),
    catalogs: { supermarkets: [], products: [] },
    page: 1,
    pageSize: 50,
    liveGranularity: 'month',
    livePeriod: '',
    cloudMode: false,
    localMode: false,
    cloudAvailable: false,
    session: null,
    isAdmin: false,
    toastTimer: null,
    realtimeTimer: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    return value ? dateFmt.format(new Date(`${value}T00:00:00`)) : '—';
  }

  function monthLabel(value, long = false) {
    if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return value || '—';
    const [year, month] = value.split('-').map(Number);
    const formatter = long ? monthLongFmt : monthFmt;
    const formatted = formatter.format(new Date(year, month - 1, 1)).replace('.', '');
    return long ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : formatted;
  }

  function quarterLabel(value) {
    const match = /^(\d{4})-Q([1-4])$/.exec(String(value || ''));
    return match ? `Q${match[2]} ${match[1]}` : value || '—';
  }

  function periodLabel(granularity, key) {
    if (granularity === 'month') return monthLabel(key, true);
    if (granularity === 'quarter') return quarterLabel(key);
    return key || '—';
  }

  function trendLabel(granularity, key) {
    if (granularity === 'month') return formatDate(key).slice(0, 5);
    return monthLabel(key);
  }

  function formatTypes(list) {
    if (!list || !list.length) return '—';
    return list.map((type) => `<span class="tag">${escapeHtml(type)}</span>`).join(' ');
  }

  function fillSelect(select, values, placeholder, selected, labelFn) {
    if (!select) return;
    const normalizedValues = [...new Set(values.filter(Boolean))];
    select.innerHTML = placeholder !== null ? `<option value="">${escapeHtml(placeholder)}</option>` : '';
    normalizedValues.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = labelFn ? labelFn(value) : value;
      if (value === selected) option.selected = true;
      select.appendChild(option);
    });
  }

  function fillDatalist(id, values) {
    const list = $(id);
    if (!list) return;
    list.innerHTML = [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'it'))
      .map((value) => `<option value="${escapeHtml(value)}"></option>`)
      .join('');
  }

  function table(headers, rowsHtml, emptyMessage = 'Nessun dato disponibile') {
    if (!rowsHtml.length) return `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rowsHtml.join('')}</tbody></table></div>`;
  }

  function kpi(label, value, sub = '', tone = '') {
    return `<article class="kpi-card ${tone ? `kpi-${tone}` : ''}"><div class="kpi-label">${escapeHtml(label)}</div><div class="kpi-value">${escapeHtml(value)}</div>${sub ? `<div class="kpi-sub">${escapeHtml(sub)}</div>` : ''}</article>`;
  }

  function metrics(items) {
    return `<div class="detail-metrics">${items.map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
  }

  function originBadge(row) {
    return row.origin === 'manual'
      ? '<span class="origin-badge manual">Inserita</span>'
      : '<span class="origin-badge historical">Storico</span>';
  }

  function rebuildRows() {
    state.rows = A.sortRows(state.rows, 'offerDateAsc');
    state.userOffers = state.rows.filter((row) => row.origin !== 'historical');
  }

  function currentAggregates() {
    const rows = state.rows;
    return {
      summary: A.summarize(rows),
      products: A.productStats(rows),
      supermarkets: A.supermarketStats(rows),
      months: A.monthlyStats(rows),
      quarters: A.quarterlyStats(rows),
      years: A.yearlyStats(rows),
      types: A.typeStats(rows)
    };
  }

  function buildLocalCatalogs() {
    const extras = Local.loadCatalogExtras();
    const supermarketByName = new Map();
    const productByName = new Map();

    (extras.supermarkets || []).forEach((item) => supermarketByName.set(item.name, { ...item }));
    (extras.products || []).forEach((item) => productByName.set(item.name, { ...item }));

    state.rows.forEach((row) => {
      if (row.supermarket && !supermarketByName.has(row.supermarket)) {
        supermarketByName.set(row.supermarket, { id: `local-supermarket-name:${row.supermarket}`, name: row.supermarket });
      }
      if (row.product && !productByName.has(row.product)) {
        productByName.set(row.product, { id: `local-product-name:${row.product}`, name: row.product, default_type: row.type || '' });
      } else if (row.product && !productByName.get(row.product).default_type && row.type) {
        productByName.get(row.product).default_type = row.type;
      }
    });

    return {
      supermarkets: [...supermarketByName.values()].sort((a, b) => a.name.localeCompare(b.name, 'it')),
      products: [...productByName.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'))
    };
  }

  function activeCatalogs() {
    if (state.cloudMode || state.localMode) return state.catalogs;
    return {
      supermarkets: A.supermarketStats(state.rows).map((item) => ({ id: item.name, name: item.name })),
      products: A.productStats(state.rows).map((item) => ({ id: item.name, name: item.name, default_type: '' }))
    };
  }

  function rangeByOffer(rows) {
    if (!rows.length) return ['—', '—'];
    const dates = rows.map((row) => row.offerDate).filter(Boolean).sort();
    return [formatDate(dates[0]), formatDate(dates[dates.length - 1])];
  }

  function denseRankingRows(ranking, entityLabel) {
    return ranking.map((item) => {
      const tied = ranking.filter((x) => x.rank === item.rank).length > 1;
      return `<tr><td><span class="rank-badge">${item.rank}</span></td><td>${tied ? '<span class="tie">Pari merito</span>' : '—'}</td><td>${escapeHtml(item.name)}</td><td>${fmtInt.format(item.count)}</td><td>${item.averagePrice != null ? fmtEuro.format(item.averagePrice) : '—'}</td></tr>`;
    });
  }

  function setStorageStatus(ok, text) {
    state.cloudAvailable = ok;
    const container = $('#storage-status');
    if (!container) return;
    container.classList.toggle('error', !ok);
    container.innerHTML = `<span class="status-dot"></span><span>${escapeHtml(text)}</span>`;
    const submit = $('#save-offer');
    if (submit) submit.disabled = !(ok && state.isAdmin);
  }

  function updateAuthUi() {
    const form = $('#auth-form');
    const user = $('#auth-user');
    const message = $('#auth-message');
    const adminTools = $('#admin-tools');
    const topButton = $('#auth-top-button');
    if (!form || !user || !adminTools) return;

    const writableMode = state.cloudMode || state.localMode;
    const modeLabel = state.cloudMode ? 'Supabase' : (state.localMode ? 'Locale' : 'Sola lettura');
    const badge = $('#storage-form-badge');
    if (badge) badge.textContent = modeLabel;

    if (!writableMode) {
      form.hidden = false;
      user.hidden = true;
      adminTools.hidden = true;
      [...form.elements].forEach((element) => { element.disabled = true; });
      if (message) {
        message.hidden = false;
        message.textContent = 'Modalità sola lettura: configura Supabase oppure apri il progetto da file/localhost per usare il login locale.';
      }
      if (topButton) topButton.textContent = 'Area gestione non disponibile';
      return;
    }

    [...form.elements].forEach((element) => { element.disabled = false; });
    form.hidden = !!state.session;
    user.hidden = !state.session;
    adminTools.hidden = !state.isAdmin;
    if (message) {
      const denied = state.session && !state.isAdmin;
      message.hidden = !denied;
      message.textContent = denied
        ? (state.cloudMode ? 'Account autenticato ma non autorizzato come amministratore. Controlla public.admin_users.' : 'Credenziali locali non autorizzate.')
        : '';
    }
    if ($('#auth-user-email')) {
      $('#auth-user-email').textContent = state.session?.user?.email || state.session?.user?.username || '';
    }
    if (topButton) topButton.textContent = state.isAdmin ? `Gestione attiva · ${modeLabel}` : (state.session ? 'Account connesso' : 'Area gestione');
    const submit = $('#save-offer');
    if (submit) submit.disabled = !(state.cloudAvailable && state.isAdmin);
  }

  function showToast(message, tone = 'success') {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${tone}`;
    toast.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function showFormMessage(kind, message) {
    const error = $('#form-error');
    const success = $('#form-success');
    if (!error || !success) return;
    error.hidden = true;
    success.hidden = true;
    if (!message) return;
    const target = kind === 'error' ? error : success;
    target.textContent = message;
    target.hidden = false;
  }

  function renderDashboard() {
    const { summary, products, supermarkets, months, types } = currentAggregates();
    $('#source-label').textContent = state.cloudMode
      ? `${fmtInt.format(state.rows.length)} offerte su Supabase`
      : (state.localMode ? `${fmtInt.format(state.rows.length)} offerte · archivio locale` : `${fmtInt.format(historicalRows.length)} offerte · sola lettura`);

    $('#dashboard-kpis').innerHTML = [
      kpi('Offerte totali', fmtInt.format(summary.records), `${fmtInt.format(state.userOffers.length)} aggiunte da te`, 'accent'),
      kpi('Prodotti distinti', fmtInt.format(summary.products), `${fmtPct.format(summary.top10Share)} nei Top 10`),
      kpi('Supermercati', fmtInt.format(summary.supermarkets), 'Insegne / punti vendita distinti'),
      kpi('Prezzo medio', fmtEuro.format(summary.averagePrice), `Mediana ${fmtEuro.format(summary.medianPrice)}`),
      kpi('Top prodotto', summary.topProducts[0].name, `${summary.topProducts[0].count} offerte`),
      kpi('Prodotto più costoso', summary.highestAverageProduct.name, `Media ${fmtEuro.format(summary.highestAverageProduct.averagePrice)}`),
      kpi('Supermercato più costoso', summary.highestAverageSupermarket.name, `Media ${fmtEuro.format(summary.highestAverageSupermarket.averagePrice)}`),
      kpi('Supermercato meno costoso', summary.lowestAverageSupermarket.name, `Media ${fmtEuro.format(summary.lowestAverageSupermarket.averagePrice)}`)
    ].join('');

    C.line($('#monthly-price-chart'), months.map((item) => ({ label: item.month, value: item.averagePrice })), {
      valueFormatter: (value) => fmtEuro.format(value),
      labelFormatter: (value) => monthLabel(value),
      ariaLabel: 'Prezzo medio mensile per data offerta'
    });

    C.horizontalBar($('#top-products-chart'), summary.topProducts.map((item) => ({ label: item.name, value: item.count })), {
      valueFormatter: (value) => `${fmtInt.format(value)}`,
      ariaLabel: 'Top 10 prodotti per frequenza',
      left: 255
    });

    const top5 = A.denseRank(products.map((item) => ({ name: item.name, count: item.count, averagePrice: item.averagePrice })), 'count', 5);
    const statsRows = [
      ['Prosciutto mediamente più costoso', summary.highestAverageProduct.name, summary.highestAverageProduct.count, fmtEuro.format(summary.highestAverageProduct.averagePrice)],
      ['Supermercato più costoso', summary.highestAverageSupermarket.name, summary.highestAverageSupermarket.count, fmtEuro.format(summary.highestAverageSupermarket.averagePrice)],
      ['Supermercato meno costoso', summary.lowestAverageSupermarket.name, summary.lowestAverageSupermarket.count, fmtEuro.format(summary.lowestAverageSupermarket.averagePrice)],
      ['Media prezzo prosciutto', 'Media semplice delle medie prodotto', summary.products, fmtEuro.format(summary.simpleProductAverage)],
      ['Media prezzo supermercato', 'Media semplice delle medie supermercato', summary.supermarkets, fmtEuro.format(summary.simpleSupermarketAverage)]
    ].map(([label, value, n, eur]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(n)}</td><td>${escapeHtml(eur)}</td></tr>`);

    $('#requested-stats').innerHTML = `
      <h5 class="subheading">Top 5 prosciutti più volte in offerta</h5>
      ${table(['Rank', 'Pari merito', 'Prodotto', 'N. offerte', 'Prezzo medio'], denseRankingRows(top5, 'Prodotto'))}
      <div class="table-gap"></div>
      ${table(['Statistica', 'Valore', 'N.', 'EUR'], statsRows)}
    `;

    const maxMonth = [...months].sort((a, b) => b.averagePrice - a.averagePrice)[0];
    const minMonth = [...months].sort((a, b) => a.averagePrice - b.averagePrice)[0];
    const maxVolume = [...months].sort((a, b) => b.count - a.count)[0];
    const highQuality = types.find((item) => item.type === 'Alta Qualità');
    const base = types.find((item) => item.type === 'Base');
    const insights = [
      `${summary.topProducts[0].name} è il prodotto più presente con ${summary.topProducts[0].count} offerte; i primi 5 prodotti concentrano il ${fmtPct.format(summary.top5Share)} del dataset.`,
      `Il prezzo medio complessivo è ${fmtEuro.format(summary.averagePrice)}. Il mese con media più alta è ${monthLabel(maxMonth.month, true)} (${fmtEuro.format(maxMonth.averagePrice)}), il più basso ${monthLabel(minMonth.month, true)} (${fmtEuro.format(minMonth.averagePrice)}).`,
      `${monthLabel(maxVolume.month, true)} registra il maggior numero di offerte: ${maxVolume.count}.`,
      `${summary.highestAverageProduct.name} è il prodotto mediamente più caro (${fmtEuro.format(summary.highestAverageProduct.averagePrice)}); ${summary.highestAverageSupermarket.name} è il supermercato con media più alta (${fmtEuro.format(summary.highestAverageSupermarket.averagePrice)}).`,
      highQuality && base ? `Alta Qualità rappresenta il ${fmtPct.format(highQuality.share)} delle osservazioni con media ${fmtEuro.format(highQuality.averagePrice)}, contro ${fmtEuro.format(base.averagePrice)} della tipologia Base.` : '',
      state.userOffers.length ? `L'archivio contiene ${state.userOffers.length} offerte inserite manualmente, già incluse in dashboard e classifiche.` : (state.cloudMode ? 'Il database contiene solo lo storico importato: le nuove offerte compariranno qui in tempo reale.' : (state.localMode ? 'Archivio locale attivo: le nuove offerte verranno salvate in questo browser.' : 'Modalità sola lettura: stai consultando lo storico incorporato nel sito.'))
    ].filter(Boolean);
    $('#insights').innerHTML = insights.map((text) => `<li><span>${escapeHtml(text)}</span></li>`).join('');
  }

  function catalogOptions(items, selectedId, placeholder) {
    return `<option value="">${escapeHtml(placeholder)}</option>` + (items || []).map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(selectedId || '') ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('');
  }

  function renewalStatusCopy(item) {
    if (item.status === 'expired') return { label: 'Da rinnovare', detail: item.daysExpired === 1 ? 'Scaduta da 1 giorno' : `Scaduta da ${item.daysExpired} giorni` };
    if (item.status === 'today') return { label: 'Scade oggi', detail: 'Da rinnovare oggi' };
    if (item.status === 'renewed') return { label: 'Rinnovato', detail: `Valida fino al ${formatDate(item.latestExpiryDate)}` };
    return { label: 'Mai rilevato', detail: 'Nessuna offerta presente' };
  }

  function renderSupermarketRenewalBoard(supermarkets) {
    const names = (supermarkets || []).map((item) => item.name);
    const statuses = A.supermarketRenewalStatus(state.rows, M.localIsoDate(), names);
    const expired = statuses.filter((item) => item.status === 'expired').length;
    const today = statuses.filter((item) => item.status === 'today').length;
    const renewed = statuses.filter((item) => item.status === 'renewed').length;
    const never = statuses.filter((item) => item.status === 'never').length;
    const summary = $('#supermarket-renewal-summary');
    if (summary) summary.innerHTML = [
      `<span class="renewal-count expired">${fmtInt.format(expired)} scaduti</span>`,
      `<span class="renewal-count today">${fmtInt.format(today)} oggi</span>`,
      `<span class="renewal-count renewed">${fmtInt.format(renewed)} rinnovati</span>`,
      never ? `<span class="renewal-count never">${fmtInt.format(never)} mai rilevati</span>` : ''
    ].filter(Boolean).join('');

    const board = $('#supermarket-renewal-board');
    if (!board) return;
    if (!statuses.length) {
      board.innerHTML = '<div class="empty-state">Nessun supermercato disponibile.</div>';
      return;
    }

    board.innerHTML = `<div class="supermarket-renewal-list">${statuses.map((item) => {
      const copy = renewalStatusCopy(item);
      const latest = item.latestOffer;
      const previous = item.previousExpired;
      let note = 'Nessuna offerta registrata per questo supermercato.';
      if (item.status === 'expired') note = `L'ultima offerta del supermercato è scaduta e non risulta una rilevazione successiva.`;
      if (item.status === 'today') note = `L'ultima offerta termina oggi: il supermercato entra nella lista da rinnovare.`;
      if (item.status === 'renewed') {
        note = previous
          ? `Rinnovato: dopo una rilevazione precedente ora scaduta (${previous.product || 'prodotto non indicato'}, ${formatDate(previous.expiryDate)}) è presente una nuova offerta valida.`
          : 'È presente una nuova offerta ancora valida per questo supermercato.';
      }
      return `<div class="supermarket-renewal-row ${item.status}">
        <div class="renewal-supermarket"><strong>${escapeHtml(item.supermarket)}</strong><div class="renewal-meta">${fmtInt.format(item.offerCount)} offerte storiche</div></div>
        <div><span class="renewal-status">${escapeHtml(copy.label)}</span><div class="renewal-meta">${escapeHtml(copy.detail)}</div></div>
        <div><span class="renewal-label">Ultima offerta</span><strong>${latest ? escapeHtml(item.latestProduct) : '—'}</strong><div class="renewal-meta">${latest ? formatDate(item.latestOfferDate) : '—'}</div></div>
        <div><span class="renewal-label">Scadenza</span><strong>${latest ? formatDate(item.latestExpiryDate) : '—'}</strong></div>
        <div class="renewal-explanation">${escapeHtml(note)}</div>
        <div class="renewal-action">${state.isAdmin && item.status !== 'renewed' ? `<button class="btn btn-primary btn-small" type="button" data-renew-supermarket="${escapeHtml(item.supermarket)}">Nuova offerta</button>` : ''}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderCombinationContent(supermarket, product, targets) {
    const container = $(targets.stats);
    const chart = $(targets.chart);
    const history = $(targets.history);
    if (!container || !chart || !history) return;

    if (!supermarket || !product) {
      container.innerHTML = '<div class="empty-state">Seleziona un supermercato e un prosciutto per vedere frequenza, prezzi e andamento temporale della combinazione.</div>';
      C.line(chart, [], {});
      history.innerHTML = '';
      return;
    }

    const stats = A.combinationStats(state.rows, supermarket.name, product.name, M.localIsoDate());
    if (!stats.count) {
      container.innerHTML = `<div class="combination-title"><div><span class="eyebrow">Nuova combinazione</span><h5>${escapeHtml(supermarket.name)} × ${escapeHtml(product.name)}</h5></div></div><div class="empty-state">Questa combinazione non è mai stata rilevata.</div>`;
      C.line(chart, [], {});
      history.innerHTML = '';
      return;
    }

    const delta = stats.priceDelta == null
      ? 'Prima rilevazione'
      : `${stats.priceDelta >= 0 ? '+' : ''}${fmtEuro.format(stats.priceDelta)} (${stats.priceDeltaPct >= 0 ? '+' : ''}${fmtPct.format(stats.priceDeltaPct)})`;
    const renewal = stats.averageRenewalDays == null ? '—' : `${fmtNumber.format(stats.averageRenewalDays)} gg`;
    const duration = stats.averageOfferDurationDays == null ? '—' : `${fmtNumber.format(stats.averageOfferDurationDays)} gg`;

    container.innerHTML = `<div class="combination-title"><div><span class="eyebrow">Combinazione selezionata</span><h5>${escapeHtml(supermarket.name)} × ${escapeHtml(product.name)}</h5></div><span class="combination-last">Ultima: ${formatDate(stats.lastOfferDate)}</span></div>
      <div class="combination-stats-grid">
        <div class="combination-stat"><span>Offerte storiche</span><strong>${fmtInt.format(stats.count)}</strong><small>Per questa combinazione</small></div>
        <div class="combination-stat"><span>Ultimo prezzo</span><strong>${fmtEuro.format(stats.lastPrice)}</strong><small>${escapeHtml(delta)}</small></div>
        <div class="combination-stat"><span>Prezzo medio</span><strong>${fmtEuro.format(stats.averagePrice)}</strong><small>${fmtEuro.format(stats.minPrice)} – ${fmtEuro.format(stats.maxPrice)}</small></div>
        <div class="combination-stat"><span>Frequenza media</span><strong>${renewal}</strong><small>Tra una rilevazione e la successiva</small></div>
        <div class="combination-stat"><span>Durata media offerta</span><strong>${duration}</strong><small>Da Data offerta a scadenza</small></div>
        <div class="combination-stat"><span>Ultima scadenza</span><strong>${formatDate(stats.lastExpiryDate)}</strong><small>${fmtInt.format(stats.daysSinceLastOffer)} gg dall'ultima rilevazione</small></div>
        <div class="combination-stat temporal"><span>Mese corrente</span><strong>${fmtInt.format(stats.currentMonthCount)}</strong><small>offerte</small></div>
        <div class="combination-stat temporal"><span>Trimestre corrente</span><strong>${fmtInt.format(stats.currentQuarterCount)}</strong><small>offerte</small></div>
        <div class="combination-stat temporal"><span>Anno corrente</span><strong>${fmtInt.format(stats.currentYearCount)}</strong><small>offerte</small></div>
      </div>`;

    C.line(chart, stats.trend.map((item) => ({ label: item.offerDate, value: item.price })), {
      compact: stats.trend.length > 12,
      valueFormatter: (value) => fmtEuro.format(value),
      labelFormatter: (value) => formatDate(value).slice(0, 5),
      ariaLabel: `Andamento prezzi ${supermarket.name} ${product.name}`
    });

    const recent = [...stats.trend].reverse().slice(0, 12);
    history.innerHTML = `<h5 class="subheading">Ultime rilevazioni</h5>${table(
      ['Data offerta', 'Scadenza', 'Prezzo', 'Tipologia'],
      recent.map((item) => `<tr><td><strong>${formatDate(item.offerDate)}</strong></td><td>${formatDate(item.expiryDate)}</td><td>${fmtEuro.format(item.price)}</td><td>${escapeHtml(item.type || '—')}</td></tr>`)
    )}`;
  }

  function renderPublicCombinationStats() {
    const catalogs = activeCatalogs();
    const supermarketSelect = $('#public-combination-supermarket');
    const productSelect = $('#public-combination-product');
    if (!supermarketSelect || !productSelect) return;

    const selectedSupermarket = supermarketSelect.value || '';
    const selectedProduct = productSelect.value || '';
    supermarketSelect.innerHTML = catalogOptions(catalogs.supermarkets, selectedSupermarket, 'Seleziona supermercato');
    productSelect.innerHTML = catalogOptions(catalogs.products, selectedProduct, 'Seleziona prosciutto');

    const supermarket = catalogs.supermarkets.find((item) => String(item.id) === String(supermarketSelect.value));
    const product = catalogs.products.find((item) => String(item.id) === String(productSelect.value));
    renderCombinationContent(supermarket, product, {
      stats: '#public-combination-stats',
      chart: '#public-combination-trend-chart',
      history: '#public-combination-history'
    });
  }

  function renderCombinationStats() {
    const supermarketId = $('#offer-supermarket')?.value || '';
    const productId = $('#offer-product')?.value || '';
    if (!supermarketId || !productId) return;
    const publicSupermarket = $('#public-combination-supermarket');
    const publicProduct = $('#public-combination-product');
    if (publicSupermarket) publicSupermarket.value = supermarketId;
    if (publicProduct) publicProduct.value = productId;
    renderPublicCombinationStats();
  }

  function renderManage() {
    const derivedSupermarkets = A.supermarketStats(state.rows).map((item) => ({ id: item.name, name: item.name }));
    const derivedProducts = A.productStats(state.rows).map((item) => ({ id: item.name, name: item.name, default_type: '' }));
    const supermarkets = (state.cloudMode || state.localMode) ? state.catalogs.supermarkets : derivedSupermarkets;
    const products = (state.cloudMode || state.localMode) ? state.catalogs.products : derivedProducts;
    const supermarketSelect = $('#offer-supermarket');
    const productSelect = $('#offer-product');
    const selectedSupermarket = supermarketSelect?.value || '';
    const selectedProduct = productSelect?.value || '';
    if (supermarketSelect) supermarketSelect.innerHTML = catalogOptions(supermarkets, selectedSupermarket, 'Seleziona supermercato');
    if (productSelect) productSelect.innerHTML = catalogOptions(products, selectedProduct, 'Seleziona prosciutto');
    fillDatalist('#type-options', [...new Set(state.rows.map((row) => row.type).filter(Boolean))]);

    $('#user-offer-count').textContent = fmtInt.format(state.userOffers.length);
    const sorted = [...state.userOffers].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 50);
    $('#user-offers-table').innerHTML = table(
      ['Data offerta', 'Scadenza', 'Supermercato', 'Prodotto', 'Tipologia', 'Prezzo', ''],
      sorted.map((row) => `<tr>
        <td>${formatDate(row.offerDate)}</td>
        <td>${formatDate(row.expiryDate)}</td>
        <td>${escapeHtml(row.supermarket)}</td>
        <td>${escapeHtml(row.product)}</td>
        <td>${escapeHtml(row.type)}</td>
        <td><strong>${fmtEuro.format(row.price)}</strong></td>
        <td>${state.isAdmin ? `<button class="icon-button danger" type="button" data-delete-offer="${escapeHtml(row.id)}" title="Elimina offerta">×</button>` : '—'}</td>
      </tr>`),
      state.localMode ? 'Non ci sono ancora offerte inserite manualmente in questo browser.' : 'Non ci sono ancora offerte inserite manualmente nel database.'
    );
    renderSupermarketRenewalBoard(supermarkets);
    renderCombinationStats();
    updateAuthUi();
  }

  function renderTop10() {
    const summary = A.summarize(state.rows);
    const grid = $('#top10-grid');
    grid.innerHTML = summary.topProducts.map((product, index) => `
      <article class="mini-chart-card">
        <div class="mini-rank">#${index + 1}</div>
        <h4>${escapeHtml(product.name)}</h4>
        <div class="mini-chart-meta">${fmtInt.format(product.count)} offerte · media ${fmtEuro.format(product.averagePrice)}</div>
        <div class="chart compact" id="top10-chart-${index}"></div>
      </article>
    `).join('');
    summary.topProducts.forEach((product, index) => {
      const trend = A.trendForProduct(state.rows, product.name);
      C.line($(`#top10-chart-${index}`), trend.map((item) => ({ label: item.month, value: item.averagePrice })), {
        compact: true,
        valueFormatter: (value) => fmtEuro.format(value),
        labelFormatter: (value) => monthLabel(value),
        ariaLabel: `Andamento ${product.name}`
      });
    });
  }

  function renderProducts() {
    const products = A.productStats(state.rows);
    const select = $('#product-select');
    const previous = select.value;
    const names = products.map((item) => item.name);
    const selected = names.includes(previous) ? previous : names[0];
    fillSelect(select, names, null, selected);
    if (selected) select.value = selected;

    $('#products-table').innerHTML = table(
      ['Prodotto', 'Offerte', 'Supermercati', 'Prezzo medio', 'Mediana', 'Min', 'Max', 'Prima offerta', 'Ultima offerta', 'Tipologie'],
      products.map((item) => {
        const entityRows = state.rows.filter((row) => row.product === item.name);
        const [firstOffer, lastOffer] = rangeByOffer(entityRows);
        return `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${fmtInt.format(item.count)}</td><td>${fmtInt.format(item.relatedCount)}</td><td>${fmtEuro.format(item.averagePrice)}</td><td>${fmtEuro.format(item.medianPrice)}</td><td>${fmtEuro.format(item.minPrice)}</td><td>${fmtEuro.format(item.maxPrice)}</td><td>${firstOffer}</td><td>${lastOffer}</td><td>${formatTypes(item.types)}</td></tr>`;
      })
    );
    renderProductDetail(selected);
  }

  function renderProductDetail(productName) {
    const products = A.productStats(state.rows);
    const stat = products.find((item) => item.name === productName);
    if (!stat) return;
    const entityRows = state.rows.filter((row) => row.product === stat.name);
    const [firstOffer, lastOffer] = rangeByOffer(entityRows);
    $('#product-detail').innerHTML = `<article class="detail-card">
      <div class="detail-head"><div><span class="eyebrow">Scheda prodotto</span><h4>${escapeHtml(stat.name)}</h4><p>Offerte dal ${firstOffer} al ${lastOffer}</p></div><div>${formatTypes(stat.types)}</div></div>
      ${metrics([
        ['Offerte', fmtInt.format(stat.count)],
        ['Supermercati', fmtInt.format(stat.relatedCount)],
        ['Prezzo medio', fmtEuro.format(stat.averagePrice)],
        ['Min / Max', `${fmtEuro.format(stat.minPrice)} / ${fmtEuro.format(stat.maxPrice)}`],
        ['Deviazione std.', fmtNumber.format(stat.stdDev)]
      ])}
    </article>`;

    const ranking = A.topSupermarketsForProduct(state.rows, stat.name, 5);
    C.horizontalBar($('#product-supermarkets-chart'), ranking.map((item) => ({ label: `#${item.rank} ${item.name}`, value: item.count })), {
      valueFormatter: (value) => `${fmtInt.format(value)} volte`,
      ariaLabel: `Top supermercati per ${stat.name}`,
      left: 260
    });
    $('#product-supermarkets-table').innerHTML = table(
      ['Rank', 'Pari merito', 'Supermercato', 'N. volte', 'Quota', 'Prezzo medio'],
      ranking.map((item) => {
        const tied = ranking.filter((x) => x.rank === item.rank).length > 1;
        return `<tr><td><span class="rank-badge">${item.rank}</span></td><td>${tied ? '<span class="tie">Sì</span>' : 'No'}</td><td>${escapeHtml(item.name)}</td><td>${fmtInt.format(item.count)}</td><td>${fmtPct.format(item.share)}</td><td>${fmtEuro.format(item.averagePrice)}</td></tr>`;
      })
    );
  }

  function renderSupermarkets() {
    const supermarkets = A.supermarketStats(state.rows);
    const select = $('#supermarket-select');
    const previous = select.value;
    const names = supermarkets.map((item) => item.name);
    const selected = names.includes(previous) ? previous : names[0];
    fillSelect(select, names, null, selected);
    if (selected) select.value = selected;

    $('#supermarkets-table').innerHTML = table(
      ['Supermercato', 'Offerte', 'Prodotti unici', 'Prezzo medio', 'Mediana', 'Min', 'Max', 'Prima offerta', 'Ultima offerta'],
      supermarkets.map((item) => {
        const entityRows = state.rows.filter((row) => row.supermarket === item.name);
        const [firstOffer, lastOffer] = rangeByOffer(entityRows);
        return `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${fmtInt.format(item.count)}</td><td>${fmtInt.format(item.relatedCount)}</td><td>${fmtEuro.format(item.averagePrice)}</td><td>${fmtEuro.format(item.medianPrice)}</td><td>${fmtEuro.format(item.minPrice)}</td><td>${fmtEuro.format(item.maxPrice)}</td><td>${firstOffer}</td><td>${lastOffer}</td></tr>`;
      })
    );
    renderSupermarketDetail(selected);
  }

  function renderSupermarketDetail(supermarketName) {
    const supermarkets = A.supermarketStats(state.rows);
    const stat = supermarkets.find((item) => item.name === supermarketName);
    if (!stat) return;
    const entityRows = state.rows.filter((row) => row.supermarket === stat.name);
    const [firstOffer, lastOffer] = rangeByOffer(entityRows);
    $('#supermarket-detail').innerHTML = `<article class="detail-card">
      <div class="detail-head"><div><span class="eyebrow">Scheda supermercato</span><h4>${escapeHtml(stat.name)}</h4><p>Offerte dal ${firstOffer} al ${lastOffer}</p></div></div>
      ${metrics([
        ['Offerte', fmtInt.format(stat.count)],
        ['Prodotti unici', fmtInt.format(stat.relatedCount)],
        ['Prezzo medio', fmtEuro.format(stat.averagePrice)],
        ['Min / Max', `${fmtEuro.format(stat.minPrice)} / ${fmtEuro.format(stat.maxPrice)}`],
        ['Deviazione std.', fmtNumber.format(stat.stdDev)]
      ])}
    </article>`;

    const ranking = A.topProductsForSupermarket(state.rows, stat.name, 5);
    C.horizontalBar($('#supermarket-products-chart'), ranking.map((item) => ({ label: `#${item.rank} ${item.name}`, value: item.count })), {
      valueFormatter: (value) => `${fmtInt.format(value)} volte`,
      ariaLabel: `Top prodotti per ${stat.name}`,
      left: 280
    });
    $('#supermarket-products-table').innerHTML = table(
      ['Rank', 'Pari merito', 'Prodotto', 'N. volte', 'Quota', 'Prezzo medio'],
      ranking.map((item) => {
        const tied = ranking.filter((x) => x.rank === item.rank).length > 1;
        return `<tr><td><span class="rank-badge">${item.rank}</span></td><td>${tied ? '<span class="tie">Sì</span>' : 'No'}</td><td>${escapeHtml(item.name)}</td><td>${fmtInt.format(item.count)}</td><td>${fmtPct.format(item.share)}</td><td>${fmtEuro.format(item.averagePrice)}</td></tr>`;
      })
    );
  }

  function periodAggregateRows(granularity) {
    const stats = granularity === 'month'
      ? A.monthlyStats(state.rows).map((item) => ({ key: item.month, ...item }))
      : granularity === 'quarter'
        ? A.quarterlyStats(state.rows).map((item) => ({ key: item.quarter, ...item }))
        : A.yearlyStats(state.rows).map((item) => ({ key: item.year, ...item }));
    return stats.sort((a, b) => String(b.key).localeCompare(String(a.key)));
  }

  function deltaDescriptor(current, previous, valueFormatter) {
    if (!previous) return { text: 'Nessun periodo precedente', className: 'neutral' };
    const diff = current - previous;
    if (diff === 0) return { text: 'Invariato', className: 'neutral' };
    const sign = diff > 0 ? '+' : '−';
    const abs = Math.abs(diff);
    const percentage = previous !== 0 ? abs / Math.abs(previous) : null;
    const formatted = valueFormatter ? valueFormatter(abs) : fmtNumber.format(abs);
    return {
      text: `${sign}${formatted}${percentage != null ? ` (${fmtPct.format(percentage)})` : ''}`,
      className: diff > 0 ? 'up' : 'down'
    };
  }

  function renderLiveRanking(container, ranking, entityLabel) {
    container.innerHTML = table(
      ['Rank', entityLabel, 'Offerte', 'Prezzo medio'],
      ranking.map((item) => `<tr><td><span class="rank-badge">${item.rank}</span></td><td><strong>${escapeHtml(item.name)}</strong>${ranking.filter((x) => x.rank === item.rank).length > 1 ? ' <span class="tie">pari</span>' : ''}</td><td>${fmtInt.format(item.count)}</td><td>${fmtEuro.format(item.averagePrice)}</td></tr>`)
    );
  }

  function renderLive() {
    const granularity = state.liveGranularity;
    const keys = A.periodKeys(state.rows, granularity);
    if (!keys.includes(state.livePeriod)) state.livePeriod = keys[0] || '';

    $$('#live-granularity button').forEach((button) => button.classList.toggle('active', button.dataset.granularity === granularity));
    fillSelect($('#live-period-select'), keys, null, state.livePeriod, (key) => periodLabel(granularity, key));
    if (state.livePeriod) $('#live-period-select').value = state.livePeriod;

    const key = state.livePeriod;
    if (!key) {
      $('#live-kpis').innerHTML = '';
      $('#live-compare').innerHTML = '<div class="empty-state">Nessun periodo disponibile.</div>';
      return;
    }

    const current = A.periodSummary(state.rows, granularity, key);
    const previousKey = A.previousPeriodKey(granularity, key);
    const previous = A.periodSummary(state.rows, granularity, previousKey);
    const subset = A.rowsForPeriod(state.rows, granularity, key);
    const trend = A.trendWithinPeriod(state.rows, granularity, key);

    $('#live-kpis').innerHTML = [
      kpi('Offerte', fmtInt.format(current.count), periodLabel(granularity, key), 'accent'),
      kpi('Prodotti', fmtInt.format(current.products), 'Referenze distinte'),
      kpi('Supermercati', fmtInt.format(current.supermarkets), 'Insegne distinte'),
      kpi('Prezzo medio', fmtEuro.format(current.averagePrice), `Mediana ${fmtEuro.format(current.medianPrice)}`),
      kpi('Prezzo minimo', fmtEuro.format(current.minPrice), 'Nel periodo selezionato'),
      kpi('Prezzo massimo', fmtEuro.format(current.maxPrice), 'Nel periodo selezionato')
    ].join('');

    const volumeDelta = deltaDescriptor(current.count, previous.count, (value) => fmtInt.format(value));
    const priceDelta = deltaDescriptor(current.averagePrice, previous.averagePrice, (value) => fmtEuro.format(value));
    $('#live-compare').innerHTML = `
      <div class="compare-title"><span class="eyebrow">Confronto</span><strong>vs ${escapeHtml(periodLabel(granularity, previousKey))}</strong></div>
      <div class="compare-metric"><span>Numero offerte</span><strong class="${volumeDelta.className}">${escapeHtml(volumeDelta.text)}</strong><small>${previous.count ? `${fmtInt.format(previous.count)} nel periodo precedente` : 'Nessun dato precedente'}</small></div>
      <div class="compare-metric"><span>Prezzo medio</span><strong class="${priceDelta.className}">${escapeHtml(priceDelta.text)}</strong><small>${previous.count ? fmtEuro.format(previous.averagePrice) : 'Nessun dato precedente'}</small></div>
      <div class="compare-metric"><span>Nuove offerte locali</span><strong>${fmtInt.format(subset.filter((row) => row.origin === 'manual').length)}</strong><small>Inserite da te in questo periodo</small></div>
    `;

    $('#live-trend-subtitle').textContent = granularity === 'month' ? 'Media giornaliera' : 'Media mensile';
    C.line($('#live-trend-chart'), trend.map((item) => ({ label: item.key, value: item.averagePrice })), {
      valueFormatter: (value) => fmtEuro.format(value),
      labelFormatter: (value) => trendLabel(granularity, value),
      ariaLabel: `Prezzo medio ${periodLabel(granularity, key)}`
    });
    C.horizontalBar($('#live-count-chart'), trend.map((item) => ({ label: trendLabel(granularity, item.key), value: item.count })), {
      valueFormatter: (value) => fmtInt.format(value),
      ariaLabel: `Numero offerte ${periodLabel(granularity, key)}`,
      left: granularity === 'month' ? 115 : 130
    });

    const productRanking = A.denseRank(A.productStats(subset).map((item) => ({ name: item.name, count: item.count, averagePrice: item.averagePrice })), 'count', 5);
    const supermarketRanking = A.denseRank(A.supermarketStats(subset).map((item) => ({ name: item.name, count: item.count, averagePrice: item.averagePrice })), 'count', 5);
    renderLiveRanking($('#live-top-products'), productRanking, 'Prodotto');
    renderLiveRanking($('#live-top-supermarkets'), supermarketRanking, 'Supermercato');

    const typeStats = A.typeStats(subset);
    $('#live-types-table').innerHTML = table(
      ['Tipologia', 'Offerte', 'Quota', 'Prezzo medio', 'Min', 'Max'],
      typeStats.map((item) => `<tr><td><span class="tag">${escapeHtml(item.type)}</span></td><td>${fmtInt.format(item.count)}</td><td>${fmtPct.format(item.share)}</td><td>${fmtEuro.format(item.averagePrice)}</td><td>${fmtEuro.format(item.minPrice)}</td><td>${fmtEuro.format(item.maxPrice)}</td></tr>`)
    );

    const history = periodAggregateRows(granularity);
    $('#live-history-table').innerHTML = table(
      ['Periodo', 'Offerte', 'Prodotti', 'Supermercati', 'Prezzo medio', 'Min', 'Max'],
      history.map((item) => `<tr class="${item.key === key ? 'selected-period-row' : ''}"><td><strong>${escapeHtml(periodLabel(granularity, item.key))}</strong></td><td>${fmtInt.format(item.count)}</td><td>${fmtInt.format(item.products)}</td><td>${fmtInt.format(item.supermarkets)}</td><td>${fmtEuro.format(item.averagePrice)}</td><td>${fmtEuro.format(item.minPrice)}</td><td>${fmtEuro.format(item.maxPrice)}</td></tr>`)
    );
  }

  function setupDataFilters() {
    const current = currentDataFilters();
    const products = A.productStats(state.rows).map((item) => item.name).sort((a, b) => a.localeCompare(b, 'it'));
    const supermarkets = A.supermarketStats(state.rows).map((item) => item.name).sort((a, b) => a.localeCompare(b, 'it'));
    const types = [...new Set(state.rows.map((row) => row.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
    const months = [...new Set(state.rows.map((row) => row.month).filter(Boolean))].sort().reverse();
    fillSelect($('#filter-product'), products, 'Tutti i prodotti', current.product);
    fillSelect($('#filter-supermarket'), supermarkets, 'Tutti i supermercati', current.supermarket);
    fillSelect($('#filter-type'), types, 'Tutte le tipologie', current.type);
    fillSelect($('#filter-month'), months, 'Tutti i mesi', current.month, (value) => monthLabel(value, true));
    if ($('#filter-origin')) $('#filter-origin').value = current.origin || '';
    if ($('#filter-sort') && !$('#filter-sort').value) $('#filter-sort').value = 'offerDateDesc';
  }

  function currentDataFilters() {
    return {
      query: $('#filter-query')?.value || '',
      supermarket: $('#filter-supermarket')?.value || '',
      product: $('#filter-product')?.value || '',
      type: $('#filter-type')?.value || '',
      month: $('#filter-month')?.value || '',
      origin: $('#filter-origin')?.value || ''
    };
  }

  function renderData() {
    const filtered = A.sortRows(A.filterRows(state.rows, currentDataFilters()), $('#filter-sort')?.value || 'offerDateDesc');
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    $('#data-table').innerHTML = table(
      ['Origine', 'Data offerta', 'Scadenza', 'Supermercato', 'Prodotto', 'Tipologia', 'Mese', 'Trimestre', 'Anno', 'Prezzo'],
      pageRows.map((row) => `<tr><td>${originBadge(row)}</td><td><strong>${formatDate(row.offerDate)}</strong></td><td>${formatDate(row.expiryDate)}</td><td>${escapeHtml(row.supermarket)}</td><td>${escapeHtml(row.product)}</td><td>${escapeHtml(row.type || '—')}</td><td>${escapeHtml(row.month)}</td><td>${escapeHtml(row.quarter)}</td><td>${escapeHtml(row.year)}</td><td><strong>${fmtEuro.format(row.price)}</strong></td></tr>`)
    );
    $('#page-info').textContent = `${fmtInt.format(filtered.length)} record · pagina ${state.page} di ${totalPages}`;
    $('#prev-page').disabled = state.page <= 1;
    $('#next-page').disabled = state.page >= totalPages;
  }

  function refreshAll() {
    rebuildRows();
    renderDashboard();
    renderManage();
    renderLive();
    renderTop10();
    renderProducts();
    renderSupermarkets();
    renderPublicCombinationStats();
    setupDataFilters();
    renderData();
  }

  function setFormDate() {
    const today = M.localIsoDate();
    const offerDate = $('#offer-date');
    const expiry = $('#offer-expiry');
    if (offerDate) offerDate.value = today;
    if (expiry) {
      expiry.min = today;
      if (!expiry.value || expiry.value < today) expiry.value = today;
    }
  }

  async function reloadCloudData(options = {}) {
    if (!state.cloudMode) return;
    const [rows, catalogs] = await Promise.all([Cloud.loadDataset(), Cloud.loadCatalogs()]);
    state.rows = rows;
    state.catalogs = catalogs;
    rebuildRows();
    if (!options.skipRender) refreshAll();
  }

  function reloadLocalData(options = {}) {
    if (!state.localMode) return;
    state.rows = historicalRows.concat(Local.loadOffers());
    rebuildRows();
    state.catalogs = buildLocalCatalogs();
    if (!options.skipRender) refreshAll();
  }

  async function handleOfferSubmit(event) {
    event.preventDefault();
    showFormMessage('', '');
    if (!(state.cloudMode || state.localMode) || !state.isAdmin) {
      showFormMessage('error', 'Accedi come amministratore per salvare nuove offerte.');
      return;
    }
    const form = event.currentTarget;
    const supermarketId = $('#offer-supermarket').value;
    const productId = $('#offer-product').value;
    const catalogs = activeCatalogs();
    const supermarket = catalogs.supermarkets.find((item) => String(item.id) === String(supermarketId));
    const product = catalogs.products.find((item) => String(item.id) === String(productId));
    try {
      if (!supermarket || !product) throw new Error('Seleziona supermercato e prosciutto dai cataloghi');
      const validated = M.createManualOffer({
        supermarket: supermarket.name,
        product: product.name,
        type: $('#offer-type').value,
        price: $('#offer-price').value,
        expiryDate: $('#offer-expiry').value
      }, M.localIsoDate());

      if (state.cloudMode) {
        await Cloud.addOffer({
          supermarketId,
          productId,
          type: validated.type,
          price: validated.price,
          offerDate: validated.offerDate,
          expiryDate: validated.expiryDate
        });
        await reloadCloudData();
      } else {
        Local.addOffer({
          supermarketId,
          productId,
          supermarket: supermarket.name,
          product: product.name,
          type: validated.type,
          price: validated.price,
          offerDate: validated.offerDate,
          expiryDate: validated.expiryDate
        });
        reloadLocalData();
      }

      form.reset();
      setFormDate();
      showFormMessage('success', state.cloudMode ? 'Offerta salvata su Supabase. Statistiche aggiornate.' : 'Offerta salvata nel browser. Statistiche aggiornate.');
      showToast('Offerta aggiunta e statistiche aggiornate');
    } catch (error) {
      showFormMessage('error', error.message || 'Impossibile salvare l\'offerta.');
    }
  }

  async function handleDeleteOffer(id) {
    if (!state.isAdmin) return;
    const offer = state.rows.find((item) => String(item.id) === String(id));
    if (!offer || offer.origin === 'historical') return;
    const confirmed = window.confirm(`Eliminare l'offerta di "${offer.product}" presso ${offer.supermarket}?`);
    if (!confirmed) return;
    try {
      if (state.cloudMode) {
        await Cloud.deleteOffer(id);
        await reloadCloudData();
      } else if (state.localMode) {
        Local.deleteOffer(id);
        reloadLocalData();
      }
      showToast('Offerta eliminata e statistiche aggiornate');
    } catch (error) {
      showToast(error.message || 'Errore durante l\'eliminazione', 'error');
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const message = $('#auth-message');
    if (!(state.cloudMode || state.localMode)) return;
    if (message) message.hidden = true;
    try {
      if (state.cloudMode) {
        state.session = await Cloud.signIn($('#auth-email').value, $('#auth-password').value);
        state.isAdmin = state.session ? await Cloud.isAdmin() : false;
      } else {
        const username = $('#auth-email').value;
        const ok = Local.authenticate(username, $('#auth-password').value, window.CDP_CONFIG || {});
        if (!ok) throw new Error('Credenziali locali non valide');
        Local.openSession(username);
        state.session = { provider: 'local', user: { username: String(username || '').trim() } };
        state.isAdmin = true;
      }
      updateAuthUi();
      renderManage();
      showToast(state.isAdmin ? `Accesso amministratore effettuato · ${state.cloudMode ? 'Supabase' : 'Locale'}` : 'Accesso effettuato senza permessi admin', state.isAdmin ? 'success' : 'error');
    } catch (error) {
      if (message) { message.hidden = false; message.textContent = error.message || 'Accesso non riuscito'; }
    }
  }

  async function handleLogout() {
    if (!(state.cloudMode || state.localMode)) return;
    try {
      if (state.cloudMode) await Cloud.signOut();
      if (state.localMode) Local.clearSession();
      state.session = null;
      state.isAdmin = false;
      updateAuthUi();
      renderManage();
      showToast('Sessione chiusa', 'neutral');
    } catch (error) {
      showToast(error.message || 'Logout non riuscito', 'error');
    }
  }

  async function handleAddSupermarket(event) {
    event.preventDefault();
    if (!state.isAdmin) return;
    const input = $('#catalog-supermarket-name');
    try {
      const created = state.cloudMode ? await Cloud.addSupermarket(input.value) : Local.addSupermarket(input.value);
      input.value = '';
      if (state.cloudMode) await reloadCloudData(); else reloadLocalData();
      $('#offer-supermarket').value = String(created.id);
      renderCombinationStats();
      showToast(`Supermercato "${created.name}" aggiunto`);
    } catch (error) {
      showToast(error.message || 'Impossibile aggiungere il supermercato', 'error');
    }
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    if (!state.isAdmin) return;
    const name = $('#catalog-product-name');
    const type = $('#catalog-product-type');
    try {
      const created = state.cloudMode ? await Cloud.addProduct(name.value, type.value) : Local.addProduct(name.value, type.value);
      name.value = '';
      type.value = '';
      if (state.cloudMode) await reloadCloudData(); else reloadLocalData();
      $('#offer-product').value = String(created.id);
      if (created.default_type) $('#offer-type').value = created.default_type;
      renderCombinationStats();
      showToast(`Prosciutto "${created.name}" aggiunto`);
    } catch (error) {
      showToast(error.message || 'Impossibile aggiungere il prosciutto', 'error');
    }
  }

  function prefillSupermarketRenewal(supermarketName) {
    if (!state.isAdmin) return;
    const supermarket = state.catalogs.supermarkets.find((item) => item.name === supermarketName);
    if (!supermarket) return;
    $('#offer-supermarket').value = String(supermarket.id);
    $('#offer-product').value = '';
    $('#offer-type').value = '';
    $('#offer-price').value = '';
    $('#offer-expiry').value = M.localIsoDate();
    renderCombinationStats();
    $('#offer-product').focus();
    showToast(`Supermercato ${supermarket.name} precompilato: scegli il prosciutto della nuova offerta`, 'neutral');
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportBackup() {
    try {
      const payload = { format: 'cdp-cloud-backup', version: 1, exportedAt: new Date().toISOString(), rows: state.rows };
      downloadBlob(JSON.stringify(payload, null, 2), `CDP_cloud_backup_${M.localIsoDate()}.json`, 'application/json;charset=utf-8');
      showToast('Backup JSON completo esportato');
    } catch (error) {
      showToast(error.message || 'Impossibile creare il backup', 'error');
    }
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const headers = ['Data offerta', 'Data scadenza', 'Supermercato', 'Prodotto', 'Tipologia', 'Prezzo EUR', 'Origine', 'Mese', 'Trimestre', 'Anno'];
    const lines = [headers.map(csvEscape).join(';')];
    state.rows.forEach((row) => {
      lines.push([
        row.offerDate,
        row.expiryDate,
        row.supermarket,
        row.product,
        row.type,
        row.price.toFixed(2).replace('.', ','),
        row.origin === 'manual' ? 'Inserita' : 'Storico',
        row.month,
        row.quarter,
        row.year
      ].map(csvEscape).join(';'));
    });
    downloadBlob(`\uFEFF${lines.join('\r\n')}`, `CDP_offerte_${M.localIsoDate()}.csv`, 'text/csv;charset=utf-8');
    showToast('CSV completo esportato');
  }

  function showSection(id) {
    $$('.section').forEach((section) => section.classList.toggle('active', section.id === id));
    $$('.nav button').forEach((button) => button.classList.toggle('active', button.dataset.section === id));
    const titles = {
      dashboard: 'Dashboard',
      manage: 'Nuova offerta',
      live: 'Statistiche live',
      combinations: 'Analisi combinazioni',
      trends: 'Andamento Top 10',
      products: 'Prodotti',
      supermarkets: 'Supermercati',
      data: 'Dati completi'
    };
    $('#page-title').textContent = titles[id] || 'CDP';
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function wireEvents() {
    $$('.nav button').forEach((button) => button.addEventListener('click', () => showSection(button.dataset.section)));
    $$('[data-go]').forEach((button) => button.addEventListener('click', () => showSection(button.dataset.go)));

    $('#auth-top-button').addEventListener('click', () => { showSection('manage'); if (!state.session) setTimeout(() => $('#auth-email')?.focus(), 50); });
    $('#auth-form').addEventListener('submit', handleAuthSubmit);
    $('#auth-logout').addEventListener('click', handleLogout);
    $('#catalog-supermarket-form').addEventListener('submit', handleAddSupermarket);
    $('#catalog-product-form').addEventListener('submit', handleAddProduct);

    $('#offer-form').addEventListener('submit', handleOfferSubmit);
    $('#offer-form').addEventListener('reset', () => {
      showFormMessage('', '');
      setTimeout(() => { setFormDate(); renderCombinationStats(); }, 0);
    });
    $('#offer-supermarket').addEventListener('change', renderCombinationStats);
    $('#offer-product').addEventListener('change', (event) => {
      const product = state.catalogs.products.find((item) => String(item.id) === String(event.target.value));
      if (product?.default_type) $('#offer-type').value = product.default_type;
      renderCombinationStats();
    });

    $('#product-select').addEventListener('change', (event) => renderProductDetail(event.target.value));
    $('#supermarket-select').addEventListener('change', (event) => renderSupermarketDetail(event.target.value));
    $('#public-combination-supermarket').addEventListener('change', renderPublicCombinationStats);
    $('#public-combination-product').addEventListener('change', renderPublicCombinationStats);

    $$('#live-granularity button').forEach((button) => button.addEventListener('click', () => {
      state.liveGranularity = button.dataset.granularity;
      state.livePeriod = '';
      renderLive();
    }));
    $('#live-period-select').addEventListener('change', (event) => {
      state.livePeriod = event.target.value;
      renderLive();
    });

    ['#filter-query', '#filter-supermarket', '#filter-product', '#filter-type', '#filter-month', '#filter-origin', '#filter-sort'].forEach((selector) => {
      const element = $(selector);
      const eventName = selector === '#filter-query' ? 'input' : 'change';
      element.addEventListener(eventName, () => { state.page = 1; renderData(); });
    });
    $('#prev-page').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; renderData(); } });
    $('#next-page').addEventListener('click', () => { state.page += 1; renderData(); });

    $('#export-backup').addEventListener('click', exportBackup);
    $('#export-csv').addEventListener('click', exportCsv);

    document.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('[data-delete-offer]');
      if (deleteButton) handleDeleteOffer(deleteButton.dataset.deleteOffer);
      const renewButton = event.target.closest('[data-renew-supermarket]');
      if (renewButton) prefillSupermarketRenewal(renewButton.dataset.renewSupermarket);
      const focusButton = event.target.closest('[data-focus-catalog]');
      if (focusButton) {
        const target = focusButton.dataset.focusCatalog === 'supermarket' ? '#catalog-supermarket-name' : '#catalog-product-name';
        $(target)?.focus();
      }
    });
  }

  async function init() {
    wireEvents();
    setFormDate();
    const cloudState = Cloud.configure(window.CDP_CONFIG || {});
    const localAllowed = Local.isLocalEnvironment(window.location);
    state.cloudMode = cloudState.configured;
    state.localMode = !state.cloudMode && localAllowed;

    if (state.cloudMode) {
      try {
        await reloadCloudData({ skipRender: true });
        state.session = await Cloud.getSession();
        state.isAdmin = state.session ? await Cloud.isAdmin() : false;
        setStorageStatus(true, 'Supabase online · aggiornamento realtime');
        updateAuthUi();
        refreshAll();
        Cloud.subscribe(() => {
          clearTimeout(state.realtimeTimer);
          state.realtimeTimer = setTimeout(async () => {
            try { await reloadCloudData(); } catch (error) { showToast('Aggiornamento realtime non riuscito', 'error'); }
          }, 180);
        });
      } catch (error) {
        state.cloudMode = false;
        state.localMode = localAllowed;
        if (state.localMode) {
          reloadLocalData({ skipRender: true });
          const username = Local.sessionUser();
          state.session = username ? { provider: 'local', user: { username } } : null;
          state.isAdmin = !!state.session;
          setStorageStatus(true, 'Supabase non raggiungibile · archivio locale attivo');
        } else {
          state.rows = historicalRows.slice();
          rebuildRows();
          setStorageStatus(false, 'Supabase non raggiungibile · sola lettura');
        }
        updateAuthUi();
        refreshAll();
        showToast(error.message || 'Impossibile caricare i dati da Supabase', 'error');
      }
    } else if (state.localMode) {
      reloadLocalData({ skipRender: true });
      const username = Local.sessionUser();
      state.session = username ? { provider: 'local', user: { username } } : null;
      state.isAdmin = !!state.session;
      setStorageStatus(true, 'Archivio locale · dati salvati nel browser');
      updateAuthUi();
      refreshAll();
    } else {
      state.rows = historicalRows.slice();
      rebuildRows();
      setStorageStatus(false, 'Sola lettura · configura Supabase');
      updateAuthUi();
      refreshAll();
    }

    const initial = location.hash.replace('#', '');
    const valid = ['dashboard', 'manage', 'live', 'combinations', 'trends', 'products', 'supermarkets', 'data'];
    if (valid.includes(initial)) showSection(initial);
  }

  init();
})();
