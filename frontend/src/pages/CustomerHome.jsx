import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { salonAPI } from '../services/api';
import {
  MapPin,
  Clock,
  Star,
  Navigation,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Wifi,
  Scissors,
  ShieldCheck,
  Armchair,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 🛠️  DEV MODE FLAG
// Set to true  → uses hardcoded Dehradun coords (for localhost testing)
// Set to false → uses real device GPS (for phone testing and production)
// ─────────────────────────────────────────────────────────────────────────────
const USE_DEV_LOCATION = true; // ← change this line to switch modes
const DEV_COORDS = { lat: 30.397484, lng: 77.907149, name: 'Dehradun (dev)' };
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_STATE = {
  IDLE: 'IDLE',
  ASKING: 'ASKING',
  LOCATING: 'LOCATING',
  READY: 'READY',
  DENIED: 'DENIED',
  ERROR: 'ERROR',
};

const DEFAULT_RADIUS_KM = 5;

const BANNER_SLIDES = [
  {
    id: 1,
    tag: 'EXCLUSIVE OFFER',
    badge: 'FLAT 20% OFF',
    title: 'Style Without The Wait',
    subtitle: 'Skip the waiting room. Track live chair availability & book instant queue turns.',
    tagline: 'CODE: SALON20',
    image: 'https://res.cloudinary.com/p5fhnwbq/image/upload/v1789213336/banner1.jpg',
  },
  {
    id: 2,
    tag: 'REAL-TIME QUEUE',
    badge: 'LIVE CHAIR TRACKING',
    title: 'Know Your Wait Time Before You Go',
    subtitle: 'Live countdowns and real-time chair status at the best verified salons near you.',
    tagline: 'ZERO WAITING LOUNGE',
    image: 'https://res.cloudinary.com/p5fhnwbq/image/upload/v1789213336/banner2.jpg',
  },
  {
    id: 3,
    tag: 'MASTER STYLISTS',
    badge: 'TOP RATED EXPERTS',
    title: 'Precision Cuts & Luxury Grooming',
    subtitle: 'Discover verified barbers, hair colorists, and skin specialists in your neighborhood.',
    tagline: '★ 4.9 AVERAGE RATING',
    image: 'https://res.cloudinary.com/p5fhnwbq/image/upload/v1789213336/banner3.jpg',
  },
];

const HeroBanner = React.memo(function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isMouseDown = useRef(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const handleTouchStart = (e) => {
    setIsHovered(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    setIsHovered(false);
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swiped left → Next slide
        setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
      } else {
        // Swiped right → Previous slide
        setCurrentSlide((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
      }
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    isMouseDown.current = true;
    setIsHovered(true);
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    setIsHovered(false);
    const diffX = touchStartX.current - touchEndX.current;
    if (Math.abs(diffX) > 35) {
      if (diffX > 0) {
        setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
      } else {
        setCurrentSlide((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
      }
    }
  };

  return (
    <div
      className="relative w-full h-52 sm:h-60 md:h-68 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs bg-slate-950 select-none group touch-pan-y cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isMouseDown.current) {
          handleMouseUp();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Slides */}
      {BANNER_SLIDES.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {/* Background image */}
          <img
            src={slide.image}
            alt={slide.title}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover object-center pointer-events-none"
          />

          {/* Dark cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/90 via-black/60 to-black/35 pointer-events-none" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 md:p-6 z-10 pointer-events-none">
            {/* Top Badge */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <span className="inline-flex items-center gap-1 bg-white/20 border border-white/25 text-white font-body text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles size={11} className="text-amber-300 shrink-0" />
                <span>{slide.tag}</span>
              </span>
              <span className="bg-white text-slate-900 font-body text-[9px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
                {slide.badge}
              </span>
            </div>

            {/* Middle Title & Subtitle */}
            <div className="max-w-xl pb-4 sm:pb-5 pointer-events-auto">
              <h2 className="font-display font-bold text-lg sm:text-2xl md:text-3xl text-white tracking-tight leading-snug mb-1">
                {slide.title}
              </h2>
              <p className="font-body text-xs sm:text-sm text-slate-200/90 leading-snug line-clamp-1 sm:line-clamp-2 max-w-lg">
                {slide.subtitle}
              </p>
              <div className="mt-1.5 inline-flex items-center gap-2">
                <span className="font-mono text-[10px] sm:text-xs font-semibold bg-white/20 border border-white/25 text-white px-2 py-0.5 rounded">
                  {slide.tagline}
                </span>
              </div>
            </div>

            {/* Spacer for bottom search bar overlap */}
            <div className="h-5 sm:h-6" />
          </div>
        </div>
      ))}

      {/* Left / Right Chevron Controls */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCurrentSlide((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
        }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Previous slide"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Next slide"
      >
        <ChevronRight size={16} />
      </button>

      {/* Slide Indicator Dots */}
      <div className="absolute bottom-9 sm:bottom-10 right-4 sm:right-6 z-20 flex items-center gap-1.5">
        {BANNER_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide(i);
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              i === currentSlide
                ? 'w-5 h-1 bg-white'
                : 'w-1 h-1 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
});

export default function CustomerHome() {
  const navigate = useNavigate();

  const [locationState, setLocationState] = useState(LOCATION_STATE.IDLE);
  const [coords, setCoords] = useState(null);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(DEFAULT_RADIUS_KM);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    // ── DEV MODE: skip geolocation, use hardcoded coords ──
    if (USE_DEV_LOCATION) {
      setCoords({ lat: DEV_COORDS.lat, lng: DEV_COORDS.lng });
      setLocationName(DEV_COORDS.name);
      loadNearbySalons(DEV_COORDS.lat, DEV_COORDS.lng, DEFAULT_RADIUS_KM);
      return;
    }

    // ── REAL MODE: use device GPS ──
    if (!navigator.geolocation) {
      setLocationState(LOCATION_STATE.ERROR);
      return;
    }
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          fetchLocation();
        }
      });
    }
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState(LOCATION_STATE.ERROR);
      return;
    }
    setLocationState(LOCATION_STATE.ASKING);
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationError,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  const fetchLocation = () => {
    setLocationState(LOCATION_STATE.LOCATING);
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationError,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  const onLocationSuccess = async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setCoords({ lat, lng });
    setLocationState(LOCATION_STATE.LOCATING);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const area =
        data.address?.suburb ||
        data.address?.neighbourhood ||
        data.address?.city_district ||
        data.address?.city ||
        'your area';
      setLocationName(area);
    } catch {
      setLocationName('your area');
    }

    await loadNearbySalons(lat, lng, searchRadius);
  };

  const onLocationError = (error) => {
    setLocationState(
      error.code === error.PERMISSION_DENIED
        ? LOCATION_STATE.DENIED
        : LOCATION_STATE.ERROR
    );
  };

  const loadNearbySalons = async (lat, lng, radius) => {
    setLoading(true);
    try {
      const response = await salonAPI.searchNearby(lat, lng, radius);
      const list = response.data.data || [];
      setSalons(list);
      setLocationState(LOCATION_STATE.READY);
    } catch (error) {
      console.error('Search error:', error.response?.status, error.response?.data);
      setLocationState(LOCATION_STATE.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (coords) loadNearbySalons(coords.lat, coords.lng, searchRadius);
    else fetchLocation();
  };

  // Plain search filter
  const displayedSalons = useMemo(() => {
    return salons.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
    });
  }, [salons, searchQuery]);

  const getWaitBadge = (minutes) => {
    if (minutes === 0) {
      return {
        label: 'Instant Seat Available',
        shortLabel: 'Available now',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200/90',
        dot: 'bg-emerald-500',
      };
    }
    if (minutes <= 30) {
      return {
        label: `~${minutes} min wait`,
        shortLabel: `~${minutes}m wait`,
        bg: 'bg-emerald-50/60',
        text: 'text-emerald-800',
        border: 'border-emerald-200/70',
        dot: 'bg-emerald-600',
      };
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins > 0 ? mins + 'm' : ''}`;
    return {
      label: `~${timeStr} wait`,
      shortLabel: `~${timeStr}`,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      dot: 'bg-amber-500',
    };
  };

  // ── SCREEN: No geolocation support ───────────────────────────────────────
  if (locationState === LOCATION_STATE.ERROR && !navigator.geolocation) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center max-w-sm shadow-xs">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Location Not Supported</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Your browser doesn't support location services. Try opening the app in Google Chrome or Safari.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition cursor-pointer"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // ── SCREEN: Permission denied ─────────────────────────────────────────────
  if (locationState === LOCATION_STATE.DENIED) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center max-w-sm shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Location Access Needed</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            We need your location to show live queues at salons near you. Please enable location permissions in your browser and refresh.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm shadow-xs transition cursor-pointer"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // ── SCREEN: Ask for location (first visit, real mode only) ───────────────
  if (locationState === LOCATION_STATE.IDLE) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-600/20 rotate-3">
            <Scissors size={28} className="text-white -rotate-3" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Find Your Next Chair
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Skip the waiting room. Track live queues and reserve your turn at nearby salons instantly.
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={17} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-700">
                Shows trusted salons near you
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={17} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-700">
                Displays real-time <strong className="text-slate-900">live wait times</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Wifi size={17} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-700">
                Your location coordinates are <strong className="text-slate-900">never stored</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-sm sm:text-base transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Navigation size={18} />
            <span>Allow Location Access</span>
          </button>
        </div>
      </div>
    );
  }

  // ── SCREEN: Locating / loading ────────────────────────────────────────────
  if (
    locationState === LOCATION_STATE.ASKING ||
    locationState === LOCATION_STATE.LOCATING ||
    (loading && salons.length === 0)
  ) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center font-sans">
        <div className="text-center px-4">
          <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {locationState === LOCATION_STATE.ASKING
              ? 'Waiting for location permission…'
              : locationState === LOCATION_STATE.LOCATING
              ? 'Finding your location…'
              : `Finding verified salons near ${locationName || 'you'}…`}
          </h2>
          <p className="text-xs text-slate-400">Loading live queue status & wait times</p>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN ───────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 min-h-screen font-body text-slate-900 pb-16">
      <div className="max-w-5xl mx-auto px-2 sm:px-4 pt-1.5 sm:pt-2.5">

        {/* Sliding Hero Banner */}
        <HeroBanner />

        {/* Floating Search Bar (overlapping half of the banner bottom) */}
        <div className="-mt-6 sm:-mt-7 relative z-30 max-w-2xl mx-auto px-3 sm:px-4 mb-5 sm:mb-6">
          <div className="bg-white border border-slate-200/90 rounded-xl p-2 sm:p-2.5 shadow-xs hover:border-slate-300 transition-all">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-3.5 text-slate-400 shrink-0 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search salons by name, landmark, or street area…"
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-slate-50 border border-slate-200/70 rounded-lg font-body text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-lg sm:text-xl text-slate-900 tracking-tight">
              Nearby Salons
            </h2>
            <span className="font-body text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {displayedSalons.length}
            </span>
          </div>
        </div>

        {/* Salons List State Handling */}
        {loading ? (
          <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="font-display font-bold text-base text-slate-800">Updating nearby salons…</p>
            <p className="font-body text-xs text-slate-400 mt-1">Checking live chair availability</p>
          </div>
        ) : displayedSalons.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MapPin size={26} />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-1">
              No Salons Found
            </h3>
            <p className="font-body text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {searchQuery
                ? 'No salons match your search. Try a different search term.'
                : 'No salons found in this area. Try expanding your search.'}
            </p>

            <div className="flex items-center justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  Clear Search
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchRadius(20);
                  if (coords) loadNearbySalons(coords.lat, coords.lng, 20);
                }}
                className="bg-black hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                Search Wider (20 km)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-3.5">
            {displayedSalons.map((salon) => {
              const waitMinutes = salon.estimatedWaitMinutes || 0;
              const waitBadge = getWaitBadge(waitMinutes);

              return (
                <div
                  key={salon.id}
                  onClick={() => navigate(`/salon/${salon.id}`)}
                  className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-black/50 transition-colors cursor-pointer flex flex-col gap-3 shadow-2xs hover:shadow-xs group select-none"
                >
                  {/* Top Row: 1:1 image + evenly aligned text info matching image height */}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 w-full">
                    <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-lg shrink-0 overflow-hidden relative border border-slate-200/70 aspect-square bg-slate-900 flex items-center justify-center">
                      {salon.coverImage ? (
                        <img
                          src={salon.coverImage}
                          alt={salon.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white"
                        style={{ display: salon.coverImage ? 'none' : 'flex' }}
                      >
                        <span className="font-display font-bold text-2xl text-emerald-400">
                          {salon.name?.charAt(0) || 'S'}
                        </span>
                        <span className="font-body text-[9px] text-slate-400 tracking-wider uppercase mt-0.5">
                          SALON
                        </span>
                      </div>
                    </div>

                    {/* Middle Info Details: self-stretch flex flex-col justify-between py-0.5 */}
                    <div className="min-w-0 flex-1 self-stretch flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 tracking-tight leading-snug group-hover:text-black transition-colors truncate">
                            {salon.name}
                          </h3>
                          {salon.verified && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                              <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                              <span>Verified</span>
                            </span>
                          )}
                          {salon.gender && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">
                              {salon.gender.toLowerCase()}
                            </span>
                          )}
                        </div>

                        {/* Location */}
                        <p className="font-body text-xs sm:text-sm text-slate-500 font-normal leading-relaxed flex items-center gap-1.5 mt-0.5 truncate">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{salon.address}, {salon.city}</span>
                        </p>
                      </div>

                      {/* Rating & Chairs row: evenly aligned at the bottom of the image */}
                      <div className="flex items-center gap-2 sm:gap-2.5 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-display font-bold text-xs text-slate-900 bg-amber-50/90 border border-amber-200/60 px-2 py-0.5 rounded">
                          <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                          <span>{salon.rating > 0 ? Number(salon.rating).toFixed(1) : 'New'}</span>
                          {salon.totalReviews > 0 && (
                            <span className="font-body font-normal text-slate-400 text-[11px]">({salon.totalReviews})</span>
                          )}
                        </span>
                        <span className="text-slate-300 font-light">•</span>
                        <span className="inline-flex items-center gap-1 font-body text-xs font-medium text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded">
                          <Armchair size={12} className="text-slate-400 shrink-0" />
                          <span>{salon.totalChairs || 1} {salon.totalChairs === 1 ? 'chair' : 'chairs'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Live Wait Pill & Action Button with generous padding & border separator */}
                  <div className="flex items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${waitBadge.bg} ${waitBadge.text} ${waitBadge.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${waitBadge.dot} ${waitMinutes === 0 ? 'animate-ping' : ''}`} />
                      <Clock size={12} className="shrink-0" />
                      <span className="font-body">{waitBadge.label}</span>
                    </div>

                    <span className="inline-flex items-center gap-1 bg-black hover:bg-slate-800 text-white font-medium text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer group-hover:bg-slate-900">
                      <span>View & Book</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
