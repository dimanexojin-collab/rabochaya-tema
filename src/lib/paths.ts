/**
 * Все внутренние ссылки — только через url(), абсолютные (canonical, og, JSON-LD, sitemap) — через abs().
 * base берётся из конфигурации Astro (import.meta.env.BASE_URL = SITE.base), поэтому смена BASE
 * (проектный сайт GitHub Pages → свой домен) не требует правок в коде.
 */
import { SITE, normalizeBase } from '../config/site.ts';

export const BASE = normalizeBase(import.meta.env?.BASE_URL ?? SITE.base);

/**
 * url('/katalog/') → '/rabochaya-tema/katalog/'. Якорь и query сохраняются; путь страницы получает «/» на конце
 * (trailingSlash: 'always'), у файлов (есть расширение) слэш не добавляется.
 */
export function url(path = '/'): string {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(path)) return path;
  const m = path.match(/^([^?#]*)(.*)$/)!;
  let p = m[1].replace(/^\/+/, '');
  if (p && !p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
  return BASE + p + m[2];
}

/** Абсолютный URL: origin + base + path. */
export const abs = (path = '/'): string => SITE.origin + url(path);

/** Путь страницы без base: '/rabochaya-tema/katalog/' → '/katalog/' (для сравнения активных пунктов, noindex). */
export function stripBase(pathname: string): string {
  const p = pathname.endsWith('/') || /\.[a-z0-9]+$/i.test(pathname) ? pathname : `${pathname}/`;
  return p.startsWith(BASE) ? `/${p.slice(BASE.length)}` : p;
}
