// Иконки и OG из мастер-файлов конвейера (src/assets/brand/logo.png — логотип ×4 Real-ESRGAN, production/ceh.jpg).
// Эмблема-щит из логотипа «Рабочая тема» → favicon.ico/svg, apple-touch-icon, icon-192/512 (новый бренд не рисуем).
// OG 1200×630: фото цеха + логотип. Результат — public/ (файлы отдаются через url() с учётом base).
// Запуск: node scripts/prepare-assets.mjs (после npm run images)
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const p = (...a) => join(ROOT, ...a);
mkdirSync(p('public/og'), { recursive: true });
const logo = readFileSync(p('src/assets/brand/logo.png'));
const { width: LW, height: LH } = await sharp(logo).metadata();

// щит занимает левый квадрат логотипа (≈ 27 % ширины)
const SHIELD = { left: 0, top: 0, width: Math.round(LH * 0.98), height: LH };
// маска-пятиугольник по контуру щита: синий фон надписи справа снизу не попадает в иконку
const sw = SHIELD.width, sh = SHIELD.height;
const maskSvg = Buffer.from(`<svg width="${sw}" height="${sh}"><polygon fill="#fff" points="0,0 ${sw},0 ${sw},${sh * 0.69} ${sw * 0.5},${sh} 0,${sh * 0.69}"/></svg>`);
const shield = await sharp(await sharp(logo).extract(SHIELD).ensureAlpha().composite([{ input: maskSvg, blend: 'dest-in' }]).png().toBuffer())
  .flatten({ background: '#ffffff' }).trim({ background: '#ffffff', threshold: 20 }).png().toBuffer();
const icon = async (size, pad = 0.08) => {
  const inner = Math.round(size * (1 - 2 * pad));
  const s = await sharp(shield).resize(inner, inner, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
    .composite([{ input: s, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png({ compressionLevel: 9, palette: true, effort: 10 });
};
const out = async (pipe, file) => writeFileSync(p(file), await pipe.toBuffer());
await out(await icon(180), 'public/apple-touch-icon.png');
await out(await icon(192), 'public/icon-192.png');
await out(await icon(512), 'public/icon-512.png');
const png32 = await (await icon(32, 0.02)).toBuffer();
writeFileSync(p('public/favicon-32.png'), png32);
// favicon.ico с PNG внутри
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18);
writeFileSync(p('public/favicon.ico'), Buffer.concat([ico, png32]));
const png64 = await (await icon(64, 0.02)).toBuffer();
writeFileSync(p('public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${png64.toString('base64')}"/></svg>\n`);

// OG 1200×630
const W = 1200, H = 630;
const bg = await sharp(readFileSync(p('src/assets/production/ceh.jpg'))).resize(W, H, { fit: 'cover' }).toBuffer();
const lw = 560, lh = Math.round((LH / LW) * lw);
const l = await sharp(logo).resize(lw, lh).toBuffer();
const plate = Buffer.from(`<svg width="${lw + 48}" height="${lh + 48}"><rect width="100%" height="100%" rx="12" fill="#ffffff"/></svg>`);
await out(sharp(bg).composite([
  { input: plate, left: 48, top: H - lh - 96 },
  { input: l, left: 72, top: H - lh - 72 },
]).jpeg({ quality: 82, mozjpeg: true }), 'public/og/default.jpg');
console.log('public/: favicon.ico/svg, favicon-32, apple-touch-icon, icon-192/512, og/default.jpg');
