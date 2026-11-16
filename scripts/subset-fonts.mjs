// Сабсет Inter Variable (ось wght сохраняется) → src/assets/fonts/inter-{cyr,lat}.woff2.
// Только глифы русскоязычного сайта: базовая кириллица + ASCII + типографика + ₽.
// Диапазоны ДОЛЖНЫ совпадать с unicode-range в src/layouts/Base.astro (общий источник — src/lib/fonts.ts).
// Проверяет, что фичи ss01 и cv11 (DESIGN.md) пережили сабсет.
// Запуск: node scripts/subset-fonts.mjs (после обновления @fontsource-variable/inter).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';
import { FONT_RANGES } from '../src/lib/fonts.ts';

const require = createRequire(import.meta.url);
const file = (f) => require.resolve(`@fontsource-variable/inter/files/${f}`);
const OUT = new URL('../src/assets/fonts/', import.meta.url);
const text = (ranges) => ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i))).join('');

await mkdir(OUT, { recursive: true });
for (const [key, name] of [['cyr', 'inter-cyrillic-wght-normal.woff2'], ['lat', 'inter-latin-wght-normal.woff2']]) {
  const src = await readFile(file(name));
  const chars = text(FONT_RANGES[key]);
  const sfnt = await subsetFont(src, chars, { targetFormat: 'sfnt' });
  const tags = ['ss01', 'cv11'].filter((t) => !sfnt.includes(Buffer.from(t)));
  if (tags.length) console.warn(`  внимание: в ${key} нет фич ${tags.join(', ')}`);
  const out = await subsetFont(src, chars, { targetFormat: 'woff2' });
  await writeFile(new URL(`inter-${key}.woff2`, OUT), out);
  console.log(`inter-${key}.woff2: ${(src.length / 1024).toFixed(1)} → ${(out.length / 1024).toFixed(1)} КБ`);
}
