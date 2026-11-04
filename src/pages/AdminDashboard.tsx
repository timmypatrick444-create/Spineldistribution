import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Layers, 
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  X,
  Printer,
  Menu,
  Pencil,
  Save,
  MailCheck,
  Send
} from 'lucide-react';
import { Product, Order, SubmittedQuote } from '../types';
import { CATEGORIES } from '../data/categories';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { parseProductsFile, parseProductsCSVString, downloadSampleCSVFile } from '../utils/csvParser';
import { downloadInvoicePDF, downloadQuotationPDF } from '../utils/pdfGenerator';

interface AdminDashboardProps {
  onRefreshCatalog: () => Promise<void>;
  onNavigateHome?: () => void;
}

type AdminTab = 'inventory' | 'rfq' | 'orders' | 'upload' | 'categories' | 'email-settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onRefreshCatalog
}) => {
  const { adminLogout, adminToken } = useAuth();
  const { exchangeRate } = useCurrency();

  const [activeTab, setActiveTab] = useState<AdminTab>('upload');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<SubmittedQuote[]>([]);
  const [loading, setLoading] = useState(true);

  // Master Inventory Filter & Pagination States (20 items per page)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [adminProductsPage, setAdminProductsPage] = useState(1);
  const ADMIN_PRODUCTS_PER_PAGE = 20;

  // Edit Product Modal States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    sku: string;
    brand: string;
    category: string;
    subcategory: string;
    priceUSD: string;
    stock: string;
    description: string;
    imageUrl: string;
    featuresText: string;
    isChoice: boolean;
    isBestSeller: boolean;
    featured: boolean;
  }>({
    name: '',
    sku: '',
    brand: '',
    category: '',
    subcategory: '',
    priceUSD: '0',
    stock: '0',
    description: '',
    imageUrl: '',
    featuresText: '',
    isChoice: false,
    isBestSeller: false,
    featured: false
  });

  // RFQ Filter & Modal States
  const [rfqSearchQuery, setRfqSearchQuery] = useState('');
  const [rfqStatusFilter, setRfqStatusFilter] = useState<string>('All');
  const [selectedQuoteModal, setSelectedQuoteModal] = useState<SubmittedQuote | null>(null);

  // Bulk Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    added: number;
    updated: number;
    total: number;
    message: string;
  } | null>(null);
  const [pastedCSV, setPastedCSV] = useState('');

  // Email & SMTP Configuration States
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [testRecipient, setTestRecipient] = useState('timmypatrick444@gmail.com');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailErrorMsg, setEmailErrorMsg] = useState('');
  const [emailLogs, setEmailLogs] = useState<string[]>([]);

  const fetchEmailConfig = async () => {
    try {
      const res = await fetch('/api/system/email-config');
      if (res.ok) {
        const data = await res.json();
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort || '465');
        setSmtpUser(data.smtpUser || '');
        setSmtpFrom(data.smtpFrom || '');
      }
    } catch {}
  };

  const handleSaveEmailConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingEmail(true);
    setEmailStatusMsg('');
    setEmailErrorMsg('');
    setEmailLogs([]);

    try {
      const res = await fetch('/api/system/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort: parseInt(smtpPort, 10) || 465,
          smtpUser,
          smtpPassword: smtpPassword || undefined,
          smtpFrom,
          testRecipient: testRecipient || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEmailErrorMsg(data.error || 'Failed to save email configuration.');
      } else {
        setEmailStatusMsg(data.message || 'Email settings saved successfully!');
        if (data.testResult) {
          if (data.testResult.success) {
            setEmailStatusMsg(prev => `${prev} Test email delivered successfully to ${testRecipient}!`);
          } else {
            setEmailErrorMsg(`Settings saved, but test delivery failed: ${data.testResult.error || 'Check credentials'}`);
          }
          if (data.testResult.details) {
            setEmailLogs(data.testResult.details);
          }
        }
      }
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Network error saving email settings.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }
    setIsTestingEmail(true);
    setEmailStatusMsg('');
    setEmailErrorMsg('');
    setEmailLogs([]);

    try {
      const res = await fetch('/api/system/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testRecipient })
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatusMsg(`Verification OTP delivered successfully to ${testRecipient} via ${data.method}! Code sent: ${data.otpSent}`);
      } else {
        setEmailErrorMsg(`Delivery failed: ${data.error || 'Check SMTP credentials.'}`);
      }
      if (data.details) {
        setEmailLogs(data.details);
      }
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Error testing email delivery.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Fetch all admin data (Products, Orders, Quotes)
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, orderRes, quoteRes] = await Promise.all([
        fetch('/api/products?limit=10000'),
        fetch('/api/orders'),
        fetch('/api/quotes')
      ]);

      if (prodRes.ok) {
        const pData = await prodRes.json();
        const productList: Product[] = Array.isArray(pData)
          ? pData
          : Array.isArray(pData?.products)
          ? pData.products
          : [];
        setProducts(productList);
      }

      if (orderRes.ok) {
        const oData = await orderRes.json();
        const orderList: Order[] = Array.isArray(oData)
          ? oData
          : Array.isArray(oData?.orders)
          ? oData.orders
          : [];
        setOrders(orderList);
      }

      // Load server quotes and merge with local quotes
      let combinedQuotes: SubmittedQuote[] = [];
      const HARDCODED_QUOTE_IDS = new Set(['RFQ-2026-8921', 'RFQ-2026-7412']);
      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        if (Array.isArray(qData?.quotes)) {
          combinedQuotes = qData.quotes.filter((q: SubmittedQuote) => !HARDCODED_QUOTE_IDS.has(q.quoteId));
        }
      }

      try {
        const localRaw = localStorage.getItem('spinel_submitted_quotes');
        if (localRaw) {
          let localList: SubmittedQuote[] = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            localList = localList.filter(q => !HARDCODED_QUOTE_IDS.has(q.quoteId));
            try {
              localStorage.setItem('spinel_submitted_quotes', JSON.stringify(localList));
            } catch {
              // ignore
            }
            const existingIds = new Set(combinedQuotes.map(q => q.quoteId));
            for (const lq of localList) {
              if (!existingIds.has(lq.quoteId)) {
                combinedQuotes.push(lq);
              }
            }
          }
        }
      } catch {
        // ignore storage parse errors
      }

      setQuotes(combinedQuotes);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchEmailConfig();
  }, []);

  // Reset inventory page to 1 whenever filters change
  useEffect(() => {
    setAdminProductsPage(1);
  }, [searchQuery, categoryFilter]);

  // Bulk File Upload Processor
  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);
      setUploadResult(null);

      const parsed = await parseProductsFile(file);
      setUploadProgress(30);

      if (parsed.length === 0) {
        throw new Error('No valid products detected in file. Please ensure columns include SKU, name, category, and price.');
      }

      const chunkSize = 500;
      let totalAdded = 0;
      let totalUpdated = 0;

      for (let i = 0; i < parsed.length; i += chunkSize) {
        const chunk = parsed.slice(i, i + chunkSize);
        const res = await fetch('/api/products/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ products: chunk })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Server error during batch ingestion');
        }

        const data = await res.json();
        totalAdded += data.added || 0;
        totalUpdated += data.updated || 0;

        const currentPct = Math.min(95, Math.round(30 + ((i + chunk.length) / parsed.length) * 65));
        setUploadProgress(currentPct);
      }

      setUploadProgress(100);
      setUploadResult({
        success: true,
        added: totalAdded,
        updated: totalUpdated,
        total: totalAdded + totalUpdated,
        message: `Successfully processed ${totalAdded + totalUpdated} products (${totalAdded} added, ${totalUpdated} updated) into the master catalog!`
      });

      await fetchData();
      await onRefreshCatalog();
    } catch (err: any) {
      setUploadResult({
        success: false,
        added: 0,
        updated: 0,
        total: 0,
        message: err.message || 'File upload failed'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Pasted CSV Processor
  const handlePastedCSVUpload = async () => {
    if (!pastedCSV.trim()) return;
    try {
      setIsUploading(true);
      setUploadProgress(20);
      setUploadResult(null);

      const parsed = parseProductsCSVString(pastedCSV);
      setUploadProgress(50);

      if (parsed.length === 0) {
        throw new Error('No valid products could be parsed from the provided text.');
      }

      const res = await fetch('/api/products/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ products: parsed })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ingestion failed');
      }

      const data = await res.json();
      setUploadProgress(100);
      setUploadResult({
        success: true,
        added: data.added || 0,
        updated: data.updated || 0,
        total: (data.added || 0) + (data.updated || 0),
        message: `Ingested ${parsed.length} products from pasted CSV successfully!`
      });

      setPastedCSV('');
      await fetchData();
      await onRefreshCatalog();
    } catch (err: any) {
      setUploadResult({
        success: false,
        added: 0,
        updated: 0,
        total: 0,
        message: err.message || 'Error parsing pasted CSV'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      }
    } catch {
      alert('Failed to update status');
    }
  };

  // RFQ Status Update
  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      setQuotes(prev => prev.map(q => q.quoteId === quoteId ? { ...q, status: newStatus } : q));
      if (selectedQuoteModal && selectedQuoteModal.quoteId === quoteId) {
        setSelectedQuoteModal({ ...selectedQuoteModal, status: newStatus });
      }

      // Update local storage backup
      try {
        const local = JSON.parse(localStorage.getItem('spinel_submitted_quotes') || '[]');
        const updated = local.map((q: any) => q.quoteId === quoteId ? { ...q, status: newStatus } : q);
        localStorage.setItem('spinel_submitted_quotes', JSON.stringify(updated));
      } catch {
        // ignore
      }
    } catch {
      alert('Failed to update quote status');
    }
  };

  // RFQ Delete
  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm(`Are you sure you want to delete quote request "${quoteId}"? This cannot be undone.`)) {
      return;
    }

    try {
      await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      setQuotes(prev => prev.filter(q => q.quoteId !== quoteId));
      if (selectedQuoteModal && selectedQuoteModal.quoteId === quoteId) {
        setSelectedQuoteModal(null);
      }

      try {
        const local = JSON.parse(localStorage.getItem('spinel_submitted_quotes') || '[]');
        const updated = local.filter((q: any) => q.quoteId !== quoteId);
        localStorage.setItem('spinel_submitted_quotes', JSON.stringify(updated));
      } catch {
        // ignore
      }
    } catch {
      alert('Failed to delete quote request');
    }
  };

  // Product Delete
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product from the master catalog?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        await onRefreshCatalog();
      }
    } catch {
      alert('Delete failed');
    }
  };

  // Clear All Products
  const handleClearAllProducts = async () => {
    if (!window.confirm('Are you sure you want to completely clear ALL products from the catalog? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/products/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        setProducts([]);
        await onRefreshCatalog();
        alert('All products have been cleared successfully.');
      }
    } catch {
      alert('Failed to clear products');
    }
  };

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setAdminProductsPage(1);
  }, [searchQuery, categoryFilter]);

  // Open Edit Product Modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditFormData({
      name: prod.name || '',
      sku: prod.sku || '',
      brand: prod.brand || '',
      category: prod.category || 'Video Surveillance & Cameras',
      subcategory: prod.subcategory || '',
      priceUSD: (prod.priceUSD ?? 0).toString(),
      stock: (prod.stock ?? 0).toString(),
      description: prod.description || '',
      imageUrl: (prod.images && prod.images[0]) || '',
      featuresText: Array.isArray(prod.features) ? prod.features.join('\n') : '',
      isChoice: Boolean(prod.isChoice),
      isBestSeller: Boolean(prod.isBestSeller),
      featured: Boolean(prod.featured)
    });
  };

  // Save Edit Product
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const parsedPrice = parseFloat(editFormData.priceUSD);
    const parsedStock = parseInt(editFormData.stock, 10);

    const updatedPayload = {
      name: editFormData.name.trim(),
      sku: editFormData.sku.trim(),
      brand: editFormData.brand.trim(),
      category: editFormData.category.trim(),
      subcategory: editFormData.subcategory.trim(),
      priceUSD: isNaN(parsedPrice) ? 0 : parsedPrice,
      stock: isNaN(parsedStock) ? 0 : parsedStock,
      description: editFormData.description.trim(),
      images: editFormData.imageUrl.trim() ? [editFormData.imageUrl.trim(), ...(editingProduct.images?.slice(1) || [])] : editingProduct.images,
      features: editFormData.featuresText.split('\n').map(f => f.trim()).filter(Boolean),
      isChoice: editFormData.isChoice,
      isBestSeller: editFormData.isBestSeller,
      featured: editFormData.featured
    };

    setIsSavingProduct(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(updatedPayload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update product');
      }

      const savedProd: Product = await res.json();
      setProducts(prev => prev.map(p => (p.id === editingProduct.id || p.sku === editingProduct.sku) ? { ...p, ...savedProd } : p));
      await onRefreshCatalog();
      setEditingProduct(null);
    } catch (err: any) {
      alert(err.message || 'Error updating product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Filtered inventory list
  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    }
    return true;
  });

  // Master Inventory 100 items per page pagination
  const totalAdminPages = Math.max(1, Math.ceil(filteredProducts.length / ADMIN_PRODUCTS_PER_PAGE));
  const startAdminIndex = (adminProductsPage - 1) * ADMIN_PRODUCTS_PER_PAGE;
  const endAdminIndex = Math.min(startAdminIndex + ADMIN_PRODUCTS_PER_PAGE, filteredProducts.length);
  const paginatedProducts = filteredProducts.slice(startAdminIndex, endAdminIndex);

  // Filtered quotes list
  const filteredQuotes = quotes.filter(q => {
    if (rfqStatusFilter !== 'All' && q.status !== rfqStatusFilter) return false;
    if (rfqSearchQuery) {
      const sq = rfqSearchQuery.toLowerCase();
      return (
        q.quoteId.toLowerCase().includes(sq) ||
        (q.companyName && q.companyName.toLowerCase().includes(sq)) ||
        (q.contactName && q.contactName.toLowerCase().includes(sq)) ||
        (q.email && q.email.toLowerCase().includes(sq)) ||
        (q.product && q.product.name.toLowerCase().includes(sq)) ||
        (q.product && q.product.sku.toLowerCase().includes(sq))
      );
    }
    return true;
  });

  const totalProductsCount = products.length;
  const totalOrdersCount = orders.length;
  const totalRevenueUSD = orders.reduce((acc, o) => acc + (o.totalUSD || 0), 0);
  const totalRevenueNGN = orders.reduce((acc, o) => acc + (o.totalNGN || 0), 0);
  const pendingQuotesCount = quotes.filter(q => q.status === 'Under Review' || q.status === 'Pending').length;

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-100 font-sans flex flex-col lg:flex-row">
      
      {/* 1. MOBILE TOP HEADER BAR WITH DRAWER TOGGLE */}
      <header className="lg:hidden bg-[#1e293b] border-b border-slate-700/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950 text-sm shadow-sm">
            S
          </div>
          <div>
            <span className="font-extrabold text-white text-sm tracking-tight block">
              SPINEL DISTRIBUTION
            </span>
            <span className="text-[10px] text-slate-400">
              Admin Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
            {activeTab === 'inventory' && 'Inventory'}
            {activeTab === 'rfq' && 'Quotes (RFQs)'}
            {activeTab === 'orders' && 'Orders'}
            {activeTab === 'upload' && 'Bulk Upload'}
            {activeTab === 'categories' && 'Categories'}
          </span>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(prev => !prev)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* 2. LEFT SIDEBAR NAVIGATION SECTION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#1e293b] border-r border-slate-700/80 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:h-screen lg:sticky lg:top-0 shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header: Brand & Console Title */}
        <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-slate-950 text-lg shadow-sm">
              S
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-tight block">
                SPINEL DISTRIBUTION
              </span>
              <p className="text-[11px] text-slate-400 font-medium">
                Admin Control Center
              </p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Admin Session Status Pill */}
        <div className="px-5 py-2.5 bg-[#0f172a]/60 border-b border-slate-700/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium text-[11px]">Admin Session Active</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
            Live
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-none">
          <div className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Console Sections
          </div>

          {/* Section 1: Bulk CSV Ingestion */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Upload size={18} className={activeTab === 'upload' ? 'text-slate-950' : 'text-emerald-400'} />
              <div className="text-left">
                <div className="leading-tight">Bulk Ingestion</div>
                <div className={`text-[10px] ${activeTab === 'upload' ? 'text-slate-900/80 font-normal' : 'text-slate-400 font-normal'}`}>
                  CSV &amp; Excel Upload
                </div>
              </div>
            </div>
          </button>

          {/* Section 2: Master Inventory */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package size={18} className={activeTab === 'inventory' ? 'text-slate-950' : 'text-amber-400'} />
              <div className="text-left">
                <div className="leading-tight">Master Inventory</div>
                <div className={`text-[10px] ${activeTab === 'inventory' ? 'text-slate-900/80 font-normal' : 'text-slate-400 font-normal'}`}>
                  Catalog &amp; Stock
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'inventory'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {products.length.toLocaleString()}
            </span>
          </button>

          {/* Section 3: Quote Requests (RFQs) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('rfq');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rfq'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className={activeTab === 'rfq' ? 'text-slate-950' : 'text-amber-400'} />
              <div className="text-left">
                <div className="leading-tight">Quote Requests (RFQs)</div>
                <div className={`text-[10px] ${activeTab === 'rfq' ? 'text-slate-900/80 font-normal' : 'text-slate-400 font-normal'}`}>
                  Client Procurement Quotes
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {pendingQuotesCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'rfq'
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {pendingQuotesCount} new
                </span>
              )}
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'rfq'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {quotes.length}
              </span>
            </div>
          </button>

          {/* Section 4: Customer Orders & Invoices */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('orders');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart size={18} className={activeTab === 'orders' ? 'text-slate-950' : 'text-blue-400'} />
              <div className="text-left">
                <div className="leading-tight">Orders &amp; Invoices</div>
                <div className={`text-[10px] ${activeTab === 'orders' ? 'text-slate-900/80 font-normal' : 'text-slate-400 font-normal'}`}>
                  Fulfillment &amp; PDF Invoices
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'orders'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {orders.length}
            </span>
          </button>

          {/* Section 5: Categories Breakdown */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers size={18} className={activeTab === 'categories' ? 'text-slate-950' : 'text-purple-400'} />
              <div className="text-left">
                <div className="leading-tight">Categories Breakdown</div>
                <div className={`text-[10px] ${activeTab === 'categories' ? 'text-slate-900/80 font-normal' : 'text-slate-400 font-normal'}`}>
                  16 Enterprise Categories
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'categories'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              16
            </span>
          </button>

          {/* Section 6: Email & SMTP Service */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('email-settings');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'email-settings'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <MailCheck size={18} className={activeTab === 'email-settings' ? 'text-slate-950' : 'text-sky-400'} />
              <div className="text-left">
                <div className="leading-tight">Email &amp; SMTP</div>
                <div className={`text-[10px] ${activeTab === 'email-settings' ? 'text-slate-900/80 font-normal' : 'text-slate-400 font-normal'}`}>
                  Live OTP Delivery &amp; Setup
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'email-settings'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}
            >
              SMTP
            </span>
          </button>

          {/* Mini Revenue / Rate summary in sidebar */}
          <div className="pt-3 px-1">
            <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-700/60">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Total Paid Revenue</span>
                <DollarSign size={13} className="text-green-400" />
              </div>
              <div className="text-sm font-extrabold text-white font-mono">
                ${totalRevenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM ACTIONS: REFRESH AND LOGOUT AS REQUESTED */}
        <div className="p-4 border-t border-slate-700/80 bg-[#162032] space-y-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Refresh Catalog and Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-amber-400' : 'text-slate-400'} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={adminLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold py-2.5 px-3 rounded-xl border border-red-500/30 transition-colors cursor-pointer"
            title="Sign Out of Admin Control Center"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col pb-16">
        {/* Desktop Top Header Bar with 20px gutter */}
        <div className="bg-[#1e293b]/90 backdrop-blur-xs border-b border-slate-700/80 px-[20px] py-4 sticky top-0 z-20 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {activeTab === 'inventory' && 'Master Inventory Management'}
              {activeTab === 'rfq' && 'Enterprise Quote Requests & RFQs'}
              {activeTab === 'orders' && 'Customer Orders & Invoices'}
              {activeTab === 'upload' && 'Bulk Product Ingestion'}
              {activeTab === 'categories' && 'Enterprise Hardware Categories'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'inventory' && `Managing ${products.length.toLocaleString()} products across 16 categories`}
              {activeTab === 'rfq' && `${quotes.length} total RFQs received (${pendingQuotesCount} pending review)`}
              {activeTab === 'orders' && `${orders.length} orders recorded with automated PDF invoices`}
              {activeTab === 'upload' && 'Upload CSV or Excel spreadsheets to update master catalog'}
              {activeTab === 'categories' && '16 industrial equipment and security technology categories'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 font-semibold">
              Spinel Admin v2.4
            </span>
          </div>
        </div>

        {/* Content Container with 20px gutter */}
        <div className="w-full px-[20px] pt-6 space-y-6">
          {/* Stat Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Master Products Card */}
            <div 
              onClick={() => setActiveTab('inventory')}
              className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-5 relative overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Catalog Products
                </span>
                <Package size={18} className="text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {totalProductsCount.toLocaleString()}
              </div>
              <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> Confidential Enterprise Catalog Count
              </p>
            </div>

            {/* Quote Requests (RFQs) Card */}
            <div 
              onClick={() => setActiveTab('rfq')}
              className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-5 cursor-pointer hover:border-amber-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Quote Requests (RFQs)
                </span>
                <FileText size={18} className="text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
                {quotes.length}
                {pendingQuotesCount > 0 && (
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {pendingQuotesCount} Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Client procurement &amp; tender quotes
              </p>
            </div>

            {/* Total Orders */}
            <div 
              onClick={() => setActiveTab('orders')}
              className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-5 cursor-pointer hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Orders Recorded
                </span>
                <ShoppingCart size={18} className="text-blue-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">
                {totalOrdersCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tracked with downloadable PDF invoices
              </p>
            </div>

            {/* Total Paid Revenue */}
            <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Paid Revenue (USD / NGN)
                </span>
                <DollarSign size={18} className="text-green-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                ${totalRevenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-green-400 font-mono mt-1">
                ₦{totalRevenueNGN.toLocaleString()}
              </p>
            </div>

          </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: MASTER INVENTORY WITH 100 ITEMS PER PAGE PAGINATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'inventory' && (
          <div className="mt-6 space-y-4">
            
            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e293b] p-4 rounded-xl border border-slate-700/80 text-xs">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search catalog by SKU, Product Name, or Brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#0f172a] border border-slate-700 rounded-lg py-2 px-3 text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="All">All 16 Categories</option>
                  {CATEGORIES.map(c => (
                    <option key={`admin-cat-filter-${c.id ?? c.slug ?? c.name}`} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {products.length > 0 && (
                  <button
                    onClick={handleClearAllProducts}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remove all products from master catalog"
                  >
                    <Trash2 size={14} /> Clear All ({products.length})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Upload Products
                </button>
              </div>
            </div>

            {/* Top Pagination Status & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e293b] px-4 py-3 rounded-xl border border-slate-700/80 text-xs">
              <div className="text-slate-300">
                {filteredProducts.length > 0 ? (
                  <span>
                    Showing <strong className="text-white font-mono">{startAdminIndex + 1}–{endAdminIndex}</strong> of{' '}
                    <strong className="text-white font-mono">{filteredProducts.length.toLocaleString()}</strong> products{' '}
                    <span className="text-slate-500">(Page {adminProductsPage} of {totalAdminPages})</span>
                  </span>
                ) : (
                  <span>No matching products found</span>
                )}
              </div>

              {/* 100 items per page Previous and Next Button Navigation */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdminProductsPage(p => Math.max(1, p - 1))}
                  disabled={adminProductsPage <= 1}
                  className="flex items-center gap-1 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold font-mono px-2.5 py-1 rounded">
                    {adminProductsPage}
                  </span>
                  <span className="text-slate-500 font-mono">/</span>
                  <span className="text-slate-400 font-mono px-1">
                    {totalAdminPages}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setAdminProductsPage(p => Math.min(totalAdminPages, p + 1))}
                  disabled={adminProductsPage >= totalAdminPages}
                  className="flex items-center gap-1 bg-[#0f172a] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Master Inventory Table (20 products per page) */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0f172a] text-slate-400 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Image</th>
                      <th className="py-3 px-4">SKU / ID</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category / Subcategory</th>
                      <th className="py-3 px-4">Price (USD / NGN)</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {paginatedProducts.map((prod, idx) => (
                      <tr key={`${prod.id || 'prod'}-${prod.sku || idx}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <img 
                            src={prod.images[0]} 
                            alt="" 
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 object-contain rounded bg-slate-900 border border-slate-700 p-0.5" 
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{prod.sku}</td>
                        <td className="py-2.5 px-4 font-medium text-white max-w-xs truncate">
                          {prod.name}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-slate-200">{prod.category}</div>
                          <div className="text-[10px] text-slate-400">{prod.subcategory}</div>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-amber-400">
                          {prod.priceUSD && prod.priceUSD > 0 ? (
                            <>
                              ${prod.priceUSD.toFixed(2)}
                              <div className="text-[10px] text-slate-400 font-normal">
                                ₦{Math.round(prod.priceUSD * exchangeRate).toLocaleString()}
                              </div>
                            </>
                          ) : (
                            <span className="text-amber-300 font-semibold text-[11px]">
                              Quote Required
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${prod.stock > 10 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {prod.stock} units
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="text-amber-400 hover:text-amber-300 p-1.5 rounded hover:bg-amber-500/10 cursor-pointer transition-colors"
                              title="Edit product details"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 cursor-pointer transition-colors"
                              title="Delete product"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Package size={32} className="mx-auto mb-2 text-slate-600" />
                          <p className="font-semibold text-slate-300">Catalog is currently empty</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            No products match your search or filter. Use Bulk Upload to ingest new records.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Bar */}
              {filteredProducts.length > 0 && (
                <div className="p-3.5 bg-[#0f172a] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800">
                  <div>
                    Showing {startAdminIndex + 1}–{endAdminIndex} of {filteredProducts.length} filtered items
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminProductsPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      disabled={adminProductsPage <= 1}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="font-mono text-slate-300">
                      Page {adminProductsPage} of {totalAdminPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminProductsPage(p => Math.min(totalAdminPages, p + 1));
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      disabled={adminProductsPage >= totalAdminPages}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 px-3 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: QUOTE REQUESTS (RFQS) SECTION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'rfq' && (
          <div className="mt-6 space-y-4">
            
            {/* Search and Status Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e293b] p-4 rounded-xl border border-slate-700/80 text-xs">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by RFQ ID, Company, Contact, Email, or Product..."
                    value={rfqSearchQuery}
                    onChange={(e) => setRfqSearchQuery(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
                </div>

                <select
                  value={rfqStatusFilter}
                  onChange={(e) => setRfqStatusFilter(e.target.value)}
                  className="bg-[#0f172a] border border-slate-700 rounded-lg py-2 px-3 text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Quoted">Quoted</option>
                  <option value="Approved">Approved</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div className="text-slate-400 text-xs">
                Total RFQs: <strong className="text-white">{filteredQuotes.length}</strong>
              </div>
            </div>

            {/* RFQs Table */}
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/80 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center text-xs">
                <span className="font-bold text-white text-sm">Enterprise Quotations &amp; RFQs</span>
                <span className="text-slate-400">{quotes.length} total requests received</span>
              </div>

              {filteredQuotes.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <FileText size={36} className="mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-300">No quote requests found</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When customers or enterprises submit RFQs via the Request a Quote form, all details appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0f172a] text-slate-400 font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-4">RFQ Ref #</th>
                        <th className="py-3 px-4">Client / Company</th>
                        <th className="py-3 px-4">Requested Hardware</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Timeline</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredQuotes.map((quote, idx) => (
                        <tr key={quote.quoteId || `quote-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {quote.quoteId}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{quote.companyName || 'Private Enterprise'}</div>
                            <div className="text-slate-300">{quote.contactName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail size={12} /> {quote.email}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone size={12} /> {quote.phone}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            {quote.product ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={quote.product.image}
                                  alt=""
                                  className="w-10 h-10 object-contain rounded bg-slate-900 border border-slate-700 p-0.5 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-200 truncate">{quote.product.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">SKU: {quote.product.sku}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Multi-system enterprise package</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {quote.quantity} units
                          </td>
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                              {quote.projectTimeline || 'Standard'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={quote.status}
                              onChange={(e) => handleUpdateQuoteStatus(quote.quoteId, e.target.value)}
                              className={`rounded px-2 py-1 text-xs font-bold outline-none border cursor-pointer ${
                                quote.status === 'Approved'
                                  ? 'bg-green-500/20 text-green-300 border-green-500/40'
                                  : quote.status === 'Quoted'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : quote.status === 'Declined'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              <option value="Under Review" className="bg-[#0f172a] text-slate-200">Under Review</option>
                              <option value="Quoted" className="bg-[#0f172a] text-slate-200">Quoted</option>
                              <option value="Approved" className="bg-[#0f172a] text-slate-200">Approved</option>
                              <option value="Declined" className="bg-[#0f172a] text-slate-200">Declined</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedQuoteModal(quote)}
                                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer font-semibold text-xs"
                                title="View full quote details"
                              >
                                <Eye size={13} /> Details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuote(quote.quoteId)}
                                className="bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 p-1.5 rounded-lg flex items-center transition-colors cursor-pointer text-xs"
                                title="Delete RFQ"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: CUSTOMER ORDERS & INVOICES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="mt-6 space-y-4">
            <div className="bg-[#1e293b] rounded-xl border border-slate-700/80 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center text-xs">
                <span className="font-bold text-white text-sm">All Customer Hardware Orders</span>
                <span className="text-slate-400">Total: {orders.length} orders recorded</span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No orders recorded yet. As customers place orders via Paystack, they appear here in real-time.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0f172a] text-slate-400 font-semibold border-b border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Total (USD / NGN)</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Fulfillment Status</th>
                        <th className="py-3 px-4">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {orders.map((order, idx) => (
                        <tr key={order.id || order.orderNumber || `admin-order-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {order.orderNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{order.customerName}</div>
                            <div className="text-[11px] text-slate-400">{order.customerEmail}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {order.items.length} items
                          </td>
                          <td className="py-3 px-4 font-bold text-amber-400">
                            ${order.totalUSD.toFixed(2)}
                            <div className="text-[10px] text-slate-400 font-normal">
                              ₦{order.totalNGN.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                              className="bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none focus:border-amber-500 cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => downloadInvoicePDF(order)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                              title="Download PDF Invoice"
                            >
                              <Download size={13} className="text-amber-400" /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: BULK INGESTION (CSV & EXCEL) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'upload' && (
          <div className="mt-6 space-y-6">
            
            {/* Top Info Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-800 to-slate-800 border border-amber-500/30 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  Enterprise Ingestion Engine
                </span>
                <h3 className="text-base font-bold text-white">
                  Bulk Product Ingestion (Thousands of Products Supported)
                </h3>
                <p className="text-slate-300 max-w-2xl">
                  Upload CSV or Excel files with hundreds or thousands of rows. The engine maps categories, handles deduplication by SKU, updates existing records, and computes USD/NGN pricing in real-time.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={downloadSampleCSVFile}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Download Sample CSV
                </button>
              </div>
            </div>

            {/* Ingestion Status Alert */}
            {uploadResult && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${uploadResult.success ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                {uploadResult.success ? <CheckCircle2 size={18} className="text-green-400 mt-0.5 shrink-0" /> : <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />}
                <div className="space-y-1">
                  <div className="font-bold">{uploadResult.success ? 'Upload Succeeded!' : 'Upload Error'}</div>
                  <div>{uploadResult.message}</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="font-semibold">Processing and Ingesting Products...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Option 1: File Dropzone */}
              <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-amber-400" />
                    Option 1: Upload Excel (.xlsx) or CSV File
                  </h4>
                  <p className="text-slate-400 text-xs mb-4">
                    Select or drag any spreadsheet file containing product details.
                  </p>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-amber-400 bg-amber-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'}`}
                  >
                    <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                    <span className="text-xs font-semibold text-slate-200 block mb-1">
                      Click to choose file or drag and drop here
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Supports .csv, .xlsx, and .xls (No limit on row count)
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Option 2: Direct CSV Paste */}
              <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                    <FileText size={18} className="text-amber-400" />
                    Option 2: Paste Raw CSV Text
                  </h4>
                  <p className="text-slate-400 text-xs mb-2">
                    Copy and paste thousands of lines directly from chat or spreadsheet.
                  </p>

                  <textarea
                    rows={6}
                    value={pastedCSV}
                    onChange={(e) => setPastedCSV(e.target.value)}
                    placeholder="sku,name,category,subcategory,priceUSD,stock,description&#10;SPN-CAM-001,Axis 4K AI Dome Camera,Video Surveillance & Cameras,Dome Cameras,249.99,50,Industrial camera...&#10;SPN-NVR-002,Hikvision 64-Ch Enterprise NVR,Video Management & Recording,NVRs,,25,Leave price blank for Quote Request..."
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={handlePastedCSVUpload}
                  disabled={!pastedCSV.trim() || isUploading}
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 font-semibold py-2 px-4 rounded-lg text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  Ingest Pasted CSV Text
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: CATEGORIES BREAKDOWN */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'categories' && (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CATEGORIES.map((cat, idx) => {
                const count = products.filter(p => (p.category || '').toLowerCase() === cat.name.toLowerCase()).length;
                return (
                  <div key={cat.id ?? cat.slug ?? `cat-overview-${idx}`} className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={cat.image} 
                        alt="" 
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{cat.name}</h4>
                        <span className="text-amber-400 font-mono font-bold text-sm">
                          {count} Products
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                      {cat.subcategories.length} subcategories:
                      <div className="text-slate-500 truncate mt-0.5">
                        {cat.subcategories.slice(0, 3).join(', ')}...
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: EMAIL & SMTP LIVE CONFIGURATION & TEST DISPATCHER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'email-settings' && (
          <div className="mt-6 space-y-6">
            
            {/* Top Status Header Card */}
            <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${smtpUser ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  <MailCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    cPanel Webmail &amp; SMTP Dispatcher
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${smtpUser ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                      {smtpUser ? 'Configured' : 'Setup Required'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controls 6-digit signup OTP verification delivery, invoice dispatches, and quotation confirmations.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchEmailConfig}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} /> Reload Settings
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {emailStatusMsg && (
              <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 p-4 rounded-xl text-xs flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{emailStatusMsg}</div>
              </div>
            )}

            {emailErrorMsg && (
              <div className="bg-red-950/40 border border-red-500/50 text-red-300 p-4 rounded-xl text-xs flex items-start gap-2.5 shadow-sm">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{emailErrorMsg}</div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form Column (2/3 width) */}
              <div className="lg:col-span-2 bg-[#1e293b] border border-slate-700/80 rounded-xl p-6 space-y-5">
                <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-700/80 pb-3">
                  <Mail size={16} className="text-amber-400" />
                  cPanel Webmail SMTP Credentials
                </h4>

                <form onSubmit={handleSaveEmailConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        SMTP Host / Mail Server *
                      </label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="mail.yourdomain.com (or localhost)"
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Usually <code className="text-amber-400">mail.yourdomain.com</code> or <code className="text-amber-400">localhost</code>
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        SMTP Port *
                      </label>
                      <select
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="465">Port 465 (SSL Direct - Recommended)</option>
                        <option value="587">Port 587 (TLS / STARTTLS)</option>
                        <option value="25">Port 25 (Standard Local)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        cPanel Email Address (Username) *
                      </label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="info@yourdomain.com"
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        The full email address created in cPanel &rarr; Email Accounts
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        cPanel Email Password *
                      </label>
                      <input
                        type="password"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Leave blank to keep existing password unchanged
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      Sender Name &amp; From Header (Optional)
                    </label>
                    <input
                      type="text"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      placeholder='"Spinel Distribution" <info@yourdomain.com>'
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Must match your domain to pass SPF &amp; DMARC checks without rejection
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Saves automatically to <code className="text-amber-400 font-mono">db_config.json</code>
                    </span>
                    <button
                      type="submit"
                      disabled={isSavingEmail}
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingEmail ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>{isSavingEmail ? 'Saving...' : 'Save Email Settings'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Test & Diagnostic Dispatcher (1/3 width) */}
              <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-700/80 pb-3">
                    <Send size={16} className="text-sky-400" />
                    Live Test OTP Dispatcher
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 mb-4">
                    Send a real verification code to your personal email to verify inbox delivery right now:
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1 text-xs">
                        Recipient Test Email:
                      </label>
                      <input
                        type="email"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder="timmypatrick444@gmail.com"
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isTestingEmail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>{isTestingEmail ? 'Connecting & Sending...' : 'Send Live Test OTP'}</span>
                    </button>
                  </div>
                </div>

                {/* Handshake Diagnostic Log */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-3 text-[11px] font-mono space-y-1">
                  <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 text-[10px] uppercase tracking-wider flex items-center justify-between">
                    <span>Server Delivery Log:</span>
                    <span className="text-amber-400">Live Trace</span>
                  </div>
                  {emailLogs.length === 0 ? (
                    <div className="text-slate-500 py-2 text-center text-[10px]">
                      Click &ldquo;Send Live Test OTP&rdquo; to test handshake.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1 pt-1">
                      {emailLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`break-all ${log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('Failed') ? 'text-red-400' : 'text-slate-400'}`}
                        >
                          &gt; {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* RFQ MODAL: FULL QUOTATION DETAILS */}
      {/* ------------------------------------------------------------- */}
      {selectedQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-200 text-xs shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-700 pb-3 sm:pb-4 gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-amber-400 font-mono font-bold text-xs sm:text-sm break-all">
                  {selectedQuoteModal.quoteId}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                  RFQ Quotation Details
                </h3>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Submitted on {selectedQuoteModal.date || 'Recent'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuoteModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto py-4 space-y-4 pr-1">
              {/* Client & Organization Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Client Contact
                  </span>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
                    <Building size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate">{selectedQuoteModal.companyName || 'Private Enterprise'}</span>
                  </div>
                  <div className="text-slate-300 font-medium truncate">
                    {selectedQuoteModal.contactName}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 break-all">
                    <Mail size={13} className="shrink-0 text-slate-500" />
                    <span>{selectedQuoteModal.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 break-all">
                    <Phone size={13} className="shrink-0 text-slate-500" />
                    <span>{selectedQuoteModal.phone}</span>
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Project Logistics
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{selectedQuoteModal.location || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar size={13} className="text-amber-400 shrink-0" />
                    <span>Timeline: {selectedQuoteModal.projectTimeline}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <DollarSign size={13} className="text-amber-400 shrink-0" />
                    <span>Preferred Currency: {selectedQuoteModal.currency || 'USD'}</span>
                  </div>
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {selectedQuoteModal.needsInstallation && (
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                        Needs Installation
                      </span>
                    )}
                    {selectedQuoteModal.needsPartnerDiscount && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                        Partner Pricing Requested
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Item Requested */}
              {selectedQuoteModal.product && (
                <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Hardware Specification
                  </span>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <img
                        src={selectedQuoteModal.product.image}
                        alt=""
                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-lg bg-slate-900 border border-slate-700 p-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs sm:text-sm break-words line-clamp-2">
                          {selectedQuoteModal.product.name}
                        </h4>
                        <div className="text-slate-400 text-xs mt-0.5">
                          Brand: <strong className="text-slate-200">{selectedQuoteModal.product.brand}</strong> • Category: {selectedQuoteModal.product.category}
                        </div>
                        <div className="font-mono text-amber-400 font-bold text-xs mt-0.5">
                          SKU: {selectedQuoteModal.product.sku}
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto bg-slate-800/80 sm:bg-transparent px-3 py-2 sm:p-0 rounded-lg flex sm:flex-col justify-between sm:items-end items-center shrink-0 border sm:border-0 border-slate-700/50">
                      <span className="text-xs text-slate-400 block">Requested Volume</span>
                      <span className="text-base sm:text-lg font-extrabold text-white">
                        {selectedQuoteModal.quantity} units
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Project Notes */}
              {selectedQuoteModal.notes && (
                <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Client Technical Notes &amp; Scope
                  </span>
                  <p className="text-slate-300 leading-relaxed italic break-words text-xs">
                    "{selectedQuoteModal.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-700 shrink-0">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-slate-400 text-xs shrink-0">Status:</span>
                <select
                  value={selectedQuoteModal.status}
                  onChange={(e) => handleUpdateQuoteStatus(selectedQuoteModal.quoteId, e.target.value)}
                  className="bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none cursor-pointer flex-1 sm:flex-initial"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Quoted">Quoted</option>
                  <option value="Approved">Approved</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteQuote(selectedQuoteModal.quoteId)}
                  className="bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Trash2 size={14} /> Delete RFQ
                </button>
                <button
                  type="button"
                  onClick={() => downloadQuotationPDF(selectedQuoteModal)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
                  title="Download quotation in PDF format"
                >
                  <Download size={14} /> Print Quotation (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuoteModal(null)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EDIT PRODUCT MODAL: INVENTORY MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-200 text-xs space-y-5 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-700 pb-3">
              <div>
                <span className="text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                  SKU: {editingProduct.sku}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Edit Product Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Product Title / Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* SKU & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">SKU / Model Number *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.sku}
                    onChange={e => setEditFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Brand / Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.brand}
                    onChange={e => setEditFormData(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Category *</label>
                  <select
                    value={editFormData.category}
                    onChange={e => {
                      const newCat = e.target.value;
                      const catDef = CATEGORIES.find(c => c.name === newCat);
                      setEditFormData(prev => ({ 
                        ...prev, 
                        category: newCat,
                        subcategory: catDef && catDef.subcategories.length > 0 ? catDef.subcategories[0] : ''
                      }));
                    }}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={`edit-cat-${c.name}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={editFormData.subcategory}
                    onChange={e => setEditFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    list="subcat-options"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs"
                    placeholder="e.g. Dome IP Cameras"
                  />
                  <datalist id="subcat-options">
                    {CATEGORIES.find(c => c.name === editFormData.category)?.subcategories.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Price USD and Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">Price (USD) *</label>
                    <span className="text-[10px] text-green-400 font-mono">
                      ≈ ₦{Math.round((parseFloat(editFormData.priceUSD) || 0) * exchangeRate).toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.priceUSD}
                    onChange={e => setEditFormData(prev => ({ ...prev, priceUSD: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Available Stock (Units) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={editFormData.stock}
                    onChange={e => setEditFormData(prev => ({ ...prev, stock: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white font-mono outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* Primary Image URL & Preview */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Primary Image URL</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editFormData.imageUrl}
                    onChange={e => setEditFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                    placeholder="https://..."
                  />
                  {editFormData.imageUrl && (
                    <img
                      src={editFormData.imageUrl}
                      alt="Preview"
                      className="w-10 h-10 object-contain rounded bg-slate-900 border border-slate-700 p-0.5 shrink-0"
                      onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs resize-y"
                  placeholder="Comprehensive technical specifications and application..."
                />
              </div>

              {/* Bullet Features */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Key Features / Highlights (one per line)</label>
                <textarea
                  rows={3}
                  value={editFormData.featuresText}
                  onChange={e => setEditFormData(prev => ({ ...prev, featuresText: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-amber-500 text-xs font-mono resize-y"
                  placeholder="4K Ultra-HD Resolution&#10;Power-over-Ethernet (PoE)&#10;Smart AI Human/Vehicle Detection"
                />
              </div>

              {/* Badges / Flags */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editFormData.isChoice}
                    onChange={e => setEditFormData(prev => ({ ...prev, isChoice: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>Spinel Choice Badge</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editFormData.isBestSeller}
                    onChange={e => setEditFormData(prev => ({ ...prev, isBestSeller: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>Best Seller Badge</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editFormData.featured}
                    onChange={e => setEditFormData(prev => ({ ...prev, featured: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <span>Featured Product</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSavingProduct ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isSavingProduct ? 'Saving Changes...' : 'Save Product Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
