/** id изображения из манифеста → ImageMetadata (astro:assets), чтобы Vite обработал файл с учётом base. */
import type { ImageMetadata } from 'astro';
import { imageTarget, imageRef } from '../data/catalog.ts';

const files = import.meta.glob<ImageMetadata>('../assets/{products,categories,news,production,brand}/*.{png,jpg}', { eager: true, import: 'default' });

export function img(id: string): ImageMetadata {
  const target = imageTarget(id);
  if (!target) throw new Error(`У изображения ${id} нет мастер-файла`);
  const key = `../${target.replace(/^src\//, '')}`;
  const m = files[key];
  if (!m) throw new Error(`Нет файла ${target} (npm run images)`);
  return m;
}

export const alt = (id: string) => imageRef(id).alt;

/** Размеры для <Picture>: карточки товаров / крупные фото. */
export const WIDTHS = {
  card: [240, 360, 480, 720],
  product: [360, 480, 720],
  // 768 — под телефоны с DPR ~1.75–2 (412 px × 1.75 ≈ 720): без него браузер брал 960
  large: [640, 768, 960, 1280, 1920],
} as const;
