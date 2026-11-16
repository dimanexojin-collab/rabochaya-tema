/** Диапазоны сабсетов Inter: общие для scripts/subset-fonts.mjs и unicode-range в Base.astro. */
export const FONT_RANGES: Record<'cyr' | 'lat', [number, number][]> = {
  cyr: [[0x0401, 0x0401], [0x0410, 0x044f], [0x0451, 0x0451], [0x2116, 0x2116]],
  lat: [
    [0x0020, 0x007e], [0x00a0, 0x00a0], [0x00a9, 0x00a9], [0x00ab, 0x00ab], [0x00b0, 0x00b0], [0x00b7, 0x00b7],
    [0x00bb, 0x00bb], [0x00d7, 0x00d7], [0x00ae, 0x00ae], [0x2013, 0x2014], [0x2018, 0x201e], [0x2022, 0x2022],
    [0x2026, 0x2026], [0x20bd, 0x20bd], [0x2192, 0x2192], [0x2212, 0x2212], [0x2248, 0x2248], [0x00b3, 0x00b3],
  ],
};

const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');
/** «U+0401,U+0410-044F,…» для @font-face unicode-range. */
export const unicodeRange = (key: 'cyr' | 'lat'): string =>
  FONT_RANGES[key].map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(',');
