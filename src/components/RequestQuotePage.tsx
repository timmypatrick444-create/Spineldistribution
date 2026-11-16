import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Package, 
  ArrowLeft, 
  Printer, 
  Download,
  Clock, 
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { downloadQuotationPDF } from '../utils/pdfGenerator';

interface RequestQuotePageProps {
  initialProduct?: Product | null;
  onNavigate: (view: string, param?: string) => void;
  onSelectProduct?: (product: Product) => void;
}

interface SubmittedQuote {
  quoteId: string;
  date: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  currency: string;
  quantity: number;
  projectTimeline?: string;
  notes: string;
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
  status: string;
}

export const RequestQuotePage: React.FC<RequestQuotePageProps> = ({
  initialProduct,
  onNavigate,
  onSelectProduct
}) => {
  const { currency } = useCurrency();
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [productName, setProductName] = useState(initialProduct ? initialProduct.name : '');
  const [productSku, setProductSku] = useState(initialProduct ? initialProduct.sku : '');
  const [customImage, setCustomImage] = useState(initialProduct ? (initialProduct.images?.[0] || '') : '');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<SubmittedQuote | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<SubmittedQuote[]>([]);
  const [showRecentTab, setShowRecentTab] = useState(false);

  // Sync when initialProduct changes
  useEffect(() => {
    if (initialProduct) {
      setProductName(initialProduct.name);
      setProductSku(initialProduct.sku);
      if (initialProduct.images?.[0]) {
        setCustomImage(initialProduct.images[0]);
      }
    }
  }, [initialProduct]);

  // Load existing quote requests from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('spinel_submitted_quotes');
      if (stored) {
        setRecentQuotes(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFormError(null);
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image file size exceeds 5MB. Please choose a smaller image file.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!companyName.trim() || !contactName.trim() || !email.trim() || !phone.trim() || !location.trim() || !notes.trim()) {
      setFormError('Please fill out all compulsory fields: Company Name, Contact Person, Business Email, Phone Number, Delivery Destination, and Project Notes / Technical Description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      let quoteId = `RFQ-2026-${randomNum}`;
      // Real image only: uploaded base64 data URL or catalog product image. If none provided, null (no placeholder image).
      const chosenImage = customImage ? customImage : (initialProduct?.images?.[0] ? initialProduct.images[0] : null);

      let newQuote: SubmittedQuote = {
        quoteId,
        date: new Date().toLocaleString(),
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location: location.trim(),
        currency: currency || 'USD',
        quantity,
        notes: notes.trim(),
        product: {
          id: initialProduct?.id || 'custom-hardware',
          sku: productSku.trim() || 'N/A',
          name: productName.trim() || 'General Hardware Request',
          brand: initialProduct?.brand || 'Enterprise Grade',
          category: initialProduct?.category || 'Hardware Equipment',
          image: chosenImage || ''
        },
        status: 'Under Review'
      };

      // Post directly to backend server to persist to cPanel MySQL table: Request_Quote
      try {
        const response = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newQuote,
            Company_Name: companyName.trim(),
            Contact_Person: contactName.trim(),
            Email: email.trim(),
            Phone_Number: phone.trim(),
            Location: location.trim(),
            Product_SKU: productSku.trim() || null,
            Product_Name: productName.trim() || null,
            Unit: quantity,
            Image: chosenImage,
            Description: notes.trim()
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.quote?.quoteId) {
            newQuote.quoteId = resData.quote.quoteId;
            quoteId = resData.quote.quoteId;
          }
          if (resData.quote?.product?.image) {
            newQuote.product.image = resData.quote.product.image;
          }
        }
      } catch (postErr) {
        console.warn('Network sync notice for quote:', postErr);
      }

      const updated = [newQuote, ...recentQuotes];
      setRecentQuotes(updated);
      try {
        localStorage.setItem('spinel_submitted_quotes', JSON.stringify(updated));
      } catch {}

      setSubmittedQuote(newQuote);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setFormError('Failed to process quote request: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadRFQ = () => {
    if (submittedQuote) {
      downloadQuotationPDF(submittedQuote);
    }
  };

  return (
    <div className="w-full px-[20px] py-8 font-sans">
      
      {/* Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        {recentQuotes.length > 0 && !submittedQuote && (
          <button
            type="button"
            onClick={() => setShowRecentTab(!showRecentTab)}
            className="text-xs text-gray-700 hover:text-[#c45500] font-medium underline cursor-pointer flex items-center gap-1"
          >
            <Clock size={13} />
            <span>{showRecentTab ? 'Hide Submitted Quotes' : `View Submitted Quotes (${recentQuotes.length})`}</span>
          </button>
        )}
      </div>

      {/* Confirmation View */}
      {submittedQuote ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4 border-b border-gray-200 pb-5">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={30} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">
                  RFQ Received Successfully
                </span>
                <span className="text-xs text-gray-500">{submittedQuote.date}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1.5">
                Official Quote Request Confirmed
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Reference ID: <strong className="text-gray-900 font-mono text-sm sm:text-base">{submittedQuote.quoteId}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadRFQ}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Download Official RFQ PDF Document"
              >
                <Download size={15} />
                <span>Download RFQ</span>
              </button>
            </div>
          </div>

          {/* Product Summary */}
          {submittedQuote.product && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                Requested Hardware Item
              </h3>
              <div className="flex items-center gap-4">
                {submittedQuote.product.image ? (
                  <img 
                    src={submittedQuote.product.image} 
                    alt={submittedQuote.product.name} 
                    className="w-16 h-16 object-contain bg-white rounded-lg border border-gray-200 p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                    <Package size={26} />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-xs text-blue-700 font-bold uppercase">{submittedQuote.product.brand}</div>
                  <h4 className="text-sm sm:text-base font-bold text-gray-900">{submittedQuote.product.name}</h4>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {submittedQuote.product.sku && submittedQuote.product.sku !== 'N/A' && (
                      <>SKU: <span className="font-mono font-medium">{submittedQuote.product.sku}</span> | </>
                    )}
                    Qty: <strong className="text-gray-900">{submittedQuote.quantity} units</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm border border-gray-200 rounded-xl p-5 bg-white">
            <div>
              <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Company / Organization:</span>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{submittedQuote.companyName}</div>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Contact Person:</span>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{submittedQuote.contactName}</div>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Business Email:</span>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{submittedQuote.email}</div>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Phone / WhatsApp:</span>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{submittedQuote.phone}</div>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Delivery Location:</span>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{submittedQuote.location}</div>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Estimated Quantity:</span>
              <div className="font-bold text-gray-900 text-sm mt-0.5">{submittedQuote.quantity} units</div>
            </div>
            {submittedQuote.notes && (
              <div className="md:col-span-2 pt-2.5 border-t border-gray-100">
                <span className="text-gray-500 block text-[11px] font-semibold uppercase tracking-wider">Project Notes / Specifications:</span>
                <p className="text-gray-800 mt-1 whitespace-pre-wrap text-xs sm:text-sm">{submittedQuote.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setSubmittedQuote(null);
                setNotes('');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs sm:text-sm rounded-lg cursor-pointer transition-colors"
            >
              Submit Another Quotation Request
            </button>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#ffd814] hover:bg-[#f7ca00] text-gray-900 font-bold text-xs sm:text-sm rounded-full border border-[#fcd200] shadow-xs cursor-pointer transition-colors"
            >
              Continue Browsing Hardware Catalog
            </button>
          </div>
        </div>
      ) : (
        /* Quotation Form */
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
          
          {/* Header Banner - Clean, balanced font sizing */}
          <div className="bg-[#131921] text-white p-5 sm:p-7 border-b border-gray-800">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Request an Enterprise Quotation (RFQ)
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1.5 max-w-2xl leading-relaxed">
              Get customized volume rates, enterprise project pricing, and official proforma invoices directly from Spinel Distribution.
            </p>
          </div>

          {/* Selected Product Card (if navigated from an unpriced or specific item) */}
          {initialProduct ? (
            <div className="bg-amber-50/60 border-b border-amber-200 p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img 
                  src={initialProduct.images[0] || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400'} 
                  alt={initialProduct.name}
                  className="w-16 h-16 object-contain bg-white rounded-lg border border-gray-200 p-1 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                      {initialProduct.brand}
                    </span>
                    <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-300">
                      Unpriced Hardware / RFQ Required
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 line-clamp-1">
                    {initialProduct.name}
                  </h3>
                  <div className="text-xs text-gray-600 mt-0.5">
                    SKU: <span className="font-mono font-medium text-gray-800">{initialProduct.sku}</span> • {initialProduct.subcategory || initialProduct.category}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  className="text-xs sm:text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Change Product
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50/60 border-b border-blue-200 p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-blue-100 text-blue-900 rounded-lg shrink-0">
                  <Package size={22} />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-gray-900">
                    Enterprise Project &amp; Bill of Materials (BOM) Quotation
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Request official project pricing, wholesale contractor tiers, or submit multi-brand equipment lists below.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('catalog')}
                className="shrink-0 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs sm:text-sm font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          )}

          {/* Recent Quotes Accordion if enabled */}
          {showRecentTab && recentQuotes.length > 0 && (
            <div className="p-4 sm:px-6 bg-gray-50 border-b border-gray-200 text-xs sm:text-sm">
              <h3 className="font-bold text-gray-800 mb-2.5 text-sm">Previously Submitted Quotation Requests:</h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {recentQuotes.map((q, i) => (
                  <div key={i} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-gray-900 text-xs">{q.quoteId}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-gray-700 font-medium text-xs">{q.product ? q.product.name : 'General Project'}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-gray-400 text-xs">{q.date}</span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded text-xs">
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The RFQ Form with Clean, Balanced Font Sizing */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-8">
            {formError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm flex items-start gap-2 shadow-xs">
                <div className="font-medium">{formError}</div>
              </div>
            )}
            
            {/* 1. Contact & Company Details */}
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-gray-600" />
                <span>Company &amp; Contact Information</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Company / Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Spinel Distribution Ltd"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Contact Person Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Timmy Patrick"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Official Business Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@spineldistribution.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Phone / WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 816 963 2070"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Product & Procurement Details */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package size={18} className="text-gray-600" />
                <span>Product &amp; Procurement Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Product Name <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Hikvision ColorVu IP Camera 4MP (Optional)"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Product SKU / Model Number <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={productSku}
                    onChange={(e) => setProductSku(e.target.value)}
                    placeholder="e.g. DS-2CD2347G2-LU (Optional)"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Estimated Quantity Required (Units) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[1, 5, 10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuantity(n)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${quantity === n ? 'bg-[#ffd814] border-[#fcd200] text-black font-bold' : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Delivery Destination / City / Port of Entry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Victoria Island, Lagos / Abuja FCT / Port Harcourt"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                    Attach Real Equipment Picture / Diagram <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 hover:file:bg-gray-200 cursor-pointer"
                    />
                    {customImage && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={customImage} 
                          alt="Preview" 
                          className="w-12 h-12 object-contain rounded border border-gray-200 bg-white p-1" 
                        />
                        <button
                          type="button"
                          onClick={() => setCustomImage('')}
                          className="text-xs text-red-600 hover:underline cursor-pointer"
                        >
                          Remove photo
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Upload a real photo of the equipment, product label, or specifications (PNG, JPG, or WEBP up to 5MB).
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Project Notes & Requirements */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block font-semibold text-gray-700 mb-1.5 text-xs sm:text-sm">
                Additional Technical Requirements / Project Scope / BOM Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include details like camera resolution, lens sizes, installation environment, NVR storage capacities, solar inverter sizing, or custom mounting bracket needs..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]/30 outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Confidential business pricing. No spam guarantee.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-7 py-3 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold text-xs sm:text-sm rounded-full border border-[#fcd200] shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Generating Quotation Request...</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Request for Quotation</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
};
