// Lighthouse по ключевым страницам (mobile + desktop) на собранном сайте; пути — под base.
// 1) npm run build:fast  2) npm run preview (в другом окне)  3) npm run lighthouse [-- http://localhost:4321]
// Нужен Chrome или Edge (CHROME_PATH). Отчёты JSON — в .lighthouse/.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { SITE } from '../src/config/site.ts';

const HOST = (process.argv[2] ?? 'http://localhost:4321').replace(/\/+$/, '');
const BASE = SITE.base;
const PAGES = ['', 'katalog/perchatki/s-pvh/', 'katalog/perchatki/s-pvh/perchatki-pvh-10-klass-serye/', 'optom/', 'kontakty/', 'stati/klass-vyazki-7-i-10/'];
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chromePath = CANDIDATES.find((p) => existsSync(p));
const OUT = new URL('../.lighthouse/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
const rows = [];
try {
  for (const formFactor of ['mobile', 'desktop']) {
    const config = formFactor === 'desktop' ? (await import('lighthouse/core/config/desktop-config.js')).default : undefined;
    for (const page of PAGES) {
      const path = BASE + page;
      const { lhr } = await lighthouse(HOST + path, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, config);
      const c = lhr.categories, a = lhr.audits;
      const row = {
        page: path, ff: formFactor,
        perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100),
        bp: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100),
        LCP: a['largest-contentful-paint'].displayValue, CLS: a['cumulative-layout-shift'].displayValue, TBT: a['total-blocking-time'].displayValue,
      };
      row.issues = Object.values(a)
        .filter((x) => x.score !== null && x.score < 0.9 && ['binary', 'numeric', 'metricSavings'].includes(x.scoreDisplayMode))
        .map((x) => `${x.id}${x.displayValue ? ` (${x.displayValue})` : ''}`).join('; ');
      rows.push(row);
      writeFileSync(new URL(`${formFactor}${path.replace(/\//g, '_')}.json`, OUT), JSON.stringify(lhr));
    }
  }
} finally {
  await chrome.kill();
}
console.table(rows.map(({ issues, ...r }) => r));
for (const r of rows) if (r.issues) console.log(`${r.ff} ${r.page}: ${r.issues}`);
