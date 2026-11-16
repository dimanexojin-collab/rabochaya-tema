/**
 * robots.txt проекта. ВАЖНО: на проектном сайте GitHub Pages (base = /rabochaya-tema/) роботы читают только
 * https://<owner>.github.io/robots.txt (репозиторий kontur), этот файл там игнорируется — см. DEPLOY.md
 * (строка Sitemap добавляется в robots.txt kontur). Файл заработает при переезде на свой домен (BASE=/).
 * Служебные страницы закрыты meta robots noindex, а не Disallow (иначе робот не увидит meta).
 */
import type { APIRoute } from 'astro';
import { SITE } from '../config/site.ts';
import { abs } from '../lib/paths.ts';

export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    `Allow: ${SITE.base}`,
    '',
    'User-agent: Yandex',
    `Allow: ${SITE.base}`,
    'Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&yclid&gclid',
    '',
    `Sitemap: ${abs('/sitemap-index.xml')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
