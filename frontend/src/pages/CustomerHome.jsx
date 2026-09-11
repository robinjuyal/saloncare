import React, { useState, useEffect, useMemo } from 'react';
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
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">

        {/* Hero Banner Area */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          {/* Location status badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-full shadow-2xs mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">
              Salons near <strong className="text-slate-900">{locationName || 'Your Location'}</strong>
            </span>
            {USE_DEV_LOCATION && (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                DEV
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              className="text-slate-400 hover:text-slate-900 p-0.5 ml-1 transition cursor-pointer"
              title="Refresh nearby salons"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2 sm:mb-3">
            Find Your Next Chair
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            Live queue countdowns · Zero waiting rooms · Instant booking
          </p>
        </div>

        {/* Plain Search Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs mb-6 sm:mb-8">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search salons by name, landmark, or street area…"
              className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Nearby Salons</h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {displayedSalons.length}
            </span>
          </div>
        </div>

        {/* Salons List State Handling */}
        {loading ? (
          <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
            <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">Updating nearby salons…</p>
            <p className="text-xs text-slate-400 mt-1">Checking live chair availability</p>
          </div>
        ) : displayedSalons.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MapPin size={26} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              No Salons Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-5">
              {searchQuery
                ? 'No salons match your search. Try a different search term.'
                : 'No salons found in this area. Try expanding your search.'}
            </p>

            <div className="flex items-center justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                Search Wider (20 km)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {displayedSalons.map((salon) => {
              const waitMinutes = salon.estimatedWaitMinutes || 0;
              const waitBadge = getWaitBadge(waitMinutes);

              return (
                <div
                  key={salon.id}
                  onClick={() => navigate(`/salon/${salon.id}`)}
                  className="bg-white border border-slate-200/90 hover:border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                >
                  {/* Left: Avatar / Cover + Core Info */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                    {/* Cover or Monogram thumbnail */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 text-white flex-shrink-0 flex items-center justify-center overflow-hidden relative shadow-xs border border-slate-200/60">
                      {salon.coverImage ? (
                        <img
                          src={salon.coverImage}
                          alt={salon.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                          <span className="text-xl sm:text-2xl font-black text-emerald-400">
                            {salon.name?.charAt(0) || 'S'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                          {salon.name}
                        </h3>
                        {salon.verified && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                            <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                            <span>Verified</span>
                          </span>
                        )}
                        {salon.gender && (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                            {salon.gender.toLowerCase()}
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{salon.address}, {salon.city}</span>
                      </p>

                      {/* Quick Specs: Rating + Chairs */}
                      <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          <span>{salon.rating > 0 ? Number(salon.rating).toFixed(1) : 'New'}</span>
                          {salon.totalReviews > 0 && (
                            <span className="font-normal text-slate-400">({salon.totalReviews})</span>
                          )}
                        </div>

                        <span className="text-slate-300">·</span>

                        <div className="flex items-center gap-1 font-medium text-slate-600">
                          <Armchair size={13} className="text-slate-400" />
                          <span>{salon.totalChairs || 1} {salon.totalChairs === 1 ? 'chair' : 'chairs'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Queue Badge & CTA Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Live Wait Pill */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold ${waitBadge.bg} ${waitBadge.text} ${waitBadge.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${waitBadge.dot} ${waitMinutes === 0 ? 'animate-ping' : ''}`} />
                      <Clock size={13} className="shrink-0" />
                      <span>{waitBadge.label}</span>
                    </div>

                    {/* Action button */}
                    <span className="inline-flex items-center gap-1.5 bg-slate-900 group-hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer">
                      <span>View & Book</span>
                      <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
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
