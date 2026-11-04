import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  ExternalLink,
  ChevronRight,
  Search
} from 'lucide-react';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

interface OrdersPageProps {
  onSelectProductById: (productId: string) => void;
  onContinueShopping: () => void;
  onViewInvoice?: (order: Order) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  onSelectProductById,
  onContinueShopping,
  onViewInvoice
}) => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchOrder, setSearchOrder] = useState<string>('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const emailQuery = user ? `?email=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`/api/orders${emailQuery}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.warn('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (searchOrder) {
      const q = searchOrder.toLowerCase();
      const matchNum = order.orderNumber.toLowerCase().includes(q);
      const matchItem = order.items.some(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      if (!matchNum && !matchItem) return false;
    }
    return true;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-md flex items-center gap-1.5"><CheckCircle size={15} /> Delivered</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-md flex items-center gap-1.5"><Truck size={15} /> Shipped / In Transit</span>;
      case 'processing':
        return <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-md flex items-center gap-1.5"><Clock size={15} /> Processing</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-sm font-bold px-3 py-1 rounded-md flex items-center gap-1.5"><Clock size={15} /> Pending</span>;
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-gray-200 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Your Orders &amp; Tax Invoices</h1>
          <p className="text-base sm:text-lg text-gray-600 mt-2">
            Track hardware dispatches, view shipment stages, and download official PDF tax invoices.
          </p>
        </div>

        {/* Filter and search */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Search all orders..."
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base text-gray-800 pl-10 outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 w-64 shadow-xs"
            />
            <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-base text-gray-800 outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 bg-white cursor-pointer shadow-xs font-semibold"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-lg sm:text-xl text-gray-500 font-semibold">
          Loading your order history...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-14 text-center rounded-2xl border border-gray-200 space-y-5 shadow-xs">
          <Package size={56} className="mx-auto text-gray-400" />
          <h3 className="text-2xl font-bold text-gray-800">No orders found</h3>
          <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
            {searchOrder || filterStatus !== 'all' 
              ? 'Try changing your search keywords or status filter.'
              : 'You have not placed any hardware orders yet.'}
          </p>
          <button
            type="button"
            onClick={onContinueShopping}
            className="bg-[#ffd814] hover:bg-[#f7ca00] text-gray-900 font-bold py-3 px-8 rounded-full border border-[#fcd200] text-base cursor-pointer shadow-sm transition-all"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredOrders.map((order, idx) => (
            <div 
              key={order.id || order.orderNumber || `order-card-${idx}`}
              className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden text-base sm:text-lg"
            >
              {/* Order Header Bar */}
              <div className="bg-gray-100/90 p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-6 text-gray-700">
                <div className="flex flex-wrap items-center gap-8 sm:gap-14">
                  <div>
                    <span className="block text-xs sm:text-sm uppercase tracking-wider text-gray-500 font-bold mb-1">Order Placed</span>
                    <span className="font-bold text-gray-900 text-base sm:text-lg">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs sm:text-sm uppercase tracking-wider text-gray-500 font-bold mb-1">Total (Free Shipping)</span>
                    <span className="font-extrabold text-gray-900 text-lg sm:text-2xl">
                      {formatPrice(order.subtotalUSD ?? order.totalUSD)}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs sm:text-sm uppercase tracking-wider text-gray-500 font-bold mb-1">Ship To</span>
                    <span className="font-bold text-gray-900 text-base sm:text-lg">
                      {order.shippingAddress.fullName}
                    </span>
                  </div>
                </div>

                {/* Right Header: Order # & Download PDF */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-right">
                    <span className="block text-sm sm:text-base font-bold text-gray-900">Order # {order.orderNumber}</span>
                    <span className="text-xs sm:text-sm text-gray-500 font-mono">Ref: {order.paymentReference || 'N/A'}</span>
                  </div>

                  {/* PDF Download and View Invoice Buttons */}
                  <div className="flex items-center gap-3">
                    {onViewInvoice && (
                      <button
                        type="button"
                        onClick={() => onViewInvoice(order)}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2.5 px-4 rounded-xl border border-amber-500 shadow-xs flex items-center gap-2 cursor-pointer text-sm sm:text-base transition-colors"
                      >
                        <FileText size={17} />
                        <span>View Invoice</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => downloadInvoicePDF(order)}
                      className="bg-white hover:bg-gray-50 text-gray-800 font-bold py-2.5 px-4 rounded-xl border border-gray-300 shadow-xs flex items-center gap-2 cursor-pointer text-sm sm:text-base transition-colors"
                    >
                      <Download size={17} className="text-[#c45500]" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Body */}
              <div className="p-7 space-y-6">
                
                {/* Status line */}
                <div className="flex items-center justify-between pb-5 border-b border-gray-100 flex-wrap gap-3 text-base sm:text-lg">
                  <div className="flex items-center gap-3.5">
                    {getStatusBadge(order.status)}
                    <span className="text-gray-700">
                      Estimated Delivery:{' '}
                      <strong className="text-gray-900 font-bold">
                        {new Date(order.estimatedDelivery).toLocaleDateString()}
                      </strong>
                    </span>
                  </div>

                  <div className="text-sm sm:text-base text-gray-600">
                    Payment: <strong className="text-green-700 capitalize font-bold">{order.paymentStatus}</strong> via {order.paymentMethod}
                  </div>
                </div>

                {/* Products list */}
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-5 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-5 sm:gap-6">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl border border-gray-200 p-2 shrink-0 bg-gray-50" 
                        />
                        <div>
                          <h4 
                            onClick={() => onSelectProductById(item.productId)}
                            className="font-bold text-gray-900 hover:text-[#c45500] cursor-pointer line-clamp-1 text-lg sm:text-xl"
                          >
                            {item.name}
                          </h4>
                          <p className="text-gray-500 text-sm sm:text-base mt-1.5">
                            SKU: <span className="font-mono text-gray-700">{item.sku}</span> | Qty: <strong className="text-gray-900 font-bold">{item.quantity}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black text-gray-900 text-lg sm:text-2xl">
                          {formatPrice(item.priceUSD * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
