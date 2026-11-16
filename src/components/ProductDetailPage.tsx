import React, { useState } from 'react';
import { 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Lock, 
  MapPin, 
  Check, 
  ChevronRight,
  Share2,
  Heart,
  ArrowRight,
  PackageCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';

interface ProductDetailPageProps {
  product: Product;
  allProducts?: Product[];
  onSelectCategory: (categoryName: string, subcategoryName?: string) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onRequestQuote?: (product: Product, quantity?: number) => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts = [],
  onSelectCategory,
  onBuyNow,
  onRequestQuote,
  onSelectProduct
}) => {
  const { formatPrice, currency, exchangeRate } = useCurrency();
  const { addToCart } = useCart();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  const hasPrice = !!(product.priceUSD && product.priceUSD > 0);

  const handleAddToCart = () => {
    if (!hasPrice) {
      if (onRequestQuote) {
        onRequestQuote(product, quantity);
      }
      return;
    }
    addToCart(product, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    if (!hasPrice) {
      if (onRequestQuote) {
        onRequestQuote(product, quantity);
      }
      return;
    }
    addToCart(product, quantity);
    onBuyNow(product, quantity);
  };

  const handleRequestQuote = () => {
    if (onRequestQuote) {
      onRequestQuote(product, quantity);
    }
  };

  // Derive multiple recommendation sets
  const relatedRecommendations = (allProducts || [])
    .filter(p => p.id !== product.id)
    .sort((a, b) => {
      // Prioritize same category, then subcategory
      if (a.category === product.category && b.category !== product.category) return -1;
      if (b.category === product.category && a.category !== product.category) return 1;
      return 0;
    })
    .slice(0, 8);

  return (
    <div className="w-full px-[20px] py-6 font-sans">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-6 flex-wrap">
        <span 
          onClick={() => onSelectCategory(product.category)}
          className="hover:underline cursor-pointer hover:text-blue-700 font-medium"
        >
          {product.category}
        </span>
        <ChevronRight size={14} className="text-gray-400" />
        <span 
          onClick={() => onSelectCategory(product.category, product.subcategory)}
          className="hover:underline cursor-pointer hover:text-blue-700 font-medium"
        >
          {product.subcategory}
        </span>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="text-gray-900 font-semibold truncate max-w-xs sm:max-w-md">
          {product.sku}
        </span>
      </nav>

      {/* Main PDP 3-Column Layout (Gallery | Details | Buy Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Interactive Image Gallery (Col 1-5) */}
        <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-4 lg:sticky lg:top-24">
          
          {/* Thumbnails */}
          <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible shrink-0 pb-2 sm:pb-0">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-md border p-1 bg-white cursor-pointer transition-all ${activeImageIndex === idx ? 'border-[#e77600] ring-2 ring-[#e77600]/40' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>

          {/* Active Large Display */}
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 sm:p-8 flex items-center justify-center min-h-[340px] sm:min-h-[420px] max-h-[500px] shadow-xs">
            <img 
              src={product.images[activeImageIndex] || product.images[0]} 
              alt={product.name}
              className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-300" 
              referrerPolicy="no-referrer"
            />
          </div>

        </div>

        {/* Center: Title, Brand, Specs & Features (Col 6-9) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Brand Link */}
          <div className="text-xs sm:text-sm text-blue-700 font-semibold hover:underline cursor-pointer">
            Brand: {product.brand}
          </div>

          {/* Product Title */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-snug">
            {product.name}
          </h1>

          {/* Choice Badge & Reviews */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200 text-xs sm:text-sm">
            {product.isChoice && (
              <span className="bg-[#131921] text-white font-bold px-2.5 py-0.5 rounded text-xs flex items-center gap-1">
                Spinel's <span className="text-[#febd69]">Choice</span>
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={i < Math.floor(product.rating) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}
                  />
                ))}
              </div>
              <span className="font-bold text-gray-800">{product.rating}</span>
            </div>

            <span className="text-blue-700 hover:underline cursor-pointer">
              {product.reviewCount} customer reviews
            </span>
          </div>

          {/* Price or Request Quote Block */}
          <div className="space-y-2 pb-5 border-b border-gray-200">
            {hasPrice ? (
              <>
                <div className="text-xs sm:text-sm text-gray-500 font-medium">Spinel List Price:</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#b12704] flex items-baseline gap-2.5 flex-wrap">
                  <span>{formatPrice(product.priceUSD)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 pt-1">
                  <Truck size={16} className="text-emerald-700" />
                  <span className="font-medium text-emerald-800">FREE Expedited Enterprise Dispatch Available</span>
                </div>
              </>
            ) : (
              <div className="space-y-3 bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className="bg-[#232F3E] text-white text-xs font-bold px-2.5 py-1 rounded">
                    Enterprise Hardware • RFQ Required
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Price on Request
                </div>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  Direct project pricing, government tenders, and volume contractor rates available on demand. Submit an official quotation request for personalized pricing within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={handleRequestQuote}
                  className="inline-flex items-center justify-center px-4 py-2 bg-[#FEBD69] hover:bg-[#f3a847] text-[#131921] font-bold text-xs sm:text-sm rounded-lg border border-[#df9b3e] shadow-sm cursor-pointer transition-colors"
                >
                  <span>Request Quote for this Item</span>
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="text-sm sm:text-base text-gray-700 leading-relaxed">
            <p>{product.description}</p>
          </div>

          {/* Technical Specifications Table */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden text-xs sm:text-sm">
              <div className="bg-gray-100 px-4 py-2.5 font-bold text-gray-800 border-b border-gray-200">
                Technical Specifications
              </div>
              <div className="divide-y divide-gray-100">
                {Object.entries(product.specs).map(([key, val]) => (
                  <div key={key} className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-semibold text-gray-600">{key}</span>
                    <span className="col-span-2 text-gray-900 font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About This Item Feature Bullets */}
          {product.features && product.features.length > 0 && (
            <div className="pt-2">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-2">About this item</h3>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-gray-700">
                {product.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Right: Buy Box (Col 10-12) */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-300 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 text-xs sm:text-sm">
            
            {/* Price in Buy Box */}
            <div className="text-2xl sm:text-3xl font-extrabold text-[#b12704]">
              {hasPrice ? (
                formatPrice(product.priceUSD)
              ) : (
                <span className="text-xl sm:text-2xl text-gray-900">Price on Request</span>
              )}
            </div>

            {/* Delivery Info */}
            <div className="text-xs sm:text-sm text-gray-700 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Truck size={16} className="text-emerald-700" />
                <span className="font-bold text-emerald-800">FREE Shipping &amp; Handling</span>
                <span className="text-xs text-gray-500">• Direct Enterprise Dispatch</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600 text-xs">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Genuine Manufacturer Warranty Safeguard</span>
              </div>
            </div>

            {/* Stock Availability */}
            <div>
              {product.stock > 10 ? (
                <div className="text-base font-bold text-green-700">In Stock</div>
              ) : product.stock > 0 ? (
                <div className="text-sm font-bold text-amber-700">
                  Only {product.stock} units available - order soon.
                </div>
              ) : (
                <div className="text-sm font-bold text-red-700">Temporarily out of stock</div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="qty" className="font-semibold text-gray-700">Quantity:</label>
              <select
                id="qty"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                className="bg-gray-50 border border-gray-300 rounded-md px-3 py-1.5 text-xs sm:text-sm outline-none focus:border-[#e77600] cursor-pointer"
              >
                {[...Array(Math.min(10, Math.max(1, product.stock)))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* ACTION BUTTONS: EITHER (Add to Cart + Buy Now) OR (Request Quote) */}
            {hasPrice ? (
              <div className="space-y-2.5 pt-2">
                {/* Add to Cart Yellow Button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-3 px-4 rounded-full border border-[#fcd200] shadow-sm cursor-pointer transition-colors text-xs sm:text-sm text-center"
                >
                  Add to Cart
                </button>

                {/* Buy Now Orange Button */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full bg-[#ffa41c] hover:bg-[#fa8900] active:bg-[#ee7600] text-gray-900 font-bold py-3 px-4 rounded-full border border-[#ff8f00] shadow-sm cursor-pointer transition-colors text-xs sm:text-sm text-center"
                >
                  Buy Now
                </button>
              </div>
            ) : (
              <div className="pt-2 space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                  <span className="font-bold">Quotation Required:</span> This equipment requires an enterprise RFQ for custom project pricing.
                </div>
                {/* Request Quote Button */}
                <button
                  type="button"
                  onClick={handleRequestQuote}
                  className="w-full bg-[#FEBD69] hover:bg-[#f3a847] active:bg-[#e29b3c] text-[#131921] font-bold py-3 px-4 rounded-full border border-[#df9b3e] shadow-md hover:shadow cursor-pointer transition-all text-xs sm:text-sm flex items-center justify-center"
                >
                  <span>Request Quote</span>
                </button>
              </div>
            )}

            {/* Added Toast Notification */}
            {addedToast && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-2 text-xs sm:text-sm">
                <Check size={16} className="text-green-600 shrink-0" />
                <span>Added to your Cart successfully!</span>
              </div>
            )}

            {/* Buy Box Metadata Table */}
            <div className="border-t border-gray-200 pt-3.5 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Ships from</span>
                <span className="font-medium text-gray-900">Spinel Distribution</span>
              </div>
              <div className="flex justify-between">
                <span>Sold by</span>
                <span className="font-medium text-gray-900">Spinel Distribution Global</span>
              </div>
              <div className="flex justify-between">
                <span>Warranty</span>
                <span className="font-medium text-gray-900">3-Year Enterprise Replacement</span>
              </div>
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="font-medium text-green-700 flex items-center gap-1">
                  <Lock size={12} /> Secure Gateway
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Multiple Recommendations / Related Products Section */}
      {relatedRecommendations.length > 0 && (
        <section className="mt-16 pt-10 border-t border-gray-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={22} className="text-amber-500" />
                Recommended Equipment &amp; Related Hardware
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Engineered to deploy seamlessly with {product.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory(product.category)}
              className="text-xs sm:text-sm text-blue-700 hover:text-[#c45500] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View all in {product.category}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {relatedRecommendations.map((rec) => {
              const recHasPrice = !!(rec.priceUSD && rec.priceUSD > 0);
              return (
                <div
                  key={rec.id}
                  className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-md group"
                >
                  <div 
                    onClick={() => onSelectProduct?.(rec)}
                    className="cursor-pointer"
                  >
                    <div className="w-full h-44 bg-gray-50 rounded-lg flex items-center justify-center p-3 mb-3 overflow-hidden">
                      <img 
                        src={rec.images[0]} 
                        alt={rec.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      {rec.brand} • {rec.category}
                    </div>

                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#c45500] line-clamp-2 leading-snug mb-2">
                      {rec.name}
                    </h3>

                    <div className="flex items-center gap-1 mb-2.5">
                      <div className="flex text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={13} 
                            className={i < Math.floor(rec.rating) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600 font-medium">({rec.reviewCount})</span>
                    </div>

                    <div className="mb-3">
                      {recHasPrice ? (
                        <div className="text-base sm:text-lg font-bold text-gray-900">
                          {formatPrice(rec.priceUSD)}
                        </div>
                      ) : (
                        <span className="inline-block bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded border border-amber-300">
                          Price on Request
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {recHasPrice ? (
                      <button
                        type="button"
                        onClick={() => addToCart(rec, 1)}
                        className="w-full bg-[#ffd814] hover:bg-[#f7ca00] text-gray-900 font-bold text-xs py-2 px-3 rounded-full border border-[#fcd200] shadow-sm cursor-pointer transition-colors"
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onRequestQuote) {
                            onRequestQuote(rec, 1);
                          }
                        }}
                        className="w-full bg-[#FEBD69] hover:bg-[#f3a847] text-[#131921] font-bold text-xs py-2 px-3 rounded-full border border-[#df9b3e] shadow-sm cursor-pointer transition-colors flex items-center justify-center"
                      >
                        <span>Request Quote</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
