import React from 'react';

export interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
  noMarginTop?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, noMarginTop = false }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`${noMarginTop ? 'mt-0' : 'mt-12'} bg-[#232f3e] text-white font-sans`}>
      {/* Back to top banner */}
      <div 
        onClick={scrollToTop}
        className="bg-[#37475a] hover:bg-[#485769] text-center py-3.5 text-xs sm:text-sm text-white font-medium cursor-pointer transition-colors"
      >
        Back to top
      </div>

      {/* Main Footer Links with 20px gutter */}
      <div className="w-full px-[20px] py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-bold text-base mb-3 text-white">Get to Know Us</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
            <li className="hover:underline cursor-pointer">About Spinel Distribution</li>
            <li className="hover:underline cursor-pointer">Enterprise Security Solutions</li>
            <li className="hover:underline cursor-pointer">Renewable Solar &amp; Inverter Tech</li>
            <li className="hover:underline cursor-pointer">Corporate Compliance</li>
            <li className="hover:underline cursor-pointer">Spinel Science &amp; Engineering</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-base mb-3 text-white">Make Money with Us</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
            <li className="hover:underline cursor-pointer">Certified System Integrator Program</li>
            <li className="hover:underline cursor-pointer">OEM &amp; Brand Partnerships</li>
            <li className="hover:underline cursor-pointer">Bulk Procurement for Projects</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-base mb-3 text-white">Spinel Payment Products</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
            <li className="hover:underline cursor-pointer">USD ($) &amp; NGN (₦) Billing</li>
            <li className="hover:underline cursor-pointer">Corporate Invoicing &amp; Wire Transfer</li>
            <li className="hover:underline cursor-pointer">Reload Your Enterprise Balance</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-base mb-3 text-white">Let Us Help You</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
            <li 
              onClick={() => onNavigate('orders')}
              className="hover:underline cursor-pointer"
            >
              Your Account &amp; Orders
            </li>
            <li className="hover:underline cursor-pointer">Shipping Rates &amp; Policies</li>
            <li className="hover:underline cursor-pointer">3-Year Warranty Terms</li>
            <li className="hover:underline cursor-pointer">Download Tax Invoices (PDF)</li>
            <li className="hover:underline cursor-pointer">Technical Support Help Center</li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal bar with 20px gutter */}
      <div className="bg-[#131921] px-[20px] py-6 text-center text-xs sm:text-sm text-gray-400 border-t border-gray-800">
        <div className="flex flex-wrap justify-center gap-6 mb-2">
          <span className="hover:underline cursor-pointer">Conditions of Use</span>
          <span className="hover:underline cursor-pointer">Privacy Notice</span>
          <span className="hover:underline cursor-pointer">Enterprise Security Statement</span>
          <span className="hover:underline cursor-pointer">Supply Chain Transparency</span>
        </div>
        <p className="text-xs text-gray-500">
          © 2026, SPINEL DISTRIBUTION Inc. or its affiliates. All hardware specs, certifications, and brand names belong to their respective manufacturers.
        </p>
      </div>
    </footer>
  );
};
