import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { NavigationDrawer } from './components/NavigationDrawer';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { CatalogPage } from './components/CatalogPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrdersPage } from './components/OrdersPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { OtpVerificationPage } from './components/OtpVerificationPage';
import { RequestQuotePage } from './components/RequestQuotePage';
import { InvoicePage } from './components/InvoicePage';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { Product, Order } from './types';
import { SEED_PRODUCTS } from './data/seedProducts';
import { UPLOADED_RENEWABLE_ENERGY_PRODUCTS } from './data/uploadedProducts';
import { UPLOADED_PAGA_PRODUCTS } from './data/uploadedPagaProducts';

const INITIAL_SEEDED_PRODUCTS: Product[] = [...UPLOADED_PAGA_PRODUCTS, ...UPLOADED_RENEWABLE_ENERGY_PRODUCTS, ...SEED_PRODUCTS];

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
      if (path === '/login') return 'login';
      if (path === '/signup') return 'signup';
      if (path === '/auth') return 'login';
    }
    return 'home';
  });

  const [pendingAuthEmail, setPendingAuthEmail] = useState<string>('');
  const [pendingAuthName, setPendingAuthName] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/product/')) {
      const prodId = decodeURIComponent(window.location.pathname.replace('/product/', '')).trim();
      return INITIAL_SEEDED_PRODUCTS.find(p => p.id === prodId || p.sku.toLowerCase() === prodId.toLowerCase()) || null;
    }
    return null;
  });
  const [quoteInitialProduct, setQuoteInitialProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);

  // Fetch products from server to sync updates seamlessly in the background
  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=5000');
      if (res.ok) {
        const data = await res.json();
        const productList: Product[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
          ? data.products
          : [];
        if (productList.length > 0) {
          setProducts(productList);
          if (window.location.pathname.startsWith('/product/')) {
            const prodId = decodeURIComponent(window.location.pathname.replace('/product/', '')).trim();
            const found = productList.find(p => p.id === prodId || p.sku.toLowerCase() === prodId.toLowerCase());
            if (found) {
              setSelectedProduct(found);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Background sync: using local catalog', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
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
        setCurrentView('catalog');
      } else if (path === '/quote' || path === '/request-quote') {
        setCurrentView('quote');
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
    setSelectedCategory(catName);
    setSelectedSubcategory(subcatName);
    setSearchQuery('');
    navigateTo('catalog');
  };

  // Search keyword submission
  const handleSearchSubmit = (query: string, categoryFilter?: string) => {
    setSearchQuery(query);
    setSelectedCategory(categoryFilter === 'All' ? undefined : categoryFilter);
    setSelectedSubcategory(undefined);
    navigateTo('catalog');
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
  const isAuthView = currentView === 'login' || currentView === 'signup' || currentView === 'otp-verify';

  return (
    <div className={`min-h-screen flex flex-col ${isAdminView ? 'bg-[#0f172a]' : isAuthView ? 'bg-[#f3f4f6]' : 'bg-[#eaeded]'} text-[#0F1111] font-sans antialiased w-full max-w-full overflow-x-hidden`}>
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
      <main className={`flex-1 ${isAdminView ? 'bg-[#0f172a]' : ''}`}>
        {catalogLoading && products.length === 0 ? (
          <div className="min-h-[400px] flex items-center justify-center text-sm text-gray-600 font-medium">
            Loading Spinel Distribution Enterprise Hardware Catalog...
          </div>
        ) : (
          <>
            {currentView === 'home' && (
              <HomePage
                products={products}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onNavigate={navigateTo}
                onRequestQuote={handleRequestQuote}
              />
            )}

            {currentView === 'catalog' && (
              <CatalogPage
                products={products}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                searchQuery={searchQuery}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onRequestQuote={handleRequestQuote}
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
          </>
        )}
      </main>

      {/* 4. Footer - Hidden on unique login & signup pages */}
      {!isAuthView && (
        <Footer 
          onNavigate={navigateTo} 
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
