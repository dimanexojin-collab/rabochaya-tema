// Список незаполненных (TODO) полей в src/config/site.ts (Node ≥ 23 импортирует .ts напрямую).
// Без аргументов — подробный список; `--summary` — одна строка (используется в `npm run build`).
// STRICT=1 — выход с кодом 1, если TODO остались в обязательных полях (REQUIRED_FIELDS).
// Дополнительно: в коде и данных нет запрещённых строк (лишние адреса, спам-блок старого сайта).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, REQUIRED_FIELDS, isTodo } from '../src/config/site.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const todos = [];
function walk(value, path) {
  if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
  if (typeof value === 'string' && /TODO/i.test(value)) todos.push({ key: path, value });
}
walk(SITE, '');
if (SITE.geo.lat === 0 && SITE.geo.lon === 0) todos.push({ key: 'geo', value: 'lat/lon = 0 (карта не выводится)' });
if (!SITE.hoursSpec.length) todos.push({ key: 'hoursSpec', value: 'пусто (openingHours в JSON-LD не выводится)' });

const base = (k) => k.replace(/\[\d+\].*$/, '');
const isReq = (k) => REQUIRED_FIELDS.some((r) => base(k) === r || base(k).startsWith(r + '.'));
const reqTodos = todos.filter((t) => isReq(t.key));

// запрещённые строки (PLAN.md: не переносим закрытые адреса, фразу про конкурента, спам-блок) — см. forbidden.mjs
const { FORBIDDEN } = await import('./forbidden.mjs');
const scan = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? scan(p) : /\.(ts|astro|json|css|mjs|md)$/.test(n) ? [p] : [];
});
const hits = [];
for (const f of [...scan(join(ROOT, 'src')), ...scan(join(ROOT, 'data'))]) {
  const text = readFileSync(f, 'utf8');
  for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${f.slice(ROOT.length)}: ${re}`);
}

if (process.argv.includes('--summary')) {
  console.log(`check:todo: плейсхолдеров в site.ts — ${todos.length}, обязательных — ${reqTodos.length}; запрещённых строк — ${hits.length} (подробно: npm run check:todo)`);
} else {
  console.log(`Незаполненные поля src/config/site.ts (${todos.length}):`);
  for (const t of todos) console.log(`  ${isReq(t.key) ? '[обязательно]' : '[желательно] '} ${t.key.padEnd(22)} ${t.value}`);
  for (const h of hits) console.log(`  [запрещено]   ${h}`);
}
if (hits.length) { console.error('Найдены запрещённые строки (см. выше)'); process.exit(1); }
if (process.env.STRICT === '1' && reqTodos.length) {
  console.error(`STRICT=1: не заполнены обязательные поля: ${[...new Set(reqTodos.map((t) => base(t.key)))].join(', ')}`);
  process.exit(1);
}
