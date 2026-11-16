/** Навигация. href — пути БЕЗ base; в разметке всегда оборачиваются в url(). */
import { sections, categoriesOf, sectionPath, categoryPath } from '../data/catalog.ts';

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const catalogNav: NavItem[] = sections.map((s) => ({
  label: s.name,
  href: sectionPath(s),
  children: categoriesOf(s.slug).map((c) => ({ label: c.name, href: categoryPath(c) })),
}));

export const mainNav: NavItem[] = [
  { label: 'Каталог', href: '/katalog/', children: catalogNav },
  { label: 'Оптом', href: '/optom/' },
  { label: 'Производство', href: '/proizvodstvo/' },
  { label: 'Доставка и оплата', href: '/kak-kupit/' },
  { label: 'Новости', href: '/novosti/' },
  { label: 'Контакты', href: '/kontakty/' },
];

export const footerNav: NavItem[] = [
  { label: 'Каталог', href: '/katalog/' },
  { label: 'Прайс для оптовиков', href: '/optom/' },
  { label: 'О производстве', href: '/proizvodstvo/' },
  { label: 'Доставка и оплата', href: '/kak-kupit/' },
  { label: 'Статьи', href: '/stati/' },
  { label: 'Новости и акции', href: '/novosti/' },
  { label: 'Контакты', href: '/kontakty/' },
  { label: 'Карта сайта', href: '/karta-sajta/' },
];

/** Активный пункт: точное совпадение или раздел. path — без base. */
export const isActive = (href: string, path: string): boolean => (href === '/' ? path === '/' : path === href || path.startsWith(href));
