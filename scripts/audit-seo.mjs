// SEO-аудит собранного сайта (dist/) без JS — как его видит робот. Учитывает base (проектный сайт GitHub Pages).
// Запуск: npm run audit (после сборки; SITE/BASE — те же, что при сборке). Код выхода 1 — есть ошибки.
//
// Проверяет:
//  - мета: title (≤60, уникальный), description (120–160, уникальный), lang, viewport, theme-color, CSP,
//    canonical = origin+base+путь, OG/Twitter (абсолютные, под base), иконки и manifest, noindex только где задумано;
//  - base: в HTML нет href/src="/…" без префикса base; JSON-LD/og/canonical/sitemap начинаются с origin+base;
//  - структура: один H1, без пропуска уровней, контент в HTML;
//  - изображения: alt, width/height, файлы существуют, lazy ниже первого экрана;
//  - ссылки: внутренние резолвятся в dist, якоря существуют, слэш на конце;
//  - JSON-LD: парсится, нет рейтингов/отзывов, Offer с price/priceCurrency, у товара Product;
//  - цены: цена каждого товара из data/products.json есть на его странице; все строки прайса — на /optom/;
//  - sitemap/robots/manifest; запрещённые строки; бюджеты HTML/CSS/JS; внешние запросы.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse } from 'node-html-parser';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
if (!existsSync(DIST)) { console.error('dist/ не найден — сначала npm run build'); process.exit(1); }

const { SITE } = await import('../src/config/site.ts');
const products = JSON.parse(readFileSync(join(ROOT, 'data/products.json'), 'utf8'));
const price = JSON.parse(readFileSync(join(ROOT, 'data/price.json'), 'utf8'));

const ORIGIN = SITE.origin;
const BASE = SITE.base; // '/rabochaya-tema/' | '/'
const PREFIX = ORIGIN + BASE;
const EXPECTED_NOINDEX = new Set(['/politika-konfidencialnosti/', '/404/']);
const TITLE_MAX = 60, DESC_MIN = 120, DESC_MAX = 160;
const BUDGET = { html: 30_000, css: 30_000, js: 10_000 };
const FORBIDDEN = [...(await import('./forbidden.mjs')).FORBIDDEN, /TODO/];

const errors = [], warnings = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);
const warn = (page, msg) => warnings.push(`${page}: ${msg}`);

// ---------- файлы ----------
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(DIST);
const rel = (p) => '/' + relative(DIST, p).split(sep).join('/');
const fileSet = new Set(files.map(rel));
const htmlFiles = files.filter((f) => f.endsWith('.html'));
/** dist-файл → путь страницы без base: /katalog/index.html → /katalog/, /404.html → /404/ */
const pageUrl = (f) => { const r = rel(f); return r.endsWith('/index.html') ? r.slice(0, -'index.html'.length) : r.replace(/\.html$/, '/'); };

/** Публичный pathname (с base) → файл в dist или null. Путь без base — тоже null. */
function resolveTarget(pathname) {
  let p;
  try { p = decodeURI(pathname); } catch { p = pathname; }
  if (!p.startsWith(BASE)) return null;
  p = '/' + p.slice(BASE.length);
  if (p.endsWith('/')) return fileSet.has(p + 'index.html') ? p + 'index.html' : null;
  if (fileSet.has(p)) return p;
  if (fileSet.has(p + '/index.html')) return p + '/index.html';
  return null;
}
const isInternal = (href) => {
  if (!href || /^(mailto:|tel:|javascript:|data:|#)/i.test(href)) return false;
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) { try { return new URL(href, ORIGIN).origin === ORIGIN; } catch { return false; } }
  return true;
};

// ---------- разбор ----------
const pages = new Map();
for (const f of htmlFiles) {
  const html = readFileSync(f, 'utf8');
  const root = parse(html, { comment: false });
  pages.set(pageUrl(f), { html, root, ids: new Set(root.querySelectorAll('[id]').map((el) => el.getAttribute('id'))), gz: gzipSync(html).length, size: Buffer.byteLength(html) });
}

const titles = new Map(), descs = new Map(), indexable = new Set(), linkedFrom = new Map();

for (const [url, { html, root, ids, gz }] of pages) {
  const head = root.querySelector('head');
  const meta = (sel) => head?.querySelector(sel)?.getAttribute('content')?.trim();
  const is404 = url === '/404/';
  const pub = BASE + url.slice(1); // публичный путь страницы

  if (root.querySelector('html')?.getAttribute('lang') !== 'ru') err(url, 'lang≠"ru"');
  if (!meta('meta[name="viewport"]')?.includes('width=device-width')) err(url, 'нет viewport');
  if (!meta('meta[name="theme-color"]')) err(url, 'нет theme-color');
  if (!head?.querySelector('meta[charset]')) err(url, 'нет meta charset');
  if (!meta('meta[http-equiv="Content-Security-Policy"]')) err(url, 'нет CSP meta');

  // --- base: абсолютные пути без префикса ---
  for (const [, attr, val] of html.matchAll(/\s(href|src|srcset|action|content)="(\/[^"]*)"/g)) {
    for (const v of val.split(',').map((s) => s.trim().split(/\s+/)[0])) {
      if (v.startsWith('/') && !v.startsWith('//') && !v.startsWith(BASE)) err(url, `${attr}="${v}" без base ${BASE}`);
    }
  }
  for (const re of FORBIDDEN) if (re.test(root.querySelector('body')?.text ?? '') || re.test(head?.toString() ?? '')) err(url, `запрещённая строка ${re}`);

  const title = head?.querySelector('title')?.text.trim() ?? '';
  if (!title) err(url, 'нет <title>');
  else if (title.length > TITLE_MAX) err(url, `title ${title.length} симв. > ${TITLE_MAX}: «${title}»`);
  if (title) titles.set(title, [...(titles.get(title) ?? []), url]);
  const desc = meta('meta[name="description"]') ?? '';
  if (!desc) err(url, 'нет description');
  else if (desc.length < DESC_MIN || desc.length > DESC_MAX) err(url, `description ${desc.length} симв. (нужно ${DESC_MIN}–${DESC_MAX}): «${desc}»`);
  if (desc) descs.set(desc, [...(descs.get(desc) ?? []), url]);

  const robots = (meta('meta[name="robots"]') ?? '').toLowerCase();
  const noindex = robots.includes('noindex');
  if (noindex && !EXPECTED_NOINDEX.has(url)) err(url, `неожиданный noindex («${robots}»)`);
  if (!noindex && EXPECTED_NOINDEX.has(url)) err(url, 'ожидался noindex');
  if (!noindex) indexable.add(url);

  const canonical = head?.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!is404) {
    if (!canonical) err(url, 'нет canonical');
    else if (canonical !== ORIGIN + pub) err(url, `canonical ${canonical} ≠ ${ORIGIN + pub}`);
  }
  for (const p of ['og:type', 'og:title', 'og:description', 'og:url', 'og:image', 'og:locale', 'og:site_name']) {
    if (!meta(`meta[property="${p}"]`) && !(is404 && p === 'og:url')) err(url, `нет ${p}`);
  }
  const ogUrl = meta('meta[property="og:url"]');
  if (ogUrl && ogUrl !== canonical) err(url, 'og:url ≠ canonical');
  const ogImage = meta('meta[property="og:image"]');
  if (ogImage) {
    if (!ogImage.startsWith(PREFIX)) err(url, `og:image не под ${PREFIX}: ${ogImage}`);
    else if (!resolveTarget(new URL(ogImage).pathname)) err(url, `og:image не найден: ${ogImage}`);
  }
  for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) if (!meta(`meta[name="${n}"]`)) err(url, `нет ${n}`);

  const links = head?.querySelectorAll('link') ?? [];
  const relHas = (r) => links.filter((l) => (l.getAttribute('rel') ?? '').split(/\s+/).includes(r));
  if (!relHas('icon').length) err(url, 'нет link rel=icon');
  if (!relHas('apple-touch-icon').length) err(url, 'нет apple-touch-icon');
  if (!relHas('manifest').length) err(url, 'нет manifest');
  for (const l of links) {
    const href = l.getAttribute('href');
    if (isInternal(href) && !resolveTarget(new URL(href, ORIGIN + pub).pathname)) err(url, `битый <link ${l.getAttribute('rel')}> ${href}`);
    if (href && /^https?:\/\//.test(href) && new URL(href).origin !== ORIGIN && /stylesheet|preload|icon/.test(l.getAttribute('rel') ?? '')) err(url, `внешний ресурс: ${href}`);
  }
  for (const s of root.querySelectorAll('script[src]')) {
    const src = s.getAttribute('src');
    if (isInternal(src)) { if (!resolveTarget(new URL(src, ORIGIN + pub).pathname)) err(url, `битый script ${src}`); } else err(url, `внешний скрипт: ${src}`);
  }

  // --- заголовки ---
  const hs = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const h1 = hs.filter((h) => h.tagName === 'H1');
  if (h1.length !== 1) err(url, `H1: ${h1.length} шт.`);
  let prev = 1;
  for (const h of hs) {
    const lvl = Number(h.tagName[1]);
    if (lvl > prev + 1 && h.closest('main')) err(url, `пропуск уровня: ${h.tagName} после H${prev} («${h.text.trim().slice(0, 40)}»)`);
    if (!h.text.trim()) err(url, `пустой ${h.tagName}`);
    if (h.closest('main')) prev = lvl;
  }
  const main = root.querySelector('main');
  const text = (main?.text ?? '').replace(/\s+/g, ' ').trim();
  if (!main) err(url, 'нет <main>');
  else if (text.length < 300) warn(url, `мало текста в <main>: ${text.length} симв.`);

  // --- изображения ---
  const imgs = root.querySelectorAll('img');
  imgs.forEach((img, i) => {
    const src = img.getAttribute('src');
    if (!img.hasAttribute('alt')) err(url, `img без alt: ${src}`);
    if (!img.getAttribute('width') || !img.getAttribute('height')) err(url, `img без width/height: ${src}`);
    if (i > 3 && img.getAttribute('loading') !== 'lazy') warn(url, `img ниже первого экрана без loading=lazy: ${src}`);
  });
  const srcs = [
    ...imgs.map((i) => i.getAttribute('src')),
    ...root.querySelectorAll('img[srcset], source[srcset]').flatMap((el) => el.getAttribute('srcset').split(',').map((s) => s.trim().split(/\s+/)[0])),
  ].filter(Boolean);
  for (const s of new Set(srcs)) if (isInternal(s) && !resolveTarget(new URL(s, ORIGIN + pub).pathname)) err(url, `битое изображение ${s}`);

  // --- ссылки ---
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href').trim();
    if (!a.text.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')) err(url, `ссылка без текста: ${href}`);
    if (href.startsWith('#')) { if (href.length > 1 && !ids.has(decodeURIComponent(href.slice(1)))) err(url, `якорь не найден: ${href}`); continue; }
    if (href.startsWith('mailto:') && /[<>"\s]/.test(href)) err(url, `mailto не экранирован: ${href}`);
    if (!isInternal(href)) continue;
    const u = new URL(href, ORIGIN + pub);
    const target = resolveTarget(u.pathname);
    if (!target) { err(url, `битая ссылка: ${href}`); continue; }
    if (target.endsWith('.html') && !u.pathname.endsWith('/')) warn(url, `ссылка без слэша: ${href}`);
    if (target.endsWith('.html')) {
      const tUrl = target.endsWith('/index.html') ? target.slice(0, -'index.html'.length) : target.replace(/\.html$/, '/');
      if (!linkedFrom.has(tUrl)) linkedFrom.set(tUrl, new Set());
      if (tUrl !== url) linkedFrom.get(tUrl).add(url);
      if (u.hash.length > 1 && !pages.get(tUrl)?.ids.has(decodeURIComponent(u.hash.slice(1)))) err(url, `якорь не найден: ${href}`);
    }
  }

  // --- JSON-LD ---
  let hasProduct = false;
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try { data = JSON.parse(s.innerHTML); } catch (e) { err(url, `JSON-LD не парсится: ${e.message}`); continue; }
    const nodes = [];
    const collect = (v) => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { nodes.push(v); Object.values(v).forEach(collect); } };
    collect(data);
    for (const t of Array.isArray(data) ? data : [data]) {
      if (!t['@context']) err(url, 'JSON-LD без @context');
      if (!t['@type']) err(url, 'JSON-LD без @type');
    }
    for (const n of nodes) {
      const type = [].concat(n['@type'] ?? []);
      if (type.includes('Product')) hasProduct = true;
      if (type.includes('AggregateRating') || n.aggregateRating || type.includes('Review') || n.review) err(url, 'JSON-LD: рейтинг/отзывы запрещены (реальных отзывов нет)');
      if (type.includes('Offer') && (n.price === undefined || !n.priceCurrency)) err(url, 'Offer без price/priceCurrency');
      if (type.includes('AggregateOffer') && (n.lowPrice === undefined || !n.priceCurrency)) err(url, 'AggregateOffer без lowPrice/priceCurrency');
      if (n.availability || n.gtin || n.gtin13) err(url, 'JSON-LD: availability/gtin не подтверждены источником');
      for (const [k, v] of Object.entries(n)) {
        if (typeof v !== 'string') continue;
        if (/TODO/i.test(v)) err(url, `JSON-LD ${type.join('/') || '?'}.${k} содержит TODO`);
        if (v.startsWith(ORIGIN) && !v.startsWith(PREFIX)) err(url, `JSON-LD ${k}: URL без base: ${v}`);
        if (v.startsWith(PREFIX) && !['@id'].includes(k) && !resolveTarget(new URL(v).pathname)) err(url, `JSON-LD ${k}: URL не существует: ${v}`);
      }
    }
  }
  if (/^\/katalog\/[^/]+\/([^/]+\/)?[^/]+\/$/.test(url)) {
    const p = products.find((x) => x.path === url);
    if (p) {
      if (!hasProduct) err(url, 'нет JSON-LD Product');
      if (!root.querySelector(`.product__price [data-price="${p.price}"]`)) err(url, `нет цены ${p.price} из data/products.json`);
    }
  }
  if (gz > BUDGET.html) warn(url, `HTML ${(gz / 1024).toFixed(1)} КБ gzip > ${BUDGET.html / 1000} КБ`);
}

for (const [t, urls] of titles) if (urls.length > 1) err(urls.join(', '), `одинаковый title «${t}»`);
for (const [d, urls] of descs) if (urls.length > 1) err(urls.join(', '), `одинаковый description «${d.slice(0, 50)}…»`);
for (const url of indexable) if (url !== '/' && !linkedFrom.get(url)?.size) warn(url, 'страница-сирота');
for (const p of products) if (!pages.has(p.path)) err(p.path, 'нет страницы товара');

// --- прайс ---
const optom = pages.get('/optom/');
if (!optom) err('/optom/', 'нет страницы');
else for (const g of price.groups) for (const r of g.rows) {
  const row = optom.root.querySelector(`tr[id="${r.id}"]`);
  if (!row) err('/optom/', `нет строки ${r.id}`);
  else if (r.priceFrom !== null && !row.querySelector(`[data-price="${r.priceFrom}"]`)) err('/optom/', `нет цены ${r.priceFrom} в строке ${r.id}`);
}

// --- sitemap ---
const smIndex = join(DIST, 'sitemap-index.xml');
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!existsSync(smIndex)) err('sitemap', 'нет sitemap-index.xml');
else {
  const all = [];
  for (const sm of locs(readFileSync(smIndex, 'utf8'))) {
    if (!sm.startsWith(PREFIX)) err('sitemap', `URL не под ${PREFIX}: ${sm}`);
    const t = resolveTarget(new URL(sm).pathname);
    if (!t) { err('sitemap', `нет файла ${sm}`); continue; }
    all.push(...locs(readFileSync(join(DIST, t), 'utf8')));
  }
  const inSitemap = new Set();
  for (const loc of all) {
    if (!loc.startsWith(PREFIX)) { err('sitemap', `URL не под ${PREFIX}: ${loc}`); continue; }
    const p = '/' + new URL(loc).pathname.slice(BASE.length);
    inSitemap.add(p);
    if (!p.endsWith('/')) err('sitemap', `URL без слэша: ${loc}`);
    if (!pages.has(p)) err('sitemap', `нет страницы: ${loc}`);
    else if (!indexable.has(p)) err('sitemap', `noindex-страница в sitemap: ${loc}`);
  }
  for (const p of indexable) if (!inSitemap.has(p)) err('sitemap', `индексируемая страница не в sitemap: ${p}`);
}

// --- robots.txt ---
const robotsPath = join(DIST, 'robots.txt');
if (!existsSync(robotsPath)) err('robots.txt', 'нет файла');
else {
  const r = readFileSync(robotsPath, 'utf8');
  const sm = r.match(/^Sitemap:\s*(\S+)/m)?.[1];
  if (!sm || !sm.startsWith(PREFIX) || !resolveTarget(new URL(sm).pathname)) err('robots.txt', `Sitemap не указывает на файл сайта: ${sm}`);
  if (/^Disallow:\s*\/\s*$/m.test(r)) err('robots.txt', 'Disallow: / закрывает сайт');
  if (BASE !== '/') warnings.push(`robots.txt: сайт в подкаталоге ${BASE} — роботы читают ${ORIGIN}/robots.txt (см. DEPLOY.md, шаг с kontur)`);
}

// --- manifest ---
const mf = join(DIST, 'site.webmanifest');
if (!existsSync(mf)) err('manifest', 'нет site.webmanifest');
else {
  const m = JSON.parse(readFileSync(mf, 'utf8'));
  if (m.start_url !== BASE || m.scope !== BASE) err('manifest', `start_url/scope ≠ ${BASE}`);
  for (const i of m.icons ?? []) if (!resolveTarget(i.src)) err('manifest', `иконка не найдена: ${i.src}`);
}

// --- инструменты/исходники не в dist ---
for (const f of fileSet) if (/^\/(source|scripts|data|\.images-sheet)\//.test(f) || /\.(mjs|md|map)$/.test(f)) err('dist', `лишний файл: ${f}`);

// --- бюджеты ---
let cssTotal = 0, jsTotal = 0;
for (const f of files) { const r = rel(f); if (r.endsWith('.css')) cssTotal += statSync(f).size; if (r.endsWith('.js')) jsTotal += statSync(f).size; }
const home = pages.get('/');
const inlineCss = home ? home.root.querySelectorAll('style').reduce((n, s) => n + Buffer.byteLength(s.innerHTML), 0) : 0;
const inlineJs = home ? home.root.querySelectorAll('script:not([type="application/ld+json"]):not([src])').reduce((n, s) => n + Buffer.byteLength(s.innerHTML), 0) : 0;
if (cssTotal + inlineCss > BUDGET.css) warn('budget', `CSS ${((cssTotal + inlineCss) / 1024).toFixed(1)} КБ > ${BUDGET.css / 1000} КБ`);
if (jsTotal + inlineJs > BUDGET.js) warn('budget', `JS ${((jsTotal + inlineJs) / 1024).toFixed(1)} КБ > ${BUDGET.js / 1000} КБ`);
const fonts = files.filter((f) => f.endsWith('.woff2')).length;
if (fonts > 2) warn('budget', `woff2: ${fonts} > 2`);

const kb = (n) => `${(n / 1024).toFixed(1)} КБ`;
console.log(`audit-seo: ${PREFIX} — страниц ${pages.size} (индексируемых ${indexable.size}), файлов ${files.length}; CSS ${kb(cssTotal)} + ${kb(inlineCss)} инлайн, JS ${kb(jsTotal)} + ${kb(inlineJs)} инлайн, HTML главной ${kb(home?.size ?? 0)} (${kb(home?.gz ?? 0)} gzip), woff2: ${fonts}`);
for (const w of new Set(warnings)) console.log(`  warn  ${w}`);
for (const e of new Set(errors)) console.log(`  ERROR ${e}`);
console.log(errors.length ? `✗ ошибок: ${new Set(errors).size}, предупреждений: ${new Set(warnings).size}` : `✓ ошибок нет, предупреждений: ${new Set(warnings).size}`);
process.exit(errors.length ? 1 : 0);
