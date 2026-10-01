import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Check, 
  ShieldCheck, 
  Zap, 
  Truck, 
  Flame,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  CheckCircle2
} from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { CATEGORIES } from '../data/categories';
import { ProductSliderSection } from './ProductSliderSection';

interface HomePageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categoryName: string, subcategoryName?: string) => void;
  onNavigate: (view: string, param?: string) => void;
  onRequestQuote?: (product: Product) => void;
}

const HERO_SLIDES = [
  {
    id: 1,
    title: 'Intelligent Video Surveillance',
    subtitle: 'Ultra low-light Starlight sensors, vehicle classification & facial recognition',
    ctaText: 'Explore Cameras & NVRs',
    category: 'Video Surveillance & Cameras',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1789723359/cctv.png',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 2,
    title: 'Smart Hybrid Solar Inverters',
    subtitle: '10kW 3-Phase Pure Sine Wave Inverters with 5.12kWh 6,000-Cycle Lithium Batteries',
    ctaText: 'Shop Renewable Energy',
    category: 'Renewable Energy',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1789723360/solar.png',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 3,
    title: 'Network Video Recorders (NVRs)',
    subtitle: 'Reliable video recording, intelligent surveillance & centralized security management',
    ctaText: 'View NVR Range',
    category: 'Networking & Connectivity',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1789723359/nvr.png',
    accentColor: 'from-amber-900/90'
  }
];

export const HomePage: React.FC<HomePageProps> = ({
  products,
  onSelectProduct,
  onSelectCategory,
  onNavigate,
  onRequestQuote
}) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const { formatPrice, currency, exchangeRate } = useCurrency();
  const { addToCart } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Added notification map for individual products
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  const handleAddToCart = (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(prod, 1);
    setAddedMap(prev => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setAddedMap(prev => ({ ...prev, [prod.id]: false }));
    }, 1500);
  };

  // 1. Filter Access Credentials products and randomize for display
  const accessCredentialProducts = useMemo(() => {
    const creds = safeProducts.filter(p => {
      const sub = (p.subcategory || '').toLowerCase().trim();
      const cat = (p.category || '').toLowerCase().trim();
      const name = (p.name || '').toLowerCase().trim();
      return (
        sub === 'access credentials' ||
        sub.includes('credential') ||
        (cat.includes('access control') && (
          sub.includes('card') || 
          sub.includes('fob') || 
          name.includes('credential') || 
          name.includes('keyfob') || 
          name.includes('fob') || 
          name.includes('card') || 
          name.includes('smart card') || 
          name.includes('tag') || 
          name.includes('mifare') || 
          name.includes('desfire') || 
          name.includes('hid') ||
          name.includes('prox')
        ))
      );
    });

    const pool = creds.length >= 6 ? creds : safeProducts.filter(p => (p.category || '').toLowerCase().includes('access'));
    return [...pool].sort(() => 0.5 - Math.random());
  }, [safeProducts]);

  // 2. Filter Video Surveillance & Cameras products and randomize for display
  const videoSurveillanceProducts = useMemo(() => {
    const vids = safeProducts.filter(p => {
      const cat = (p.category || '').toLowerCase().trim();
      const sub = (p.subcategory || '').toLowerCase().trim();
      return (
        cat === 'video surveillance & cameras' ||
        cat.includes('video surveillance') ||
        cat.includes('cameras') ||
        sub.includes('camera') ||
        sub.includes('nvr') ||
        sub.includes('dvr') ||
        sub.includes('ptz')
      );
    });

    const pool = vids.length >= 6 ? vids : safeProducts.filter(p => 
      (p.category || '').toLowerCase().includes('surveillance') || 
      (p.category || '').toLowerCase().includes('camera')
    );
    return [...pool].sort(() => 0.5 - Math.random());
  }, [safeProducts]);

  // 3. Filter Access Control Readers products and randomize for display
  const accessControlReaderProducts = useMemo(() => {
    const readers = safeProducts.filter(p => {
      const sub = (p.subcategory || '').toLowerCase().trim();
      const cat = (p.category || '').toLowerCase().trim();
      const name = (p.name || '').toLowerCase().trim();
      return (
        sub === 'access control readers' ||
        sub === 'card readers' ||
        sub === 'biometric readers' ||
        (cat.includes('access control') && (
          sub.includes('reader') ||
          name.includes('reader') ||
          name.includes('mullion') ||
          name.includes('keypad') ||
          name.includes('biometric') ||
          name.includes('fingerprint')
        ))
      );
    });

    const pool = readers.length >= 6 ? readers : safeProducts.filter(p => (p.name || '').toLowerCase().includes('reader'));
    return [...pool].sort(() => 0.5 - Math.random());
  }, [safeProducts]);

  // 4. Filter Video Management & Recording products and randomize for display
  const videoManagementProducts = useMemo(() => {
    const vmr = safeProducts.filter(p => {
      const cat = (p.category || '').toLowerCase().trim();
      const sub = (p.subcategory || '').toLowerCase().trim();
      const name = (p.name || '').toLowerCase().trim();
      return (
        cat === 'video management & recording' ||
        cat.includes('video management') ||
        sub.includes('nvr') ||
        sub.includes('vms') ||
        sub.includes('recorder') ||
        sub.includes('encoder') ||
        sub.includes('decoder') ||
        sub.includes('video storage') ||
        name.includes('nvr') ||
        name.includes('recorder') ||
        name.includes('encoder') ||
        name.includes('decoder') ||
        name.includes('dockcontroller') ||
        name.includes('recording') ||
        name.includes('workstation')
      );
    });

    const pool = vmr.length >= 6 ? vmr : safeProducts.filter(p => (p.category || '').toLowerCase().includes('surveillance'));
    return [...pool].sort(() => 0.5 - Math.random());
  }, [safeProducts]);

  // 5. Filter Renewable Energy products and randomize for display
  const renewableEnergyProducts = useMemo(() => {
    const renewable = safeProducts.filter(p => {
      const cat = (p.category || '').toLowerCase().trim();
      const sub = (p.subcategory || '').toLowerCase().trim();
      const name = (p.name || '').toLowerCase().trim();
      return (
        cat === 'renewable energy' ||
        cat.includes('renewable') ||
        cat.includes('solar') ||
        cat.includes('energy') ||
        sub.includes('inverter') ||
        sub.includes('battery') ||
        sub.includes('solar') ||
        name.includes('inverter') ||
        name.includes('battery') ||
        name.includes('solar') ||
        name.includes('hybrid') ||
        name.includes('lifepo4')
      );
    });

    const pool = renewable.length >= 4 ? renewable : safeProducts.filter(p => (p.category || '').toLowerCase().includes('power'));
    return [...pool].sort(() => 0.5 - Math.random());
  }, [safeProducts]);

  // Eagerly preload all hero slide images into browser cache immediately
  useEffect(() => {
    HERO_SLIDES.forEach(s => {
      const img = new Image();
      img.src = s.image;
    });
  }, []);

  // Auto-advance hero slides every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-[#eaeded] pb-0 font-sans">
      
      {/* 1. HERO BANNER WITH GRADIENT OVERLAY */}
      <div className="relative h-[380px] sm:h-[440px] md:h-[500px] w-full overflow-hidden bg-black select-none">
        
        {/* Pre-rendered Stacked Slide Images for Instant Switching */}
        {HERO_SLIDES.map((s, idx) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <img
              src={s.image}
              alt={s.title}
              loading={idx === 0 ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform scale-105"
            />
            {/* Gradient Tint */}
            <div className={`absolute inset-0 bg-gradient-to-r ${s.accentColor} via-black/50 to-transparent`} />
          </div>
        ))}

        {/* Hero Slide Content: 50px downward on mobile, 50px rightward on tablet, 100px rightward on desktop */}
        <div className="relative w-full h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-start pt-3 sm:pt-6 md:pt-8 text-white z-20">
          <div className="max-w-xl space-y-3 sm:space-y-4 translate-y-[50px] sm:translate-y-0 sm:translate-x-[50px] lg:translate-x-[100px] transition-transform duration-200">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white drop-shadow-md">
              {slide.title}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-200 line-clamp-2 drop-shadow">
              {slide.subtitle}
            </p>
            <div>
              <button
                type="button"
                onClick={() => onSelectCategory(slide.category)}
                className="bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold px-5 sm:px-6 py-2 sm:py-2.5 rounded shadow-lg text-xs sm:text-sm transition-all transform hover:scale-[1.02] cursor-pointer"
              >
                {slide.ctaText}
              </button>
            </div>
          </div>
        </div>

        {/* Hero Slider Nav Arrows aligned with the visible text area */}
        <button
          onClick={() => setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-2 top-[35%] sm:top-[38%] -translate-y-1/2 z-30 p-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-r transition-colors"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-2 top-[35%] sm:top-[38%] -translate-y-1/2 z-30 p-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/60 rounded-l transition-colors"
          aria-label="Next Slide"
        >
          <ChevronRight size={32} />
        </button>

        {/* Bottom Gradient Fade into Gray Background */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#eaeded] via-[#eaeded]/70 to-transparent pointer-events-none z-20" />
      </div>

      {/* 2. OVERLAPPING 4-ITEM / FEATURED BENTO CARDS with 20px gutter */}
      <div className="w-full px-[20px] relative -mt-24 sm:-mt-36 z-20">
        
        {/* 4-Column Grid with 10px gap increasing the width of the 4 sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[10px]">
          
          {/* Box 1: Video Surveillance */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                Video Surveillance &amp; Cameras
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div 
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'Bullet Cameras')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/bullet.jpg" 
                      alt="Bullet Cameras"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Bullet Cameras
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'PTZ Cameras')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/ptz.jpg" 
                      alt="PTZ Cameras"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    PTZ Cameras
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'Dome Cameras')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/dome_camera.jpg" 
                      alt="Dome Cameras"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Dome Cameras
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'Thermal Cameras')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/PRODUCT%20MARKETING/Sarix%20Enhanced%20Duo/Sarix-Enh-Duo-500x500%20%282%29.png" 
                      alt="Thermal Cameras"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Thermal Cameras
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelectCategory('Video Surveillance & Cameras')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left"
            >
              See all 12 camera categories
            </button>
          </div>

          {/* Box 2: Renewable Energy & Power */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  Renewable Energy Systems
                </h3>
                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  NEW
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div 
                  onClick={() => onSelectCategory('Renewable Energy', 'Smart Hybrid Inverters')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1788634097/inverter-9.jpg" 
                      alt="Hybrid Inverters"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Hybrid Inverters
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Renewable Energy', 'Lithium LiFePO4 Batteries')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/solar_battery.jpg" 
                      alt="LiFePO4 Batteries"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    LiFePO4 Batteries
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Renewable Energy', 'Industrial Solar Panels')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/solar_panel.jpg" 
                      alt="Tier-1 Solar Panels"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Tier-1 Solar Panels
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Power & Electrical Systems', 'UPS Systems')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789729131/ups.jpg" 
                      alt="Online Rack UPS"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Online Rack UPS
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelectCategory('Renewable Energy')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left"
            >
              Shop Inverters &amp; Batteries
            </button>
          </div>

          {/* Box 3: Networking & Industrial PoE */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                Networking &amp; Connectivity
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div 
                  onClick={() => onSelectCategory('Networking & Connectivity', 'PoE Switches')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/poe_switch.jpg" 
                      alt="PoE Switches"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    PoE Switches
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Networking & Connectivity', 'Industrial Switches')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789729780/motorola.jpg" 
                      alt="DIN-Rail Industrial"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    DIN-Rail Industrial
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Networking & Connectivity', 'Wireless Access Points')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789729938/Network_Adapter.jpg" 
                      alt="Wi-Fi 6 APs"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Wi-Fi 6 APs
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Telecommunication & Communication Equipment', 'Microwave Radio')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1789730104/Industrial_Switch.jpg" 
                      alt="Wireless Bridges"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Wireless Bridges
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelectCategory('Networking & Connectivity')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left"
            >
              Explore all enterprise networking
            </button>
          </div>

          {/* Box 4: Access Control & Biometrics */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                Access Control &amp; Biometrics
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div 
                  onClick={() => onSelectCategory('Access Control & Door Security', 'Biometric Readers')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/ACM/AC-HID-READER-SIGNO-40NKS-00-000000_071620.jpg" 
                      alt="Facial Terminals"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Facial Terminals
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Access Control & Door Security', 'Electronic Locks')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/ACM/csr35_1200x1200_071520.jpg" 
                      alt="Magnetic Locks"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Magnetic Locks
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Intercom & IP Communication', 'Door Stations')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/PRODUCT%20MARKETING/STid-READER-ARC-B-063022.jpg" 
                      alt="Video Intercoms"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Video Intercoms
                  </span>
                </div>
                <div 
                  onClick={() => onSelectCategory('Security Software & Licenses', 'Access Control Software')}
                  className="cursor-pointer group flex flex-col"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/ACM/SC_MTK15_HO_071620.jpg" 
                      alt="Software Licenses"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Software Licenses
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onSelectCategory('Access Control & Door Security')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left"
            >
              Shop Access Control &amp; Gates
            </button>
          </div>

        </div>

      </div>

      {/* 3. SMARTER ACCESS STARTS HERE - Access Credentials */}
      <ProductSliderSection
        id="smarter-access-starts-here"
        title="Smarter Access Starts Here"
        subtitle="Explore smart credentials, RFID cards, key fobs & mobile access keys"
        products={accessCredentialProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Access Control & Door Security', 'Access Credentials')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Access Credentials currently loading or unavailable."
      />

      {/* 4. SEE MORE. SECURE MORE. - Video Surveillance & Cameras */}
      <ProductSliderSection
        id="see-more-secure-more"
        title="See More. Secure More."
        subtitle="Explore high-definition IP cameras, thermal imaging, smart PTZ domes & network video recorders"
        products={videoSurveillanceProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Video Surveillance & Cameras')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Video Surveillance products currently loading or unavailable."
      />

      {/* 5. CONTROL WHO COMES IN - Access Control Readers */}
      <ProductSliderSection
        id="control-who-comes-in"
        title="Control Who Comes In"
        subtitle="Explore smart RFID card readers, biometric scanners, keypad wall readers & door controllers"
        products={accessControlReaderProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Access Control & Door Security', 'Access Control Readers')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Access Control Readers currently loading or unavailable."
      />

      {/* 6. SWITCH ON BETTER CONNECTIVITY - Video Management & Recording */}
      <ProductSliderSection
        id="switch-on-better-connectivity"
        title="Switch On Better Connectivity"
        subtitle="Explore enterprise NVRs, VMS software, high-density storage servers & video encoders"
        products={videoManagementProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Video Management & Recording')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Video Management & Recording products currently loading or unavailable."
      />

      {/* 7. POWER YOUR PROJECTS WITH RELIABLE TECHNOLOGY - Renewable Energy */}
      <ProductSliderSection
        id="power-your-projects"
        className="w-full px-[20px] mb-4 sm:mb-5"
        title="Power Your Projects with Reliable Technology"
        subtitle="Explore smart hybrid inverters, long-life LiFePO4 batteries & high-efficiency solar panels"
        products={renewableEnergyProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Renewable Energy')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Renewable Energy products currently loading or unavailable."
      />

    </div>
  );
};
