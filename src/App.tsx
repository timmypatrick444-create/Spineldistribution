import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { NavigationDrawer } from './components/NavigationDrawer';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Product, Order } from './types';

// Lazy-load secondary pages so homepage JS downloads & executes dramatically faster
const CatalogPage = lazy(() => import('./components/CatalogPage').then(m => ({ default: m.CatalogPage })));
const ProductDetailPage = lazy(() => import('./components/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('./components/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./components/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrdersPage = lazy(() => import('./components/OrdersPage').then(m => ({ default: m.OrdersPage })));
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./components/SignupPage').then(m => ({ default: m.SignupPage })));
const OtpVerificationPage = lazy(() => import('./components/OtpVerificationPage').then(m => ({ default: m.OtpVerificationPage })));
const RequestQuotePage = lazy(() => import('./components/RequestQuotePage').then(m => ({ default: m.RequestQuotePage })));
const InvoicePage = lazy(() => import('./components/InvoicePage').then(m => ({ default: m.InvoicePage })));
const AboutPage = lazy(() => import('./components/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./components/ContactPage').then(m => ({ default: m.ContactPage })));
const TermsOfUsePage = lazy(() => import('./components/TermsOfUsePage').then(m => ({ default: m.TermsOfUsePage })));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { CATEGORIES } from './data/categories';
import { SEED_PRODUCTS } from './data/seedProducts';
import { UPLOADED_CATALOG_PRODUCTS } from './data/uploadedProducts';
import { UPLOADED_PAGA_PRODUCTS } from './data/uploadedPagaProducts';
import { UPLOADED_ENCLOSURE_PRODUCTS } from './data/uploadedEnclosureProducts';
import { UPLOADED_FIBER_CABLE_PRODUCTS } from './data/uploadedFiberCables';
import { CUSTOM_UPLOADED_PRODUCTS } from './data/customUploadedProducts';
import { fetchWithRetry } from './utils/apiRetry';

const INITIAL_SEEDED_PRODUCTS: Product[] = [
  ...CUSTOM_UPLOADED_PRODUCTS,
  ...UPLOADED_FIBER_CABLE_PRODUCTS,
  ...UPLOADED_ENCLOSURE_PRODUCTS,
  ...UPLOADED_PAGA_PRODUCTS,
  ...UPLOADED_CATALOG_PRODUCTS,
  ...SEED_PRODUCTS
];

function MainApp() {
  const { isAdmin } = useAuth();

  // Navigation / View State with initial route detection
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/product/')) return 'product';
      if (path === '/admin/dashboard' || path === '/admin') return 'admin-dashboard';
      if (path === '/orders') return 'orders';
      if (path === '/cart') return 'cart';
      if (path === '/checkout') return 'checkout';
      if (path === '/invoice') return 'invoice';
      if (path === '/catalog') return 'catalog';
      if (path === '/quote' || path === '/request-quote') return 'quote';
      if (path === '/about') return 'about';
      if (path === '/contact') return 'contact';
      if (path === '/terms-of-use' || path === '/terms') return 'terms-of-use';
      if (path === '/privacy-policy' || path === '/privacy') return 'privacy-policy';
      if (path === '/reset-password' || path === '/forgot-password') return 'reset-password';
      if (path === '/login') return 'login';
      if (path === '/signup') return 'signup';
      if (path === '/auth') return 'login';
    }
    return 'home';
  });

  const [pendingAuthEmail, setPendingAuthEmail] = useState<string>('');
  const [pendingAuthName, setPendingAuthName] = useState<string>('');
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product/')) {
      const prodId = decodeURIComponent(window.location.pathname.replace('/product/', '')).trim();
      return INITIAL_SEEDED_PRODUCTS.find(p => p.id === prodId || p.sku.toLowerCase() === prodId.toLowerCase()) || null;
    }
    return null;
  });
  const [quoteInitialProduct, setQuoteInitialProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/catalog') {
      return new URLSearchParams(window.location.search).get('category') || undefined;
    }
    return undefined;
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/catalog') {
      return new URLSearchParams(window.location.search).get('subcategory') || undefined;
    }
    return undefined;
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/catalog') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [currentInvoiceOrder, setCurrentInvoiceOrder] = useState<Order | null>(() => {
    try {
      const saved = sessionStorage.getItem('spinel_current_invoice_order');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Global Products State - initialized immediately for ultra-fast, smooth 0ms loading
  const [products, setProducts] = useState<Product[]>(INITIAL_SEEDED_PRODUCTS);

  // Fetch products from server to sync updates seamlessly in the background
  const loadProducts = async () => {
    try {
      const res = await fetchWithRetry('/api/products?limit=5000');
      if (res.ok) {
        const data = await res.json();
        const productList: Product[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
          ? data.products
          : [];
        if (productList.length > 0) {
          // Merge server products while guaranteeing NO products are ever deducted or removed
          const seenIds = new Set<string>();
          const seenSkus = new Set<string>();
          const validFiberSkus = new Set(UPLOADED_FIBER_CABLE_PRODUCTS.map(p => (p.sku || '').toLowerCase()));
          const merged: Product[] = [];

          // 1. Add products received from server (excluding any obsolete/legacy fiber products)
          for (const p of productList) {
            if (!p) continue;
            const cat = (p.category || '').toLowerCase().trim();
            if (cat === 'fiber optic & hybrid cables' || cat.includes('fiber optic')) {
              // Only allow the 60 official products from the uploaded catalog
              if (!validFiberSkus.has((p.sku || '').toLowerCase())) {
                continue;
              }
            }
            const idKey = (p.id || '').toLowerCase().trim();
            const skuKey = (p.sku || '').toLowerCase().trim();
            if (idKey && seenIds.has(idKey)) continue;
            if (skuKey && seenSkus.has(skuKey)) continue;
            if (idKey) seenIds.add(idKey);
            if (skuKey) seenSkus.add(skuKey);
            merged.push(p);
          }

          // 2. Guarantee every initial seeded product is preserved, never dropped or reduced
          for (const p of INITIAL_SEEDED_PRODUCTS) {
            if (!p) continue;
            const idKey = (p.id || '').toLowerCase().trim();
            const skuKey = (p.sku || '').toLowerCase().trim();
            if ((idKey && seenIds.has(idKey)) || (skuKey && seenSkus.has(skuKey))) continue;
            if (idKey) seenIds.add(idKey);
            if (skuKey) seenSkus.add(skuKey);
            merged.push(p);
          }

          setProducts(merged);
          if (window.location.pathname.startsWith('/product/')) {
            const prodId = decodeURIComponent(window.location.pathname.replace('/product/', '')).trim();
            const found = merged.find(p => p.id === prodId || p.sku.toLowerCase() === prodId.toLowerCase());
            if (found) {
              setSelectedProduct(found);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Background sync: using local catalog', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Clean up any stale ?_v=... query parameters from address bar without reloading
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('_v=')) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('_v');
      const cleanSearch = searchParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  }, []);

  // Background catalog data sync: refreshes data in memory without any page reload or URL mutation
  useEffect(() => {
    let initialBootTime: number | null = null;
    let initialBuildTs: number | null = null;

    const checkLiveVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.serverBootTime) {
          if (initialBootTime === null) {
            initialBootTime = data.serverBootTime;
            initialBuildTs = data.buildTs;
          } else if (
            (data.serverBootTime !== initialBootTime && Math.abs(data.serverBootTime - initialBootTime) > 2000) ||
            (initialBuildTs !== null && data.buildTs && Math.abs(data.buildTs - initialBuildTs) > 2000)
          ) {
            // Silently refresh products in-memory without any URL changes or page reloads
            initialBootTime = data.serverBootTime;
            initialBuildTs = data.buildTs;
            loadProducts();
          }
        }
      } catch {}
    };

    const interval = setInterval(checkLiveVersion, 30000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Sync with browser URL path (e.g. /product/:id, /orders, /cart, /admin)
  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      if (path.startsWith('/product/')) {
        const prodId = decodeURIComponent(path.replace('/product/', '')).trim();
        if (prodId) {
          const list = Array.isArray(products) && products.length > 0 ? products : INITIAL_SEEDED_PRODUCTS;
          const found = list.find(p => p.id === prodId || p.sku.toLowerCase() === prodId.toLowerCase());
          if (found) {
            setSelectedProduct(found);
          }
        }
        setCurrentView('product');
      } else if (path === '/admin/dashboard' || path === '/admin') {
        setCurrentView(isAdmin ? 'admin-dashboard' : 'admin-login');
      } else if (path === '/orders') {
        setCurrentView('orders');
      } else if (path === '/cart') {
        setCurrentView('cart');
      } else if (path === '/checkout') {
        setCurrentView('checkout');
      } else if (path === '/invoice') {
        setCurrentView('invoice');
      } else if (path === '/catalog') {
        const params = new URLSearchParams(window.location.search);
        setSelectedCategory(params.get('category') || undefined);
        setSelectedSubcategory(params.get('subcategory') || undefined);
        setSearchQuery(params.get('search') || '');
        setCurrentView('catalog');
      } else if (path === '/quote' || path === '/request-quote') {
        setCurrentView('quote');
      } else if (path === '/about') {
        setCurrentView('about');
      } else if (path === '/contact') {
        setCurrentView('contact');
      } else if (path === '/terms-of-use' || path === '/terms') {
        setCurrentView('terms-of-use');
      } else if (path === '/privacy-policy' || path === '/privacy') {
        setCurrentView('privacy-policy');
      } else if (path === '/login') {
        setCurrentView('login');
      } else if (path === '/signup') {
        setCurrentView('signup');
      } else if (path === '/auth') {
        setCurrentView('login');
      } else if (path === '/') {
        setCurrentView('home');
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, [products, isAdmin]);

  // Dynamic SEO document title & meta description per route/category/product
  useEffect(() => {
    let pageTitle = 'SPINEL DISTRIBUTION - International E-Commerce & Security Systems';
    let pageDesc = 'International enterprise e-commerce platform for video surveillance, access control, networking, telecommunications, and fiber optic cabling.';

    if (currentView === 'product' && selectedProduct) {
      pageTitle = `${selectedProduct.name} | SPINEL DISTRIBUTION`;
      pageDesc = (selectedProduct.description || `${selectedProduct.brand} ${selectedProduct.name} (${selectedProduct.sku}) - Enterprise security & ICT distribution.`).slice(0, 158);
    } else if (currentView === 'catalog') {
      const catLabel = selectedSubcategory
        ? `${selectedSubcategory} - ${selectedCategory || 'Catalog'}`
        : selectedCategory || (searchQuery ? `Search: ${searchQuery}` : 'Enterprise Hardware Catalog');
      pageTitle = `${catLabel} | SPINEL DISTRIBUTION`;
    } else if (currentView === 'quote') {
      pageTitle = 'Request Enterprise Quotation (RFQ) | SPINEL DISTRIBUTION';
    } else if (currentView === 'about') {
      pageTitle = 'About Spinel Distribution Ltd | Global ICT & Security Systems';
    } else if (currentView === 'contact') {
      pageTitle = 'Contact Spinel Distribution | Enterprise Support & Sales';
    } else if (currentView === 'terms-of-use') {
      pageTitle = 'Terms of Use | SPINEL DISTRIBUTION';
    } else if (currentView === 'privacy-policy') {
      pageTitle = 'Privacy Policy | SPINEL DISTRIBUTION';
    }

    document.title = pageTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', pageDesc);
  }, [currentView, selectedProduct, selectedCategory, selectedSubcategory, searchQuery]);

  // Update browser URL on navigation
  const navigateTo = (view: string, param?: string) => {
    if (view === 'request-quote') {
      view = 'quote';
    }
    if (view === 'auth') {
      view = 'login';
    }
    if (view === 'category' && param) {
      handleSelectCategory(param);
      return;
    }

    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let targetPath = '/';
    if (view === 'admin-login') targetPath = '/admin';
    else if (view === 'admin-dashboard') targetPath = '/admin/dashboard';
    else if (view === 'cart') targetPath = '/cart';
    else if (view === 'checkout') targetPath = '/checkout';
    else if (view === 'invoice') targetPath = '/invoice';
    else if (view === 'orders') targetPath = '/orders';
    else if (view === 'catalog') targetPath = '/catalog';
    else if (view === 'login') targetPath = '/login';
    else if (view === 'signup') targetPath = '/signup';
    else if (view === 'quote') targetPath = '/quote';
    else if (view === 'about') targetPath = '/about';
    else if (view === 'contact') targetPath = '/contact';
    else if (view === 'terms-of-use' || view === 'terms') targetPath = '/terms-of-use';
    else if (view === 'privacy-policy' || view === 'privacy') targetPath = '/privacy-policy';
    else if (view === 'reset-password') {
      if (param) setResetPasswordEmail(param);
      targetPath = '/reset-password';
    }
    else if (view === 'product') {
      const prodId = param || selectedProduct?.id;
      targetPath = prodId ? `/product/${encodeURIComponent(prodId)}` : '/';
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const handleViewInvoice = (order: Order) => {
    setCurrentInvoiceOrder(order);
    try {
      sessionStorage.setItem('spinel_current_invoice_order', JSON.stringify(order));
    } catch {}
    navigateTo('invoice');
  };

  // Category selection handler
  const handleSelectCategory = (catName?: string, subcatName?: string) => {
    let nextCat = catName;
    let nextSub = subcatName;
    // If a subcategory name was passed as catName without subcatName, map it to parent category
    if (catName && !subcatName) {
      for (const cat of CATEGORIES) {
        if (cat.name.toLowerCase() === catName.toLowerCase()) {
          nextCat = cat.name;
          nextSub = undefined;
          break;
        }
        if (cat.subcategories.some(s => s.toLowerCase() === catName.toLowerCase())) {
          nextCat = cat.name;
          nextSub = catName;
          break;
        }
      }
    }
    setSelectedCategory(nextCat);
    setSelectedSubcategory(nextSub);
    setSearchQuery('');
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const params = new URLSearchParams();
    if (nextCat) params.set('category', nextCat);
    if (nextSub) params.set('subcategory', nextSub);
    const qs = params.toString();
    const targetUrl = qs ? `/catalog?${qs}` : '/catalog';
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  // Search keyword submission
  const handleSearchSubmit = (query: string, categoryFilter?: string) => {
    const nextCat = categoryFilter === 'All' ? undefined : categoryFilter;
    setSearchQuery(query);
    setSelectedCategory(nextCat);
    setSelectedSubcategory(undefined);
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const params = new URLSearchParams();
    if (nextCat) params.set('category', nextCat);
    if (query) params.set('search', query);
    const qs = params.toString();
    const targetUrl = qs ? `/catalog?${qs}` : '/catalog';
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  // Product Selection handler - updates URL to navigated product details page
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    navigateTo('product', prod.id);
  };

  const handleSelectProductById = (productId: string) => {
    const list = Array.isArray(products) && products.length > 0 ? products : INITIAL_SEEDED_PRODUCTS;
    const found = list.find(p => p.id === productId || p.sku.toLowerCase() === productId.toLowerCase());
    if (found) {
      handleSelectProduct(found);
    } else {
      navigateTo('catalog');
    }
  };

  // Request Quote handler
  const handleRequestQuote = (prod?: Product) => {
    setQuoteInitialProduct(prod || null);
    navigateTo('quote');
  };

  // Buy Now immediate navigation - redirects to Request Quote if product has no price
  const handleBuyNow = (product: Product, quantity: number) => {
    if (!product.priceUSD || product.priceUSD <= 0) {
      handleRequestQuote(product);
      return;
    }
    navigateTo('checkout');
  };

  const isAdminView = currentView === 'admin-dashboard';
  const isAuthView = currentView === 'login' || currentView === 'signup' || currentView === 'otp-verify' || currentView === 'reset-password';

  return (
    <div className={`min-h-screen flex flex-col ${isAdminView ? 'bg-[#0f172a]' : isAuthView ? 'bg-[#f3f4f6]' : 'bg-[#eaeded]'} text-[#0F1111] font-sans antialiased w-full max-w-full overflow-x-clip`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2.5 focus:bg-[#febd69] focus:text-[#131921] focus:font-bold focus:rounded-md focus:shadow-xl"
      >
        Skip to main content
      </a>
      {/* 1. Main Header - Hidden on standalone login & signup pages */}
      {!isAuthView && (
        <Header
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onSearch={handleSearchSubmit}
          onSearchSubmit={handleSearchSubmit}
          onSelectCategory={handleSelectCategory}
          onNavigate={navigateTo}
          currentCategory={selectedCategory}
        />
      )}

      {/* 2. Slide-Out Navigation Drawer */}
      {!isAuthView && (
        <NavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSelectCategory={handleSelectCategory}
          onNavigate={navigateTo}
        />
      )}

      {/* 3. Main Body Views */}
      <main id="main-content" tabIndex={-1} className={`flex-1 outline-none ${isAdminView ? 'bg-[#0f172a]' : ''}`}>
        {currentView === 'home' && (
          <HomePage
            products={products}
            onSelectProduct={handleSelectProduct}
            onSelectCategory={handleSelectCategory}
            onNavigate={navigateTo}
            onRequestQuote={handleRequestQuote}
          />
        )}

        <Suspense
          fallback={
            <div role="status" aria-live="polite" className="min-h-[60vh] flex items-center justify-center p-8 text-sm font-medium text-gray-700">
              <span>Loading content…</span>
            </div>
          }
        >
            {currentView === 'catalog' && (
              <CatalogPage
                products={products}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                searchQuery={searchQuery}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onRequestQuote={handleRequestQuote}
                onRefreshCatalog={loadProducts}
              />
            )}

            {currentView === 'product' && selectedProduct && (
              <ProductDetailPage
                product={selectedProduct}
                allProducts={products}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onBuyNow={handleBuyNow}
                onRequestQuote={handleRequestQuote}
              />
            )}

            {(currentView === 'quote' || currentView === 'request-quote') && (
              <RequestQuotePage
                initialProduct={quoteInitialProduct}
                onNavigate={navigateTo}
                onSelectProduct={handleSelectProduct}
              />
            )}

            {currentView === 'cart' && (
              <CartPage
                products={products}
                onProceedToCheckout={() => navigateTo('checkout')}
                onContinueShopping={() => navigateTo('catalog')}
                onSelectProduct={handleSelectProduct}
                onRequestQuote={handleRequestQuote}
              />
            )}

            {currentView === 'checkout' && (
              <CheckoutPage
                onBackToCart={() => navigateTo('cart')}
                onOrderCompleted={(order) => {
                  handleViewInvoice(order);
                }}
              />
            )}

            {currentView === 'invoice' && (
              currentInvoiceOrder ? (
                <InvoicePage
                  order={currentInvoiceOrder}
                  onNavigate={navigateTo}
                  onOrderUpdated={(updated) => {
                    setCurrentInvoiceOrder(updated);
                    try {
                      sessionStorage.setItem('spinel_current_invoice_order', JSON.stringify(updated));
                    } catch {}
                  }}
                />
              ) : (
                <div className="max-w-2xl mx-auto px-4 py-16 text-center font-sans">
                  <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">No active invoice found</h2>
                    <p className="text-xs text-gray-500">
                      You do not have an active invoice loaded in this session. You can view past orders or explore our catalog.
                    </p>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('orders')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        View Order History
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('catalog')}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Explore Catalog
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {currentView === 'orders' && (
              <OrdersPage
                onSelectProductById={handleSelectProductById}
                onContinueShopping={() => navigateTo('catalog')}
                onViewInvoice={handleViewInvoice}
              />
            )}

            {currentView === 'about' && (
              <AboutPage
                onNavigate={navigateTo}
                onSelectCategory={handleSelectCategory}
              />
            )}

            {currentView === 'contact' && (
              <ContactPage
                onNavigate={navigateTo}
              />
            )}

            {currentView === 'terms-of-use' && (
              <TermsOfUsePage
                onNavigate={navigateTo}
              />
            )}

            {currentView === 'privacy-policy' && (
              <PrivacyPolicyPage
                onNavigate={navigateTo}
              />
            )}

            {currentView === 'reset-password' && (
              <ResetPasswordPage
                initialEmail={resetPasswordEmail}
                onSuccess={() => {
                  navigateTo('login');
                }}
                onNavigate={navigateTo}
              />
            )}

            {currentView === 'login' && (
              <LoginPage
                onSuccess={() => navigateTo('home')}
                onNavigate={navigateTo}
                onNavigateToOtp={(email) => {
                  setPendingAuthEmail(email);
                  setCurrentView('otp-verify');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentView === 'signup' && (
              <SignupPage
                onSuccess={() => navigateTo('home')}
                onNavigate={navigateTo}
                onNavigateToOtp={(email, fullName) => {
                  setPendingAuthEmail(email);
                  setPendingAuthName(fullName);
                  setCurrentView('otp-verify');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentView === 'otp-verify' && (
              <OtpVerificationPage
                email={pendingAuthEmail}
                fullName={pendingAuthName}
                onSuccess={() => navigateTo('home')}
                onNavigate={navigateTo}
                onBackToSignup={() => {
                  setCurrentView('signup');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentView === 'admin-login' && (
              <AdminLogin
                onSuccess={() => navigateTo('admin-dashboard')}
                onNavigateHome={() => navigateTo('home')}
              />
            )}

            {currentView === 'admin-dashboard' && (
              !isAdmin ? (
                <AdminLogin
                  onSuccess={() => navigateTo('admin-dashboard')}
                  onNavigateHome={() => navigateTo('home')}
                />
              ) : (
                <AdminDashboard
                  onNavigateHome={() => navigateTo('home')}
                  onRefreshCatalog={loadProducts}
                />
              )
            )}
        </Suspense>
      </main>

      {/* 4. Footer - Hidden on unique login & signup pages */}
      {!isAuthView && (
        <Footer 
          onNavigate={navigateTo} 
          onSelectCategory={handleSelectCategory}
          noMarginTop={isAdminView || currentView === 'home'}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
