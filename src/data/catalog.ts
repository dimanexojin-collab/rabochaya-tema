/**
 * Типизированный каталог поверх data/*.json (генерирует scripts/build-data.mjs из source/).
 * Цены во всех title/description/JSON-LD/карточках — только отсюда.
 * validateCatalog() вызывается при сборке (импорт модуля) и роняет сборку при нарушении целостности.
 */
import categoriesJson from '../../data/categories.json';
import productsJson from '../../data/products.json';
import priceJson from '../../data/price.json';
import newsJson from '../../data/news.json';
import manifestJson from '../../data/images.manifest.json';
import { productCopy } from './copy/products.ts';
import { categoryCopy, sectionCopy } from './copy/categories.ts';
import { newsCopy } from './copy/news.ts';

export type Unit = 'пара' | 'шт' | 'упаковка' | 'TODO';
export type Quality = 'original' | 'upscaled-ai' | 'upscaled-sharp' | 'upscaled-blend' | 'original-normalized';

export interface ImageRef {
  id: string;
  alt: string;
  quality: Quality;
  w: number;
  h: number;
}

export interface Section {
  slug: string;
  name: string;
  h1: string;
  direct?: boolean;
}
export interface Category {
  slug: string;
  section: string;
  name: string;
  h1: string;
  image?: string;
  tile?: string;
}
export interface Product {
  id: string;
  slug: string;
  sectionSlug: string;
  categorySlug: string | null;
  path: string;
  name: string;
  shortName: string;
  sourceName: string;
  brand?: string;
  note?: string;
  price: number;
  priceFrom: boolean;
  unit: Unit;
  packNote?: string;
  hit: boolean;
  specs: [string, string][];
  standards: string[];
  packaging: string[];
  image: string;
  sourceUrl: string;
}
export interface PriceRow {
  id: string;
  name: string;
  tex?: number;
  threads?: number;
  priceFrom: number | null;
  bag: string;
}
export interface PriceGroup {
  id: string;
  title: string;
  colors?: string;
  rows: PriceRow[];
}
export interface SerialItem {
  id: string;
  oldUrls: string[];
  caption: string;
  priceRow?: string;
}
export interface NewsItem {
  slug: string;
  date: string;
  title: string;
  sourceTitle: string;
  kind: 'info' | 'promo' | 'product';
  until?: string;
  images: string[];
  thumb?: string;
  sourceUrl: string;
}
interface ManifestEntry {
  id: string;
  src: string;
  kind: string;
  target: string | null;
  alt: string;
  usedBy: string[];
  result?: { method: Quality; w: number; h: number; srcW: number; srcH: number };
}

export const sections: Section[] = categoriesJson.sections;
export const categories: Category[] = categoriesJson.categories;
export const products: Product[] = productsJson as Product[];
export const priceGroups: PriceGroup[] = priceJson.groups as PriceGroup[];
export const priceNote: string = priceJson.note;
export const serialItems: SerialItem[] = priceJson.serial;
export const news: NewsItem[] = [...(newsJson as NewsItem[])].sort((a, b) => b.date.localeCompare(a.date));
const manifest: ManifestEntry[] = manifestJson.images as ManifestEntry[];

export const CURRENCY = 'RUB';

// ---------- хелперы ----------
export const getSection = (slug: string): Section => {
  const s = sections.find((x) => x.slug === slug);
  if (!s) throw new Error(`Нет раздела ${slug}`);
  return s;
};
export const getCategory = (slug: string): Category => {
  const c = categories.find((x) => x.slug === slug);
  if (!c) throw new Error(`Нет категории ${slug}`);
  return c;
};
export const getProduct = (slug: string): Product => {
  const p = products.find((x) => x.slug === slug);
  if (!p) throw new Error(`Нет товара ${slug}`);
  return p;
};
export const sectionPath = (s: Section | string) => `/katalog/${typeof s === 'string' ? s : s.slug}/`;
export const categoryPath = (c: Category) => `/katalog/${c.section}/${c.slug}/`;
export const categoriesOf = (section: string) => categories.filter((c) => c.section === section);
export const productsOfCategory = (slug: string) => products.filter((p) => p.categorySlug === slug);
export const productsOfSection = (slug: string) => products.filter((p) => p.sectionSlug === slug);
export const minPrice = (list: Product[]) => Math.min(...list.map((p) => p.price));
export const categoryOf = (p: Product) => (p.categorySlug ? getCategory(p.categorySlug) : undefined);

/** Похожие: соседи по категории, затем по разделу; до 4 шт. */
export function relatedProducts(p: Product, n = 4): Product[] {
  const same = products.filter((x) => x.slug !== p.slug && x.categorySlug && x.categorySlug === p.categorySlug);
  const sec = products.filter((x) => x.slug !== p.slug && x.sectionSlug === p.sectionSlug && !same.includes(x));
  return [...same, ...sec].slice(0, n);
}

export const hits = () => products.filter((p) => p.hit);

export function imageRef(id: string): ImageRef {
  const m = manifest.find((x) => x.id === id);
  if (!m) throw new Error(`Нет изображения ${id} в манифесте`);
  return { id, alt: m.alt, quality: m.result?.method ?? 'original', w: m.result?.w ?? 0, h: m.result?.h ?? 0 };
}
export const imageTarget = (id: string) => manifest.find((x) => x.id === id)?.target ?? null;

export const priceRow = (id: string): PriceRow | undefined => priceGroups.flatMap((g) => g.rows).find((r) => r.id === id);

/** «пара» → «за пару» для подписи цены. */
export const UNIT_LABEL: Record<Unit, string> = { 'пара': 'за пару', 'шт': 'за штуку', 'упаковка': 'за упаковку', TODO: '' };

// ---------- валидация (падает сборка) ----------
export function validateCatalog(): void {
  const errors: string[] = [];
  const dup = <T>(arr: T[]) => arr.filter((x, i) => arr.indexOf(x) !== i);
  for (const d of dup(products.map((p) => p.slug))) errors.push(`повтор slug товара: ${d}`);
  for (const d of dup(categories.map((c) => c.slug))) errors.push(`повтор slug категории: ${d}`);
  for (const d of dup(news.map((n) => n.slug))) errors.push(`повтор slug новости: ${d}`);
  if (products.length !== 29) errors.push(`товаров ${products.length}, ожидалось 29`);
  for (const p of products) {
    if (!(p.price > 0)) errors.push(`${p.slug}: цена ${p.price}`);
    if (!sections.some((s) => s.slug === p.sectionSlug)) errors.push(`${p.slug}: нет раздела ${p.sectionSlug}`);
    if (p.categorySlug && !categories.some((c) => c.slug === p.categorySlug)) errors.push(`${p.slug}: нет категории ${p.categorySlug}`);
    if (!manifest.some((m) => m.id === p.image && m.target)) errors.push(`${p.slug}: нет изображения`);
    if (!productCopy[p.slug]) errors.push(`${p.slug}: нет текста в copy/products.ts`);
  }
  for (const c of categories) {
    if (!productsOfCategory(c.slug).length) errors.push(`пустая категория ${c.slug}`);
    if (!categoryCopy[c.slug]) errors.push(`${c.slug}: нет текста в copy/categories.ts`);
    for (const id of [c.image, c.tile].filter(Boolean) as string[]) if (!manifest.some((m) => m.id === id)) errors.push(`${c.slug}: нет изображения ${id}`);
  }
  for (const s of sections) if (!sectionCopy[s.slug]) errors.push(`${s.slug}: нет текста раздела`);
  for (const n of news) {
    if (!newsCopy[n.slug]) errors.push(`${n.slug}: нет текста новости`);
    for (const id of [...n.images, n.thumb].filter(Boolean) as string[]) if (!manifest.some((m) => m.id === id)) errors.push(`${n.slug}: нет изображения ${id}`);
  }
  for (const s of serialItems) if (s.priceRow && !priceRow(s.priceRow)) errors.push(`серийная позиция ${s.id}: нет строки прайса ${s.priceRow}`);
  // все файлы источника привязаны к страницам и обработаны конвейером
  if (manifest.length !== 55) errors.push(`изображений в манифесте ${manifest.length}, ожидалось 55`);
  for (const m of manifest) {
    if (!m.usedBy?.length) errors.push(`изображение ${m.id} не используется ни на одной странице`);
    if (m.target && !m.result) errors.push(`изображение ${m.id} не обработано (npm run images)`);
  }
  if (errors.length) throw new Error(`Каталог не прошёл проверку:\n  ${errors.join('\n  ')}`);
}
validateCatalog();
