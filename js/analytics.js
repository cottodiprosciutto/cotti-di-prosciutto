(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CDPAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const priceOf = (row) => Number.isFinite(Number(row?.comparisonPrice)) ? Number(row.comparisonPrice) : Number(row?.price || 0);

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function standardDeviation(values) {
    if (values.length < 2) return 0;
    const mean = average(values);
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  function groupBy(rows, keyOrFn) {
    const getter = typeof keyOrFn === 'function' ? keyOrFn : (row) => row[keyOrFn];
    const groups = new Map();
    rows.forEach((row) => {
      const key = getter(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return groups;
  }

  function denseRank(entries, countKey = 'count', maxRank = 5) {
    const sorted = [...entries].sort((a, b) => (b[countKey] - a[countKey]) || String(a.name).localeCompare(String(b.name), 'it'));
    let rank = 0;
    let previous = null;
    return sorted.map((entry) => {
      if (previous === null || entry[countKey] !== previous) {
        rank += 1;
        previous = entry[countKey];
      }
      return { ...entry, rank };
    }).filter((entry) => entry.rank <= maxRank);
  }

  function aggregateEntity(rows, entityKey, relatedKey) {
    return [...groupBy(rows, entityKey).entries()].map(([name, entityRows]) => {
      const prices = entityRows.map(priceOf);
      const packagePrices = entityRows.map((row) => Number(row.price || 0));
      const expiryDates = entityRows.map((row) => row.expiryDate).sort();
      const related = new Set(entityRows.map((row) => row[relatedKey]));
      const types = [...new Set(entityRows.map((row) => row.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
      return {
        name,
        count: entityRows.length,
        relatedCount: related.size,
        averagePrice: average(prices),
        medianPrice: median(prices),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        stdDev: standardDeviation(prices),
        averagePackagePrice: average(packagePrices),
        firstExpiry: expiryDates[0],
        lastExpiry: expiryDates[expiryDates.length - 1],
        types
      };
    });
  }

  function productStats(rows) {
    return aggregateEntity(rows, 'product', 'supermarket')
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'it'));
  }

  function supermarketStats(rows) {
    return aggregateEntity(rows, 'supermarket', 'product')
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'it'));
  }

  function monthlyStats(rows) {
    return [...groupBy(rows, 'month').entries()]
      .map(([month, monthRows]) => {
        const prices = monthRows.map(priceOf);
        return {
          month,
          count: monthRows.length,
          products: new Set(monthRows.map((row) => row.product)).size,
          supermarkets: new Set(monthRows.map((row) => row.supermarket)).size,
          averagePrice: average(prices),
          medianPrice: median(prices),
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices)
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  function quarterlyStats(rows) {
    return [...groupBy(rows, 'quarter').entries()]
      .map(([quarter, quarterRows]) => {
        const prices = quarterRows.map(priceOf);
        return {
          quarter,
          count: quarterRows.length,
          products: new Set(quarterRows.map((row) => row.product)).size,
          supermarkets: new Set(quarterRows.map((row) => row.supermarket)).size,
          averagePrice: average(prices),
          medianPrice: median(prices),
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices)
        };
      })
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  }


  function yearlyStats(rows) {
    return [...groupBy(rows, 'year').entries()]
      .filter(([year]) => Boolean(year))
      .map(([year, yearRows]) => {
        const prices = yearRows.map(priceOf);
        return {
          year,
          count: yearRows.length,
          products: new Set(yearRows.map((row) => row.product)).size,
          supermarkets: new Set(yearRows.map((row) => row.supermarket)).size,
          averagePrice: average(prices),
          medianPrice: median(prices),
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices)
        };
      })
      .sort((a, b) => a.year.localeCompare(b.year));
  }

  function assertGranularity(granularity) {
    if (!['month', 'quarter', 'year'].includes(granularity)) throw new Error(`Granularità non valida: ${granularity}`);
  }

  function periodKeys(rows, granularity) {
    assertGranularity(granularity);
    return [...new Set(rows.map((row) => row[granularity]).filter(Boolean))]
      .sort((a, b) => String(b).localeCompare(String(a)));
  }

  function periodKeysThroughDate(rows, granularity, currentDate) {
    assertGranularity(granularity);
    const existing = periodKeys(rows, granularity);
    if (!existing.length) return [];
    const current = /^\d{4}-\d{2}-\d{2}$/.test(String(currentDate || '')) ? String(currentDate) : new Date().toISOString().slice(0, 10);
    const earliestOffer = [...rows].map((row) => row.offerDate).filter(Boolean).sort()[0];
    const latestOffer = [...rows].map((row) => row.offerDate).filter(Boolean).sort().slice(-1)[0];
    const start = earliestOffer || `${existing[existing.length - 1].slice(0, 4)}-01-01`;
    const end = latestOffer && latestOffer > current ? latestOffer : current;
    const startYear = Number(start.slice(0, 4));
    const startMonth = Number(start.slice(5, 7) || 1);
    const endYear = Number(end.slice(0, 4));
    const endMonth = Number(end.slice(5, 7) || 1);
    const keys = [];
    if (granularity === 'year') {
      for (let year = endYear; year >= startYear; year -= 1) keys.push(String(year));
      return keys;
    }
    if (granularity === 'month') {
      let year = endYear;
      let month = endMonth;
      while (year > startYear || (year === startYear && month >= startMonth)) {
        keys.push(`${year}-${String(month).padStart(2, '0')}`);
        month -= 1;
        if (month === 0) { month = 12; year -= 1; }
      }
      return keys;
    }
    let year = endYear;
    let quarter = Math.floor((endMonth - 1) / 3) + 1;
    const startQuarter = Math.floor((startMonth - 1) / 3) + 1;
    while (year > startYear || (year === startYear && quarter >= startQuarter)) {
      keys.push(`${year}-Q${quarter}`);
      quarter -= 1;
      if (quarter === 0) { quarter = 4; year -= 1; }
    }
    return keys;
  }

  function rowsForPeriod(rows, granularity, key) {
    assertGranularity(granularity);
    return rows.filter((row) => row[granularity] === key);
  }

  function previousPeriodKey(granularity, key) {
    assertGranularity(granularity);
    if (granularity === 'year') return String(Number(key) - 1);
    if (granularity === 'month') {
      const match = /^(\d{4})-(\d{2})$/.exec(String(key));
      if (!match) throw new Error('Periodo mensile non valido');
      let year = Number(match[1]);
      let month = Number(match[2]) - 1;
      if (month === 0) { year -= 1; month = 12; }
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    const match = /^(\d{4})-Q([1-4])$/.exec(String(key));
    if (!match) throw new Error('Periodo trimestrale non valido');
    let year = Number(match[1]);
    let quarter = Number(match[2]) - 1;
    if (quarter === 0) { year -= 1; quarter = 4; }
    return `${year}-Q${quarter}`;
  }

  function periodSummary(rows, granularity, key) {
    const subset = rowsForPeriod(rows, granularity, key);
    if (!subset.length) {
      return { key, count: 0, products: 0, supermarkets: 0, averagePrice: 0, medianPrice: 0, minPrice: 0, maxPrice: 0 };
    }
    const prices = subset.map(priceOf);
    return {
      key,
      count: subset.length,
      products: new Set(subset.map((row) => row.product)).size,
      supermarkets: new Set(subset.map((row) => row.supermarket)).size,
      averagePrice: average(prices),
      medianPrice: median(prices),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices)
    };
  }

  function trendWithinPeriod(rows, granularity, key) {
    const subset = rowsForPeriod(rows, granularity, key);
    const groupingKey = granularity === 'month' ? 'offerDate' : 'month';
    return [...groupBy(subset, groupingKey).entries()]
      .map(([groupKey, groupRows]) => ({
        key: groupKey,
        count: groupRows.length,
        averagePrice: average(groupRows.map(priceOf))
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  function typeStats(rows) {
    return [...groupBy(rows, 'type').entries()]
      .map(([type, typeRows]) => ({
        type,
        count: typeRows.length,
        share: typeRows.length / rows.length,
        averagePrice: average(typeRows.map(priceOf)),
        medianPrice: median(typeRows.map(priceOf)),
        minPrice: Math.min(...typeRows.map(priceOf)),
        maxPrice: Math.max(...typeRows.map(priceOf))
      }))
      .sort((a, b) => b.count - a.count);
  }

  function trendForProduct(rows, product) {
    return [...groupBy(rows.filter((row) => row.product === product), 'month').entries()]
      .map(([month, monthRows]) => ({
        month,
        averagePrice: average(monthRows.map(priceOf)),
        count: monthRows.length
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  function topProductsForSupermarket(rows, supermarket, maxRank = 5) {
    const subset = rows.filter((row) => row.supermarket === supermarket);
    const entries = [...groupBy(subset, 'product').entries()].map(([name, itemRows]) => ({
      name,
      count: itemRows.length,
      share: subset.length ? itemRows.length / subset.length : 0,
      averagePrice: average(itemRows.map(priceOf))
    }));
    return denseRank(entries, 'count', maxRank);
  }

  function topSupermarketsForProduct(rows, product, maxRank = 5) {
    const subset = rows.filter((row) => row.product === product);
    const entries = [...groupBy(subset, 'supermarket').entries()].map(([name, itemRows]) => ({
      name,
      count: itemRows.length,
      share: subset.length ? itemRows.length / subset.length : 0,
      averagePrice: average(itemRows.map(priceOf))
    }));
    return denseRank(entries, 'count', maxRank);
  }

  function summarize(rows) {
    const products = productStats(rows);
    const supermarkets = supermarketStats(rows);
    const prices = rows.map(priceOf);
    const top5Count = products.slice(0, 5).reduce((sum, product) => sum + product.count, 0);
    const top10Count = products.slice(0, 10).reduce((sum, product) => sum + product.count, 0);
    const productByAverage = [...products].sort((a, b) => b.averagePrice - a.averagePrice);
    const supermarketByAverage = [...supermarkets].sort((a, b) => b.averagePrice - a.averagePrice);
    return {
      records: rows.length,
      products: products.length,
      supermarkets: supermarkets.length,
      averagePrice: average(prices),
      medianPrice: median(prices),
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      top5Share: rows.length ? top5Count / rows.length : 0,
      top10Share: rows.length ? top10Count / rows.length : 0,
      topProducts: products.slice(0, 10),
      highestAverageProduct: productByAverage[0] || null,
      highestAverageSupermarket: supermarketByAverage[0] || null,
      lowestAverageSupermarket: supermarketByAverage[supermarketByAverage.length - 1] || null,
      simpleProductAverage: average(products.map((item) => item.averagePrice)),
      simpleSupermarketAverage: average(supermarkets.map((item) => item.averagePrice))
    };
  }

  function filterRows(rows, filters) {
    const query = String(filters.query || '').trim().toLocaleLowerCase('it');
    return rows.filter((row) => {
      if (filters.supermarket && row.supermarket !== filters.supermarket) return false;
      if (filters.product && row.product !== filters.product) return false;
      if (filters.type && row.type !== filters.type) return false;
      if (filters.month && row.month !== filters.month) return false;
      if (filters.origin && row.origin !== filters.origin) return false;
      if (query) {
        const haystack = `${row.supermarket} ${row.product} ${row.type || ''} ${row.offerDate || ''} ${row.expiryDate} ${row.price}`.toLocaleLowerCase('it');
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }


  function renewalQueue(rows, today) {
    const current = String(today || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) throw new Error('Data odierna non valida');
    const latest = new Map();
    (rows || []).forEach((row) => {
      if (!row || !row.supermarket || !row.product || !row.expiryDate) return;
      const key = `${row.supermarket}\u0000${row.product}`;
      const previous = latest.get(key);
      const rowOrder = `${row.expiryDate}|${row.offerDate || ''}|${row.id || ''}`;
      const prevOrder = previous ? `${previous.expiryDate}|${previous.offerDate || ''}|${previous.id || ''}` : '';
      if (!previous || rowOrder > prevOrder) latest.set(key, row);
    });
    const todayUtc = Date.parse(`${current}T00:00:00Z`);
    return [...latest.values()]
      .filter((row) => row.expiryDate <= current)
      .map((row) => {
        const expiryUtc = Date.parse(`${row.expiryDate}T00:00:00Z`);
        const daysExpired = Math.max(0, Math.round((todayUtc - expiryUtc) / 86400000));
        return { ...row, status: row.expiryDate === current ? 'today' : 'expired', daysExpired };
      })
      .sort((a, b) => {
        const statusOrder = Number(b.status === 'today') - Number(a.status === 'today');
        if (statusOrder) return statusOrder;
        const expiryOrder = String(b.expiryDate).localeCompare(String(a.expiryDate));
        if (expiryOrder) return expiryOrder;
        return String(a.supermarket).localeCompare(String(b.supermarket), 'it') || String(a.product).localeCompare(String(b.product), 'it');
      });
  }

  function isoDayDiff(fromDate, toDate) {
    const from = Date.parse(`${fromDate}T00:00:00Z`);
    const to = Date.parse(`${toDate}T00:00:00Z`);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
    return Math.round((to - from) / 86400000);
  }

  function rowChronologicalOrder(row) {
    return `${row?.offerDate || ''}|${row?.expiryDate || ''}|${row?.id || ''}`;
  }

  function supermarketRenewalStatus(rows, today, supermarketNames = []) {
    const current = String(today || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) throw new Error('Data odierna non valida');

    const names = new Set([...(supermarketNames || []).filter(Boolean)]);
    (rows || []).forEach((row) => { if (row?.supermarket) names.add(row.supermarket); });

    const grouped = groupBy((rows || []).filter((row) => row?.supermarket), 'supermarket');
    const statusOrder = { expired: 0, today: 1, never: 2, renewed: 3 };

    return [...names].map((supermarket) => {
      const supermarketRows = [...(grouped.get(supermarket) || [])]
        .filter((row) => row.offerDate && row.expiryDate)
        .sort((a, b) => rowChronologicalOrder(a).localeCompare(rowChronologicalOrder(b)));

      if (!supermarketRows.length) {
        return {
          supermarket,
          status: 'never',
          needsRenewal: true,
          latestOffer: null,
          latestProduct: '',
          latestOfferDate: '',
          latestExpiryDate: '',
          daysExpired: 0,
          previousExpired: null,
          offerCount: 0
        };
      }

      const latest = supermarketRows[supermarketRows.length - 1];
      const previousRows = supermarketRows.slice(0, -1);
      const previousExpired = [...previousRows]
        .reverse()
        .find((row) => row.expiryDate <= current) || null;
      const daysExpired = latest.expiryDate < current ? Math.max(0, isoDayDiff(latest.expiryDate, current)) : 0;
      const status = latest.expiryDate < current ? 'expired' : latest.expiryDate === current ? 'today' : 'renewed';

      return {
        supermarket,
        status,
        needsRenewal: status === 'expired' || status === 'today',
        latestOffer: latest,
        latestProduct: latest.product || '',
        latestOfferDate: latest.offerDate,
        latestExpiryDate: latest.expiryDate,
        daysExpired,
        previousExpired,
        offerCount: supermarketRows.length
      };
    }).sort((a, b) => {
      const statusDelta = statusOrder[a.status] - statusOrder[b.status];
      if (statusDelta) return statusDelta;
      if (a.status === 'expired' && b.status === 'expired') {
        const daysDelta = b.daysExpired - a.daysExpired;
        if (daysDelta) return daysDelta;
      }
      if (a.status === 'renewed' && b.status === 'renewed') {
        const expiryDelta = String(a.latestExpiryDate).localeCompare(String(b.latestExpiryDate));
        if (expiryDelta) return expiryDelta;
      }
      return String(a.supermarket).localeCompare(String(b.supermarket), 'it');
    });
  }

  function combinationStats(rows, supermarket, product, today) {
    const current = String(today || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) throw new Error('Data odierna non valida');
    const subset = (rows || [])
      .filter((row) => row?.supermarket === supermarket && row?.product === product && row.offerDate)
      .sort((a, b) => rowChronologicalOrder(a).localeCompare(rowChronologicalOrder(b)));

    if (!subset.length) {
      return {
        supermarket,
        product,
        count: 0,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        lastPrice: 0,
        previousPrice: null,
        priceDelta: null,
        priceDeltaPct: null,
        lastOfferDate: '',
        lastExpiryDate: '',
        daysSinceLastOffer: null,
        averageRenewalDays: null,
        averageOfferDurationDays: null,
        currentMonthCount: 0,
        currentQuarterCount: 0,
        currentYearCount: 0,
        trend: []
      };
    }

    const prices = subset.map(priceOf);
    const latest = subset[subset.length - 1];
    const previous = subset.length > 1 ? subset[subset.length - 2] : null;
    const intervals = subset.slice(1).map((row, index) => isoDayDiff(subset[index].offerDate, row.offerDate));
    const durations = subset
      .filter((row) => row.expiryDate)
      .map((row) => isoDayDiff(row.offerDate, row.expiryDate));
    const currentMonth = current.slice(0, 7);
    const year = current.slice(0, 4);
    const monthNumber = Number(current.slice(5, 7));
    const quarter = `${year}-Q${Math.floor((monthNumber - 1) / 3) + 1}`;
    const priceDelta = previous ? priceOf(latest) - priceOf(previous) : null;
    const priceDeltaPct = previous && priceOf(previous) !== 0 ? priceDelta / priceOf(previous) : null;

    return {
      supermarket,
      product,
      count: subset.length,
      averagePrice: average(prices),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      lastPrice: priceOf(latest),
      lastPackagePrice: Number(latest.price),
      averagePackagePrice: average(subset.map((row) => Number(row.price || 0))),
      previousPrice: previous ? priceOf(previous) : null,
      priceDelta,
      priceDeltaPct,
      lastOfferDate: latest.offerDate,
      lastExpiryDate: latest.expiryDate || '',
      daysSinceLastOffer: Math.max(0, isoDayDiff(latest.offerDate, current)),
      averageRenewalDays: intervals.length ? average(intervals) : null,
      averageOfferDurationDays: durations.length ? average(durations) : null,
      currentMonthCount: subset.filter((row) => row.offerDate.slice(0, 7) === currentMonth).length,
      currentQuarterCount: subset.filter((row) => {
        const m = Number(row.offerDate.slice(5, 7));
        return `${row.offerDate.slice(0, 4)}-Q${Math.floor((m - 1) / 3) + 1}` === quarter;
      }).length,
      currentYearCount: subset.filter((row) => row.offerDate.slice(0, 4) === year).length,
      trend: subset.map((row) => ({
        offerDate: row.offerDate,
        expiryDate: row.expiryDate || '',
        price: priceOf(row),
        packagePrice: Number(row.price),
        weightGrams: row.weightGrams || null,
        type: row.type || ''
      }))
    };
  }

  function sortRows(rows, mode = 'offerDateDesc') {
    const list = [...(rows || [])];
    const specs = {
      offerDateDesc: ['offerDate', -1],
      offerDateAsc: ['offerDate', 1],
      expiryDateDesc: ['expiryDate', -1],
      expiryDateAsc: ['expiryDate', 1]
    };
    const [field, direction] = specs[mode] || specs.offerDateDesc;
    return list.sort((a, b) => {
      const primary = String(a?.[field] || '').localeCompare(String(b?.[field] || '')) * direction;
      if (primary) return primary;
      return String(a?.id || '').localeCompare(String(b?.id || '')) * direction;
    });
  }

  return {
    average,
    median,
    groupBy,
    denseRank,
    productStats,
    supermarketStats,
    monthlyStats,
    quarterlyStats,
    yearlyStats,
    periodKeys,
    periodKeysThroughDate,
    rowsForPeriod,
    previousPeriodKey,
    periodSummary,
    trendWithinPeriod,
    typeStats,
    trendForProduct,
    topProductsForSupermarket,
    topSupermarketsForProduct,
    summarize,
    filterRows,
    renewalQueue,
    supermarketRenewalStatus,
    combinationStats,
    sortRows
  };
});
