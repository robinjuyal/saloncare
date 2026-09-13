import React, { useState, useMemo, useEffect } from 'react';
import {
  Scissors,
  User,
  Palette,
  Sparkles,
  Search,
  Check,
  Plus,
  X,
  Clock,
  AlertCircle,
  Ticket,
  ArrowRight,
} from 'lucide-react';
import BookingTicket from './BookingTicket';

// Service Avatar Illustration Helper
function ServiceAvatar({ category, name }) {
  const n = (name || '').toLowerCase();
  const c = (category || '').toUpperCase();

  if (n.includes('women') || n.includes('female') || n.includes('girl') || n.includes('lady')) {
    return (
      <div className="w-28 h-28 sm:w-[135px] sm:h-[135px] rounded-md bg-[#FFE4E6] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-16 h-16 sm:w-20 sm:h-20 text-rose-500 fill-current" aria-hidden="true">
          <path d="M24 6c-6.6 0-12 5.4-12 12 0 4.2 2.2 7.9 5.5 10v3c0 1.7 1.3 3 3 3h7c1.7 0 3-1.3 3-3v-3c3.3-2.1 5.5-5.8 5.5-10 0-6.6-5.4-12-12-12zm-3.5 13c-1.4 0-2.5-1.1-2.5-2.5S19.1 14 20.5 14s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zm7 0c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z" opacity="0.85"/>
          <path d="M14 20c-1.5 2.5-2 6-1.5 10 1.5-1 3-2 4-3.5-1-2-1.8-4.2-2.5-6.5zm20 0c-.7 2.3-1.5 4.5-2.5 6.5 1 1.5 2.5 2.5 4 3.5.5-4 0-7.5-1.5-10z"/>
        </svg>
      </div>
    );
  }

  if (c === 'BEARD' || n.includes('beard') || n.includes('shave') || n.includes('mustache')) {
    return (
      <div className="w-28 h-28 sm:w-[135px] sm:h-[135px] rounded-md bg-[#FEF3C7] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-16 h-16 sm:w-20 sm:h-20 text-amber-600 fill-current" aria-hidden="true">
          <circle cx="24" cy="17" r="7" />
          <path d="M16 26c0 6 3.6 11 8 11s8-5 8-11c0-2-1.5-3-3-3h-10c-1.5 0-3 1-3 3zm8 6c-2.2 0-4-1.3-4-3h8c0 1.7-1.8 3-4 3z"/>
        </svg>
      </div>
    );
  }

  if (c === 'HAIR_COLOR' || n.includes('color') || n.includes('dye') || n.includes('highlight')) {
    return (
      <div className="w-28 h-28 sm:w-[135px] sm:h-[135px] rounded-md bg-[#EDE9FE] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-16 h-16 sm:w-20 sm:h-20 text-purple-600 fill-current" aria-hidden="true">
          <path d="M24 6C15.2 6 8 13.2 8 22c0 4.5 1.9 8.6 5 11.5 1.4 1.3 2.5 3 2.5 5 0 2 1.6 3.5 3.5 3.5h10c1.9 0 3.5-1.6 3.5-3.5 0-2 1.1-3.7 2.5-5 3.1-2.9 5-7 5-11.5 0-8.8-7.2-16-16-16zm-7 15c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm6-6c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm8 6c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
        </svg>
      </div>
    );
  }

  if (c === 'FACIAL' || c === 'MASSAGE' || n.includes('facial') || n.includes('spa') || n.includes('massage')) {
    return (
      <div className="w-28 h-28 sm:w-[135px] sm:h-[135px] rounded-md bg-[#E0F2FE] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-16 h-16 sm:w-20 sm:h-20 text-sky-600 fill-current" aria-hidden="true">
          <circle cx="24" cy="22" r="11" opacity="0.8"/>
          <path d="M24 7l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zm12 21l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3zM10 28l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3z"/>
        </svg>
      </div>
    );
  }

  // Default: Men's Haircut styling (matches mint green avatar from the reference image)
  return (
    <div className="w-28 h-28 sm:w-[135px] sm:h-[135px] rounded-md bg-[#D1FAE5] flex items-center justify-center shrink-0 overflow-hidden">
      <svg viewBox="0 0 48 48" className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-700 fill-current" aria-hidden="true">
        <path d="M26 8c-6.6 0-11 4.5-11 10.5 0 2.2.8 4.2 2 5.8v4.7c0 1.7 1.3 3 3 3h7c1.7 0 3-1.3 3-3v-4.7c1.2-1.6 2-3.6 2-5.8C32 12.5 27.6 8 26 8zm-8 7c1-3 3.5-5 6.5-5 4 0 7 2.5 7.5 6.5-2.5-.5-5.5-.5-8.5 1-2 1-3.5 2.5-4.5 4.5-.5-2.5-.5-5-1-7z" />
        <path d="M19 28c-.5 2-1 4.5-1 6.5 0 2.2 1.8 4 4 4h7c2.2 0 4-1.8 4-4 0-2-.5-4.5-1-6.5h-13z" opacity="0.6"/>
      </svg>
    </div>
  );
}

// Service Image displaying backend image URL if returned in service response, with fallback to ServiceAvatar
function ServiceImage({ service }) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = service?.imageUrl || service?.image || service?.photoUrl || service?.image_url;

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  if (imageUrl && !imgError) {
    return (
      <div className="w-28 h-28 sm:w-[135px] sm:h-[135px] rounded-md bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 shadow-2xs">
        <img
          src={imageUrl}
          alt={service?.name || 'Service'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return <ServiceAvatar category={service?.category} name={service?.name} />;
}

const CATEGORY_META = {
  ALL: { label: 'All Services' },
  HAIRCUT: { label: 'Haircut' },
  BEARD: { label: 'Beard' },
  HAIR_AND_BEARD: { label: 'Hair+Beard' },
  HAIR_COLOR: { label: 'Color' },
  FACIAL: { label: 'Facial' },
  MASSAGE: { label: 'Massage' },
  STYLING: { label: 'Styling' },
  OTHER: { label: 'Other' },
};

export default function ServicesTab({
  services = [],
  servicesLoading = false,
  selectedServices = [],
  onToggleService,
  onRemoveService,
  totalPrice = 0,
  totalDuration = 0,
  estimatedArrivalMs = Date.now(),
  totalChairs = 1,
  waitMinutes = 0,
  payState = 'IDLE',
  payError = '',
  onPayNow,
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);

  // Available categories derived dynamically from services fetched from the backend
  const presentCategories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean));
    // Ensure primary standard categories are represented if present in list
    return Array.from(set);
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        selectedCategory === 'ALL' || service.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description &&
          service.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  // Handle hardware/browser back button: close mobile drawer instead of navigating away
  useEffect(() => {
    if (mobileTicketOpen) {
      window.history.pushState({ modal: 'ticket' }, '');
      const handlePopState = () => {
        setMobileTicketOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [mobileTicketOpen]);

  // Close ticket safely, syncing with history state
  const handleCloseTicket = () => {
    if (window.history.state?.modal === 'ticket') {
      window.history.back();
    } else {
      setMobileTicketOpen(false);
    }
  };

  // Close modal when payment succeeds
  useEffect(() => {
    if (payState === 'SUCCESS') {
      setMobileTicketOpen(false);
    }
  }, [payState]);

  return (
    <div className="pb-28 lg:pb-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Services Catalog */}
        <div className="lg:col-span-7 xl:col-span-8">
          {/* 1. Search Bar (Full rounded pill input matching reference image) */}
          <div className="relative mb-3">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search haircut, beard, facial, styling..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/90 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* 2. Category horizontal pills (matching reference image) */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 hide-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-[#0B2524] text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Services
            </button>

            {/* Standard Category Pills */}
            {(presentCategories.length > 0
              ? presentCategories
              : ['HAIRCUT', 'BEARD', 'HAIR_COLOR', 'FACIAL']
            ).map((cat) => {
              const label =
                CATEGORY_META[cat]?.label ||
                cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#0B2524] text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 3. Status Header: count + selected badge */}
          <div className="flex items-center justify-between my-3 px-1">
            <span className="text-xs sm:text-sm font-semibold text-slate-500">
              {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} available
            </span>
            {selectedServices.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1 rounded-full text-xs font-bold">
                <Check size={13} strokeWidth={2.5} />
                {selectedServices.length} chosen
              </span>
            )}
          </div>

          {/* 4. Services List Cards Stack */}
          {servicesLoading ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 p-6">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading services…</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 p-6">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-sm font-medium text-slate-700">No services found</p>
              <p className="text-xs mt-0.5">Try a different category or search term.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);

                return (
                  <div
                    key={service.id}
                    onClick={() => onToggleService(service)}
                    className={`p-1 sm:p-1.5 pr-3.5 sm:pr-4 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 sm:gap-3.5 select-none ${
                      isSelected
                        ? 'bg-white border border-black shadow-xs'
                        : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Left Service Image (pulls imageUrl from backend response, with fallback to category avatar) */}
                    <ServiceImage service={service} />

                    {/* Middle Info Details */}
                    <div className="min-w-0 flex-1 py-1">
                      <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 tracking-tight leading-snug truncate">
                        {service.name}
                      </h3>
                      <p className="font-body text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-0.5 line-clamp-2">
                        {service.description || 'Classic & modern styles'}
                      </p>

                      {/* Time and Price row with stylish typography */}
                      <div className="flex items-center gap-2 sm:gap-2.5 mt-2">
                        <span className="inline-flex items-center gap-1 font-body text-xs font-medium text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>{service.durationMinutes} min</span>
                        </span>
                        <span className="text-slate-300 font-light">•</span>
                        <span className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                          ₹{service.price}
                        </span>
                      </div>
                    </div>

                    {/* Right Circular Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleService(service);
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white shadow-2xs'
                          : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      title={isSelected ? 'Remove service' : 'Add service'}
                    >
                      {isSelected ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <Plus size={18} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Booking Ticket */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
          <div className="sticky top-20">
            <BookingTicket
              selectedServices={selectedServices}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              estimatedArrivalMs={estimatedArrivalMs}
              totalChairs={totalChairs}
              waitMinutes={waitMinutes}
              payState={payState}
              payError={payError}
              onRemoveService={onRemoveService}
              onPayNow={onPayNow}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Summary Bar matching reference image */}
      {selectedServices.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto pointer-events-none">
          <div className="bg-[#f0faf5] border border-emerald-100/90 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 px-4 sm:px-4.5 shadow-lg shadow-emerald-950/5 flex items-center justify-between gap-3 pointer-events-auto">
            {/* Left: Ticket icon + service details */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                <Ticket size={20} className="text-emerald-600" />
              </div>

              <div className="min-w-0">
                <div className="font-body text-xs font-semibold text-slate-800 leading-tight truncate">
                  <span>{selectedServices.length} selected </span>
                  <span className="text-slate-500 font-normal">(~{totalDuration}m)</span>
                </div>
                <div className="font-display font-bold text-lg sm:text-xl text-slate-900 leading-tight my-0.5">
                  ₹{totalPrice}
                </div>
                <div className="font-body text-[11px] sm:text-xs font-medium text-emerald-700 flex items-center gap-1 leading-tight">
                  <Clock size={12} className="text-emerald-600 shrink-0" />
                  <span>
                    Arrival: ~{estimatedArrivalMs
                      ? new Date(estimatedArrivalMs).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        }).toLowerCase()
                      : 'now'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-[1px] bg-slate-200/90 mx-1 shrink-0" />

            {/* Right: Book Now Button */}
            <button
              type="button"
              onClick={() => setMobileTicketOpen(true)}
              className="bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white font-body font-semibold text-xs sm:text-sm px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Book Now</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Drawer Modal for Ticket Details */}
      {mobileTicketOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 hardware-accelerated flex items-end justify-center p-0">
          <div className="bg-white w-full max-h-[85vh] rounded-t-3xl overflow-y-auto p-4 sm:p-5 shadow-2xl relative animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-slate-900">Your Booking Ticket</h3>
              <button
                type="button"
                onClick={handleCloseTicket}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <BookingTicket
              selectedServices={selectedServices}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              estimatedArrivalMs={estimatedArrivalMs}
              totalChairs={totalChairs}
              waitMinutes={waitMinutes}
              payState={payState}
              payError={payError}
              onRemoveService={onRemoveService}
              onPayNow={onPayNow}
            />
          </div>
        </div>
      )}
    </div>
  );
}

