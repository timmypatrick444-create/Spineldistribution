import React from 'react';

export interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
  onSelectCategory?: (category?: string, subcategory?: string) => void;
  noMarginTop?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onSelectCategory, noMarginTop = false }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (category?: string, subcategory?: string) => {
    if (onSelectCategory) {
      onSelectCategory(category, subcategory);
    } else {
      onNavigate('catalog');
    }
    scrollToTop();
  };

  const handleQuickHelp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const phone = '2348169632070';
    const message = encodeURIComponent('Hello Spinel Distribution Support, I need assistance with...');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className={`${noMarginTop ? 'mt-0' : 'mt-12'} bg-[#232f3e] text-white font-sans w-full`}>
      {/* Back to top banner */}
      <div 
        onClick={scrollToTop}
        className="bg-[#37475a] hover:bg-[#485769] text-center py-3.5 text-xs sm:text-sm text-white font-medium cursor-pointer transition-colors select-none"
      >
        Back to top
      </div>

      {/* Main Footer Container - perfectly aligned on Mobile, Tablet & Desktop */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 text-sm">
        
        {/* Column 1: Spinel Logo, Company Description & Social Media Navigation */}
        <div className="flex flex-col justify-between">
          <div>
            <div 
              onClick={() => { onNavigate('home'); scrollToTop(); }}
              className="inline-flex items-center gap-2.5 mb-3.5 cursor-pointer"
              title="Spinel Distribution - Return to Homepage"
            >
              <img 
                src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1788619290/Spinel_Distribution.jpg"
                alt="Spinel Distribution Logo"
                className="h-8.5 sm:h-9 w-auto object-contain bg-white p-0.5 rounded shadow-sm shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="font-extrabold tracking-tight text-white text-sm sm:text-base leading-tight uppercase font-sans whitespace-nowrap">
                SPINEL DISTRIBUTION
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4 max-w-sm">
              Spinel Distribution Ltd is a global ICT Distribution company. We are a leading provider of ICT and Engineering products, security surveillance, Ex-communication system and equipment for the hazardous zones.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="flex items-center gap-2.5 mt-2 pt-1">
            {/* Facebook */}
            <a 
              href="https://web.facebook.com/profile.php?id=61558951755204"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Spinel Distribution on Facebook"
              className="w-8 h-8 rounded-full bg-[#37475a] hover:bg-[#1877f2] hover:text-white text-gray-300 flex items-center justify-center transition-all duration-200"
              title="Facebook"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* Instagram */}
            <a 
              href="https://www.instagram.com/spineldistribution"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Spinel Distribution on Instagram"
              className="w-8 h-8 rounded-full bg-[#37475a] hover:bg-[#e4405f] hover:text-white text-gray-300 flex items-center justify-center transition-all duration-200"
              title="Instagram"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            {/* X (formerly Twitter) */}
            <a 
              href="https://x.com/SpinelDistrLtd"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Spinel Distribution on X"
              className="w-8 h-8 rounded-full bg-[#37475a] hover:bg-black hover:text-white text-gray-300 flex items-center justify-center transition-all duration-200"
              title="X"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a 
              href="https://www.linkedin.com/company/spineldistribution"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Spinel Distribution on LinkedIn"
              className="w-8 h-8 rounded-full bg-[#37475a] hover:bg-[#0077b5] hover:text-white text-gray-300 flex items-center justify-center transition-all duration-200"
              title="LinkedIn"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.762-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>

            {/* YouTube */}
            <a 
              href="https://www.youtube.com/@SpinelDistributionLtd"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Spinel Distribution on YouTube"
              className="w-8 h-8 rounded-full bg-[#37475a] hover:bg-[#ff0000] hover:text-white text-gray-300 flex items-center justify-center transition-all duration-200"
              title="YouTube"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Column 2: Our Product */}
        <div>
          <h4 className="font-bold text-base mb-3 text-white tracking-wide">Our Product</h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300">
            <li 
              onClick={() => handleCategoryClick('Enclosures & Housings', 'IT Racks')}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              IT Racks
            </li>
            <li 
              onClick={() => handleCategoryClick('Access Control & Door Security')}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Access Control
            </li>
            <li 
              onClick={() => handleCategoryClick('Video Management Software (VMS)')}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Video Management System(VMS)
            </li>
            <li 
              onClick={() => handleCategoryClick('Enclosures & Housings', 'Equipment Enclosures')}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Enclosures
            </li>
            <li 
              onClick={() => handleCategoryClick('Enclosures & Housings', 'Junction Boxes')}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Junction Boxes
            </li>
            <li 
              onClick={() => handleCategoryClick('Public Address (PAGA) System')}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Ex-Proof Telephone
            </li>
          </ul>
        </div>

        {/* Column 3: Get to know us */}
        <div>
          <h4 className="font-bold text-base mb-3 text-white tracking-wide">Get to know us</h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300">
            <li 
              onClick={() => { onNavigate('about'); scrollToTop(); }}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              About Us
            </li>
            <li 
              onClick={() => { onNavigate('contact'); scrollToTop(); }}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Contact Us
            </li>
            <li 
              onClick={() => { onNavigate('quote'); scrollToTop(); }}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Request Quote
            </li>
            <li 
              onClick={() => handleCategoryClick(undefined, undefined)}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Enterprise Store
            </li>
          </ul>
        </div>

        {/* Column 4: Let Us Help You */}
        <div>
          <h4 className="font-bold text-base mb-3 text-white tracking-wide">
            Let Us Help You
          </h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300">
            <li 
              onClick={() => { onNavigate('orders'); scrollToTop(); }}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Your Orders &amp; Invoices
            </li>
            <li 
              onClick={() => { onNavigate('terms-of-use'); scrollToTop(); }}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Terms of Use
            </li>
            <li 
              onClick={() => { onNavigate('privacy-policy'); scrollToTop(); }}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Privacy Policy
            </li>
            <li 
              onClick={handleQuickHelp}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              Quick Help
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal bar with 20px gutter */}
      <div className="bg-[#131921] px-4 sm:px-6 lg:px-8 py-6 text-center text-xs sm:text-sm text-gray-400 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-2">
           © 2026 SPINEL DISTRIBUTION Limited. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
