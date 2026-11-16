import React, { useRef, useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import { Product } from '../types';

interface ProductSliderSectionProps {
  id?: string;
  className?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onSeeAll: () => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onRequestQuote?: (product: Product) => void;
  onNavigateQuote?: () => void;
  addedMap: Record<string, boolean>;
  emptyMessage?: string;
}

export const ProductSliderSection: React.FC<ProductSliderSectionProps> = ({
  id,
  className = 'w-full px-[20px] mb-8',
  title,
  subtitle,
  products,
  onSelectProduct,
  onSeeAll,
  onAddToCart,
  onRequestQuote,
  onNavigateQuote,
  addedMap,
  emptyMessage = 'Products currently loading or unavailable.'
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [products]);

  return (
    <div id={id} className={className}>
      <div className="bg-white p-5 sm:p-6 rounded-[20px] shadow-sm border border-gray-200">
        
        {/* Header with Title and Category Navigation Arrow */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Navigation Button for Easy Navigation to Category */}
          <button
            type="button"
            onClick={onSeeAll}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-[#febd69] hover:bg-[#f3a847] active:bg-[#e59b38] text-[#131921] font-bold text-xs sm:text-sm rounded-md transition-all shadow-sm cursor-pointer whitespace-nowrap group"
            title={`Shop all in ${title}`}
          >
            <span>See All</span>
            <ArrowRight size={15} className="text-[#131921] stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Horizontal Product Carousel */}
        {products.length > 0 ? (
          <div className="relative group/carousel">
            
            {/* Floating Left Arrow */}
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className={`absolute -left-2.5 sm:-left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 text-gray-800 hover:bg-gray-50 hover:text-black flex items-center justify-center transition-all cursor-pointer ${
                !canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'
              }`}
              aria-label={`Previous ${title} Products`}
            >
              <ChevronLeft size={22} />
            </button>

            {/* Floating Right Arrow */}
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className={`absolute -right-2.5 sm:-right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 text-gray-800 hover:bg-gray-50 hover:text-black flex items-center justify-center transition-all cursor-pointer ${
                !canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'
              }`}
              aria-label={`Next ${title} Products`}
            >
              <ChevronRight size={22} />
            </button>

            {/* Scrollable Track */}
            <div
              ref={scrollContainerRef}
              className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scroll-smooth scrollbar-none py-2 px-1"
            >
              {products.slice(0, 18).map((prod, idx) => {
                const isAdded = addedMap[prod.id];
                const hasPrice = prod.priceUSD && prod.priceUSD > 0;

                return (
                  <div
                    key={`${prod.id}-${idx}`}
                    className="w-[185px] sm:w-[210px] md:w-[220px] flex-shrink-0 flex flex-col justify-between bg-white border border-gray-200 rounded-[16px] shadow-2xs hover:shadow-md transition-shadow duration-200 group/card overflow-hidden"
                  >
                    {/* 1. Product Image Area */}
                    <div
                      onClick={() => onSelectProduct(prod)}
                      className="w-full h-44 sm:h-48 bg-gray-50/70 border-b border-gray-100 flex items-center justify-center p-3 relative overflow-hidden cursor-pointer"
                      title={prod.name}
                    >
                      <img
                        src={prod.images[0] || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80'}
                        alt={prod.name}
                        className="max-h-full max-w-full object-contain group-hover/card:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* 2. Product Name & Action Button */}
                    <div className="p-3.5 flex flex-col justify-between flex-1">
                      <div
                        onClick={() => onSelectProduct(prod)}
                        className="cursor-pointer mb-3"
                      >
                        <h4 
                          className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover/card:text-[#c45500] transition-colors min-h-[34px] sm:min-h-[38px]"
                          title={prod.name}
                        >
                          {prod.name}
                        </h4>
                      </div>

                      {/* 3. Action Button: Add to Cart or Request Quote */}
                      {hasPrice ? (
                        <button
                          type="button"
                          onClick={(e) => onAddToCart(prod, e)}
                          className={`w-full font-bold text-xs py-2 px-2.5 rounded-lg shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            isAdded
                              ? 'bg-green-600 border border-green-600 text-white'
                              : 'bg-[#febd69] hover:bg-[#f3a847] active:bg-[#e59b38] text-[#131921]'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 size={14} className="text-white" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} className="text-[#131921]" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRequestQuote) {
                              onRequestQuote(prod);
                            } else if (onNavigateQuote) {
                              onNavigateQuote();
                            }
                          }}
                          className="w-full bg-[#febd69] hover:bg-[#f3a847] active:bg-[#e59b38] text-[#131921] font-bold text-xs py-2 px-2.5 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center justify-center"
                        >
                          <span>Request Quote</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm text-gray-600 mb-2">{emptyMessage}</p>
            <button
              type="button"
              onClick={onSeeAll}
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 mx-auto"
            >
              Browse Category <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
