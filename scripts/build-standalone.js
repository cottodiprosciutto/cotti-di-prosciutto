const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="assets/styles.css" />', `<style>\n${css}\n</style>`);

const scripts = [
  'data/cdp-data.js',
  'js/data-model.js',
  'js/analytics.js',
  'js/charts.js',
  'js/config.js',
  'js/supabase-store.js',
  'js/local-store.js',
  'js/mode-controller.js',
  'js/app.js'
];

for (const relative of scripts) {
  const tag = `<script src="${relative}"></script>`;
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!html.includes(tag)) throw new Error(`Tag non trovato in index.html: ${tag}`);
  html = html.replace(tag, `<script>\n${source}\n</script>`);
}

fs.writeFileSync(path.join(root, 'CDP_2026_Gestionale.html'), html);
console.log('Generato CDP_2026_Gestionale.html da index.html + assets/js.');
