(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs = {}, text = '') {
    const el = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text !== '') el.textContent = text;
    return el;
  }

  function clear(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  function emptyState(container, message) {
    clear(container);
    const el = document.createElement('div');
    el.className = 'chart-empty';
    el.textContent = message;
    container.appendChild(el);
  }

  function horizontalBar(container, data, options = {}) {
    if (!data || !data.length) return emptyState(container, 'Nessun dato disponibile');
    clear(container);
    const width = 760;
    const rowHeight = Math.max(34, options.rowHeight || 38);
    const height = Math.max(180, 58 + data.length * rowHeight);
    const left = Math.min(300, Math.max(160, options.left || 230));
    const right = 72;
    const top = 24;
    const bottom = 26;
    const plotWidth = width - left - right;
    const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);
    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': options.ariaLabel || 'Grafico a barre' });
    svg.classList.add('chart-svg');

    data.forEach((item, index) => {
      const y = top + index * rowHeight;
      const value = Number(item.value) || 0;
      const barWidth = (value / maxValue) * plotWidth;
      const label = svgEl('text', { x: left - 12, y: y + 21, class: 'chart-label', 'text-anchor': 'end' }, item.label);
      const track = svgEl('rect', { x: left, y: y + 6, width: plotWidth, height: 20, rx: 8, class: 'chart-track' });
      const bar = svgEl('rect', { x: left, y: y + 6, width: Math.max(2, barWidth), height: 20, rx: 8, class: 'chart-bar' });
      const valueText = svgEl('text', { x: left + barWidth + 8, y: y + 21, class: 'chart-value' }, options.valueFormatter ? options.valueFormatter(value, item) : String(value));
      const title = svgEl('title', {}, `${item.label}: ${options.valueFormatter ? options.valueFormatter(value, item) : value}`);
      bar.appendChild(title);
      svg.append(label, track, bar, valueText);
    });

    const baseline = svgEl('line', { x1: left, y1: height - bottom, x2: width - right, y2: height - bottom, class: 'chart-axis' });
    svg.appendChild(baseline);
    container.appendChild(svg);
  }

  function line(container, data, options = {}) {
    if (!data || !data.length) return emptyState(container, 'Nessun dato disponibile');
    clear(container);
    const width = 760;
    const height = options.compact ? 220 : 300;
    const left = 58;
    const right = 22;
    const top = 24;
    const bottom = 54;
    const values = data.map((item) => Number(item.value)).filter(Number.isFinite);
    if (!values.length) return emptyState(container, 'Nessun dato disponibile');
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);
    if (minValue === maxValue) {
      minValue -= 1;
      maxValue += 1;
    }
    const pad = (maxValue - minValue) * 0.12;
    minValue = options.zeroBaseline ? 0 : Math.max(0, minValue - pad);
    maxValue += pad;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = (index) => data.length === 1 ? left + plotWidth / 2 : left + (index / (data.length - 1)) * plotWidth;
    const y = (value) => top + (1 - (value - minValue) / (maxValue - minValue)) * plotHeight;
    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': options.ariaLabel || 'Grafico a linea' });
    svg.classList.add('chart-svg');

    const ticks = 4;
    for (let i = 0; i <= ticks; i += 1) {
      const v = minValue + ((maxValue - minValue) * i / ticks);
      const yy = y(v);
      svg.appendChild(svgEl('line', { x1: left, y1: yy, x2: width - right, y2: yy, class: 'chart-grid' }));
      svg.appendChild(svgEl('text', { x: left - 10, y: yy + 4, class: 'chart-tick', 'text-anchor': 'end' }, options.valueFormatter ? options.valueFormatter(v) : v.toFixed(1)));
    }

    const points = data.map((item, index) => `${x(index)},${y(Number(item.value))}`).join(' ');
    const baselineY = top + plotHeight;
    const areaPoints = `${x(0)},${baselineY} ${points} ${x(data.length - 1)},${baselineY}`;
    svg.appendChild(svgEl('polygon', { points: areaPoints, class: 'chart-area' }));
    svg.appendChild(svgEl('polyline', { points, fill: 'none', class: 'chart-line' }));

    data.forEach((item, index) => {
      const cx = x(index);
      const cy = y(Number(item.value));
      const circle = svgEl('circle', { cx, cy, r: options.compact ? 4.5 : 5.5, class: 'chart-point' });
      circle.appendChild(svgEl('title', {}, `${item.label}: ${options.valueFormatter ? options.valueFormatter(item.value, item) : item.value}`));
      svg.appendChild(circle);
      if (!options.compact || data.length <= 10 || index % 2 === 0) {
        const label = options.labelFormatter ? options.labelFormatter(item.label) : item.label;
        svg.appendChild(svgEl('text', { x: cx, y: height - 24, class: 'chart-x-label', 'text-anchor': 'middle' }, label));
      }
    });

    svg.appendChild(svgEl('line', { x1: left, y1: top + plotHeight, x2: width - right, y2: top + plotHeight, class: 'chart-axis' }));
    container.appendChild(svg);
  }

  root.CDPCharts = { horizontalBar, line };
})(typeof globalThis !== 'undefined' ? globalThis : this);
