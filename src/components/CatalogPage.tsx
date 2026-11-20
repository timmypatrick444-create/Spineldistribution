import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Star, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  X 
} from 'lucide-react';
import { Product } from '../types';
import { CATEGORIES } from '../data/categories';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { optimizeImageUrl, handleProductImageError } from '../utils/imageOptimizer';

interface CatalogPageProps {
  products: Product[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  searchQuery?: string;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categoryName?: string, subcategoryName?: string) => void;
  onRequestQuote?: (product: Product) => void;
  onRefreshCatalog?: () => void;
}

const ITEMS_PER_PAGE = 50;

export const CatalogPage: React.FC<CatalogPageProps> = ({
  products,
  selectedCategory,
  selectedSubcategory,
  searchQuery,
  onSelectProduct,
  onSelectCategory,
  onRequestQuote
}) => {
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();

  // Local Filter States
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const closeFilterBtnRef = useRef<HTMLButtonElement>(null);

  // Pagination state: 50 items per page
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Safe product list
  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  // Reset pagination to page 1 whenever search, category, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, searchQuery, selectedBrand, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  // Focus management and Escape key handling for mobile filter drawer
  useEffect(() => {
    if (!mobileFilterOpen) return;
    closeFilterBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileFilterOpen]);

  // Generate stable random weights once per catalog load so default ordering stays varied without re-sorting thrash
  const randomWeights = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of safeProducts) {
      map.set(p.id, Math.random());
    }
    return map;
  }, [safeProducts]);

  // Derive unique brands
  const brands = useMemo(() => {
    const list = Array.from(new Set(safeProducts.map(p => p.brand).filter(Boolean)));
    return ['All', ...list];
  }, [safeProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const hasSearch = Boolean(searchQuery && searchQuery.trim());
    const q = hasSearch ? searchQuery!.toLowerCase().trim() : '';
    const words = hasSearch ? q.split(/\s+/).filter(Boolean) : [];
    const selLower = selectedCategory && selectedCategory !== 'All' ? selectedCategory.toLowerCase().trim() : '';
    const selSubLower = selectedSubcategory ? selectedSubcategory.toLowerCase().trim() : '';
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);

    return safeProducts.filter(p => {
      // Category Matching
      if (selLower) {
        const pCatLower = (p.category || '').toLowerCase().trim();
        const pSubLower = (p.subcategory || '').toLowerCase().trim();
        const isCatMatch =
          pCatLower === selLower ||
          pCatLower.includes(selLower) ||
          selLower.includes(pCatLower) ||
          pSubLower === selLower ||
          pSubLower.includes(selLower);
        if (!isCatMatch) return false;
      }
      // Subcategory
      if (selSubLower && (p.subcategory || '').toLowerCase() !== selSubLower) {
        return false;
      }
      // Search
      if (hasSearch) {
        const searchableText = `${p.name} ${p.sku} ${p.brand} ${p.category} ${p.subcategory || ''} ${p.description || ''} ${Object.values(p.specs || {}).join(' ')}`.toLowerCase();
        const matches = searchableText.includes(q) || words.every(w => searchableText.includes(w));
        if (!matches) return false;
      }
      // Brand
      if (selectedBrand !== 'All' && p.brand !== selectedBrand) {
        return false;
      }
      // Price
      if (!isNaN(min) && p.priceUSD < min) return false;
      if (!isNaN(max) && p.priceUSD > max) return false;

      // Rating
      if (minRating > 0 && p.rating < minRating) return false;

      // In Stock
      if (inStockOnly && p.stock <= 0) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceUSD - b.priceUSD;
      if (sortBy === 'price_desc') return b.priceUSD - a.priceUSD;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const weightA = randomWeights.get(a.id) ?? 0;
      const weightB = randomWeights.get(b.id) ?? 0;
      return weightA - weightB;
    });
  }, [
    safeProducts,
    randomWeights,
    selectedCategory,
    selectedSubcategory,
    searchQuery,
    selectedBrand,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sortBy
  ]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  // Current page items (50 per page)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setSelectedBrand('All');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    onSelectCategory(undefined, undefined);
  };

  const catalogHeading = searchQuery
    ? `Search results for "${searchQuery}"`
    : selectedSubcategory
      ? `${selectedCategory ? `${selectedCategory} - ` : ''}${selectedSubcategory}`
      : selectedCategory || 'All Hardware & Security Products';

  return (
    // Standardized 20px gutter matching all pages: w-full px-[20px]
    <div className="w-full px-[20px] py-6 font-sans">
      <h1 className="sr-only">{catalogHeading}</h1>

      {/* Breadcrumbs & Results Top Bar */}
      <div className="bg-white p-3 rounded-md border border-gray-200 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700 shadow-xs">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap min-w-0">
          <button
            type="button"
            onClick={() => onSelectCategory(undefined, undefined)}
            className="text-blue-700 hover:underline cursor-pointer font-medium py-1"
          >
            All Categories
          </button>
          {selectedCategory && (
            <>
              <ChevronRight size={12} className="text-gray-400 shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onSelectCategory(selectedCategory, undefined)}
                aria-current={!selectedSubcategory ? 'page' : undefined}
                className={`cursor-pointer py-1 ${!selectedSubcategory ? 'font-bold text-gray-900' : 'text-blue-700 hover:underline'}`}
              >
                {selectedCategory}
              </button>
            </>
          )}
          {selectedSubcategory && (
            <>
              <ChevronRight size={12} className="text-gray-400 shrink-0" aria-hidden="true" />
              <span aria-current="page" className="font-bold text-gray-900 py-1">{selectedSubcategory}</span>
            </>
          )}
          {searchQuery && (
            <span className="ml-2 font-medium text-gray-900">
              for <span className="text-[#c45500]">"{searchQuery}"</span>
            </span>
          )}
          
          <span className="text-gray-400 ml-2" aria-hidden="true">|</span>
          <span className="text-gray-800 font-semibold">
            {filteredProducts.length} results
          </span>
          {filteredProducts.length > 0 && (
            <span className="text-gray-600 text-[11px]">
              (Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)})
            </span>
          )}
        </nav>

        {/* Sort Dropdown & Mobile Filter */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <label htmlFor="sort-select" className="text-gray-700 ml-1 font-medium">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 min-h-[38px] text-xs text-gray-900 font-medium outline-none focus:border-[#e77600] cursor-pointer"
          >
            <option value="featured">Featured (All Categories)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Avg. Customer Review</option>
            <option value="newest">Newest Arrivals</option>
          </select>

          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-expanded={mobileFilterOpen}
            aria-controls="mobile-catalog-filters"
            className="md:hidden flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-1.5 min-h-[38px] rounded border border-gray-300 cursor-pointer font-medium"
          >
            <Filter size={14} aria-hidden="true" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        
        {/* LEFT SIDEBAR FILTERS (Desktop & Landscape Tablet) */}
        <aside aria-label="Product Filters" className="hidden md:block w-60 xl:w-64 shrink-0 space-y-5 text-sm">
          
          {/* Active Filter Clear */}
          {(selectedCategory || selectedSubcategory || selectedBrand !== 'All' || minRating > 0 || inStockOnly || minPrice || maxPrice) && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium">Filters Applied</span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-blue-700 hover:underline font-bold cursor-pointer py-0.5"
              >
                Clear all
              </button>
            </div>
          )}

          {/* 1. Department / Category Filter */}
          <div>
            <h2 className="font-bold text-gray-900 text-sm mb-2">Department</h2>
            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => onSelectCategory(undefined, undefined)}
                aria-pressed={!selectedCategory}
                className={`block w-full text-left py-0.5 cursor-pointer hover:text-[#c45500] ${!selectedCategory ? 'font-bold text-[#c45500]' : 'text-gray-700'}`}
              >
                Any Category
              </button>

              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <div key={cat.id} className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectCategory(cat.name, undefined)}
                      aria-pressed={isSelected && !selectedSubcategory}
                      className={`w-full text-left py-0.5 cursor-pointer hover:text-[#c45500] flex items-center justify-between ${isSelected ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                    >
                      <span className="line-clamp-1">{cat.name}</span>
                    </button>

                    {/* Show subcategories when category is selected */}
                    {isSelected && (
                      <div className="ml-3 pl-2 border-l-2 border-gray-200 mt-1 space-y-1">
                        {cat.subcategories.map(sub => {
                          const isSubSelected = selectedSubcategory === sub;
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => onSelectCategory(cat.name, sub)}
                              aria-pressed={isSubSelected}
                              className={`block w-full text-left py-0.5 cursor-pointer text-[11px] hover:text-[#c45500] ${isSubSelected ? 'font-bold text-[#c45500]' : 'text-gray-600'}`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Customer Reviews Filter */}
          <div className="border-t border-gray-200 pt-4">
            <h2 className="font-bold text-gray-900 text-sm mb-2">Customer Reviews</h2>
            <div className="space-y-1.5 text-xs">
              {[4, 3, 2].map(stars => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                  aria-pressed={minRating === stars}
                  aria-label={`${stars} stars and up`}
                  className={`w-full flex items-center gap-1.5 py-0.5 cursor-pointer hover:text-[#c45500] ${minRating === stars ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                >
                  <div className="flex text-amber-500" aria-hidden="true">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < stars ? 'fill-amber-500' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span>&amp; Up</span>
                  {minRating === stars && <span className="text-xs text-blue-700 ml-auto" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Brands Filter */}
          <div className="border-t border-gray-200 pt-4">
            <h2 className="font-bold text-gray-900 text-sm mb-2">Brand</h2>
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
              {brands.map(brand => (
                <label key={brand} className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-gray-900 text-gray-700">
                  <input
                    type="radio"
                    name="brand-filter"
                    checked={selectedBrand === brand}
                    onChange={() => setSelectedBrand(brand)}
                    className="text-[#e77600] focus:ring-[#e77600]"
                  />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Price Filter */}
          <div className="border-t border-gray-200 pt-4">
            <h2 className="font-bold text-gray-900 text-sm mb-2">Price (USD)</h2>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                aria-label="Minimum price in USD"
                placeholder="$ Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-20 border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-[#e77600]"
              />
              <span className="text-gray-600">to</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                aria-label="Maximum price in USD"
                placeholder="$ Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-20 border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-[#e77600]"
              />
            </div>
          </div>

          {/* 5. In Stock Filter */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 py-1 cursor-pointer text-xs text-gray-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-[#e77600] focus:ring-[#e77600]"
              />
              <span>In Stock Only</span>
            </label>
          </div>

        </aside>

        {/* PRODUCT LISTING GRID: 5 per row (2xl:grid-cols-5), 50 per page */}
        <section aria-label="Product catalog results" className="flex-1 min-w-0">
          {paginatedProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded border border-gray-200 shadow-xs">
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                No matching hardware products found
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Try resetting your filters or search keywords.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="bg-[#ffd814] hover:bg-[#f7ca00] text-black font-semibold text-xs py-2.5 px-5 rounded-full border border-[#fcd200] cursor-pointer min-h-[40px]"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {/* Product Grid: 5 columns per row on large desktop (2xl:grid-cols-5) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {paginatedProducts.map((prod, idx) => (
                  <article
                    key={`${prod.id || 'prod'}-${prod.sku || idx}-${idx}`}
                    className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between hover:shadow-md transition-shadow min-w-0"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProduct(prod)}
                      className="cursor-pointer text-left w-full group block"
                    >
                      {/* Image */}
                      <div className="w-full h-44 sm:h-48 bg-gray-50 rounded flex items-center justify-center p-2.5 mb-2.5">
                        <img
                          src={optimizeImageUrl(prod.images[0], 380)}
                          alt={prod.name}
                          width={200}
                          height={180}
                          loading={idx < 5 ? 'eager' : 'lazy'}
                          fetchPriority={idx < 5 ? 'high' : 'low'}
                          decoding="async"
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleProductImageError(e, prod.images[0])}
                        />
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-1.5 min-h-[22px] flex-wrap">
                        {prod.isBestSeller && (
                          <span className="bg-[#e67a00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs">
                            #1 Best Seller
                          </span>
                        )}
                        {prod.isChoice && (
                          <span className="bg-[#131921] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-xs flex items-center gap-1">
                            Spinel&apos;s <span className="text-[#febd69]">Choice</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#c45500] line-clamp-2 leading-snug mb-1">
                        {prod.name}
                      </h2>

                      {/* Subcategory & Brand */}
                      <div className="text-[11px] text-gray-600 mb-1.5 truncate">
                        {prod.brand} • <span className="text-gray-800">{prod.subcategory}</span>
                      </div>

                      {/* Rating & Reviews */}
                      <div
                        className="flex items-center gap-1 mb-2"
                        aria-label={`Rated ${prod.rating} out of 5 stars from ${prod.reviewCount} reviews`}
                      >
                        <div className="flex text-amber-500" aria-hidden="true">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={13}
                              className={i < Math.floor(prod.rating) ? 'fill-amber-500' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-blue-700 font-medium">
                          {prod.reviewCount}
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="mb-2">
                        {prod.priceUSD && prod.priceUSD > 0 ? (
                          <>
                            <div className="text-base sm:text-lg font-bold text-gray-900 flex items-baseline gap-1 flex-wrap">
                              <span>{formatPrice(prod.priceUSD)}</span>
                            </div>

                            <div className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5">
                              {prod.stock > 10 ? (
                                <span className="text-green-700 font-medium">In Stock</span>
                              ) : prod.stock > 0 ? (
                                <span className="text-amber-800 font-medium">Only {prod.stock} left</span>
                              ) : (
                                <span className="text-red-700 font-medium">Temporarily out of stock</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="py-0.5">
                            <span className="inline-block bg-amber-100 text-amber-950 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-300">
                              Price on Request
                            </span>
                            <div className="text-[10px] text-gray-600 mt-0.5">
                              Enterprise RFQ Required
                            </div>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Add to Cart or Request Quote Button */}
                    {prod.priceUSD && prod.priceUSD > 0 ? (
                      <button
                        type="button"
                        onClick={() => addToCart(prod, 1)}
                        className="w-full mt-2 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-semibold text-xs py-2 px-3 min-h-[38px] rounded-full border border-[#fcd200] shadow-xs cursor-pointer transition-colors"
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequestQuote) {
                            onRequestQuote(prod);
                          }
                        }}
                        className="w-full mt-2 bg-[#f0c14b] hover:bg-[#e2b33c] active:bg-[#d8a32a] text-gray-950 font-bold text-xs py-2 px-3 min-h-[38px] rounded-full border border-[#a88734] shadow-xs cursor-pointer transition-colors"
                      >
                        Request Quote
                      </button>
                    )}
                  </article>
                ))}
              </div>

              {/* PAGINATION: PREVIOUS, NEXT & PAGE BUTTONS (50 PER PAGE) */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> of{' '}
                  <span className="font-bold text-gray-900">{filteredProducts.length}</span> products (Page {currentPage} of {totalPages})
                </div>

                <nav aria-label="Pagination" className="flex items-center gap-2 flex-wrap justify-center">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className={`flex items-center gap-1 px-3 py-2 min-h-[40px] rounded text-xs sm:text-sm font-semibold border transition-all ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 shadow-xs cursor-pointer'
                    }`}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="px-1 text-gray-500 text-xs" aria-hidden="true">...</span>}
                            <button
                              type="button"
                              onClick={() => handlePageChange(page)}
                              aria-label={`Page ${page}`}
                              aria-current={currentPage === page ? 'page' : undefined}
                              className={`min-w-[40px] min-h-[40px] px-2.5 rounded text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                                currentPage === page
                                  ? 'bg-[#131921] text-white shadow-xs'
                                  : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    className={`flex items-center gap-1 px-3 py-2 min-h-[40px] rounded text-xs sm:text-sm font-semibold border transition-all ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 shadow-xs cursor-pointer'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </>
          )}
        </section>

      </div>

      {/* Mobile & Portrait Tablet Filter Drawer */}
      {mobileFilterOpen && (
        <div
          id="mobile-catalog-filters"
          role="dialog"
          aria-modal="true"
          aria-label="Product Filters"
          className="fixed inset-0 z-50 flex"
        >
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileFilterOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto z-10 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="font-bold text-base text-gray-900">Filters</h2>
              <button
                ref={closeFilterBtnRef}
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                className="cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center rounded hover:bg-gray-100 text-gray-700"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Mobile Category List */}
            <div>
              <h3 className="font-bold mb-2 text-sm text-gray-900">Category</h3>
              <button
                type="button"
                onClick={() => { onSelectCategory(undefined, undefined); setMobileFilterOpen(false); }}
                className={`block w-full text-left py-2 cursor-pointer font-medium ${!selectedCategory ? 'text-[#c45500] font-bold' : 'text-blue-700'}`}
              >
                All Categories
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onSelectCategory(c.name); setMobileFilterOpen(false); }}
                  className={`block w-full text-left py-2 hover:text-blue-700 cursor-pointer ${selectedCategory === c.name ? 'font-bold text-gray-900' : 'text-gray-800'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Mobile Brand Filter */}
            <div className="border-t border-gray-200 pt-3">
              <label htmlFor="mobile-brand-filter" className="block font-bold mb-2 text-sm text-gray-900">Brand</label>
              <select
                id="mobile-brand-filter"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-2 min-h-[38px] text-xs text-gray-900 bg-gray-50"
              >
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Mobile Price Filter */}
            <div className="border-t border-gray-200 pt-3">
              <h3 className="font-bold mb-2 text-sm text-gray-900">Price (USD)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  aria-label="Minimum price in USD"
                  placeholder="$ Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-2 outline-none focus:border-[#e77600]"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  aria-label="Maximum price in USD"
                  placeholder="$ Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-2 outline-none focus:border-[#e77600]"
                />
              </div>
            </div>

            {/* Mobile Customer Reviews Filter */}
            <div className="border-t border-gray-200 pt-3">
              <h3 className="font-bold mb-2 text-sm text-gray-900">Customer Reviews</h3>
              <div className="space-y-1">
                {[4, 3, 2].map(stars => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                    aria-pressed={minRating === stars}
                    className={`w-full flex items-center gap-1.5 py-1.5 cursor-pointer ${minRating === stars ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                  >
                    <div className="flex text-amber-500" aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < stars ? 'fill-amber-500' : 'text-gray-300'} />
                      ))}
                    </div>
                    <span>&amp; Up</span>
                  </button>
                ))}
              </div>
            </div>

            {/* In Stock */}
            <div className="border-t border-gray-200 pt-3">
              <label className="flex items-center gap-2 py-1.5 cursor-pointer text-xs text-gray-800">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-[#e77600]"
                />
                <span>In Stock Only</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2.5 min-h-[40px] bg-[#ffd814] hover:bg-[#f7ca00] text-gray-950 font-bold rounded cursor-pointer transition-colors"
              >
                Show {filteredProducts.length} Results
              </button>
              <button
                type="button"
                onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                className="px-4 py-2.5 min-h-[40px] bg-gray-100 text-gray-900 font-bold rounded cursor-pointer hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
