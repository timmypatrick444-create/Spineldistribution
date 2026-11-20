import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, User, ArrowLeft, Home } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { useAuth } from '../context/AuthContext';
import { CategoryDefinition } from '../types';

export interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryName: string, subcategoryName?: string) => void;
  onNavigate: (view: string) => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  onNavigate
}) => {
  const { user, customerLogout } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryDefinition | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Category & Store Navigation Menu"
      className="fixed inset-0 z-[100] flex"
    >
      {/* Dimmed Overlay */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/65 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        
        {/* Drawer Header (Navy) */}
        <div className="bg-[#232f3e] text-white px-6 py-4 flex items-center justify-between shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <User aria-hidden="true" size={20} className="text-white" />
              </div>
              <div className="font-bold text-base">
                {`Hello, ${user.fullName}`}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onNavigate('login');
                onClose();
              }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 text-left rounded"
            >
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <User aria-hidden="true" size={20} className="text-white" />
              </div>
              <span className="font-bold text-base">
                Hello, Sign In
              </span>
            </button>
          )}
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="text-gray-200 hover:text-white p-2 rounded-full hover:bg-gray-700/50 cursor-pointer"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Categories Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-200 text-sm">
          
          {activeCategory ? (
            /* Subcategory drilldown view */
            <div>
              <button
                onClick={() => setActiveCategory(null)}
                className="w-full px-6 py-3 bg-gray-50 flex items-center gap-2 text-xs font-bold text-gray-700 hover:bg-gray-100 border-b border-gray-200"
              >
                <ArrowLeft size={16} />
                MAIN MENU
              </button>

              <div className="px-6 py-3 font-bold text-gray-900 text-base">
                {activeCategory.name}
              </div>

              <div className="py-2">
                <button
                  onClick={() => {
                    onSelectCategory(activeCategory.name);
                    onClose();
                  }}
                  className="w-full text-left px-6 py-2.5 font-bold text-blue-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  See all in {activeCategory.name}
                </button>

                {activeCategory.subcategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      onSelectCategory(activeCategory.name, sub);
                      onClose();
                    }}
                    className="w-full text-left px-6 py-2 text-gray-700 hover:bg-gray-100 hover:text-black flex items-center justify-between"
                  >
                    <span>{sub}</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Main Menu View */
            <div className="py-2">
              {/* Home Page Navigation */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(null);
                  onNavigate('home');
                  onClose();
                }}
                className="w-full text-left px-6 py-3 font-semibold text-gray-900 hover:bg-amber-50 hover:text-amber-800 flex items-center justify-between transition-colors border-b border-gray-100 group"
              >
                <div className="flex items-center gap-3">
                  <Home size={18} className="text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-gray-900 group-hover:text-amber-800">Home</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-amber-600" />
              </button>

              <div className="px-6 pt-3 pb-2 font-bold text-gray-900 uppercase tracking-wider text-xs">
                Shop By Category
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectCategory('All');
                  onClose();
                }}
                className="w-full text-left px-6 py-3 text-[#b12704] font-bold hover:bg-amber-50 flex items-center justify-between transition-colors border-b border-gray-100"
              >
                <span>All Products</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>

              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className="w-full text-left px-6 py-3 text-gray-800 hover:bg-gray-100 hover:text-black flex items-center justify-between transition-colors"
                >
                  <span className="font-medium">{cat.name}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}

              <div className="border-t border-gray-200 mt-3 pt-3">
                <div className="px-6 py-2 font-bold text-gray-900 text-base uppercase tracking-wider text-xs">
                  Enterprise Services &amp; Settings
                </div>
                <button
                  onClick={() => { onNavigate('quote'); onClose(); }}
                  className="w-full text-left px-6 py-2.5 text-gray-800 font-medium hover:bg-gray-100 flex items-center justify-between"
                >
                  <span className="text-[#b12704] font-semibold">Request Enterprise Quote (RFQ)</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => { onNavigate('orders'); onClose(); }}
                  className="w-full text-left px-6 py-2.5 text-gray-700 hover:bg-gray-100"
                >
                  Your Orders &amp; Invoices
                </button>
                <button
                  onClick={() => { onNavigate('about'); onClose(); }}
                  className="w-full text-left px-6 py-2.5 text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>About Spinel</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => { onNavigate('contact'); onClose(); }}
                  className="w-full text-left px-6 py-2.5 text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>Contact &amp; Support</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                {!user ? (
                  <>
                    <button
                      onClick={() => { onNavigate('login'); onClose(); }}
                      className="w-full text-left px-6 py-2.5 text-gray-800 font-bold hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Sign In</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => { onNavigate('signup'); onClose(); }}
                      className="w-full text-left px-6 py-2.5 text-amber-700 font-bold hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>Create Enterprise Account</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { customerLogout(); onClose(); }}
                    className="w-full text-left px-6 py-2.5 text-red-600 font-semibold hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
