/**
 * Служебные страницы с `noindex, follow` — исключаются из sitemap (astro.config.mjs).
 * Пути без base. robots.txt их НЕ закрывает Disallow (иначе робот не увидит meta robots).
 */
export const NOINDEX_PATHS: string[] = ['/politika-konfidencialnosti/', '/404/'];

export const isNoindex = (path: string): boolean => NOINDEX_PATHS.includes(path);
