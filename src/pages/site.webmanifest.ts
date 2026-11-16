/** Web App Manifest с учётом base: start_url/scope/иконки — под /rabochaya-tema/. */
import type { APIRoute } from 'astro';
import { SITE } from '../config/site.ts';
import { url } from '../lib/paths.ts';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: `${SITE.name} — ${SITE.tagline}`,
      short_name: SITE.name,
      lang: 'ru',
      start_url: url('/'),
      scope: url('/'),
      display: 'browser',
      background_color: '#ebeadf',
      theme_color: '#ebeadf',
      icons: [
        { src: url('/icon-192.png'), sizes: '192x192', type: 'image/png' },
        { src: url('/icon-512.png'), sizes: '512x512', type: 'image/png' },
      ],
    }, null, 2),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
