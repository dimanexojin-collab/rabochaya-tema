// Конвейер фото: source/images (не изменяется) → мастер-файлы src/assets/** по data/images.manifest.json.
// Приоритет источника: source/originals/{id}.* (оригинал от заказчика) → Real-ESRGAN → sharp.
//
//  esrgan    realesrgan-ncnn-vulkan -n realesrgan-x4plus -s 4 (GPU/Vulkan). Нужна папка с релизом:
//            REALESRGAN_DIR (см. scripts/fetch-realesrgan.mjs). Нет релиза/Vulkan → автоматически sharp.
//  sharp     lanczos3 ×4 → median(3) → лёгкий blur 0.3 → unsharp (sigma 0.8)
//  blend     50/50 esrgan + sharp (для мелкого текста на упаковке — ИИ его «дорисовывает»)
//  normalize только EXIF-поворот, sRGB, белая подложка, ≤ 1920 px (крупные оригиналы)
//
// Товары/категории после увеличения: фон, связанный с краями кадра, аккуратно приводится к белому
// (заливка от краёв по близким к фону пикселям + мягкая растушёвка; сам предмет не вырезается),
// затем обрезка полей и вписывание в белый квадрат 800×800 с полем 6 %.
// Запуск: node scripts/images-upscale.mjs [--only id1,id2] [--force-sharp]
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = join(ROOT, 'data/images.manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const only = arg('--only')?.split(',');
const forceSharp = process.argv.includes('--force-sharp');

const ESR_DIR = process.env.REALESRGAN_DIR ?? join(tmpdir(), 'realesrgan');
const ESR_EXE = join(ESR_DIR, 'bin', process.platform === 'win32' ? 'realesrgan-ncnn-vulkan.exe' : 'realesrgan-ncnn-vulkan');
const WORK = join(tmpdir(), 'rt-images');
rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, 'in'), { recursive: true });
mkdirSync(join(WORK, 'out'), { recursive: true });

const SQUARE = 800;
const PAD = 0.06;
const MAX_LARGE = 1920;

const items = manifest.images.filter((m) => m.target && (!only || only.includes(m.id)));
const originalOf = (id) => {
  const dir = join(ROOT, 'source/originals');
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => n.replace(/\.[^.]+$/, '') === id);
  return f ? join(dir, f) : null;
};

/** Источник → PNG без альфы на белом, sRGB (короткий путь: realesrgan не читает длинные пути). */
async function prepare(m) {
  const file = join(WORK, 'in', `${m.id}.png`);
  let img = sharp(readFileSync(join(ROOT, m.src))).rotate().flatten({ background: '#ffffff' }).toColourspace('srgb');
  // у превью товаров бывает рамка 1 px по краю — срезаем 2 px, чтобы она не стала линией после увеличения
  if (m.kind === 'product' || m.kind === 'category') {
    const { width, height } = await sharp(readFileSync(join(ROOT, m.src))).metadata();
    img = img.extract({ left: 2, top: 2, width: width - 4, height: height - 4 });
  }
  await img.png().toFile(file);
  return file;
}

// ---------- Real-ESRGAN ----------
let esrganOk = false;
if (!forceSharp && existsSync(ESR_EXE)) {
  try {
    const probe = join(WORK, 'probe.png');
    await sharp({ create: { width: 16, height: 16, channels: 3, background: '#808080' } }).png().toFile(probe);
    execFileSync(ESR_EXE, ['-i', probe, '-o', join(WORK, 'probe-x4.png'), '-n', 'realesrgan-x4plus', '-s', '4', '-m', join(ESR_DIR, 'bin', 'models')], { stdio: 'pipe', cwd: WORK });
    esrganOk = (await sharp(join(WORK, 'probe-x4.png')).metadata()).width === 64;
  } catch (e) {
    console.warn(`Real-ESRGAN недоступен (${e.message.split('\n')[0]}) → sharp`);
  }
} else if (!forceSharp) console.warn(`Нет ${ESR_EXE} → sharp (скачать: node scripts/fetch-realesrgan.mjs)`);
console.log(`Метод увеличения: ${esrganOk ? 'Real-ESRGAN realesrgan-x4plus (Vulkan)' : 'sharp lanczos3'}`);

async function esrgan(file) {
  const out = join(WORK, 'out', `${file.split(/[\\/]/).pop().replace(/\.png$/, '')}-esr.png`);
  execFileSync(ESR_EXE, ['-i', file, '-o', out, '-n', 'realesrgan-x4plus', '-s', '4', '-m', join(ESR_DIR, 'bin', 'models'), '-f', 'png'], { stdio: 'pipe', cwd: WORK });
  return out;
}
async function sharpUp(file) {
  const { width, height } = await sharp(file).metadata();
  return sharp(file)
    .resize(width * 4, height * 4, { kernel: 'lanczos3' })
    .median(3)
    .blur(0.3)
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 1.2 })
    .png()
    .toBuffer();
}
async function upscale(file, method) {
  if (method === 'sharp' || !esrganOk) return { buf: await sharpUp(file), used: 'upscaled-sharp' };
  const ai = await sharp(await esrgan(file)).png().toBuffer();
  if (method === 'blend') {
    const s = await sharpUp(file);
    const meta = await sharp(ai).metadata();
    const sRes = await sharp(s).resize(meta.width, meta.height).ensureAlpha(0.5).png().toBuffer();
    return { buf: await sharp(ai).composite([{ input: sRes, blend: 'over' }]).flatten({ background: '#fff' }).png().toBuffer(), used: 'upscaled-blend' };
  }
  return { buf: ai, used: 'upscaled-ai' };
}

// ---------- белый фон ----------
/**
 * Фон, связанный с краями кадра, → чистый белый. Заливка идёт от краёв по пикселям, близким к цвету фона
 * (медиана по рамке), и только если сосед почти не отличается (не перескакивает контур предмета).
 * Маска растушёвывается, поэтому край предмета не режется. Если фон не светлый/однородный — ничего не делаем.
 */
async function whitenBackground(buf) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const border = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
  const ch = [0, 1, 2].map((c) => border.map((i) => data[i * 3 + c]).sort((a, b) => a - b));
  const bg = ch.map((a) => a[a.length >> 1]);
  const lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  const sat = Math.max(...bg) - Math.min(...bg);
  // доля рамки, близкой к медиане: фон однородный?
  const near = border.filter((i) => Math.max(...px(i).map((v, c) => Math.abs(v - bg[c]))) < 24).length / border.length;
  if (lum < 200 || sat > 30 || near < 0.6) return { buf, whitened: false, bg, near };

  const TOL = 18; // до цвета фона
  const STEP = 7; // до соседа
  const mask = new Uint8Array(W * H);
  const q = new Int32Array(W * H);
  let qh = 0, qt = 0;
  const dist = (i) => Math.max(Math.abs(data[i * 3] - bg[0]), Math.abs(data[i * 3 + 1] - bg[1]), Math.abs(data[i * 3 + 2] - bg[2]));
  const lightNeutral = (i) => { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]; return Math.min(r, g, b) >= 250 && Math.max(r, g, b) - Math.min(r, g, b) < 6; };
  for (const i of border) if (!mask[i] && (dist(i) < TOL || lightNeutral(i))) { mask[i] = 1; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++];
    const x = i % W, y = (i / W) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (j < 0 || mask[j]) continue;
      const step = Math.max(Math.abs(data[j * 3] - data[i * 3]), Math.abs(data[j * 3 + 1] - data[i * 3 + 1]), Math.abs(data[j * 3 + 2] - data[i * 3 + 2]));
      if ((dist(j) < TOL && step < STEP) || (lightNeutral(j) && step < STEP)) { mask[j] = 1; q[qt++] = j; }
    }
  }
  // растушёвка маски: сужаем на 1 px (blur + порог), затем мягкий край
  const m8 = Buffer.from(mask.map((v) => v * 255));
  const soft = await sharp(m8, { raw: { width: W, height: H, channels: 1 } }).blur(1.6).extractChannel(0).raw().toBuffer();
  if (soft.length !== W * H) throw new Error(`маска: ${soft.length} ≠ ${W * H}`);
  const out = Buffer.alloc(W * H * 3);
  let changed = 0;
  for (let i = 0; i < W * H; i++) {
    const a = mask[i] ? Math.min(1, soft[i] / 255 * 1.25) : soft[i] / 255 * 0.6;
    if (a > 0) changed++;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(data[i * 3 + c] * (1 - a) + 255 * a);
  }
  return { buf: await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer(), whitened: true, bg, share: changed / (W * H) };
}

/** Обрезка белых полей и вписывание в белый квадрат с полем. */
async function squareOnWhite(buf, size = SQUARE) {
  let trimmed = buf;
  try { trimmed = await sharp(buf).trim({ background: '#ffffff', threshold: 12 }).png().toBuffer(); } catch { /* ничего не обрезано */ }
  const inner = Math.round(size * (1 - 2 * PAD));
  const fit = await sharp(trimmed).resize(inner, inner, { fit: 'inside', kernel: 'lanczos3', withoutEnlargement: false }).sharpen({ sigma: 0.5 }).png().toBuffer();
  const { width, height } = await sharp(fit).metadata();
  return sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
    .composite([{ input: fit, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ---------- прогон ----------
const report = [];
for (const m of items) {
  const target = join(ROOT, m.target);
  mkdirSync(dirname(target), { recursive: true });
  const orig = originalOf(m.id);
  const srcFile = orig ?? join(ROOT, m.src);
  const srcBuf = readFileSync(srcFile);
  const srcMeta = await sharp(srcBuf).metadata();
  let used = 'original';
  let buf;

  if (orig || m.method === 'normalize') {
    buf = await sharp(srcBuf).rotate().flatten({ background: '#ffffff' }).toColourspace('srgb')
      .resize({ width: MAX_LARGE, height: MAX_LARGE, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    used = orig ? 'original' : 'original-normalized';
  } else {
    const file = await prepare(m);
    ({ buf, used } = await upscale(file, m.method));
  }

  let whitened = false;
  if (m.kind === 'product' || m.kind === 'category') {
    const w = m.whiten === false ? { buf, whitened: false } : await whitenBackground(buf);
    buf = w.buf; whitened = w.whitened;
    buf = await squareOnWhite(buf);
  } else if (m.kind === 'logo') {
    buf = await sharp(buf).png({ compressionLevel: 9 }).toBuffer();
  } else {
    buf = await sharp(buf).resize({ width: MAX_LARGE, height: MAX_LARGE, fit: 'inside', withoutEnlargement: true }).toBuffer();
  }

  const isPng = target.endsWith('.png');
  const final = isPng ? sharp(buf).png({ compressionLevel: 9 }) : sharp(buf).jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' });
  const outBuf = await final.toBuffer();
  writeFileSync(target, outBuf);
  const res = await sharp(outBuf).metadata();
  m.result = { method: used, w: res.width, h: res.height, srcW: srcMeta.width, srcH: srcMeta.height, whitened };
  report.push(`${m.id.padEnd(40)} ${used.padEnd(20)} ${srcMeta.width}×${srcMeta.height} → ${res.width}×${res.height}${whitened ? ' (фон → белый)' : ''}`);
  process.stdout.write('.');
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${report.join('\n')}\nГотово: ${report.length} файлов → src/assets/**`);
