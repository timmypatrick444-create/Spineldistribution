import React, { useState, useMemo, useEffect } from 'react';
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

interface CatalogPageProps {
  products: Product[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  searchQuery?: string;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categoryName?: string, subcategoryName?: string) => void;
  onRequestQuote?: (product: Product) => void;
}

// Fisher-Yates shuffle algorithm for randomizing products order on refresh
const shuffleArray = <T,>(array: T[]): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

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
  const { formatPrice, currency, exchangeRate } = useCurrency();
  const { addToCart } = useCart();

  // Local Filter States
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Pagination state: 50 items per page
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Safe product list
  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);

  // Randomized base order generated whenever the page is refreshed / loaded
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (safeProducts.length > 0) {
      setShuffledProducts(shuffleArray(safeProducts));
    }
  }, [safeProducts]);

  // Reset pagination to page 1 whenever search, category, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, searchQuery, selectedBrand, minPrice, maxPrice, minRating, inStockOnly, sortBy]);

  // Derive unique brands
  const brands = useMemo(() => {
    const list = Array.from(new Set(safeProducts.map(p => p.brand).filter(Boolean)));
    return ['All', ...list];
  }, [safeProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const baseList = shuffledProducts.length > 0 ? shuffledProducts : safeProducts;

    return baseList.filter(p => {
      // Category Matching
      if (selectedCategory && selectedCategory !== 'All') {
        const selLower = selectedCategory.toLowerCase().trim();
        const pCatLower = p.category.toLowerCase().trim();
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
      if (selectedSubcategory && p.subcategory.toLowerCase() !== selectedSubcategory.toLowerCase()) {
        return false;
      }
      // Search
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const words = q.split(/\s+/).filter(Boolean);
        const searchableText = `${p.name} ${p.sku} ${p.brand} ${p.category} ${p.subcategory || ''} ${p.description || ''} ${Object.values(p.specs || {}).join(' ')}`.toLowerCase();
        const matches = searchableText.includes(q) || words.every(w => searchableText.includes(w));
        if (!matches) return false;
      }
      // Brand
      if (selectedBrand !== 'All' && p.brand !== selectedBrand) {
        return false;
      }
      // Price
      const min = parseFloat(minPrice);
      if (!isNaN(min) && p.priceUSD < min) return false;

      const max = parseFloat(maxPrice);
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
      // Default 'featured': maintains randomized product order on page refresh!
      return 0;
    });
  }, [
    shuffledProducts,
    safeProducts, 
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

  return (
    // Standardized 20px gutter matching all pages: w-full px-[20px]
    <div className="w-full px-[20px] py-6 font-sans">
      
      {/* Breadcrumbs & Results Top Bar */}
      <div className="bg-white p-3 rounded-md border border-gray-200 mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span 
            onClick={() => onSelectCategory(undefined, undefined)}
            className="text-blue-700 hover:underline cursor-pointer font-medium"
          >
            All Categories
          </span>
          {selectedCategory && (
            <>
              <ChevronRight size={12} className="text-gray-400 shrink-0" />
              <span 
                onClick={() => onSelectCategory(selectedCategory, undefined)}
                className={`cursor-pointer ${!selectedSubcategory ? 'font-bold text-gray-900' : 'text-blue-700 hover:underline'}`}
              >
                {selectedCategory}
              </span>
            </>
          )}
          {selectedSubcategory && (
            <>
              <ChevronRight size={12} className="text-gray-400 shrink-0" />
              <span className="font-bold text-gray-900">{selectedSubcategory}</span>
            </>
          )}
          {searchQuery && (
            <span className="ml-2 font-medium text-gray-900">
              for <span className="text-[#c45500]">"{searchQuery}"</span>
            </span>
          )}
          
          <span className="text-gray-400 ml-2">|</span>
          <span className="text-gray-700 font-semibold">
            {filteredProducts.length} results
          </span>
          {filteredProducts.length > 0 && (
            <span className="text-gray-500 text-[11px]">
              (Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)})
            </span>
          )}
        </div>

        {/* Sort Dropdown & Mobile Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort-select" className="text-gray-600">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 font-medium outline-none focus:border-[#e77600] cursor-pointer"
          >
            <option value="featured">Featured (Randomized)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Avg. Customer Review</option>
            <option value="newest">Newest Arrivals</option>
          </select>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded border border-gray-300 cursor-pointer"
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        
        {/* LEFT SIDEBAR FILTERS (Desktop) */}
        <aside className="hidden md:block w-60 xl:w-64 shrink-0 space-y-5 text-sm">
          
          {/* Active Filter Clear */}
          {(selectedCategory || selectedSubcategory || selectedBrand !== 'All' || minRating > 0 || inStockOnly || minPrice || maxPrice) && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium">Filters Applied</span>
              <button
                onClick={clearAllFilters}
                className="text-blue-700 hover:underline font-bold cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* 1. Department / Category Filter */}
          <div>
            <h4 className="font-bold text-gray-900 text-sm mb-2">Department</h4>
            <div className="space-y-1 text-xs">
              <div 
                onClick={() => onSelectCategory(undefined, undefined)}
                className={`cursor-pointer hover:text-[#c45500] ${!selectedCategory ? 'font-bold text-[#c45500]' : 'text-gray-700'}`}
              >
                Any Category
              </div>

              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <div key={cat.id} className="pt-0.5">
                    <div
                      onClick={() => onSelectCategory(cat.name, undefined)}
                      className={`cursor-pointer hover:text-[#c45500] flex items-center justify-between ${isSelected ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                    >
                      <span className="line-clamp-1">{cat.name}</span>
                    </div>

                    {/* Show subcategories when category is selected */}
                    {isSelected && (
                      <div className="ml-3 pl-2 border-l-2 border-gray-200 mt-1 space-y-1">
                        {cat.subcategories.map(sub => {
                          const isSubSelected = selectedSubcategory === sub;
                          return (
                            <div
                              key={sub}
                              onClick={() => onSelectCategory(cat.name, sub)}
                              className={`cursor-pointer text-[11px] hover:text-[#c45500] ${isSubSelected ? 'font-bold text-[#c45500]' : 'text-gray-600'}`}
                            >
                              {sub}
                            </div>
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
            <h4 className="font-bold text-gray-900 text-sm mb-2">Customer Reviews</h4>
            <div className="space-y-1.5 text-xs">
              {[4, 3, 2].map(stars => (
                <div
                  key={stars}
                  onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                  className={`flex items-center gap-1.5 cursor-pointer hover:text-[#c45500] ${minRating === stars ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                >
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < stars ? 'fill-amber-500' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span>&amp; Up</span>
                  {minRating === stars && <span className="text-xs text-blue-700 ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Brands Filter */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-bold text-gray-900 text-sm mb-2">Brand</h4>
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
              {brands.map(brand => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer hover:text-gray-900 text-gray-700">
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
            <h4 className="font-bold text-gray-900 text-sm mb-2">Price (USD)</h4>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                placeholder="$ Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:border-[#e77600]"
              />
              <span className="text-gray-400">to</span>
              <input
                type="number"
                placeholder="$ Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:border-[#e77600]"
              />
            </div>
          </div>

          {/* 5. In Stock Filter */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
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

        {/* PRODUCT LISTING GRID: 5 per row (xl:grid-cols-5), 50 per page */}
        <main className="flex-1 min-w-0">
          {paginatedProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded border border-gray-200 shadow-xs">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No matching hardware products found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Try resetting your filters or search keywords.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="bg-[#ffd814] hover:bg-[#f7ca00] text-black font-semibold text-xs py-2 px-5 rounded-full border border-[#fcd200] cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {/* Product Grid: 5 columns per row on desktop (xl:grid-cols-5) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {paginatedProducts.map((prod, idx) => (
                  <div
                    key={`${prod.id || 'prod'}-${prod.sku || idx}-${idx}`}
                    className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between hover:shadow-md transition-shadow min-w-0"
                  >
                    <div 
                      onClick={() => onSelectProduct(prod)}
                      className="cursor-pointer"
                    >
                      {/* Image */}
                      <div className="w-full h-44 sm:h-48 bg-gray-50 rounded flex items-center justify-center p-2.5 mb-2.5">
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
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
                            Spinel's <span className="text-[#febd69]">Choice</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-[#c45500] line-clamp-2 leading-snug mb-1">
                        {prod.name}
                      </h3>

                      {/* Subcategory & Brand */}
                      <div className="text-[11px] text-gray-500 mb-1.5 truncate">
                        {prod.brand} • <span className="text-gray-700">{prod.subcategory}</span>
                      </div>

                      {/* Rating & Reviews */}
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex text-amber-500">
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

                            <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                              {prod.stock > 10 ? (
                                <span className="text-green-700 font-medium">In Stock</span>
                              ) : prod.stock > 0 ? (
                                <span className="text-amber-700 font-medium">Only {prod.stock} left</span>
                              ) : (
                                <span className="text-red-700 font-medium">Temporarily out of stock</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="py-0.5">
                            <span className="inline-block bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-300">
                              Price on Request
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Enterprise RFQ Required
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add to Cart or Request Quote Button */}
                    {prod.priceUSD && prod.priceUSD > 0 ? (
                      <button
                        type="button"
                        onClick={() => addToCart(prod, 1)}
                        className="w-full mt-2 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-semibold text-xs py-1.5 px-3 rounded-full border border-[#fcd200] shadow-xs cursor-pointer transition-colors"
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
                        className="w-full mt-2 bg-[#f0c14b] hover:bg-[#e2b33c] active:bg-[#d8a32a] text-gray-950 font-bold text-xs py-1.5 px-3 rounded-full border border-[#a88734] shadow-xs cursor-pointer transition-colors"
                      >
                        Request Quote
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* PAGINATION: PREVIOUS, NEXT & PAGE BUTTONS (50 PER PAGE) */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-gray-600">
                  Showing <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> of{' '}
                  <span className="font-bold text-gray-900">{filteredProducts.length}</span> products (Page {currentPage} of {totalPages})
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs sm:text-sm font-semibold border transition-all ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 shadow-xs cursor-pointer'
                    }`}
                  >
                    <ChevronLeft size={16} />
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
                            {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                            <button
                              type="button"
                              onClick={() => handlePageChange(page)}
                              className={`min-w-[32px] h-8 px-2 rounded text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                                currentPage === page
                                  ? 'bg-[#131921] text-white shadow-xs'
                                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs sm:text-sm font-semibold border transition-all ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 shadow-xs cursor-pointer'
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

      </div>

      {/* Mobile Filter Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto z-10 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-base text-gray-900">Filters</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="cursor-pointer"><X size={20} /></button>
            </div>
            {/* Mobile Category List */}
            <div>
              <h4 className="font-bold mb-2 text-sm text-gray-900">Category</h4>
              <div 
                onClick={() => { onSelectCategory(undefined, undefined); setMobileFilterOpen(false); }}
                className="py-1.5 text-blue-700 cursor-pointer font-medium"
              >
                All Categories
              </div>
              {CATEGORIES.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => { onSelectCategory(c.name); setMobileFilterOpen(false); }}
                  className="py-1.5 text-gray-800 hover:text-blue-700 cursor-pointer"
                >
                  {c.name}
                </div>
              ))}
            </div>

            {/* In Stock */}
            <div className="border-t border-gray-200 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-[#e77600]"
                />
                <span>In Stock Only</span>
              </label>
            </div>

            <button
              onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
              className="w-full py-2 bg-gray-100 font-bold rounded cursor-pointer hover:bg-gray-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
