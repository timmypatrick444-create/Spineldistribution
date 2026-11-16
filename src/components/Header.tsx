import React, { useState, useEffect } from 'react';
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

  // Sync category state with prop changes
  useEffect(() => {
    if (currentCategory) {
      setSelectedCategory(currentCategory);
    } else {
      setSelectedCategory('All');
    }
  }, [currentCategory]);

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
          onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-[#232F3E] hover:bg-[#2c3b4e] border border-[#3a4756] rounded-md cursor-pointer transition-colors shadow-xs"
          title="Select Currency"
        >
          <img
            src={currency === 'USD' 
              ? "https://res.cloudinary.com/bmv4hvtk/image/upload/v1788620186/usa-flag.png" 
              : "https://res.cloudinary.com/bmv4hvtk/image/upload/v1788620186/nigeria-flag.png"}
            alt={currency === 'USD' ? "USA Flag" : "Nigeria Flag"}
            className="w-4 h-3 sm:w-5 sm:h-3.5 object-cover rounded-xs border border-white/30 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <span className="text-[11px] sm:text-xs md:text-sm font-bold text-white uppercase tracking-wider">
            {currency}
          </span>
          <ChevronDown size={12} className="text-gray-300" />
        </button>

        {currencyMenuOpen && (
          <div 
            className="absolute right-0 mt-1 w-52 bg-white text-gray-800 rounded-md shadow-2xl border border-gray-200 py-2 z-50 text-xs sm:text-sm"
            onMouseLeave={() => setCurrencyMenuOpen(false)}
          >
            <div className="px-4 py-2 font-bold text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px]">
              Currency Settings
            </div>
            <button
              type="button"
              onClick={() => { setCurrency('USD'); setCurrencyMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${currency === 'USD' ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <img 
                  src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1788620186/usa-flag.png" 
                  alt="USA" 
                  className="w-4 h-3 object-cover rounded-xs"
                  referrerPolicy="no-referrer"
                />
                <span>USD - US Dollar ($)</span>
              </div>
              {currency === 'USD' && <span className="text-[#b12704] font-bold">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => { setCurrency('NGN'); setCurrencyMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${currency === 'NGN' ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <img 
                  src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1788620186/nigeria-flag.png" 
                  alt="Nigeria" 
                  className="w-4 h-3 object-cover rounded-xs"
                  referrerPolicy="no-referrer"
                />
                <span>NGN - Nigerian Naira (₦)</span>
              </div>
              {currency === 'NGN' && <span className="text-[#b12704] font-bold">✓</span>}
            </button>
          </div>
        )}
      </div>

      {/* 2-REQUEST QUOTE: HIGH-VISIBILITY ACTION BUTTON (Desktop/Tablet only, removed on mobile header bar as requested) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => onNavigate('quote')}
          className="flex items-center justify-center px-3 sm:px-4 py-2 bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold text-xs sm:text-sm rounded-md transition-all shadow-sm cursor-pointer whitespace-nowrap"
          title="Request Official Corporate Quote / Proforma Invoice"
        >
          <span>Request Quote</span>
        </button>
      )}

      {/* 3-ACCOUNTS & LOGIN: Clean mobile icon button without text, no icon on desktop view */}
      <div className="relative shrink-0">
        {isMobile ? (
          <button
            type="button"
            onClick={() => {
              if (user) {
                setAccountMenuOpen(!accountMenuOpen);
              } else {
                onNavigate('login');
              }
            }}
            className="flex items-center justify-center w-9 h-9 bg-[#232F3E] hover:bg-[#2c3b4e] active:bg-[#1a232f] border border-[#3a4756] hover:border-[#febd69]/60 rounded-lg text-white transition-all cursor-pointer shadow-xs relative group"
            title={user ? `Signed in as ${user.fullName}` : "Account"}
            aria-label="User Account"
          >
            <svg 
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
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-[#131921] ring-1 ring-emerald-400"></span>
            )}
          </button>
        ) : (
          <div 
            onClick={() => {
              if (user) {
                setAccountMenuOpen(!accountMenuOpen);
              } else {
                onNavigate('login');
              }
            }}
            className="flex flex-col justify-center px-2.5 py-1.5 rounded cursor-pointer border border-transparent hover:border-[#6b7280] transition-colors leading-tight"
          >
            <span className="text-[10px] sm:text-xs text-gray-300">
              {user ? `Hello, ${user.fullName.split(' ')[0]}` : 'Hello, sign in'}
            </span>
            <div className="flex items-center gap-0.5 font-bold text-xs sm:text-sm text-white">
              <span>Account</span>
              <ChevronDown size={11} className="text-gray-300" />
            </div>
          </div>
        )}

        {/* Account popup */}
        {accountMenuOpen && user && (
          <div 
            className="absolute right-0 mt-1 w-64 bg-white text-gray-800 rounded-md shadow-2xl border border-gray-200 py-3 z-50 text-xs sm:text-sm"
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <div className="px-4 pb-2 border-b border-gray-100">
              <div className="font-bold text-gray-900 truncate">{user.fullName}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
              {user.company && (
                <div className="text-[11px] text-blue-600 font-medium truncate mt-0.5">{user.company}</div>
              )}
            </div>

            <div className="py-1">
              <button
                type="button"
                onClick={() => { onNavigate('orders'); setAccountMenuOpen(false); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between text-gray-700"
              >
                <span>Your Orders &amp; Invoices</span>
              </button>
              
              <button
                type="button"
                onClick={() => { onNavigate('quote'); setAccountMenuOpen(false); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between text-gray-700"
              >
                <span>Request B2B Quote</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 px-4">
              <button
                type="button"
                onClick={() => { customerLogout(); setAccountMenuOpen(false); }}
                className="w-full text-left py-1 text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4-ORDERS & INVOICES DIRECT LINK (Desktop only) */}
      {!isMobile && (
        <div 
          onClick={() => onNavigate('orders')}
          className="hidden md:flex flex-col justify-center px-2.5 py-1.5 rounded cursor-pointer border border-transparent hover:border-[#6b7280] transition-colors leading-tight"
          title="View Past Orders &amp; Download Invoices"
        >
          <span className="text-[10px] sm:text-xs text-gray-300">Returns</span>
          <span className="font-bold text-xs sm:text-sm text-white">&amp; Orders</span>
        </div>
      )}

      {/* 5-SHOPPING CART: Icon always visible with badge, text strictly hidden on mobile */}
      <div 
        onClick={() => onNavigate('cart')}
        className="flex items-center p-1.5 sm:p-2 rounded-md cursor-pointer relative border border-transparent hover:border-[#6b7280] transition-colors shrink-0 mr-1"
        title="Shopping Cart"
      >
        <div className="relative shrink-0">
          <ShoppingCart size={24} className="text-white" />
          <span className="absolute -top-1.5 -right-2 bg-[#f08804] text-black font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/20">
            {totalItemsCount}
          </span>
        </div>
        <span className="hidden md:inline font-bold text-sm sm:text-base text-white ml-2">
          Cart
        </span>
      </div>

    </div>
  );

  // Reusable search form
  const renderSearchForm = (className = "") => (
    <form 
      onSubmit={handleSearchSubmit} 
      className={`relative flex items-center h-10 sm:h-11 rounded-md bg-white text-black min-w-0 ${className}`}
    >
      {/* Category Dropdown inside Search */}
      <div className="relative h-full flex items-center shrink-0">
        <button
          type="button"
          onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
          className="h-full bg-gray-100 hover:bg-gray-200 border-r border-gray-300 flex items-center gap-1.5 px-2.5 sm:px-3 cursor-pointer transition-colors text-xs sm:text-sm font-bold text-gray-800 rounded-l-md shrink-0"
        >
          <span className="max-w-[70px] sm:max-w-[120px] truncate">
            {selectedCategory === 'All' ? 'All' : selectedCategory}
          </span>
          <ChevronDown size={13} className="text-gray-600 shrink-0" />
        </button>

        {/* Custom Category Dropdown */}
        {categoryDropdownOpen && (
          <div 
            className="absolute left-0 top-full mt-1.5 w-64 sm:w-80 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-300 z-50 max-h-96 overflow-y-auto py-1.5 text-xs sm:text-sm"
            onMouseLeave={() => setCategoryDropdownOpen(false)}
          >
            <div className="px-3.5 py-1.5 font-bold text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[11px]">
              Filter by Category
            </div>

            {/* All Option */}
            <button
              type="button"
              onClick={() => handleCategorySelectFromDropdown('All')}
              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-100 transition-colors ${selectedCategory === 'All' ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-800'}`}
            >
              <span className="font-semibold">All Categories &amp; Products</span>
              {selectedCategory === 'All' && <span className="text-[#b12704] font-bold">✓</span>}
            </button>

            {/* 16 Distribution Categories */}
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelectFromDropdown(cat.name)}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors ${selectedCategory === cat.name ? 'font-bold text-[#b12704] bg-amber-50' : 'text-gray-700'}`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                {selectedCategory === cat.name && <span className="text-[#b12704] font-bold">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search cameras, NVRs, solar inverters, access control..."
        className="flex-1 min-w-0 h-full px-2.5 sm:px-3.5 text-xs sm:text-sm text-gray-900 outline-none bg-white placeholder-gray-500"
      />

      {/* Submit Yellow Button */}
      <button
        type="submit"
        aria-label="Search"
        onClick={handleSearchSubmit}
        className="bg-[#febd69] hover:bg-[#f3a847] h-full px-4 sm:px-5 flex items-center justify-center transition-colors cursor-pointer text-[#131921] rounded-r-md shrink-0"
      >
        <Search size={19} className="stroke-[2.5]" />
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 w-full max-w-full flex flex-col font-sans select-none shadow-md">
      
      {/* Top Primary Navbar with generous breathing room padding */}
      <div className="bg-[#131921] text-white w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3.5 sm:py-4.5">
        
        {/* DESKTOP LAYOUT (lg and up): Brand on Left, Search in Middle, Actions on Right */}
        <div className="hidden lg:flex items-center justify-between gap-6 xl:gap-8 w-full">
          {/* Brand Logo - Official SPINEL DISTRIBUTION */}
          <div 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3.5 p-1 rounded cursor-pointer shrink-0 transition-opacity"
            title="SPINEL DISTRIBUTION - Homepage"
          >
            <img 
              src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1788619290/Spinel_Distribution.jpg"
              alt="SPINEL DISTRIBUTION"
              className="h-11 w-auto min-w-[48px] object-contain rounded bg-white p-1 shadow-md"
              referrerPolicy="no-referrer"
            />
            <span className="font-extrabold tracking-tight text-white text-base xl:text-lg leading-tight uppercase font-sans whitespace-nowrap">
              SPINEL DISTRIBUTION
            </span>
          </div>

          {/* Search bar in center */}
          <div className="flex-1 max-w-3xl xl:max-w-5xl mx-3 min-w-0">
            {renderSearchForm("w-full shadow-xs")}
          </div>

          {/* Right Action Items */}
          {renderActionItems(false)}
        </div>

        {/* MOBILE & TABLET LAYOUT (< lg): Generous padding and zero overflow */}
        <div className="flex lg:hidden flex-col gap-3 w-full">
          {/* Row 1: Logo on Left, Action Items on Right */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-4 w-full min-w-0">
            <div 
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 sm:gap-2.5 p-0.5 rounded cursor-pointer shrink-0"
              title="SPINEL DISTRIBUTION - Homepage"
            >
              <img 
                src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1788619290/Spinel_Distribution.jpg"
                alt="SPINEL DISTRIBUTION"
                className="h-8.5 sm:h-9 w-auto min-w-[34px] sm:min-w-[36px] object-contain rounded bg-white p-0.5 sm:p-1 shadow-md"
                referrerPolicy="no-referrer"
              />
              {/* Text logo shown on tablet (sm & md) but hidden on mobile (< sm) */}
              <span className="hidden sm:inline-block font-extrabold tracking-tight text-white text-sm md:text-base leading-tight uppercase font-sans whitespace-nowrap">
                SPINEL DISTRIBUTION
              </span>
            </div>

            {/* Action buttons on mobile/tablet */}
            {renderActionItems(true)}
          </div>

          {/* Row 2: Full-width responsive search bar */}
          <div className="w-full mt-0.5">
            {renderSearchForm("w-full shadow-sm")}
          </div>
        </div>

      </div>

      {/* Sub Navbar with matching generous padding */}
      <div className="bg-[#232f3e] text-white w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-2.5 sm:py-3 flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none shadow-sm">
        
        {/* All Products Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex items-center gap-1.5 py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer font-bold text-sm text-white shrink-0"
        >
          <Menu size={18} />
          <span>All Products</span>
        </button>

        {/* Direct category shortcuts */}
        <button
          type="button"
          onClick={() => onNavigate('category', 'Video Surveillance & Cameras')}
          className="py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-200 hover:text-white"
        >
          Video Surveillance
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Video Management & Recording')}
          className="py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-200 hover:text-white"
        >
          NVR &amp; AI Analytics
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Access Control & Door Security')}
          className="py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-200 hover:text-white"
        >
          Access Control
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Networking & Connectivity')}
          className="py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-200 hover:text-white"
        >
          Networking &amp; PoE
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Renewable Energy')}
          className="py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-[#febd69] font-bold hover:text-white flex items-center gap-1"
        >
          <span>Renewable Solar &amp; Inverters</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('category', 'Storage & Data Infrastructure')}
          className="py-1 px-2 hover:outline hover:outline-1 hover:outline-white rounded cursor-pointer text-gray-200 hover:text-white"
        >
          Surveillance Hard Drives
        </button>

      </div>
    </header>
  );
};
