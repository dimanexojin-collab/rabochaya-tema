import type { NewsItem } from '../data/catalog.ts';
import { newsCopy } from '../data/copy/news.ts';
import { formatDate } from './format.ts';

/** Метка архива: акции — «завершена»; цены в новостях — «на дату публикации». */
export function newsStatus(n: NewsItem): string {
  if (n.kind === 'promo') return 'акция завершена';
  if (/\d\s?₽/.test(newsCopy[n.slug].body.join(' '))) return `цена на ${formatDate(n.date)}`;
  return '';
}
