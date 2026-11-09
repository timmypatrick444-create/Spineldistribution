import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Product, BulkUploadStats } from '../types';
import { CATEGORIES } from '../data/categories';

export interface RawProductRow {
  sku?: string;
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  price?: string | number;
  priceUSD?: string | number;
  'price(usd)'?: string | number;
  category?: string;
  subcategory?: string;
  brand?: string;
  stock?: string | number;
  rating?: string | number;
  reviewCount?: string | number;
  images?: string;
  image?: string;
  specs?: string;
  isChoice?: string | boolean;
  [key: string]: any;
}

// Fallback images per category if row has none
const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'Video Surveillance & Cameras': 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
  'Video Management & Recording': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  'Access Control & Door Security': 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
  'Intercom & IP Communication': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
  'Networking & Connectivity': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
  'Security Sensors & Detection': 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
  'Public Address (PAGA) System': 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
  'Security Software & Licenses': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
  'Storage & Data Infrastructure': 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?auto=format&fit=crop&w=800&q=80',
  'Power & Electrical Systems': 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  'Enclosures & Housings': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  'Mounting & Surveillance Accessories': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  'Lighting & Visual Deterrence': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
  'Telecommunication & Communication Equipment': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'Accessories & Replacement Parts': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
  'Renewable Energy': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80'
};

// Intelligently assign/infer brand of each product from name, SKU, category and description
export function inferBrand(name: string, sku: string, category: string, subcategory: string, description: string): string {
  const text = `${name} ${sku} ${description}`.toLowerCase();
  
  if (text.includes('axis') || sku.toUpperCase().startsWith('AXIS')) return 'Axis Communications';
  if (text.includes('hikvision') || sku.toUpperCase().includes('DS-2CD') || sku.toUpperCase().includes('DS-7')) return 'Hikvision';
  if (text.includes('dahua') || sku.toUpperCase().includes('IPC-H') || sku.toUpperCase().includes('NVR5')) return 'Dahua Technology';
  if (text.includes('hanwha') || text.includes('wisenet') || sku.toUpperCase().startsWith('XNV')) return 'Hanwha Vision';
  if (text.includes('stid') || sku.toUpperCase().includes('ARCS')) return 'STid Security';
  if (text.includes('cisco') || text.includes('catalyst') || text.includes('meraki')) return 'Cisco Systems';
  if (text.includes('ubiquiti') || text.includes('unifi') || text.includes('edgeswitch')) return 'Ubiquiti Networks';
  if (text.includes('apc') || text.includes('smart-ups')) return 'APC by Schneider Electric';
  if (text.includes('schneider') || text.includes('acti9')) return 'Schneider Electric';
  if (text.includes('bosch') || text.includes('flexidome') || text.includes('autodome')) return 'Bosch Security Systems';
  if (text.includes('honeywell') || text.includes('pro-watch')) return 'Honeywell Security';
  if (text.includes('victron') || text.includes('multiplus') || text.includes('smartsolar')) return 'Victron Energy';
  if (text.includes('suprema') || text.includes('biostation') || text.includes('facestation')) return 'Suprema';
  if (text.includes('hid') || text.includes('iclass') || text.includes('signo')) return 'HID Global';
  if (text.includes('seagate') || text.includes('skyhawk')) return 'Seagate Technology';
  if (text.includes('western digital') || text.includes('wd purple')) return 'Western Digital';
  if (text.includes('mikrotik') || text.includes('routerboard')) return 'MikroTik';
  if (text.includes('uniview') || text.includes('unv')) return 'Uniview';
  if (text.includes('tp-link') || text.includes('omada')) return 'TP-Link Omada';
  if (text.includes('milestone') || text.includes('xprotect')) return 'Milestone Systems';
  if (text.includes('eaton')) return 'Eaton Power';
  if (text.includes('cyberpower')) return 'CyberPower Systems';
  if (text.includes('huawei')) return 'Huawei Enterprise';

  // Domain-specific prestige branding based on category
  if (category.includes('Solar') || category.includes('Renewable')) return 'Spinel Solar Energy Systems';
  if (category.includes('Power') || category.includes('Electrical')) return 'Spinel Power Dynamics';
  if (category.includes('Surveillance') || category.includes('Camera')) return 'Spinel Optical Security';
  if (category.includes('Access Control')) return 'Spinel Access Technologies';
  if (category.includes('Networking') || category.includes('Telecommunication')) return 'Spinel Networks';
  if (category.includes('Public Address')) return 'Spinel Acoustics & PAGA';

  return 'Spinel Distribution';
}

// Normalize category name against predefined list
export function matchCategory(rawCat?: string): { category: string; subcategory: string } {
  if (!rawCat) {
    return {
      category: 'Video Surveillance & Cameras',
      subcategory: 'Network Cameras'
    };
  }

  const clean = rawCat.trim().toLowerCase();
  
  // Direct category match
  for (const cat of CATEGORIES) {
    if (cat.name.toLowerCase() === clean || cat.slug === clean) {
      return { category: cat.name, subcategory: cat.subcategories[0] || 'General' };
    }
    // Check if user specified a subcategory directly in category field
    for (const sub of cat.subcategories) {
      if (sub.toLowerCase() === clean) {
        return { category: cat.name, subcategory: sub };
      }
    }
  }

  // Partial match
  for (const cat of CATEGORIES) {
    if (cat.name.toLowerCase().includes(clean) || clean.includes(cat.name.toLowerCase())) {
      return { category: cat.name, subcategory: cat.subcategories[0] || 'General' };
    }
  }

  return {
    category: 'Video Surveillance & Cameras',
    subcategory: 'Network Cameras'
  };
}

export function matchSubcategory(categoryName: string, rawSub?: string): string {
  const cat = CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  if (!cat) return rawSub || 'General';

  if (!rawSub) return cat.subcategories[0] || 'General';

  const clean = rawSub.trim().toLowerCase();
  for (const sub of cat.subcategories) {
    if (sub.toLowerCase() === clean || sub.toLowerCase().includes(clean) || clean.includes(sub.toLowerCase())) {
      return sub;
    }
  }

  return cat.subcategories[0] || rawSub;
}

// Convert a single raw object into a validated Product object
export function convertRowToProduct(row: RawProductRow, index: number): Product {
  const name = String(row.name || row.title || `Enterprise Hardware Item #${index + 1}`).trim();
  const matched = matchCategory(row.category);
  const category = matched.category;
  const subcategory = matchSubcategory(category, row.subcategory || matched.subcategory);
  
  // Price handling: support products with price and products without price (RFQ quote required)
  const rawPrice = row.priceUSD !== undefined 
    ? row.priceUSD 
    : (row.price !== undefined ? row.price : (row['price(usd)'] !== undefined ? row['price(usd)'] : row['priceusd']));
  
  let priceUSD = 0;
  if (rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '') {
    const parsed = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      priceUSD = Number(parsed.toFixed(2));
    }
  }

  const rawStock = row.stock || row['stockquantity'] || row.qty;
  let stock = typeof rawStock === 'number' ? rawStock : parseInt(String(rawStock || '50').replace(/[^0-9]/g, ''), 10);
  if (isNaN(stock) || stock < 0) stock = 25;

  const sku = String(row.sku || `SPN-${category.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}-${index + 1}`).trim();
  const description = String(row.description || row.desc || `${name}. High reliability industrial solution supplied by Spinel Distribution.`).trim();
  
  // Brand is automatically assigned and displayed
  const brand = row.brand && String(row.brand).trim().length > 0 && String(row.brand).trim().toLowerCase() !== 'undefined'
    ? String(row.brand).trim()
    : inferBrand(name, sku, category, subcategory, description);

  // Images parse
  let images: string[] = [];
  const rawImages = row.images || row.image || row['imageurl'];
  if (typeof rawImages === 'string' && rawImages.trim()) {
    images = rawImages.split(/[,;|]/).map(s => s.trim()).filter(s => s.startsWith('http'));
  }
  if (images.length === 0) {
    images = [CATEGORY_IMAGE_MAP[category] || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'];
  }

  // Parse specs if available as json string or key:value;
  const specs: Record<string, string> = {
    'Brand': brand,
    'Model / SKU': sku,
    'Condition': 'New - Factory Sealed Enterprise Pack',
    'Warranty': '3 Years Spinel Distribution Replacement Warranty'
  };

  const features: string[] = [
    'Official Spinel Distribution certified equipment',
    'Engineered for 24/7 mission-critical operations',
    'Compliance with international safety & cybersecurity standards'
  ];

  if (row.specs && typeof row.specs === 'string') {
    try {
      if (row.specs.startsWith('{')) {
        Object.assign(specs, JSON.parse(row.specs));
      } else {
        const parts = row.specs.split(';');
        let specIndex = 1;
        for (const p of parts) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          if (trimmed.includes(':')) {
            const [k, ...rest] = trimmed.split(':');
            if (k && rest.length > 0) specs[k.trim()] = rest.join(':').trim();
          } else {
            specs[`Spec_${specIndex}`] = trimmed;
            specIndex++;
          }
          if (features.length < 6) {
            features.push(trimmed);
          }
        }
      }
    } catch {
      // Ignored non-json string
    }
  }

  const isChoice = row.isChoice === true || String(row.isChoice).toLowerCase() === 'true';

  return {
    id: `prod-bulk-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}-${index}`,
    sku,
    name,
    description,
    priceUSD,
    category,
    subcategory,
    brand,
    rating: parseFloat((4.6 + (Math.random() * 0.4)).toFixed(1)),
    reviewCount: Math.floor(25 + Math.random() * 350),
    stock,
    images,
    specs,
    features,
    isChoice: isChoice ?? (index % 4 === 0),
    featured: index % 5 === 0,
    createdAt: new Date().toISOString()
  };
}

// Parse CSV text string (handles thousands of lines safely)
export function parseCSVString(csvContent: string): { products: Product[]; stats: BulkUploadStats } {
  const startTime = Date.now();
  const parsed = Papa.parse<RawProductRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, '')
  });

  const products: Product[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const categoriesCount: Record<string, number> = {};

  parsed.data.forEach((row, idx) => {
    try {
      // Look for title or name or sku
      const hasContent = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim().length > 0);
      if (!hasContent) return;

      const product = convertRowToProduct(row, idx);
      products.push(product);
      categoriesCount[product.category] = (categoriesCount[product.category] || 0) + 1;
    } catch (err: any) {
      errors.push({ row: idx + 2, reason: err?.message || 'Invalid row data' });
    }
  });

  const stats: BulkUploadStats = {
    totalProcessed: parsed.data.length,
    successful: products.length,
    failed: errors.length,
    errors,
    categoriesCount,
    timeTakenMs: Date.now() - startTime
  };

  return { products, stats };
}

// Parse Excel ArrayBuffer / binary (.xlsx or .xls)
export function parseExcelBuffer(buffer: ArrayBuffer): { products: Product[]; stats: BulkUploadStats } {
  const startTime = Date.now();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<RawProductRow>(worksheet, { defval: '' });

  const products: Product[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const categoriesCount: Record<string, number> = {};

  rawRows.forEach((row, idx) => {
    try {
      const normalizedRow: RawProductRow = {};
      for (const [k, v] of Object.entries(row)) {
        const cleanKey = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
        normalizedRow[cleanKey] = v;
      }

      const product = convertRowToProduct(normalizedRow, idx);
      products.push(product);
      categoriesCount[product.category] = (categoriesCount[product.category] || 0) + 1;
    } catch (err: any) {
      errors.push({ row: idx + 2, reason: err?.message || 'Failed to parse row' });
    }
  });

  const stats: BulkUploadStats = {
    totalProcessed: rawRows.length,
    successful: products.length,
    failed: errors.length,
    errors,
    categoriesCount,
    timeTakenMs: Date.now() - startTime
  };

  return { products, stats };
}

// Convenience wrapper to parse either CSV or Excel File object
export async function parseProductsFile(file: File): Promise<Product[]> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const result = parseExcelBuffer(buffer);
    return result.products;
  } else {
    const text = await file.text();
    const result = parseCSVString(text);
    return result.products;
  }
}

// Convenience wrapper to parse raw CSV string and return products array
export function parseProductsCSVString(csvContent: string): Product[] {
  const result = parseCSVString(csvContent);
  return result.products;
}

// Generate sample downloadable CSV template and trigger browser download
export function downloadSampleCSVFile(): void {
  const csvData = generateSampleCSV();
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'spinel_products_bulk_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate sample downloadable CSV template
export function generateSampleCSV(): string {
  const sampleRows = CATEGORIES.map((cat, i) => {
    // Alternate to showcase products with price and products without price (Quote required)
    const hasPrice = i % 2 === 0;
    const priceUSD = hasPrice ? (120 + i * 45).toFixed(2) : ''; // Empty means Quote / RFQ required

    return {
      sku: `SPN-${cat.slug.slice(0, 4).toUpperCase()}-${100 + i}`,
      name: `Spinel ${cat.subcategories[0]} Model ${2026 + i}`,
      description: `Enterprise-grade ${cat.subcategories[0]} for mission-critical industrial applications. Handled by Spinel Distribution.`,
      priceUSD: priceUSD, // Leave blank or 0 for Quote Request (RFQ)
      category: cat.name,
      subcategory: cat.subcategories[0],
      stock: 100,
      specs: 'Input:100-240V;Warranty:3 Years;Certification:CE/FCC/UL',
      images: CATEGORY_IMAGE_MAP[cat.name] || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'
    };
  });

  return Papa.unparse(sampleRows);
}

// Generate sample Excel workbook for download
export function generateSampleExcelBlob(): Blob {
  const sampleRows = CATEGORIES.flatMap((cat, i) => 
    cat.subcategories.slice(0, 2).map((sub, j) => {
      const hasPrice = (i + j) % 2 === 0;
      const priceVal = hasPrice ? Number((120 + (i * 45) + (j * 30)).toFixed(2)) : '';

      return {
        'SKU': `SPN-${cat.slug.slice(0, 4).toUpperCase()}-${(i * 10) + j + 1}`,
        'Product Name': `Spinel Professional ${sub} Series X`,
        'Description': `Industrial-grade ${sub} engineered for high reliability in ${cat.name}.`,
        'Price USD (Leave blank or 0 for Quote)': priceVal,
        'Category': cat.name,
        'Subcategory': sub,
        'Stock Quantity': 75,
        'Specifications': 'Standard:IEC;Operating Temp:-20C to +60C;Protection:IP67',
        'Image URL': CATEGORY_IMAGE_MAP[cat.name] || ''
      };
    })
  );

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products_Template');
  
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
