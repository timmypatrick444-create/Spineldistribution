import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  ChevronDown, 
  Menu, 
  LogOut
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../data/categories';

export interface HeaderProps {
  onOpenDrawer: () => void;
  onSearch?: (query: string, category?: string) => void;
  onSearchSubmit?: (query: string, category?: string) => void;
  onSelectCategory?: (category: string) => void;
  currentCategory?: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDrawer,
  onSearch,
  onSearchSubmit,
  onSelectCategory,
  currentCategory,
  onNavigate
}) => {
  const { currency, setCurrency } = useCurrency();
  const { totalItemsCount } = useCart();
  const { user, customerLogout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'All');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Sync category state with prop changes
  useEffect(() => {
    if (currentCategory) {
      setSelectedCategory(currentCategory);
    } else {
      setSelectedCategory('All');
    }
  }, [currentCategory]);

  // Close open dropdown menus on Escape key or outside pointer tap/click (critical for mobile/tablet touchscreens)
  useEffect(() => {
    if (!currencyMenuOpen && !accountMenuOpen && !categoryDropdownOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setCurrencyMenuOpen(false);
        setAccountMenuOpen(false);
        setCategoryDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCurrencyMenuOpen(false);
        setAccountMenuOpen(false);
        setCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currencyMenuOpen, accountMenuOpen, categoryDropdownOpen]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const searchFn = onSearchSubmit || onSearch;
    if (typeof searchFn === 'function') {
      searchFn(searchQuery.trim(), selectedCategory === 'All' ? undefined : selectedCategory);
    }
  };

  const handleCategorySelectFromDropdown = (catName: string) => {
    setSelectedCategory(catName);
    setCategoryDropdownOpen(false);
    if (catName === 'All') {
      if (onSelectCategory) onSelectCategory('');
      onNavigate('catalog');
    } else {
      if (onSelectCategory) onSelectCategory(catName);
      onNavigate('category', catName);
    }
  };

  // Reusable action cluster
  const renderActionItems = (isMobile = false) => (
    <div className={`flex items-center ${isMobile ? 'gap-2 sm:gap-3' : 'gap-3 sm:gap-4'} shrink-0`}>
      
      {/* 1-CURRENCY CONVERTER: BACKGROUND #232F3E */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setCurrencyMenuOpen(prev => !prev);
            setAccountMenuOpen(false);
            setCategoryDropdownOpen(false);
          }}
          aria-expanded={currencyMenuOpen}
          aria-haspopup="listbox"
          aria-label={`Currency: ${currency}. Change currency`}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 min-h-[38px] py-1.5 sm:py-2 bg-[#232F3E] hover:bg-[#2c3b4e] border border-[#3a4756] rounded-md cursor-pointer transition-colors shadow-xs"
          title="Select Currency"
        >
          <img
            src={currency === 'USD' 
              ? "https://res.cloudinary.com/bmv4hvtk/image/upload/f_auto,q_auto,w_64/v1788620186/usa-flag.png" 
              : "https://res.cloudinary.com/bmv4hvtk/image/upload/f_auto,q_auto,w_64/v1788620186/nigeria-flag.png"}
            alt=""
            aria-hidden="true"
            width={20}
            height={14}
            decoding="async"
            className="w-4 h-3 sm:w-5 sm:h-3.5 object-cover rounded-xs border border-white/30 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <span className="text-[11px] sm:text-xs md:text-sm font-bold text-white uppercase tracking-wider">
            {currency}
          </span>
          <ChevronDown size={12} aria-hidden="true" className="text-gray-300" />
        </button>

        {currencyMenuOpen && (
          <div 
            role="listbox"
            aria-label="Currency Options"
            className="absolute right-0 mt-1 w-56 bg-white text-gray-800 rounded-md shadow-2xl border border-gray-200 py-2 z-50 text-xs sm:text-sm"
            onMouseLeave={() => setCurrencyMenuOpen(false)}
          >
            <div className="px-4 py-2 font-bold text-gray-600 border-b border-gray-100 uppercase tracking-wider text-[11px]">
              Currency Settings
            </div>
            <button
              type="button"
              role="option"
              aria-selected={currency === 'USD'}
              onClick={() => { setCurrency('USD'); setCurrencyMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${currency === 'USD' ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <img 
                  src="https://res.cloudinary.com/bmv4hvtk/image/upload/f_auto,q_auto,w_64/v1788620186/usa-flag.png" 
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={12}
                  decoding="async"
                  className="w-4 h-3 object-cover rounded-xs"
                  referrerPolicy="no-referrer"
                />
                <span>USD - US Dollar ($)</span>
              </div>
              {currency === 'USD' && <span aria-hidden="true" className="text-[#b12704] font-bold">✓</span>}
            </button>
            <button
              type="button"
              role="option"
              aria-selected={currency === 'NGN'}
              onClick={() => { setCurrency('NGN'); setCurrencyMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${currency === 'NGN' ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <img 
                  src="https://res.cloudinary.com/bmv4hvtk/image/upload/f_auto,q_auto,w_64/v1788620186/nigeria-flag.png" 
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={12}
                  decoding="async"
                  className="w-4 h-3 object-cover rounded-xs"
                  referrerPolicy="no-referrer"
                />
                <span>NGN - Nigerian Naira (₦)</span>
              </div>
              {currency === 'NGN' && <span aria-hidden="true" className="text-[#b12704] font-bold">✓</span>}
            </button>
          </div>
        )}
      </div>

      {/* 2-REQUEST QUOTE: HIGH-VISIBILITY ACTION BUTTON (Desktop/Tablet only) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => onNavigate('quote')}
          className="flex items-center justify-center px-3 sm:px-4 min-h-[40px] py-2 bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold text-xs sm:text-sm rounded-md transition-all shadow-sm cursor-pointer whitespace-nowrap"
          title="Request Official Corporate Quote / Proforma Invoice"
        >
          <span>Request Quote</span>
        </button>
      )}

      {/* 3-ACCOUNTS & LOGIN */}
      <div className="relative shrink-0">
        {isMobile ? (
          <button
            type="button"
            onClick={() => {
              if (user) {
                setAccountMenuOpen(prev => !prev);
                setCurrencyMenuOpen(false);
                setCategoryDropdownOpen(false);
              } else {
                onNavigate('login');
              }
            }}
            aria-expanded={user ? accountMenuOpen : undefined}
            aria-haspopup={user ? 'menu' : undefined}
            className="flex items-center justify-center w-10 h-10 bg-[#232F3E] hover:bg-[#2c3b4e] active:bg-[#1a232f] border border-[#3a4756] hover:border-[#febd69]/60 rounded-lg text-white transition-all cursor-pointer shadow-xs relative group"
            title={user ? `Signed in as ${user.fullName}` : "Sign in to Account"}
            aria-label={user ? `Account menu for ${user.fullName}` : "Sign in to User Account"}
          >
            <svg 
              aria-hidden="true"
              className="w-5 h-5 text-gray-100 group-hover:text-[#febd69] transition-colors" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {user && (
              <span aria-hidden="true" className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-[#131921] ring-1 ring-emerald-400"></span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (user) {
                setAccountMenuOpen(prev => !prev);
                setCurrencyMenuOpen(false);
                setCategoryDropdownOpen(false);
              } else {
                onNavigate('login');
              }
            }}
            aria-expanded={user ? accountMenuOpen : undefined}
            aria-haspopup={user ? 'menu' : undefined}
            className="flex flex-col justify-center px-2.5 py-1.5 rounded cursor-pointer border border-transparent hover:border-[#6b7280] transition-colors leading-tight text-left"
          >
            <span className="text-[10px] sm:text-xs text-gray-300">
              {user ? `Hello, ${user.fullName.split(' ')[0]}` : 'Hello, sign in'}
            </span>
            <span className="flex items-center gap-0.5 font-bold text-xs sm:text-sm text-white">
              <span>Account</span>
              <ChevronDown size={11} aria-hidden="true" className="text-gray-300" />
            </span>
          </button>
        )}

        {/* Account popup */}
        {accountMenuOpen && user && (
          <div 
            role="menu"
            aria-label="User Account Menu"
            className="absolute right-0 mt-1 w-64 bg-white text-gray-800 rounded-md shadow-2xl border border-gray-200 py-3 z-50 text-xs sm:text-sm"
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <div className="px-4 pb-2 border-b border-gray-100">
              <div className="font-bold text-gray-900 truncate">{user.fullName}</div>
              <div className="text-xs text-gray-600 truncate">{user.email}</div>
              {user.company && (
                <div className="text-[11px] text-blue-700 font-medium truncate mt-0.5">{user.company}</div>
              )}
            </div>

            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => { onNavigate('orders'); setAccountMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 cursor-pointer"
              >
                <span>Your Orders &amp; Invoices</span>
              </button>
              
              <button
                type="button"
                role="menuitem"
                onClick={() => { onNavigate('quote'); setAccountMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 cursor-pointer"
              >
                <span>Request B2B Quote</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 px-4">
              <button
                type="button"
                role="menuitem"
                onClick={() => { customerLogout(); setAccountMenuOpen(false); }}
                className="w-full text-left py-1.5 text-red-700 hover:text-red-800 font-medium flex items-center gap-2 cursor-pointer"
              >
                <LogOut size={14} aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4-ORDERS & INVOICES DIRECT LINK (Desktop only) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="hidden md:flex flex-col justify-center px-2.5 py-1.5 rounded cursor-pointer border border-transparent hover:border-[#6b7280] transition-colors leading-tight text-left"
          title="View Past Orders & Download Invoices"
        >
          <span className="text-[10px] sm:text-xs text-gray-300">Returns</span>
          <span className="font-bold text-xs sm:text-sm text-white">&amp; Orders</span>
        </button>
      )}

      {/* 5-SHOPPING CART: Icon always visible with badge, text hidden on mobile */}
      <button
        type="button"
        onClick={() => onNavigate('cart')}
        aria-label={`Shopping Cart, ${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'}`}
        className="flex items-center p-2 rounded-md cursor-pointer relative border border-transparent hover:border-[#6b7280] transition-colors shrink-0 mr-1"
        title="Shopping Cart"
      >
        <div className="relative shrink-0">
          <ShoppingCart size={24} aria-hidden="true" className="text-white" />
          <span aria-hidden="true" className="absolute -top-1.5 -right-2 bg-[#f08804] text-black font-black text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/20">
            {totalItemsCount}
          </span>
        </div>
        <span className="hidden md:inline font-bold text-sm sm:text-base text-white ml-2">
          Cart
        </span>
      </button>

    </div>
  );

  // Reusable search form
  const renderSearchForm = (className = "", inputId = "header-search-input") => (
    <form 
      role="search"
      aria-label="Product Catalog Search"
      onSubmit={handleSearchSubmit} 
      className={`relative flex items-center h-11 rounded-md bg-white text-black min-w-0 ${className}`}
    >
      {/* Category Dropdown inside Search */}
      <div className="relative h-full flex items-center shrink-0">
        <button
          type="button"
          aria-expanded={categoryDropdownOpen}
          aria-haspopup="listbox"
          aria-label={`Filter search by category: ${selectedCategory}`}
          onClick={() => {
            setCategoryDropdownOpen(prev => !prev);
            setCurrencyMenuOpen(false);
            setAccountMenuOpen(false);
          }}
          className="h-full bg-gray-100 hover:bg-gray-200 border-r border-gray-300 flex items-center gap-1.5 px-2.5 sm:px-3 cursor-pointer transition-colors text-xs sm:text-sm font-bold text-gray-800 rounded-l-md shrink-0"
        >
          <span className="max-w-[70px] sm:max-w-[120px] truncate">
            {selectedCategory === 'All' ? 'All' : selectedCategory}
          </span>
          <ChevronDown size={13} aria-hidden="true" className="text-gray-600 shrink-0" />
        </button>

        {/* Custom Category Dropdown */}
        {categoryDropdownOpen && (
          <div 
            role="listbox"
            aria-label="Search Categories"
            className="absolute left-0 top-full mt-1.5 w-64 sm:w-80 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-300 z-50 max-h-96 overflow-y-auto py-1.5 text-xs sm:text-sm"
            onMouseLeave={() => setCategoryDropdownOpen(false)}
          >
            <div className="px-3.5 py-1.5 font-bold text-gray-600 border-b border-gray-100 uppercase tracking-wider text-[11px]">
              Filter by Category
            </div>

            {/* All Option */}
            <button
              type="button"
              role="option"
              aria-selected={selectedCategory === 'All'}
              onClick={() => handleCategorySelectFromDropdown('All')}
              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer ${selectedCategory === 'All' ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-800'}`}
            >
              <span className="font-semibold">All Categories &amp; Products</span>
              {selectedCategory === 'All' && <span aria-hidden="true" className="text-[#b12704] font-bold">✓</span>}
            </button>

            {/* Distribution Categories */}
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                role="option"
                aria-selected={selectedCategory === cat.name}
                onClick={() => handleCategorySelectFromDropdown(cat.name)}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer ${selectedCategory === cat.name ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-700'}`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                {selectedCategory === cat.name && <span aria-hidden="true" className="text-[#b12704] font-bold">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Input */}
      <label htmlFor={inputId} className="sr-only">Search enterprise hardware, enclosures, cables, and cameras</label>
      <input
        id={inputId}
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search cameras, enclosures, cables, access control..."
        className="flex-1 min-w-0 h-full px-2.5 sm:px-3.5 text-sm text-gray-900 bg-white placeholder-gray-600"
      />

      {/* Submit Yellow Button */}
      <button
        type="submit"
        aria-label="Submit search"
        onClick={handleSearchSubmit}
        className="bg-[#febd69] hover:bg-[#f3a847] h-full px-4 sm:px-5 flex items-center justify-center transition-colors cursor-pointer text-[#131921] rounded-r-md shrink-0"
      >
        <Search size={19} aria-hidden="true" className="stroke-[2.5]" />
      </button>
    </form>
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-40 w-full max-w-full flex flex-col font-sans select-none shadow-md">
      
      {/* Top Primary Navbar */}
      <div className="bg-[#131921] text-white w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-4">
        
        {/* DESKTOP LAYOUT (lg and up) */}
        <div className="hidden lg:flex items-center justify-between gap-6 xl:gap-8 w-full">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3.5 p-1 rounded cursor-pointer shrink-0 transition-opacity hover:opacity-95"
            title="SPINEL DISTRIBUTION - Homepage"
            aria-label="SPINEL DISTRIBUTION - Return to Homepage"
          >
            <img 
              src="https://res.cloudinary.com/bmv4hvtk/image/upload/f_auto,q_auto:good,w_360,c_limit/v1794363298/Spinel_White_Long_Logo_With_Smile.png"
              alt="SPINEL DISTRIBUTION"
              width={200}
              height={44}
              fetchPriority="high"
              decoding="async"
              className="h-10 xl:h-11 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* Search bar in center */}
          <div className="flex-1 max-w-3xl xl:max-w-5xl mx-3 min-w-0">
            {renderSearchForm("w-full shadow-xs", "desktop-search-input")}
          </div>

          {/* Right Action Items */}
          {renderActionItems(false)}
        </div>

        {/* MOBILE & TABLET LAYOUT (< lg) */}
        <div className="flex lg:hidden flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4 w-full min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 sm:gap-2.5 p-0.5 rounded cursor-pointer shrink-0"
              title="SPINEL DISTRIBUTION - Homepage"
              aria-label="SPINEL DISTRIBUTION - Return to Homepage"
            >
              <img 
                src="https://res.cloudinary.com/bmv4hvtk/image/upload/f_auto,q_auto:good,w_360,c_limit/v1794363298/Spinel_White_Long_Logo_With_Smile.png"
                alt="SPINEL DISTRIBUTION"
                width={170}
                height={36}
                fetchPriority="high"
                decoding="async"
                className="h-6.5 sm:h-8 md:h-9 w-auto max-w-[155px] sm:max-w-[210px] md:max-w-[250px] object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            </button>

            {/* Action buttons on mobile/tablet */}
            {renderActionItems(true)}
          </div>

          {/* Row 2: Full-width responsive search bar */}
          <div className="w-full mt-0.5">
            {renderSearchForm("w-full shadow-sm", "mobile-search-input")}
          </div>
        </div>

      </div>

      {/* Sub Navbar: Category Navigation Landmark */}
      <nav
        aria-label="Category shortcuts"
        className="bg-[#232f3e] text-white w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-2.5 flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none shadow-sm"
      >
        {/* All Products Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open All Products Navigation Menu"
          className="flex items-center gap-1.5 min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer font-bold text-sm text-white shrink-0"
        >
          <Menu size={18} aria-hidden="true" />
          <span>All Products</span>
        </button>

        {/* Direct category shortcuts */}
        <button
          type="button"
          onClick={() => onNavigate('category', 'Enclosures & Housings')}
          className="min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-[#febd69] font-bold hover:text-white shrink-0"
        >
          Enclosures &amp; Housings
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Hybrid Composite Cables')}
          className="min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-[#febd69] font-bold hover:text-white flex items-center gap-1 shrink-0"
        >
          <span>Hybrid Composite Cables</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Fiber Outdoor Cables')}
          className="min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-100 hover:text-white shrink-0"
        >
          Fiber Outdoor Cables
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Public Address (PAGA) System')}
          className="min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-100 hover:text-white shrink-0"
        >
          Public Address (PAGA)
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Video Surveillance & Cameras')}
          className="min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-100 hover:text-white shrink-0"
        >
          Video Surveillance
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Access Control & Door Security')}
          className="min-h-[36px] py-1 px-2.5 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-100 hover:text-white shrink-0"
        >
          Access Control
        </button>
      </nav>
    </header>
  );
};
