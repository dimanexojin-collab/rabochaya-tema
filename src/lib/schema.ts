/**
 * JSON-LD. Правила: TODO-поля не выводятся; никаких выдуманных рейтингов, отзывов, availability, gtin.
 * Все @id/url — абсолютные с base (abs()).
 */
import { SITE, filled, mainPhone, geoFilled, socialLinks, DAY_SCHEMA } from '../config/site.ts';
import { CURRENCY, type Product, type PriceGroup } from '../data/catalog.ts';
import type { FaqItem } from '../data/faq.ts';
import { abs } from './paths.ts';
import { OG_DEFAULT } from './seo.ts';

export type JsonLd = Record<string, unknown>;

export const ORG_ID = () => abs('/#organization');
export const STORE_ID = () => abs('/#store');
const WEBSITE_ID = () => abs('/#website');

function clean<T extends JsonLd>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))) as T;
}

const postalAddress = () => clean({
  '@type': 'PostalAddress',
  streetAddress: SITE.address.streetSchema,
  addressLocality: SITE.address.locality,
  addressRegion: SITE.address.region,
  postalCode: filled(SITE.address.postalCode),
  addressCountry: 'RU',
});

export function organization(): JsonLd {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID(),
    name: SITE.name,
    legalName: SITE.legal.entity,
    taxID: SITE.legal.inn,
    url: abs('/'),
    logo: abs('/icon-512.png'),
    email: SITE.email,
    telephone: SITE.phones.map((p) => p.href.replace('tel:', '')),
    address: postalAddress(),
    sameAs: socialLinks().map((s) => s.href),
  });
}

export function store(): JsonLd {
  const geo = geoFilled();
  return clean({
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': STORE_ID(),
    name: SITE.name,
    description: SITE.tagline,
    url: abs('/'),
    image: abs(OG_DEFAULT),
    telephone: mainPhone().href.replace('tel:', ''),
    email: SITE.email,
    address: postalAddress(),
    parentOrganization: { '@id': ORG_ID() },
    currenciesAccepted: CURRENCY,
    paymentAccepted: 'Наличные, безналичный расчёт',
    geo: geo && { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lon },
    hasMap: filled(SITE.mapUrl),
    openingHoursSpecification: SITE.hoursSpec.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => `https://schema.org/${DAY_SCHEMA[d]}`),
      opens: h.open,
      closes: h.close,
    })),
  });
}

export function website(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID(),
    url: abs('/'),
    name: SITE.name,
    inLanguage: 'ru-RU',
    publisher: { '@id': ORG_ID() },
  };
}

export interface Crumb {
  name: string;
  href: string;
}
export function breadcrumbs(items: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

export function faqPage(items: FaqItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** Product + Offer (или AggregateOffer.lowPrice для цен «от»). image — абсолютный URL. */
export function productLd(p: Product, description: string, image: string): JsonLd {
  const url = abs(p.path);
  const offers = p.priceFrom
    ? { '@type': 'AggregateOffer', lowPrice: p.price, priceCurrency: CURRENCY, url, seller: { '@id': ORG_ID() } }
    : { '@type': 'Offer', price: p.price, priceCurrency: CURRENCY, url, seller: { '@id': ORG_ID() } };
  return clean({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description,
    url,
    image,
    sku: p.slug,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers,
  });
}

/** /optom/: прайс как ItemList из Offer. */
export function priceListLd(groups: PriceGroup[], pageUrl: string): JsonLd {
  const rows = groups.flatMap((g) => g.rows.filter((r) => r.priceFrom !== null).map((r) => ({ g, r })));
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Прайс на складские позиции',
    url: abs(pageUrl),
    numberOfItems: rows.length,
    itemListElement: rows.map(({ g, r }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Offer',
        name: `${r.name} — ${g.title}`,
        price: r.priceFrom,
        priceCurrency: CURRENCY,
        priceSpecification: { '@type': 'UnitPriceSpecification', minPrice: r.priceFrom, priceCurrency: CURRENCY, valueAddedTaxIncluded: true },
        url: `${abs(pageUrl)}#${r.id}`,
        seller: { '@id': ORG_ID() },
      },
    })),
  };
}

export function articleLd(o: { type: 'Article' | 'NewsArticle'; headline: string; description: string; path: string; date?: string; image?: string }): JsonLd {
  return clean({
    '@context': 'https://schema.org',
    '@type': o.type,
    headline: o.headline,
    description: o.description,
    url: abs(o.path),
    mainEntityOfPage: abs(o.path),
    image: o.image ?? abs(OG_DEFAULT),
    datePublished: o.date,
    inLanguage: 'ru-RU',
    author: { '@id': ORG_ID() },
    publisher: { '@id': ORG_ID() },
  });
}
