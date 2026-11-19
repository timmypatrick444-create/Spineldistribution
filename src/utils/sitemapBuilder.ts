import { CategoryDefinition, Product } from '../types';

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeImageForSitemap(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let url = raw.trim();
  if (!url || url.startsWith('data:') || url.startsWith('/')) return null;
  if (url.startsWith('http://avoweb1.s3-us-west-2.amazonaws.com')) {
    url = 'https://' + url.slice('http://'.length);
  }
  if (!url.startsWith('https://') && !url.startsWith('http://')) return null;
  return url;
}

export interface SitemapBuildOptions {
  baseUrl: string;
  categories: CategoryDefinition[];
  products: Product[];
  lastmodDate?: string;
}

export function buildSitemapXml({
  baseUrl,
  categories,
  products,
  lastmodDate
}: SitemapBuildOptions): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const today = lastmodDate || new Date().toISOString().split('T')[0];

  const entries: string[] = [];
  const seenUrls = new Set<string>();

  const pushUrl = (
    pathWithQuery: string,
    priority: string,
    changefreq: string,
    lastmod = today,
    image?: { loc: string; title: string } | null
  ) => {
    const loc = `${cleanBase}${pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`}`;
    if (seenUrls.has(loc)) return;
    seenUrls.add(loc);

    const lines = [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`
    ];

    if (image && image.loc) {
      lines.push('    <image:image>');
      lines.push(`      <image:loc>${escapeXml(image.loc)}</image:loc>`);
      if (image.title) {
        lines.push(`      <image:title>${escapeXml(image.title)}</image:title>`);
      }
      lines.push('    </image:image>');
    }

    lines.push('  </url>');
    entries.push(lines.join('\n'));
  };

  // 1. Core Storefront & Informational Pages
  pushUrl('/', '1.0', 'daily', today);
  pushUrl('/catalog', '0.9', 'daily', today);
  pushUrl('/quote', '0.8', 'weekly', today);
  pushUrl('/about', '0.7', 'monthly', today);
  pushUrl('/contact', '0.7', 'monthly', today);
  pushUrl('/terms-of-use', '0.4', 'yearly', today);
  pushUrl('/privacy-policy', '0.4', 'yearly', today);

  // 2. Category & Subcategory Landing Pages
  for (const cat of categories) {
    if (!cat?.name) continue;
    const catParam = encodeURIComponent(cat.name);
    const catImg = normalizeImageForSitemap(cat.image);
    pushUrl(
      `/catalog?category=${catParam}`,
      '0.8',
      'weekly',
      today,
      catImg ? { loc: catImg, title: cat.name } : null
    );

    if (Array.isArray(cat.subcategories)) {
      for (const sub of cat.subcategories) {
        if (!sub) continue;
        pushUrl(
          `/catalog?category=${catParam}&subcategory=${encodeURIComponent(sub)}`,
          '0.7',
          'weekly',
          today
        );
      }
    }
  }

  // 3. Individual Product Detail Pages (with image metadata, capped safely under Google's 50,000 URL limit)
  const MAX_PRODUCT_URLS = 45000;
  let productCount = 0;

  for (const prod of products) {
    if (!prod || productCount >= MAX_PRODUCT_URLS) break;
    const identifier = (prod.id || prod.sku || '').trim();
    if (!identifier) continue;

    let prodDate = today;
    if (prod.createdAt) {
      const parsed = new Date(prod.createdAt);
      if (!isNaN(parsed.getTime())) {
        prodDate = parsed.toISOString().split('T')[0];
      }
    }

    const firstImg = Array.isArray(prod.images) ? normalizeImageForSitemap(prod.images[0]) : null;
    pushUrl(
      `/product/${encodeURIComponent(identifier)}`,
      '0.7',
      'weekly',
      prodDate,
      firstImg ? { loc: firstImg, title: prod.name || identifier } : null
    );
    productCount++;
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    entries.join('\n'),
    '</urlset>',
    ''
  ].join('\n');
}

export function buildRobotsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /catalog',
    'Allow: /product/',
    'Allow: /about',
    'Allow: /contact',
    'Allow: /quote',
    'Allow: /terms-of-use',
    'Allow: /privacy-policy',
    '',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /invoice',
    'Disallow: /orders',
    'Disallow: /login',
    'Disallow: /signup',
    'Disallow: /reset-password',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    ''
  ].join('\n');
}
