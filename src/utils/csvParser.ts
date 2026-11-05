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
  priceusd?: string | number;
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
  features?: string;
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
  'Renewable Energy': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  'Fiber Optic & Hybrid Cables': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80'
};

// Intelligently assign/infer brand of each product from name, SKU, category and description
export function inferBrand(name: string, sku: string, category: string, subcategory: string, description: string): string {
  const text = `${name} ${sku} ${description}`.toLowerCase();
  
  if (text.includes('crouse-hinds') || text.includes('crouse hinds') || text.includes('ceag') || text.includes('hernis') || text.includes('oxalis') || text.includes('medc') || text.includes('fhf')) return 'Eaton Crouse-Hinds';
  if (text.includes('tripp lite') || text.includes('smartrack')) return 'Eaton Tripp Lite';
  if (text.includes('b-line') || text.includes('b line')) return 'Eaton B-Line';
  if (text.includes('eaton')) return 'Eaton';
  if (text.includes('axis') || sku.toUpperCase().startsWith('AXIS') || sku.toUpperCase().startsWith('AX-')) return 'Axis Communications';
  if (text.includes('pelco')) return 'Pelco';
  if (text.includes('2n ') || sku.toUpperCase().startsWith('2N')) return '2N';
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
  if (text.includes('infinisolar')) return 'InfiniSolar';
  if (text.includes('gennex')) return 'Gennex';
  if (text.includes('suprema') || text.includes('biostation') || text.includes('facestation')) return 'Suprema';
  if (text.includes('hid') || text.includes('iclass') || text.includes('signo')) return 'HID Global';
  if (text.includes('seagate') || text.includes('skyhawk')) return 'Seagate Technology';
  if (text.includes('western digital') || text.includes('wd purple')) return 'Western Digital';
  if (text.includes('mikrotik') || text.includes('routerboard')) return 'MikroTik';
  if (text.includes('uniview') || text.includes('unv')) return 'Uniview';
  if (text.includes('tp-link') || text.includes('omada')) return 'TP-Link Omada';
  if (text.includes('milestone') || text.includes('xprotect')) return 'Milestone Systems';
  if (text.includes('cyberpower')) return 'CyberPower Systems';
  if (text.includes('huawei')) return 'Huawei Enterprise';

  // Domain-specific prestige branding based on category
  if (category.includes('Solar') || category.includes('Renewable')) return 'Spinel Solar Energy Systems';
  if (category.includes('Power') || category.includes('Electrical')) return 'Spinel Power Dynamics';
  if (category.includes('Surveillance') || category.includes('Camera')) return 'Spinel Optical Security';
  if (category.includes('Access Control')) return 'Spinel Access Technologies';
  if (category.includes('Networking') || category.includes('Telecommunication')) return 'Spinel Networks';
  if (category.includes('Public Address')) return 'Spinel Acoustics & PAGA';
  if (category.includes('Enclosures')) return 'Eaton Crouse-Hinds';

  return 'Spinel Distribution';
}

// Normalize category name against predefined list of 16 categories
export function matchCategory(rawCat?: string, rawSub?: string, name?: string, sheetName?: string): { category: string; subcategory: string } {
  const candidates = [rawCat, sheetName, rawSub].filter(Boolean).map(s => String(s).trim());

  for (const candidate of candidates) {
    const clean = candidate.toLowerCase();
    // 1. Exact category or slug match
    for (const cat of CATEGORIES) {
      if (cat.name.toLowerCase() === clean || cat.slug === clean) {
        return { category: cat.name, subcategory: cat.subcategories[0] || 'General' };
      }
      // 2. Exact subcategory match
      for (const sub of cat.subcategories) {
        if (sub.toLowerCase() === clean) {
          return { category: cat.name, subcategory: sub };
        }
      }
    }

    // 3. Partial or keyword match on category candidate
    for (const cat of CATEGORIES) {
      if (cat.name.toLowerCase().includes(clean) || clean.includes(cat.name.toLowerCase())) {
        return { category: cat.name, subcategory: cat.subcategories[0] || 'General' };
      }
      for (const sub of cat.subcategories) {
        if (sub.toLowerCase().includes(clean) || clean.includes(sub.toLowerCase())) {
          return { category: cat.name, subcategory: sub };
        }
      }
    }

    // 4. Keyword aliases
    if (clean.includes('enclosure') || clean.includes('housing') || clean.includes('junction box') || clean.includes('it rack')) {
      return { category: 'Enclosures & Housings', subcategory: 'Equipment Enclosures' };
    }
    if (clean.includes('paga') || clean.includes('public address') || clean.includes('speaker') || clean.includes('sounder') || clean.includes('horn')) {
      return { category: 'Public Address (PAGA) System', subcategory: 'Public Address Systems' };
    }
    if (clean.includes('renewable') || clean.includes('solar') || clean.includes('inverter') || clean.includes('lifepo4')) {
      return { category: 'Renewable Energy', subcategory: 'Smart Hybrid Inverters' };
    }
    if (clean.includes('hybrid cable') || clean.includes('hybrid composite')) {
      return { category: 'Fiber Optic & Hybrid Cables', subcategory: 'Hybrid Composite Cables' };
    }
    if (clean.includes('fiber optic') || clean.includes('outdoor fiber') || clean.includes('fiber cable') || clean.includes('optical fiber')) {
      return { category: 'Fiber Optic & Hybrid Cables', subcategory: 'Fiber Outdoor Cables' };
    }
    if (clean.includes('power') || clean.includes('electrical') || clean.includes('ups') || clean.includes('pdu') || clean.includes('power supply')) {
      return { category: 'Power & Electrical Systems', subcategory: 'Power Supplies' };
    }
    if (clean.includes('storage') || clean.includes('hard drive') || clean.includes('hdd') || clean.includes('nas') || clean.includes('san')) {
      return { category: 'Storage & Data Infrastructure', subcategory: 'Network Storage' };
    }
    if (clean.includes('software') || clean.includes('license')) {
      return { category: 'Security Software & Licenses', subcategory: 'Software Licenses' };
    }
    if (clean.includes('sensor') || clean.includes('detection') || clean.includes('radar') || clean.includes('pir')) {
      return { category: 'Security Sensors & Detection', subcategory: 'Motion Sensors' };
    }
    if (clean.includes('network') || clean.includes('switch') || clean.includes('router') || clean.includes('wi-fi') || clean.includes('wifi')) {
      return { category: 'Networking & Connectivity', subcategory: 'Network Switches' };
    }
    if (clean.includes('intercom') || clean.includes('ip phone') || clean.includes('door station')) {
      return { category: 'Intercom & IP Communication', subcategory: 'IP Intercoms' };
    }
    if (clean.includes('access control') || clean.includes('biometric') || clean.includes('reader') || clean.includes('credential') || clean.includes('lock')) {
      return { category: 'Access Control & Door Security', subcategory: 'Access Control Readers' };
    }
    if (clean.includes('nvr') || clean.includes('vms') || clean.includes('video management') || clean.includes('recording') || clean.includes('encoder') || clean.includes('decoder')) {
      return { category: 'Video Management & Recording', subcategory: 'Network Video Recorders (NVR)' };
    }
    if (clean.includes('mount') || clean.includes('bracket') || clean.includes('pendant')) {
      return { category: 'Mounting & Surveillance Accessories', subcategory: 'Camera Mounts' };
    }
    if (clean.includes('light') || clean.includes('illuminator') || clean.includes('deterrence') || clean.includes('strobe')) {
      return { category: 'Lighting & Visual Deterrence', subcategory: 'Security Lighting' };
    }
    if (clean.includes('telecom') || clean.includes('microwave') || clean.includes('uhf') || clean.includes('vhf') || clean.includes('satellite') || clean.includes('radio')) {
      return { category: 'Telecommunication & Communication Equipment', subcategory: 'Wireless Communication' };
    }
    if (clean.includes('replacement') || clean.includes('spare part') || clean.includes('upgrade kit') || clean.includes('accessory') || clean.includes('accessories')) {
      return { category: 'Accessories & Replacement Parts', subcategory: 'Replacement Parts' };
    }
    if (clean.includes('camera') || clean.includes('surveillance') || clean.includes('ptz') || clean.includes('dome') || clean.includes('bullet') || clean.includes('thermal')) {
      return { category: 'Video Surveillance & Cameras', subcategory: 'Network Cameras' };
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

  if (!rawSub || !String(rawSub).trim()) return cat.subcategories[0] || 'General';

  const clean = String(rawSub).trim().toLowerCase();
  for (const sub of cat.subcategories) {
    if (sub.toLowerCase() === clean) {
      return sub;
    }
  }
  for (const sub of cat.subcategories) {
    if (sub.toLowerCase().includes(clean) || clean.includes(sub.toLowerCase())) {
      return sub;
    }
  }

  return String(rawSub).trim();
}

// Convert a single raw object into a validated Product object
export function convertRowToProduct(row: RawProductRow, index: number, sheetName?: string): Product {
  const rawName = row.name || row.productname || row.title || row.item || row.model || '';
  const name = String(rawName || `Enterprise Hardware Item #${index + 1}`).trim();
  const rawCat = row.category || row.department || row.group;
  const rawSub = row.subcategory || row.sub || row.type;
  const matched = matchCategory(rawCat, rawSub, name, sheetName);
  const category = matched.category;
  const subcategory = matchSubcategory(category, rawSub || matched.subcategory);
  
  // Price handling: support products with price and products without price (RFQ quote required)
  const rawPrice = row.priceUSD !== undefined 
    ? row.priceUSD 
    : (row.priceusd !== undefined 
      ? row.priceusd 
      : (row.price !== undefined 
        ? row.price 
        : (row['price(usd)'] !== undefined ? row['price(usd)'] : row.unitprice)));
  
  let priceUSD = 0;
  if (rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '') {
    const parsed = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      priceUSD = Number(parsed.toFixed(2));
    }
  }

  const rawStock = row.stock ?? row.stockquantity ?? row.qty ?? row.quantity;
  let stock = typeof rawStock === 'number' ? rawStock : parseInt(String(rawStock ?? '50').replace(/[^0-9]/g, ''), 10);
  if (isNaN(stock) || stock < 0) stock = 50;

  const rawSku = row.sku || row.partnumber || row.partno || row.modelnumber || row.code;
  const sku = String(rawSku || `SPN-${category.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}-${index + 1}`).trim();
  const rawDesc = row.description || row.desc || row.details || row.summary;
  const description = String(rawDesc || `${name}. High reliability industrial solution supplied by Spinel Distribution.`).trim();
  
  // Brand is automatically assigned and displayed
  const brand = row.brand && String(row.brand).trim().length > 0 && String(row.brand).trim().toLowerCase() !== 'undefined'
    ? String(row.brand).trim()
    : inferBrand(name, sku, category, subcategory, description);

  // Images parse
  let images: string[] = [];
  const rawImages = row.images || row.image || row.imageurl || row.img || row.photo || row.picture;
  if (typeof rawImages === 'string' && rawImages.trim()) {
    images = rawImages.split(/[,;|]/).map(s => s.trim()).filter(s => s.startsWith('http') || s.startsWith('/'));
  }
  if (images.length === 0) {
    images = [CATEGORY_IMAGE_MAP[category] || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80'];
  }

  // Parse specs if available as json string or key:value;
  const specs: Record<string, string> = {};
  const features: string[] = [];

  const rawSpecs = row.specs || row.specifications || row.specification || row.features;
  if (rawSpecs && typeof rawSpecs === 'string') {
    try {
      if (rawSpecs.trim().startsWith('{')) {
        Object.assign(specs, JSON.parse(rawSpecs.trim()));
      } else {
        const parts = rawSpecs.split(';');
        let specIndex = 1;
        for (const p of parts) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          if (trimmed.includes(':')) {
            const [k, ...rest] = trimmed.split(':');
            if (k && rest.length > 0) specs[k.trim()] = rest.join(':').trim();
          } else {
            specs[`Specification ${specIndex}`] = trimmed;
            specIndex++;
          }
          if (features.length < 8) {
            features.push(trimmed);
          }
        }
      }
    } catch {
      // Ignored non-json string
    }
  }

  if (Object.keys(specs).length === 0) {
    specs['Brand'] = brand;
    specs['Model / SKU'] = sku;
    specs['Category'] = `${category} — ${subcategory}`;
    specs['Condition'] = 'New - Factory Sealed Enterprise Pack';
  }

  if (features.length === 0) {
    features.push(
      `Official ${brand} Industrial & Enterprise Grade Hardware`,
      'Engineered for 24/7 Mission-Critical Operations',
      'Spinel Distribution Authorized Partner Warranty & Support'
    );
  }

  const isChoice = row.isChoice === true || String(row.isChoice || row.ischoice).toLowerCase() === 'true';
  const cleanSkuId = sku.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    id: `prod-${cleanSkuId || `${Date.now().toString(36)}-${index}`}`,
    sku,
    name,
    description,
    priceUSD,
    category,
    subcategory,
    brand,
    rating: parseFloat((4.7 + ((index % 4) * 0.1)).toFixed(1)),
    reviewCount: 18 + ((index * 7) % 65),
    stock,
    images,
    specs,
    features,
    isChoice: isChoice || (index % 3 === 0),
    isBestSeller: index % 4 === 0,
    featured: true,
    createdAt: new Date().toISOString()
  };
}

// Parse CSV text string (handles thousands of lines safely)
export function parseCSVString(csvContent: string): { products: Product[]; stats: BulkUploadStats } {
  const startTime = Date.now();
  const parsed = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  });

  const products: Product[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const categoriesCount: Record<string, number> = {};

  parsed.data.forEach((rawRow, idx) => {
    try {
      const normalizedRow: RawProductRow = {};
      for (const [k, v] of Object.entries(rawRow || {})) {
        const cleanKey = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (cleanKey && v !== null && v !== undefined && String(v).trim() !== '') {
          normalizedRow[cleanKey] = v;
        }
      }

      const hasKeyContent = Boolean(normalizedRow.sku || normalizedRow.name || normalizedRow.productname || normalizedRow.title || normalizedRow.model);
      if (!hasKeyContent) return;

      const product = convertRowToProduct(normalizedRow, idx);
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

// Parse Excel ArrayBuffer / binary (.xlsx or .xls) across ALL sheets in the workbook
export function parseExcelBuffer(buffer: ArrayBuffer): { products: Product[]; stats: BulkUploadStats } {
  const startTime = Date.now();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const products: Product[] = [];
  const errors: Array<{ row: number; reason: string }> = [];
  const categoriesCount: Record<string, number> = {};
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    totalRows += rawRows.length;

    rawRows.forEach((row, idx) => {
      try {
        const normalizedRow: RawProductRow = {};
        for (const [k, v] of Object.entries(row || {})) {
          const cleanKey = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
          if (cleanKey && v !== null && v !== undefined && String(v).trim() !== '') {
            normalizedRow[cleanKey] = v;
          }
        }

        const hasKeyContent = Boolean(normalizedRow.sku || normalizedRow.name || normalizedRow.productname || normalizedRow.title || normalizedRow.model);
        if (!hasKeyContent) return;

        const product = convertRowToProduct(normalizedRow, products.length, sheetName);
        products.push(product);
        categoriesCount[product.category] = (categoriesCount[product.category] || 0) + 1;
      } catch (err: any) {
        errors.push({ row: idx + 2, reason: err?.message || 'Failed to parse row' });
      }
    });
  }

  const stats: BulkUploadStats = {
    totalProcessed: totalRows,
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
  const lower = file.name.toLowerCase();
  const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');

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
    const hasPrice = i % 2 === 0;
    const priceUSD = hasPrice ? (120 + i * 45).toFixed(2) : '';

    return {
      sku: `SPN-${cat.slug.slice(0, 4).toUpperCase()}-${100 + i}`,
      name: `Spinel ${cat.subcategories[0]} Model ${2026 + i}`,
      description: `Enterprise-grade ${cat.subcategories[0]} for mission-critical industrial applications. Handled by Spinel Distribution.`,
      priceUSD: priceUSD,
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
