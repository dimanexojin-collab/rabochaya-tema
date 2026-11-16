// Контактный лист для ручной приёмки фото: «исходник (как есть, ×1) | результат конвейера».
// Пишет PNG-листы и HTML в .images-sheet/ (в git и в dist не попадает).
// Запуск: node scripts/images-sheet.mjs [--kind product|category|news-thumb|all] [--only id1,id2]
import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, '.images-sheet');
mkdirSync(OUT, { recursive: true });
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const kind = arg('--kind') ?? 'product';
const only = arg('--only')?.split(',');
const manifest = JSON.parse(readFileSync(join(ROOT, 'data/images.manifest.json'), 'utf8'));
const items = manifest.images.filter((m) =>
  (only ? only.includes(m.id) : kind === 'all' || m.kind === kind) && m.target && existsSync(join(ROOT, m.target)));

const CELL = 300;
const PER_SHEET = 8;
const cell = async (file, label) => {
  const img = await sharp(readFileSync(file)).flatten({ background: '#ebeadf' }).resize(CELL, CELL, { fit: 'contain', background: '#ebeadf', withoutEnlargement: false, kernel: 'nearest' }).png().toBuffer();
  const txt = Buffer.from(`<svg width="${CELL}" height="18"><rect width="100%" height="100%" fill="#000"/><text x="4" y="13" font-size="11" font-family="Arial" fill="#fff">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`);
  return sharp({ create: { width: CELL, height: CELL + 18, channels: 3, background: '#ebeadf' } })
    .composite([{ input: img, top: 18, left: 0 }, { input: txt, top: 0, left: 0 }]).png().toBuffer();
};

const sheets = [];
for (let s = 0; s * PER_SHEET < items.length; s++) {
  const chunk = items.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
  const rows = [];
  for (const m of chunk) {
    const src = join(ROOT, m.src);
    const meta = await sharp(readFileSync(src)).metadata();
    const res = await sharp(readFileSync(join(ROOT, m.target))).metadata();
    rows.push([
      await cell(src, `${m.id} src ${meta.width}x${meta.height}`),
      await cell(join(ROOT, m.target), `${m.result?.method ?? '?'} ${res.width}x${res.height}`),
    ]);
  }
  const W = CELL * 2 + 8, H = (CELL + 18 + 8) * rows.length;
  const comp = rows.flatMap((r, i) => r.map((b, j) => ({ input: b, left: j * (CELL + 8), top: i * (CELL + 26) })));
  const file = join(OUT, `${kind}-${s + 1}.png`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#fff' } }).composite(comp).png().toBuffer().then((b) => writeFileSync(file, b));
  sheets.push(file);
}
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>images</title><style>body{background:#ebeadf;font:14px sans-serif}img{max-width:100%}</style>${
  items.map((m) => `<figure><figcaption>${m.id} — ${m.result?.method ?? ''}</figcaption><img src="../${m.src}" height="270"> <img src="../${m.target}" height="400"></figure>`).join('\n')}`);
console.log(sheets.join('\n'));
