import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Pause,
  Play
} from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ProductSliderSection } from './ProductSliderSection';
import { optimizeImageUrl, handleProductImageError } from '../utils/imageOptimizer';

interface HomePageProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categoryName: string, subcategoryName?: string) => void;
  onNavigate: (view: string, param?: string) => void;
  onRequestQuote?: (product: Product) => void;
}

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  ctaText: string;
  category: string;
  subcategory?: string;
  image: string;
  accentColor: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    title: 'Fiber Optic Cables',
    subtitle: 'Data transmission, reliable connectivity & fibre networking',
    ctaText: 'Explore Fiber Optic Cables',
    category: 'Fiber Optic & Hybrid Cables',
    subcategory: 'Fiber Outdoor Cables',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1794226019/Fiber_Optic_Cables.webp',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 2,
    title: 'Hybrid Composite Cables',
    subtitle: 'Integrated power and fibre transmission connectivity',
    ctaText: 'Explore Hybrid Cables',
    category: 'Fiber Optic & Hybrid Cables',
    subcategory: 'Hybrid Composite Cables',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1794226020/Hybrid_Composite_Cables.webp',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 3,
    title: 'Enclosures',
    subtitle: 'Durable equipment protection for industrial and electrical installations',
    ctaText: 'Explore Enclosures',
    category: 'Enclosures & Housings',
    subcategory: 'Equipment Enclosures',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1794226020/enclosure.webp',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 4,
    title: 'Ex Junction Boxes',
    subtitle: 'Hazardous-area protection, robust enclosures & secure electrical connections',
    ctaText: 'Explore Ex Junction Boxes',
    category: 'Enclosures & Housings',
    subcategory: 'Junction Boxes',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1793032693/Ex_Junction_Box.png',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 5,
    title: 'IT Racks & Enclosures',
    subtitle: 'Secure equipment housing, optimized cable management & efficient airflow',
    ctaText: 'Explore IT Racks',
    category: 'Enclosures & Housings',
    subcategory: 'IT Racks',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1793032693/IT_Racks.png',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 6,
    title: 'Explosion-Proof Telephone Systems',
    subtitle: 'Reliable voice communication, hazardous-area protection & rugged industrial performance',
    ctaText: 'Explore PAGA Systems',
    category: 'Public Address (PAGA) System',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1793032692/Ex_Telephone_System.png',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 7,
    title: 'Intelligent Video Surveillance',
    subtitle: 'Ultra low-light Starlight sensors, vehicle classification & facial recognition',
    ctaText: 'Explore Cameras & NVRs',
    category: 'Video Surveillance & Cameras',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1789723359/cctv.png',
    accentColor: 'from-amber-900/90'
  },
  {
    id: 8,
    title: 'Network Video Recorders (NVRs)',
    subtitle: 'Reliable video recording, intelligent surveillance & centralized security management',
    ctaText: 'View NVR Range',
    category: 'Networking & Connectivity',
    image: 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1789723359/nvr.png',
    accentColor: 'from-amber-900/90'
  }
];

// Helper to shuffle an array uniformly (Fisher-Yates)
const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const HomePage: React.FC<HomePageProps> = ({
  products,
  onSelectProduct,
  onSelectCategory,
  onNavigate,
  onRequestQuote
}) => {
  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);
  const { addToCart } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

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

  // Single O(N) pass over all products to populate all 8 homepage slider buckets efficiently
  const {
    accessCredentialProducts,
    videoSurveillanceProducts,
    accessControlReaderProducts,
    videoManagementProducts,
    pagaProducts,
    enclosureProducts,
    hybridCompositeProducts,
    fiberOutdoorProducts
  } = useMemo(() => {
    const creds: Product[] = [];
    const credsFallback: Product[] = [];
    const vids: Product[] = [];
    const vidsFallback: Product[] = [];
    const readers: Product[] = [];
    const readersFallback: Product[] = [];
    const vmr: Product[] = [];
    const vmrFallback: Product[] = [];
    const paga: Product[] = [];
    const pagaFallback: Product[] = [];
    const enclosures: Product[] = [];
    const hybrid: Product[] = [];
    const fiberOutdoor: Product[] = [];

    for (let i = 0; i < safeProducts.length; i++) {
      const p = safeProducts[i];
      const cat = (p.category || '').toLowerCase().trim();
      const sub = (p.subcategory || '').toLowerCase().trim();
      const name = (p.name || '').toLowerCase().trim();
      const sku = p.sku || '';

      // 1. Access Credentials
      if (cat.includes('access')) credsFallback.push(p);
      if (
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
      ) {
        creds.push(p);
      }

      // 2. Video Surveillance & Cameras
      if (cat.includes('surveillance') || cat.includes('camera')) vidsFallback.push(p);
      if (
        cat === 'video surveillance & cameras' ||
        cat.includes('video surveillance') ||
        cat.includes('cameras') ||
        sub.includes('camera') ||
        sub.includes('nvr') ||
        sub.includes('dvr') ||
        sub.includes('ptz')
      ) {
        vids.push(p);
      }

      // 3. Access Control Readers
      if (name.includes('reader')) readersFallback.push(p);
      if (
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
      ) {
        readers.push(p);
      }

      // 4. Video Management & Recording
      if (cat.includes('surveillance')) vmrFallback.push(p);
      if (
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
      ) {
        vmr.push(p);
      }

      // 5. Public Address (PAGA) System
      if (cat.includes('public address')) pagaFallback.push(p);
      if (
        cat === 'public address (paga) system' ||
        cat.includes('public address') ||
        cat.includes('paga') ||
        sub.includes('public address') ||
        sub.includes('paga') ||
        sub.includes('speaker') ||
        sub.includes('sounder') ||
        sub.includes('telephone') ||
        sub.includes('microphone') ||
        sub.includes('amplifier') ||
        name.includes('exresisttel') ||
        name.includes('ferntel') ||
        name.includes('medc') ||
        name.includes('sounder') ||
        name.includes('loudspeaker') ||
        name.includes('paga')
      ) {
        paga.push(p);
      }

      // 6. Enclosures & Housings
      if (cat === 'enclosures & housings') {
        enclosures.push(p);
      }

      // 7. Hybrid Composite Cables
      if (
        sub === 'hybrid composite cables' ||
        cat === 'hybrid composite cables' ||
        (cat === 'fiber optic & hybrid cables' && sub.includes('hybrid')) ||
        sku.startsWith('SP-HC-')
      ) {
        hybrid.push(p);
      }

      // 8. Fiber Outdoor Cables
      if (
        sub === 'fiber outdoor cables' ||
        cat === 'fiber outdoor cables' ||
        (cat === 'fiber optic & hybrid cables' && sub.includes('outdoor')) ||
        sku.startsWith('SP-FOC-')
      ) {
        fiberOutdoor.push(p);
      }
    }

    return {
      accessCredentialProducts: shuffleArray(creds.length >= 6 ? creds : credsFallback),
      videoSurveillanceProducts: shuffleArray(vids.length >= 6 ? vids : vidsFallback),
      accessControlReaderProducts: shuffleArray(readers.length >= 6 ? readers : readersFallback),
      videoManagementProducts: shuffleArray(vmr.length >= 6 ? vmr : vmrFallback),
      pagaProducts: shuffleArray(paga.length >= 4 ? paga : pagaFallback),
      enclosureProducts: shuffleArray(enclosures),
      hybridCompositeProducts: shuffleArray(hybrid),
      fiberOutdoorProducts: shuffleArray(fiberOutdoor)
    };
  }, [safeProducts]);

  // Respect user's reduced-motion preference for hero auto-advance
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setIsHeroPaused(true);
    }
  }, []);

  // Preload only the upcoming hero slide after initial render so slide 1 (LCP) loads at full speed
  useEffect(() => {
    const nextIdx = (currentSlide + 1) % HERO_SLIDES.length;
    const timer = setTimeout(() => {
      const img = new Image();
      img.decoding = 'async';
      img.src = optimizeImageUrl(HERO_SLIDES[nextIdx].image, 1400);
    }, 350);
    return () => clearTimeout(timer);
  }, [currentSlide]);

  // Auto-advance hero slides every 6 seconds when not paused
  useEffect(() => {
    if (isHeroPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHeroPaused]);

  const slide = HERO_SLIDES[currentSlide];
  const prevSlideIdx = (currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
  const nextSlideIdx = (currentSlide + 1) % HERO_SLIDES.length;

  return (
    <div className="min-h-screen bg-[#eaeded] pb-0 font-sans">
      
      {/* 1. HERO BANNER WITH GRADIENT OVERLAY */}
      <section
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured Hardware Categories"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
        className="relative h-[380px] sm:h-[440px] md:h-[500px] w-full overflow-hidden bg-black select-none"
      >
        
        {/* Render only current & adjacent slides for instant LCP and smooth transitions */}
        {HERO_SLIDES.map((s, idx) => {
          const shouldMount = idx === currentSlide || idx === nextSlideIdx || idx === prevSlideIdx;
          if (!shouldMount) return null;
          const isCurrent = idx === currentSlide;
          return (
            <div
              key={s.id}
              aria-hidden={!isCurrent}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              <img
                src={optimizeImageUrl(s.image, 1400)}
                alt={s.title}
                width={1400}
                height={500}
                loading={idx === 0 || isCurrent ? 'eager' : 'lazy'}
                fetchPriority={idx === 0 ? 'high' : 'low'}
                decoding={idx === 0 ? 'sync' : 'async'}
                referrerPolicy="no-referrer"
                onError={(e) => handleProductImageError(e, s.image)}
                className="w-full h-full object-cover object-center transform scale-105"
              />
              {/* Gradient Tint */}
              <div className={`absolute inset-0 bg-gradient-to-r ${s.accentColor} via-black/50 to-transparent`} />
            </div>
          );
        })}

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
                onClick={() => onSelectCategory(slide.category, slide.subcategory)}
                className="bg-[#febd69] hover:bg-[#f3a847] text-[#131921] font-bold px-5 sm:px-6 py-2.5 rounded shadow-lg text-xs sm:text-sm transition-all transform hover:scale-[1.02] cursor-pointer min-h-[40px]"
              >
                {slide.ctaText}
              </button>
            </div>
          </div>
        </div>

        {/* Hero Slider Nav Arrows aligned with the visible text area */}
        <button
          type="button"
          onClick={() => setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-2 top-[35%] sm:top-[38%] -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-white/90 hover:text-white bg-black/40 hover:bg-black/70 rounded transition-colors cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft size={28} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-2 top-[35%] sm:top-[38%] -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-white/90 hover:text-white bg-black/40 hover:bg-black/70 rounded transition-colors cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight size={28} aria-hidden="true" />
        </button>

        {/* Accessible Carousel Controls: Pause/Play & Slide Indicators */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/45 backdrop-blur-xs px-2.5 py-1.5 rounded-full">
          <button
            type="button"
            onClick={() => setIsHeroPaused(prev => !prev)}
            className="text-white hover:text-[#febd69] p-1 rounded-full cursor-pointer flex items-center justify-center"
            aria-label={isHeroPaused ? 'Play featured slide rotation' : 'Pause featured slide rotation'}
            aria-pressed={isHeroPaused}
          >
            {isHeroPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-1" role="tablist" aria-label="Choose featured slide">
            {HERO_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={currentSlide === idx}
                aria-label={`Slide ${idx + 1}: ${s.title}`}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-5 bg-[#febd69]' : 'w-2 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Gradient Fade into Gray Background */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#eaeded] via-[#eaeded]/70 to-transparent pointer-events-none z-20" />
      </section>

      {/* 2. OVERLAPPING 4-ITEM / FEATURED BENTO CARDS with 20px gutter */}
      <section aria-label="Featured Hardware Departments" className="w-full px-[20px] relative -mt-24 sm:-mt-36 z-20">
        
        {/* 4-Column Grid with 10px gap increasing the width of the 4 sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[10px]">
          
          {/* Box 1: Video Surveillance */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                Video Surveillance &amp; Cameras
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <button
                  type="button"
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'Bullet Cameras')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/bullet.jpg', 360)} 
                      alt="Bullet Cameras"
                      width={160}
                      height={128}
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Bullet Cameras
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'PTZ Cameras')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/ptz.jpg', 360)} 
                      alt="PTZ Cameras"
                      width={160}
                      height={128}
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    PTZ Cameras
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'Dome Cameras')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1789800516/dome_camera.jpg', 360)} 
                      alt="Dome Cameras"
                      width={160}
                      height={128}
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Dome Cameras
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Video Surveillance & Cameras', 'Thermal Cameras')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/PRODUCT%20MARKETING/Sarix%20Enhanced%20Duo/Sarix-Enh-Duo-500x500%20%282%29.png" 
                      alt="Thermal Cameras"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Thermal Cameras
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('Video Surveillance & Cameras')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left min-h-[32px] inline-flex items-center cursor-pointer"
            >
              See all 12 camera categories
            </button>
          </div>

          {/* Box 2: Fiber Optic & Hybrid Cables */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                  Fiber Optic &amp; Hybrid Cables
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <button
                  type="button"
                  onClick={() => onSelectCategory('Fiber Optic & Hybrid Cables', 'Fiber Outdoor Cables')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1793895919/SP-FOC-PR-29.webp', 360)} 
                      alt="Fiber Outdoor Cables"
                      width={160}
                      height={128}
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Fiber Outdoor
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Fiber Optic & Hybrid Cables', 'Hybrid Composite Cables')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1793825243/SP-HC-JF-15.webp', 360)} 
                      alt="Hybrid Composite Cables"
                      width={160}
                      height={128}
                      loading="eager"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Hybrid Composite
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Enclosures & Housings')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1793719299/SP-RA-EN-RI-WME-19.webp', 360)} 
                      alt="Equipment Enclosures"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Enclosures &amp; Boxes
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Power & Electrical Systems', 'UPS Systems')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1789729131/ups.jpg', 360)} 
                      alt="Online Rack UPS"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Online Rack UPS
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('Fiber Optic & Hybrid Cables')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left min-h-[32px] inline-flex items-center cursor-pointer"
            >
              Explore Fiber &amp; Hybrid Cables
            </button>
          </div>

          {/* Box 3: Networking & Connectivity */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                Networking &amp; Connectivity
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <button
                  type="button"
                  onClick={() => onSelectCategory('Enclosures & Housings', 'IT Racks')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1792674795/SP-RA-EN-FHF-037.png', 360)} 
                      alt="IT Racks"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    IT Racks
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Enclosures & Housings', 'Equipment Enclosures')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1792589887/SP-EN-FHF-016.png', 360)} 
                      alt="Equipment Enclosures"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Equipment Enclosures
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Enclosures & Housings', 'Mounting Enclosures')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1792674799/SP-EN-FHF-034.png', 360)} 
                      alt="Mounting Enclosures"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Mounting Enclosures
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Enclosures & Housings', 'Explosion-Proof Enclosures')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src={optimizeImageUrl('https://res.cloudinary.com/bmv4hvtk/image/upload/v1792411705/SP-EX-EN-FHF-006.png', 360)} 
                      alt="Explosion-Proof Enclosures"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Explosion-Proof Enclosures
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('Networking & Connectivity')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left min-h-[32px] inline-flex items-center cursor-pointer"
            >
              Explore all enterprise networking
            </button>
          </div>

          {/* Box 4: Access Control & Biometrics */}
          <div className="bg-white p-4.5 rounded-[20px] shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                Access Control &amp; Biometrics
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <button
                  type="button"
                  onClick={() => onSelectCategory('Access Control & Door Security', 'Access Control Readers')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/ACM/SC_MTMSK15_HO_071620.jpg" 
                      alt="Access Control Readers"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Access Control Readers
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Access Control & Door Security', 'Access Credentials')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/ACM/AC-HID-MOB-MID-SUB-T100_071820.jpg" 
                      alt="Access Credentials"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Access Credentials
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Access Control & Door Security', 'Electronic Locks')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/PRODUCT%20MARKETING/SALTO/AC-SALTO-BLUENET-BLACK-GATEWAYB3CUS-03242021.jpg" 
                      alt="Electronic Locks"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Electronic Locks
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('Access Control & Door Security', 'Wireless Locks')}
                  className="cursor-pointer group flex flex-col text-left rounded-[10px]"
                >
                  <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center overflow-hidden rounded-[10px]">
                    <img 
                      src="https://avoweb1.s3-us-west-2.amazonaws.com/Prod/ACM/SCH_PIM400-TD2_SR_071620.jpg" 
                      alt="Wireless Locks"
                      width={160}
                      height={128}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-[10px] group-hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-800 line-clamp-1 mt-1.5 group-hover:text-blue-700 transition-colors">
                    Wireless Locks
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('Access Control & Door Security')}
              className="text-xs text-blue-700 hover:text-[#c45500] hover:underline font-semibold text-left min-h-[32px] inline-flex items-center cursor-pointer"
            >
              Shop Access Control &amp; Gates
            </button>
          </div>

        </div>

      </section>

      {/* 2.4 POWER & CONNECTIVITY IN ONE CABLE - Hybrid Composite Cables */}
      <ProductSliderSection
        id="power-connectivity-in-one-cable"
        title="Power & Connectivity in One Cable"
        subtitle="Shop high-quality hybrid composite cables combining power and fibre-optic transmission for efficient installations, reliable connectivity, and streamlined infrastructure deployment."
        products={hybridCompositeProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Fiber Optic & Hybrid Cables', 'Hybrid Composite Cables')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Hybrid Composite Cables currently loading or unavailable."
      />

      {/* 2.5 COMMUNICATE SAFELY. RESPOND INSTANTLY - Public Address (PAGA) System */}
      <ProductSliderSection
        id="communicate-safely-respond-instantly"
        title="Communicate Safely. Respond Instantly"
        subtitle="Explore explosion-proof communication systems, emergency paging, and reliable PAGA equipment for hazardous environments."
        products={pagaProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Public Address (PAGA) System')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Public Address & PAGA products currently loading or unavailable."
      />

      {/* 2.8 PROTECT MORE. CONNECT SECURELY - Enclosures & Housings */}
      <ProductSliderSection
        id="protect-more-connect-securely"
        title="Protect More. Connect Securely."
        subtitle="Explore industrial enclosures, explosion-proof junction boxes, weatherproof housings, and reliable electrical protection equipment for hazardous environments."
        products={enclosureProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Enclosures & Housings')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Enclosures & Housings products currently loading or unavailable."
      />

      {/* 2.9 BUILT FOR RELIABLE OUTDOOR CONNECTIVITY - Fiber Outdoor Cables */}
      <ProductSliderSection
        id="built-for-reliable-outdoor-connectivity"
        title="Built for Reliable Outdoor Connectivity"
        subtitle="Discover durable outdoor fibre-optic cables designed for high-speed data transmission, long-distance connectivity, and dependable performance in demanding environments."
        products={fiberOutdoorProducts}
        onSelectProduct={onSelectProduct}
        onSeeAll={() => onSelectCategory('Fiber Optic & Hybrid Cables', 'Fiber Outdoor Cables')}
        onAddToCart={handleAddToCart}
        onRequestQuote={onRequestQuote}
        onNavigateQuote={() => onNavigate('quote')}
        addedMap={addedMap}
        emptyMessage="Fiber Outdoor Cables currently loading or unavailable."
      />

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

    </div>
  );
};
