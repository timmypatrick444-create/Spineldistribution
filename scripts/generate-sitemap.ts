import fs from 'fs';
import path from 'path';
import { CATEGORIES } from '../src/data/categories';
import { SEED_PRODUCTS } from '../src/data/seedProducts';
import { UPLOADED_CATALOG_PRODUCTS } from '../src/data/uploadedProducts';
import { UPLOADED_PAGA_PRODUCTS } from '../src/data/uploadedPagaProducts';
import { UPLOADED_ENCLOSURE_PRODUCTS } from '../src/data/uploadedEnclosureProducts';
import { UPLOADED_FIBER_CABLE_PRODUCTS } from '../src/data/uploadedFiberCables';
import { CUSTOM_UPLOADED_PRODUCTS } from '../src/data/customUploadedProducts';
import { Product } from '../src/types';
import { buildSitemapXml, buildRobotsTxt } from '../src/utils/sitemapBuilder';

const rootDir = process.cwd();
const siteUrl = (process.env.SITE_URL || process.env.APP_URL || 'https://spineldistribution.com').replace(/\/+$/, '');

const allProducts: Product[] = [
  ...CUSTOM_UPLOADED_PRODUCTS,
  ...UPLOADED_FIBER_CABLE_PRODUCTS,
  ...UPLOADED_ENCLOSURE_PRODUCTS,
  ...UPLOADED_PAGA_PRODUCTS,
  ...UPLOADED_CATALOG_PRODUCTS,
  ...SEED_PRODUCTS.map((p, index) => ({
    ...p,
    id: p.id || `prod-${p.sku || index}`
  }))
];

const sitemapXml = buildSitemapXml({
  baseUrl: siteUrl,
  categories: CATEGORIES,
  products: allProducts
});

const robotsTxt = buildRobotsTxt(siteUrl);

const targetDirs = [
  path.join(rootDir, 'public'),
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'client-build')
];

let urlCount = (sitemapXml.match(/<url>/g) || []).length;

for (const dir of targetDirs) {
  if (dir.endsWith('public') || fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sitemap.xml'), sitemapXml, 'utf8');
    fs.writeFileSync(path.join(dir, 'robots.txt'), robotsTxt, 'utf8');
    console.log(`[SEO Sitemap] Wrote sitemap.xml (${urlCount} URLs) & robots.txt to ${path.relative(rootDir, dir)}/`);
  }
}
