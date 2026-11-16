import type { Product } from '../data/catalog.ts';
import { UNIT_LABEL } from '../data/catalog.ts';

/** Неразрывный пробел: между разрядами и перед ₽. */
export const NBSP = ' ';

/** 1000 → «1 000» (неразрывный пробел). */
export function formatNumber(n: number): string {
  const [int, frac] = Math.abs(Math.round(n * 100) / 100).toString().split('.');
  return (n < 0 ? '−' : '') + int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + (frac ? ',' + frac : '');
}
export const formatPrice = (n: number): string => `${formatNumber(n)}${NBSP}₽`;
export const formatFrom = (n: number): string => `от${NBSP}${formatPrice(n)}`;

/** Цена товара: «от 16 ₽» или «4 500 ₽». */
export const productPrice = (p: Product): string => (p.priceFrom ? formatFrom(p.price) : formatPrice(p.price));
/** «за пару», «за упаковку 100 пар» или пусто (единица не указана в источнике). */
export function unitText(p: Product): string {
  const u = UNIT_LABEL[p.unit];
  if (!u) return '';
  return p.unit === 'упаковка' && p.packNote ? `${u} (${p.packNote})` : u;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** '2022-05-23' → «23 мая 2022». */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}${NBSP}${MONTHS[m - 1]} ${y}`;
}

export function plural(n: number, forms: readonly [string, string, string]): string {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
export const PRODUCT_FORMS = ['товар', 'товара', 'товаров'] as const;
