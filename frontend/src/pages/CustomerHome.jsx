import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { salonAPI } from '../services/api';
import {
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
  Scissors,
  X,
  Navigation,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 🛠️  DEV MODE FLAG
// Set to true  → uses hardcoded Dehradun coords (for localhost testing)
// Set to false → uses real device GPS (for phone testing and production)
// ─────────────────────────────────────────────────────────────────────────────
const USE_DEV_LOCATION = true;
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

const DEFAULT_RADIUS_KM = 10;

const BANNER_SLIDES = [
  {
    id: 1,
    title: (
      <>
        Style Without<br />The Wait
      </>
    ),
    subtitle: 'Skip the waiting room. Track live chair availability & book on the go.',
    cameraTransform: 'scale(1.10) translate(0%, 0%) rotate(0deg)',
  },
  {
    id: 2,
    title: (
      <>
        Zero Wait,<br />Real-Time Queues
      </>
    ),
    subtitle: 'Track live salon chairs & know your exact turn before leaving home.',
    cameraTransform: 'scale(1.22) translate(-6%, -1.5%) rotate(0.6deg)',
  },
  {
    id: 3,
    title: (
      <>
        Your Favourite<br />Salon Services
      </>
    ),
    subtitle: 'Explore trusted stylists nearby & reserve instant seats with 1 tap.',
    cameraTransform: 'scale(1.18) translate(4%, 1%) rotate(-0.5deg)',
  },
];

export default function CustomerHome() {
  const navigate = useNavigate();

  const [locationState, setLocationState] = useState(LOCATION_STATE.IDLE);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTimerRef = useRef(null);

  // Auto-slide banner text every 4.5 seconds with reset capability
  const startSlideTimer = () => {
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    slideTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 4500);
  };

  useEffect(() => {
    startSlideTimer();
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, []);

  const handleDotClick = (index) => {
    setCurrentSlide(index);
    startSlideTimer(); // Reset timer so it stays for a full cycle
  };

  useEffect(() => {
    // ── DEV MODE: skip geolocation, use hardcoded coords ──
    if (USE_DEV_LOCATION) {
      loadNearbySalons(DEV_COORDS.lat, DEV_COORDS.lng, DEFAULT_RADIUS_KM);
      return;
    }

    // ── REAL MODE: use device GPS ──
    if (!navigator.geolocation) {
      setLocationState(LOCATION_STATE.ERROR);
      return;
    }
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted') {
            fetchLocation();
          }
        })
        .catch(() => {
          // Fallback for browsers that don't support geolocation permission query (e.g. Safari)
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
    setLocationState(LOCATION_STATE.LOCATING);
    await loadNearbySalons(lat, lng, DEFAULT_RADIUS_KM);
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
      const list = response.data?.data || [];
      setSalons(list);
      setLocationState(LOCATION_STATE.READY);
    } catch (error) {
      console.error('Search error:', error.response?.status, error.response?.data);
      setLocationState(LOCATION_STATE.ERROR);
    } finally {
      setLoading(false);
    }
  };

  // Optimized search filter: O(1) when search is empty
  const displayedSalons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return salons;
    return salons.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
    );
  }, [salons, searchQuery]);

  // ── SCREEN: Permission denied ─────────────────────────────────────────────
  if (locationState === LOCATION_STATE.DENIED) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center max-w-sm shadow-xl">
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
            className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // ── SCREEN: Ask for location (first visit, real mode only) ───────────────
  if (locationState === LOCATION_STATE.IDLE && !USE_DEV_LOCATION) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-600/20">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Find Your Next Chair
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Skip the waiting room. Track live queues and reserve your turn at nearby salons instantly.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm sm:text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Navigation size={18} />
            <span>Allow Location Access</span>
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: Exact Replication of Reference Design ─────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-28">
      {/* ── 1. HERO BANNER (Zero top/left/right margins, full width edge-to-edge) ── */}
      <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-slate-900 px-5 sm:px-6 py-5 sm:py-6 flex flex-col justify-start select-none">
        {/* Background image of salon interior with dynamic cinematic camera perspective */}
        <img
          src="https://res.cloudinary.com/p5fhnwbq/image/upload/v1789213336/banner1.jpg"
          alt="Style Without The Wait"
          className="absolute inset-0 w-full h-full object-cover object-center origin-center will-change-transform"
          style={{
            transform: BANNER_SLIDES[currentSlide]?.cameraTransform || 'scale(1.10) translate(0%, 0%)',
            transition: 'transform 1800ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
        {/* Subtle gradient overlay to match reference */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 pointer-events-none" />

        {/* Inner Content Container - Animated Sliding Text */}
        <div className="relative z-10 max-w-md sm:max-w-lg mx-auto w-full pt-1 sm:pt-2">
          <div className="relative h-36 sm:h-40 overflow-hidden">
            {BANNER_SLIDES.map((slide, idx) => {
              const offset = (idx - currentSlide + BANNER_SLIDES.length) % BANNER_SLIDES.length;

              let stateClasses = 'translate-x-full opacity-0 duration-0 pointer-events-none';
              if (offset === 0) {
                stateClasses = 'translate-x-0 opacity-100 duration-700 pointer-events-auto';
              } else if (offset === BANNER_SLIDES.length - 1) {
                stateClasses = '-translate-x-full opacity-0 duration-700 pointer-events-none';
              }

              return (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-all ease-in-out flex flex-col justify-start ${stateClasses}`}
                >
                  <h1 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight drop-shadow-sm">
                    {slide.title}
                  </h1>
                  <p className="font-body text-[15px] sm:text-base text-slate-100 font-medium tracking-wide mt-2 leading-relaxed drop-shadow-xs max-w-sm sm:max-w-md">
                    {slide.subtitle}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-1.5 mt-2">
            {BANNER_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDotClick(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. BODY CONTENT (Search bar & Salon Listings) ── */}
      <div className="max-w-md sm:max-w-lg mx-auto px-4 space-y-4">
        {/* ── Floating Search Bar ── */}
        <div className="-mt-6 sm:-mt-7 relative z-20 px-0">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-lg shadow-black/5 border border-slate-100">
            <div className="relative flex items-center bg-[#F0F4FA] rounded-xl sm:rounded-2xl px-3.5 py-2.5 sm:py-3">
              <Search size={20} className="text-slate-400 shrink-0 mr-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search salons by name, landmark, or street"
                className="w-full bg-transparent font-sans text-sm sm:text-base text-slate-800 placeholder:text-slate-400 placeholder:text-sm sm:placeholder:text-base focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. SALON CARDS / LIST ── */}
        {loading ? (
          <div className="text-center py-16 bg-white/90 backdrop-blur-xs border border-slate-100 rounded-3xl shadow-sm">
            <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="font-display font-bold text-base text-slate-800">Updating nearby salons…</p>
            <p className="font-sans text-xs text-slate-400 mt-1">Checking live chair availability</p>
          </div>
        ) : displayedSalons.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white/95 backdrop-blur-xs border border-slate-100 rounded-3xl shadow-sm">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MapPin size={26} />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-1">
              No Salons Found
            </h3>
            <p className="font-sans text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {searchQuery
                ? 'No salons match your search. Try a different search term.'
                : 'No salons found in this area. Try expanding your search radius.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedSalons.map((salon) => {
              const waitMinutes = salon.estimatedWaitMinutes || 0;

              return (
                <article
                  key={salon.id}
                  onClick={() => navigate(`/salon/${salon.id}`)}
                  className="bg-white rounded-3xl p-2.5 sm:p-3 pr-3.5 sm:pr-4 shadow-lg shadow-black/5 border border-slate-100/90 transition-all hover:shadow-xl cursor-pointer select-none"
                >
                  {/* Horizontal Content: Everything side-by-side with image */}
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    {/* Left: Thumbnail Image with robust monogram fallback */}
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 border border-slate-100 relative bg-slate-900">
                      {/* Monogram fallback layer (always rendered behind) */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white z-0">
                        <span className="font-display font-bold text-2xl text-emerald-400">
                          {salon.name?.charAt(0) || 'S'}
                        </span>
                        <span className="font-sans text-[9px] text-slate-400 tracking-wider uppercase mt-0.5">
                          SALON
                        </span>
                      </div>
                      {/* Cover image on top */}
                      {salon.coverImage && (
                        <img
                          src={salon.coverImage}
                          alt={salon.name || 'Salon'}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover z-10"
                          onError={(e) => {
                            e.currentTarget.remove();
                          }}
                        />
                      )}
                    </div>

                    {/* Right: Info, Waiting Time & View and Book button */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                      {/* Name & Verified Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 leading-snug tracking-tight truncate">
                          {salon.name}
                        </h3>
                        {salon.verified && (
                          <span className="inline-flex items-center gap-1 bg-[#E8F8F0] border border-[#B2EBD0] text-[#059669] text-xs font-semibold px-2 py-0.5 rounded-md">
                            <CheckCircle2 size={13} className="text-[#059669] shrink-0" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 mt-1">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {salon.address}, {salon.city}
                        </span>
                      </div>

                      {/* Waiting Time (with Clock icon matching MapPin) */}
                      <div className="font-body text-xs sm:text-sm mt-1 flex items-center gap-1 text-slate-500">
                        <Clock size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-500">Waiting Time -</span>
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-500 tracking-tight">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span>{waitMinutes || 0} {waitMinutes === 1 ? 'min' : 'mins'}</span>
                        </span>
                      </div>

                      {/* View & Book Button (Realigned back to left) */}
                      <div className="mt-2.5 sm:mt-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/salon/${salon.id}`);
                          }}
                          className="bg-[#0B0F17] hover:bg-black text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <span>View & Book</span>
                          <ChevronRight size={15} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
