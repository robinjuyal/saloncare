import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salonAPI } from '../services/api';
import {
  MapPin, Clock, Star, Navigation,
  Search, RefreshCw, AlertCircle, ChevronRight, Wifi, Scissors
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 🛠️  DEV MODE FLAG
// Set to true  → uses hardcoded Dehradun coords (for localhost testing)
// Set to false → uses real device GPS (for phone testing and production)
// ─────────────────────────────────────────────────────────────────────────────
const USE_DEV_LOCATION = true; // ← change this one line to switch modes
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
  const [filteredSalons, setFilteredSalons] = useState([]);
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
        // 'prompt' → stay on IDLE screen, user taps Allow button
        // 'denied' → stay on IDLE, will hit DENIED after they tap
      });
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSalons(salons);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredSalons(
      salons.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, salons]);

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
      setFilteredSalons(list);
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

  const getWaitColor = (minutes) => {
    if (minutes <= 15) return 'text-sage-bright';
    if (minutes <= 30) return 'text-brass';
    return 'text-rose';
  };

  const getWaitLabel = (minutes) => {
    if (minutes === 0) return 'Available now';
    if (minutes < 60) return `~${minutes} min wait`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `~${hrs}h ${mins > 0 ? mins + 'm' : ''} wait`;
  };

  // ── SCREEN: No geolocation support ───────────────────────────────────────
  if (locationState === LOCATION_STATE.ERROR && !navigator.geolocation) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-4 font-body">
        <div className="glass rounded-3xl shadow-xl p-8 sm:p-10 text-center max-w-sm">
          <AlertCircle size={44} className="mx-auto text-rose mb-4" />
          <p className="text-lg font-semibold text-paper mb-2 font-display">Location not supported</p>
          <p className="text-paper/50 text-sm leading-relaxed">
            Your browser doesn't support location services. Try opening the app in Chrome or Safari.
          </p>
        </div>
      </div>
    );
  }

  // ── SCREEN: Permission denied ─────────────────────────────────────────────
  if (locationState === LOCATION_STATE.DENIED) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-4 font-body">
        <div className="glass rounded-3xl shadow-xl p-8 sm:p-10 text-center max-w-sm">
          <MapPin size={44} className="mx-auto text-paper/25 mb-4" />
          <p className="text-lg font-semibold text-paper mb-2 font-display">Location access denied</p>
          <p className="text-paper/50 text-sm mb-6 leading-relaxed">
            We need your location to show nearby salons. Please allow location
            access in your browser settings and refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-rose hover:bg-rose-dark text-white px-6 py-3 rounded-xl font-semibold transition text-sm"
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
      <div className="ambient-bg min-h-screen flex items-center justify-center p-4 font-body">
        <div className="glass rounded-[2rem] shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-rose rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose/30 rotate-3">
            <Scissors size={28} className="text-paper -rotate-3" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-paper mb-2">Find your next chair</h1>
          <p className="text-paper/50 text-sm mb-8 leading-relaxed font-body">
            Book instantly, skip the wait. See live queue times at salons near you.
          </p>
          <div className="glass-strong rounded-2xl p-4 mb-8 text-left space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={17} className="text-rose flex-shrink-0 mt-0.5" />
              <p className="text-sm text-paper/70">Show salons within <strong className="text-paper">5 km</strong> of you</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={17} className="text-rose flex-shrink-0 mt-0.5" />
              <p className="text-sm text-paper/70">Show <strong className="text-paper">live wait times</strong> for each salon</p>
            </div>
            <div className="flex items-start gap-3">
              <Wifi size={17} className="text-rose flex-shrink-0 mt-0.5" />
              <p className="text-sm text-paper/70">Your location is <strong className="text-paper">never stored</strong> on our servers</p>
            </div>
          </div>
          <button
            onClick={requestLocation}
            className="w-full bg-rose hover:bg-rose-dark text-white py-4 rounded-2xl font-bold text-base transition-all transform active:scale-[0.98] shadow-lg shadow-rose/30 flex items-center justify-center gap-2"
          >
            <Navigation size={19} />
            Allow Location Access
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
      <div className="ambient-bg min-h-screen flex items-center justify-center font-body">
        <div className="text-center px-4">
          <div className="w-14 h-14 border-[3px] border-rose/25 border-t-rose rounded-full animate-spin mx-auto mb-5" />
          <p className="text-lg font-semibold text-paper/70 font-display">
            {locationState === LOCATION_STATE.ASKING
              ? 'Waiting for location permission…'
              : locationState === LOCATION_STATE.LOCATING
              ? 'Finding your location…'
              : `Finding salons near ${locationName || 'you'}…`}
          </p>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN ───────────────────────────────────────────────────────────
  return (
    <div className="ambient-bg min-h-screen font-body">
      <div className="max-w-6xl mx-auto px-4 pt-8 sm:pt-12 pb-8">

        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-display font-semibold text-paper mb-2 sm:mb-3 leading-tight">
            Find your next chair
          </h1>
          <p className="text-base sm:text-xl text-paper/50 font-body">Book instantly, skip the wait</p>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-4">
            <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-sage-bright rounded-full animate-pulse" />
              <p className="text-xs sm:text-sm text-paper/80">
                Near <span className="font-semibold text-paper">{locationName}</span>
              </p>
              {USE_DEV_LOCATION && (
                <span className="bg-brass/20 text-brass text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  DEV
                </span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 text-xs text-paper/50 hover:text-paper font-semibold transition"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search + radius card */}
        {/* Search — just the one control. A radius slider + quick-select
            buttons used to live here too, but first-time users found it
            confusing to be presented with a search config before they'd
            even seen a result. Radius still exists internally (used for
            the initial fetch and the "search wider" fallback on empty
            results below) — it's just no longer something the customer
            has to think about up front. */}
        <div className="glass rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-6 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/35" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search salons by name or area…"
              className="glass-strong w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition text-sm text-paper placeholder:text-paper/35"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm text-paper/45 font-medium">
            {loading ? 'Searching…'
              : filteredSalons.length === 0 ? 'No salons found'
              : `${filteredSalons.length} salon${filteredSalons.length > 1 ? 's' : ''} found`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-[3px] border-rose/25 border-t-rose rounded-full animate-spin mx-auto mb-4" />
            <div className="text-lg font-semibold text-paper/50 font-display">Searching for salons…</div>
          </div>
        ) : filteredSalons.length === 0 ? (
          <div className="text-center py-20">
            <MapPin size={56} className="mx-auto text-paper/20 mb-4" />
            <div className="text-2xl font-display font-semibold text-paper/60 mb-2">No salons found</div>
            <p className="text-paper/40 mb-6">Try increasing the search radius</p>
            <button
              onClick={() => { setSearchRadius(20); if (coords) loadNearbySalons(coords.lat, coords.lng, 20); }}
              className="bg-rose hover:bg-rose-dark text-white px-6 py-3 rounded-xl font-semibold transition text-sm"
            >
              Search wider (20 km)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredSalons.map((salon) => (
              <div
                key={salon.id}
                onClick={() => navigate(`/salon/${salon.id}`)}
                className="glass-lite rounded-2xl sm:rounded-3xl shadow-md hover:shadow-xl hover:bg-white/20 overflow-hidden transition-all duration-300 cursor-pointer group active:scale-[0.98] flex"
              >
                {/* Image — fixed width, stretches to match the row's full
                    height (flex default cross-axis stretch — no fixed
                    height needed, it just fills whatever height the right
                    side's content ends up being). Parent's overflow-hidden
                    + rounding clips it to match. */}
                <div className="w-24 sm:w-32 md:w-40 flex-shrink-0 bg-gradient-to-br from-rose/40 to-ink relative overflow-hidden flex items-center justify-center">
                  {salon.coverImage
                    ? <img src={salon.coverImage} alt={salon.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : (
                      <span className="text-2xl sm:text-4xl md:text-5xl font-display font-semibold text-paper/90">
                        {salon.name.charAt(0)}
                      </span>
                    )
                  }
                </div>

                {/* Details — right side, fills remaining width */}
                <div className="flex-1 min-w-0 p-3 sm:p-5 flex flex-col justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="text-base sm:text-xl md:text-2xl font-display font-semibold text-paper truncate">{salon.name}</h3>
                      {salon.verified && <span className="text-sage flex-shrink-0 text-sm" title="Verified">✓</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-paper/50 mb-2 sm:mb-3">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="text-[11px] sm:text-sm truncate">{salon.address}, {salon.city}</span>
                    </div>
                    {/* flex-wrap is the safety net here — on a very narrow
                        screen this drops to 2 lines instead of clipping
                        "Available now" off the edge of the card (the
                        previous flex-shrink-0 on both halves is what
                        caused that: it forced them to their full natural
                        width no matter how little room was left). */}
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 sm:gap-x-4">
                      <div className="flex items-center gap-1 min-w-0">
                        <Star size={13} className="text-brass fill-brass flex-shrink-0" />
                        <span className="font-bold text-paper text-xs sm:text-base">{salon.rating > 0 ? Number(salon.rating).toFixed(1) : '–'}</span>
                        <span className="text-[10px] sm:text-xs text-paper/35">({salon.totalReviews || 0})</span>
                      </div>
                      <div className="w-px h-3.5 bg-white/15 flex-shrink-0" />
                      <div className={`flex items-center gap-1 min-w-0 ${getWaitColor(salon.estimatedWaitMinutes || 0)}`}>
                        <Clock size={13} className="flex-shrink-0" />
                        <span className="text-[11px] sm:text-sm font-bold truncate">{getWaitLabel(salon.estimatedWaitMinutes || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 mt-2 pt-2 sm:pt-3 flex justify-end">
                    <span className="flex items-center gap-1 text-xs sm:text-base font-bold text-white bg-rose group-hover:bg-rose-dark px-3.5 sm:px-6 py-1.5 sm:py-3 rounded-full transition flex-shrink-0">
                      View &amp; Book
                      <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
