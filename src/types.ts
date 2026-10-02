export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceUSD: number;
  category: string;
  subcategory: string;
  brand: string;
  rating: number;
  reviewCount: number;
  stock: number;
  images: string[];
  specs: Record<string, string>;
  features: string[];
  isChoice: boolean;
  isBestSeller?: boolean;
  featured?: boolean;
  createdAt: string;
}

export interface CategoryDefinition {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  image: string;
  subcategories: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  priceUSD: number;
  priceNGN: number;
  quantity: number;
  image: string;
  category: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotalUSD: number;
  subtotalNGN: number;
  shippingFeeUSD: number;
  shippingFeeNGN: number;
  totalUSD: number;
  totalNGN: number;
  exchangeRateUsed: number;
  currency: 'USD' | 'NGN';
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  paymentMethod: 'paystack' | 'bank_transfer' | 'card';
  paymentReference?: string;
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  createdAt: string;
  estimatedDelivery: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  company?: string;
  role?: string;
  verificationStatus?: string;
  createdAt: string;
}

export interface ServerConfig {
  usdToNgnRate: number;
  paystackPublicKey: string;
  supabaseConfigured: boolean;
  companyName: string;
  supportEmail: string;
}

export interface BulkUploadStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
  categoriesCount: Record<string, number>;
  timeTakenMs: number;
}

export interface SubmittedQuote {
  quoteId: string;
  date: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  location?: string;
  currency?: string;
  quantity: number;
  projectTimeline?: string;
  notes?: string;
  needsInstallation?: boolean;
  needsPartnerDiscount?: boolean;
  product?: {
    id: string;
    sku: string;
    name: string;
    brand: string;
    category: string;
    image: string;
  };
  status: 'Under Review' | 'Quoted' | 'Approved' | 'Declined' | string;
}
