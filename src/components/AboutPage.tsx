import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Flame, 
  Server, 
  Radio, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  Globe2,
  Users2,
  HardHat,
  PhoneCall
} from 'lucide-react';

export interface AboutPageProps {
  onNavigate: (view: string, param?: string) => void;
  onSelectCategory?: (category?: string, subcategory?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onSelectCategory }) => {
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    // Trigger smooth professional entrance slide immediately after mount
    const timer = setTimeout(() => {
      setSlideIn(true);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full bg-[#f8f9fa] text-gray-900 font-sans pb-16">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs sm:text-sm text-gray-600 flex items-center gap-2">
          <button 
            onClick={() => onNavigate('home')} 
            className="hover:text-[#c45500] hover:underline cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">About Spinel Distribution</span>
        </div>
      </div>

      {/* Hero Banner with Desktop Slide-in Image */}
      <div className="bg-gradient-to-r from-[#131921] via-[#1f2937] to-[#232f3e] text-white py-12 sm:py-16 md:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Hero Text Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-400 text-xs sm:text-sm font-semibold mb-4 border border-white/10">
                <Globe2 className="w-4 h-4" /> Global ICT &amp; Industrial Engineering Distribution
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
                Engineering Safety, Connectivity &amp; Industrial Protection
              </h1>
              <p className="mt-4 text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed">
                Spinel Distribution Ltd is a global ICT Distribution company. We are a leading provider of ICT and Engineering products, security surveillance, Ex-communication systems, and heavy-duty equipment for hazardous zones.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => onNavigate('catalog')}
                  className="px-6 py-3 bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold rounded-lg text-sm sm:text-base shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  Explore Products <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-sm sm:text-base border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  Contact Our Engineers <PhoneCall className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop Hero Image with Professional Entrance Slide & Engraved Background Blend */}
            <div className="hidden lg:flex lg:col-span-5 items-end justify-center relative self-end">
              <div 
                className={`transition-all duration-1000 ease-out transform ${
                  slideIn 
                    ? 'translate-x-0 opacity-100 scale-100' 
                    : 'translate-x-20 opacity-0 scale-95'
                } relative flex flex-col items-center justify-end w-full`}
              >
                <div className="relative w-full flex items-end justify-center">
                  {/* Subtle ambient backlight glow */}
                  <div className="absolute -inset-2 bg-gradient-to-tr from-amber-500/15 via-blue-500/10 to-transparent rounded-3xl filter blur-2xl opacity-60 pointer-events-none"></div>

                  {/* Engraved hero image with transparent bottom fade */}
                  <div 
                    className="relative overflow-hidden flex items-end justify-center"
                    style={{
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.6) 78%, rgba(0,0,0,0) 98%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.6) 78%, rgba(0,0,0,0) 98%)'
                    }}
                  >
                    <img
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1792855297/Engr_Dotun.png"
                      alt="Engr. Dotun - Spinel Distribution Ltd"
                      className="relative h-[460px] lg:h-[500px] xl:h-[540px] w-auto max-w-full object-contain object-bottom drop-shadow-2xl"
                      loading="eager"
                    />

                    {/* Gradient overlay ensuring seamless engraved blend into hero dark background */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1f2937] via-[#1f2937]/70 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corporate Overview Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Global Distribution Network</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Serving enterprise clients, defense, oil &amp; gas, infrastructure, and telecommunications contractors across EMEA with authorized OEM warranties and expedited logistics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ex-Proof &amp; Hazardous Zone Specialists</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Certified equipment for ATEX, IECEx, and Class I Div 1/2 environments including explosion-protected cameras, terminal boxes, and harsh environment PAGA intercoms.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Enterprise Security &amp; Telecom</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Complete physical security portfolios: high-definition IP video surveillance, biometric access control, IT server racks, and data center modular architectures.
            </p>
          </div>
        </div>
      </div>

      {/* Core Technology Divisions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Our Core Product Divisions</h2>
          <p className="mt-3 text-base text-gray-600">
            We partner with premier global manufacturers to supply genuine hardware, factory warranties, and technical project consultation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Division 1 */}
          <div 
            onClick={() => onSelectCategory ? onSelectCategory('Enclosures & Housings', 'IT Racks') : onNavigate('catalog')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#febd69] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 group-hover:text-[#c45500] transition-colors">IT Racks &amp; Data Centers</h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Server cabinets, open frame racks, high-density GenAI GPU enclosures, and modular container PODs.
            </p>
            <span className="text-xs font-semibold text-blue-600 group-hover:text-[#c45500] flex items-center gap-1">
              Explore IT Racks &rarr;
            </span>
          </div>

          {/* Division 2 */}
          <div 
            onClick={() => onSelectCategory ? onSelectCategory('Enclosures & Housings') : onNavigate('catalog')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#febd69] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <HardHat className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 group-hover:text-[#c45500] transition-colors">Industrial Enclosures &amp; Junctions</h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              NEMA 4/4X stainless enclosures, Krydon non-metallic boxes, and ATEX/IECEx explosion-proof junction housings.
            </p>
            <span className="text-xs font-semibold text-blue-600 group-hover:text-[#c45500] flex items-center gap-1">
              Explore Enclosures &rarr;
            </span>
          </div>

          {/* Division 3 */}
          <div 
            onClick={() => onSelectCategory ? onSelectCategory('Public Address (PAGA) System') : onNavigate('catalog')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#febd69] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 group-hover:text-[#c45500] transition-colors">Ex-Communication &amp; PAGA</h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Explosion-proof hazardous telephones, emergency paging stations, marine PA sounders, and beacons.
            </p>
            <span className="text-xs font-semibold text-blue-600 group-hover:text-[#c45500] flex items-center gap-1">
              Explore PAGA Systems &rarr;
            </span>
          </div>

          {/* Division 4 */}
          <div 
            onClick={() => onSelectCategory ? onSelectCategory('Access Control & Door Security') : onNavigate('catalog')}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#febd69] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 group-hover:text-[#c45500] transition-colors">Surveillance &amp; Access Control</h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              High-definition optical and thermal cameras, VMS software licenses, biometric readers, and smart credentials.
            </p>
            <span className="text-xs font-semibold text-blue-600 group-hover:text-[#c45500] flex items-center gap-1">
              Explore Security &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Why Choose Spinel Distribution */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                <Award className="w-4 h-4" /> Proven Enterprise Standards
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Why Systems Integrators &amp; EPC Contractors Rely on Spinel
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6">
                From oil refineries and offshore drilling platforms to multinational data center operators and high-security government facilities, we eliminate supply chain friction with genuine, certified industrial hardware.
              </p>

              <div className="space-y-3">
                {[
                  'Direct OEM partnerships and authentic manufacturer warranties',
                  'Full technical compliance documents: ATEX, IECEx, UL, CSA, NEMA, and CE',
                  'Flexible commercial procurement with dual USD ($) and NGN (₦) billing',
                  'Fast-turnaround Request a Quote (RFQ) system with formal PDF tax invoices',
                  'Dedicated engineering support and project bill-of-materials (BOM) sizing'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#131921] to-[#232f3e] p-8 rounded-xl text-white">
              <h4 className="text-xl font-bold mb-4 text-[#febd69]">Corporate Fast Facts</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="border-b border-gray-700 pb-4">
                  <div className="text-3xl font-extrabold text-white">100%</div>
                  <div className="text-xs text-gray-400 mt-1">Authorized &amp; Genuine Products</div>
                </div>
                <div className="border-b border-gray-700 pb-4">
                  <div className="text-3xl font-extrabold text-white">5,000+</div>
                  <div className="text-xs text-gray-400 mt-1">Industrial SKUs in Catalog</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white">Dual</div>
                  <div className="text-xs text-gray-400 mt-1">USD &amp; NGN Settlement</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white">24/7</div>
                  <div className="text-xs text-gray-400 mt-1">Online RFQ &amp; Instant Invoicing</div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onNavigate('quote')}
                  className="flex-1 px-4 py-2.5 bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold rounded-lg text-sm transition-colors text-center cursor-pointer"
                >
                  Request a Project Quote
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-sm border border-white/20 transition-colors text-center cursor-pointer"
                >
                  Reach Our Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
