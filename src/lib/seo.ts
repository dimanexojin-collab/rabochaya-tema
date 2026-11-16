/**
 * Title / description. Цены — только из data/*.json (через catalog.ts).
 * TODO-поля site.ts в мета не попадают.
 */
import { SITE } from '../config/site.ts';
import {
  type Product, type Category, type Section,
  productsOfCategory, productsOfSection, minPrice,
} from '../data/catalog.ts';
import { productCopy } from '../data/copy/products.ts';
import { categoryCopy, sectionCopy } from '../data/copy/categories.ts';
import { formatFrom, formatPrice, productPrice, unitText } from './format.ts';

export const TITLE_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 160;
export const OG_DEFAULT = '/og/default.jpg';

/** Обычные пробелы вместо неразрывных — в мета-тегах так надёжнее. */
const plain = (s: string) => s.replace(/ /g, ' ');

/** Первый вариант, который помещается в лимит; иначе — последний, обрезанный. */
export function pickTitle(...variants: string[]): string {
  const v = variants.map(plain).find((t) => t.length <= TITLE_MAX);
  return v ?? plain(variants[variants.length - 1]).slice(0, TITLE_MAX - 1).replace(/\s+\S*$/, '') + '…';
}

/** Описание 120–160: добираем хвостами по очереди, обрезаем по границе слова. */
export function fitDescription(base: string, ...tails: string[]): string {
  let t = plain(base).replace(/\s+/g, ' ').trim();
  for (const tail of tails) {
    if (t.length >= DESC_MIN) break;
    const next = `${t} ${plain(tail)}`.trim();
    if (next.length <= DESC_MAX) t = next;
  }
  if (t.length <= DESC_MAX) return t;
  const cut = t.slice(0, DESC_MAX - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.:;—–-]+$/, '') + '…';
}

const WHERE = `Архангельск, ${SITE.address.street}.`;
const TAILS = [WHERE, 'Оптом и в розницу, счёт с НДС.', `Тел. ${SITE.phones[2].display}.`];

export function productTitle(p: Product): string {
  const price = productPrice(p);
  return pickTitle(
    `${p.name} — ${price}, купить в Архангельске`,
    `${p.name} — ${price} в Архангельске`,
    `${p.name} — ${price}`,
    `${p.shortName} — ${price}, купить в Архангельске`,
    `${p.shortName} — ${price}`,
  );
}

export function productDescription(p: Product): string {
  const unit = unitText(p);
  const meta = productCopy[p.slug].meta;
  return fitDescription(`${p.name}: ${productPrice(p)}${unit ? ` ${unit}` : ''}. ${meta[0].toUpperCase()}${meta.slice(1)}.`, ...TAILS);
}

/** Одна позиция — точная цена, несколько — «от». */
const priceOf = (list: Product[]) => (list.length === 1 ? formatPrice(list[0].price) : formatFrom(minPrice(list)));
const withPrice = (tpl: string, list: Product[]) => tpl.replace('{price}', priceOf(list));

export function categoryTitle(c: Category): string {
  return pickTitle(withPrice(categoryCopy[c.slug].title, productsOfCategory(c.slug)));
}
export function categoryDescription(c: Category): string {
  const list = productsOfCategory(c.slug);
  return fitDescription(`${categoryCopy[c.slug].meta}. ${list.length > 1 ? 'Цены' : 'Цена'} ${priceOf(list)}.`, ...TAILS);
}
export function sectionTitle(s: Section): string {
  return pickTitle(withPrice(sectionCopy[s.slug].title, productsOfSection(s.slug)));
}
export function sectionDescription(s: Section): string {
  const list = productsOfSection(s.slug);
  return fitDescription(`${sectionCopy[s.slug].meta}. ${list.length > 1 ? 'Цены' : 'Цена'} ${priceOf(list)}.`, ...TAILS);
}
export { WHERE, TAILS };
