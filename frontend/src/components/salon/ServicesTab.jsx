import React, { useState, useMemo, useEffect } from 'react';
import {
  Scissors,
  Palette,
  Sparkles,
  Search,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react';
import BookingTicket from './BookingTicket';

// Compact Service Avatar Illustration Helper
function ServiceAvatar({ category, name }) {
  const n = (name || '').toLowerCase();
  const c = (category || '').toUpperCase();

  if (n.includes('women') || n.includes('female') || n.includes('girl') || n.includes('lady')) {
    return (
      <div className="self-stretch w-[72px] sm:w-[80px] rounded-xl bg-[#FFE4E6] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-10 sm:h-10 text-rose-500 fill-current" aria-hidden="true">
          <path d="M24 6c-6.6 0-12 5.4-12 12 0 4.2 2.2 7.9 5.5 10v3c0 1.7 1.3 3 3 3h7c1.7 0 3-1.3 3-3v-3c3.3-2.1 5.5-5.8 5.5-10 0-6.6-5.4-12-12-12zm-3.5 13c-1.4 0-2.5-1.1-2.5-2.5S19.1 14 20.5 14s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zm7 0c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z" opacity="0.85" />
          <path d="M14 20c-1.5 2.5-2 6-1.5 10 1.5-1 3-2 4-3.5-1-2-1.8-4.2-2.5-6.5zm20 0c-.7 2.3-1.5 4.5-2.5 6.5 1 1.5 2.5 2.5 4 3.5.5-4 0-7.5-1.5-10z" />
        </svg>
      </div>
    );
  }

  if (c === 'BEARD' || n.includes('beard') || n.includes('shave') || n.includes('mustache')) {
    return (
      <div className="self-stretch w-[72px] sm:w-[80px] rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-10 sm:h-10 text-amber-600 fill-current" aria-hidden="true">
          <circle cx="24" cy="17" r="7" />
          <path d="M16 26c0 6 3.6 11 8 11s8-5 8-11c0-2-1.5-3-3-3h-10c-1.5 0-3 1-3 3zm8 6c-2.2 0-4-1.3-4-3h8c0 1.7-1.8 3-4 3z" />
        </svg>
      </div>
    );
  }

  if (c === 'HAIR_COLOR' || n.includes('color') || n.includes('dye') || n.includes('highlight')) {
    return (
      <div className="self-stretch w-[72px] sm:w-[80px] rounded-xl bg-[#EDE9FE] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-10 sm:h-10 text-purple-600 fill-current" aria-hidden="true">
          <path d="M24 6C15.2 6 8 13.2 8 22c0 4.5 1.9 8.6 5 11.5 1.4 1.3 2.5 3 2.5 5 0 2 1.6 3.5 3.5 3.5h10c1.9 0 3.5-1.6 3.5-3.5 0-2 1.1-3.7 2.5-5 3.1-2.9 5-7 5-11.5 0-8.8-7.2-16-16-16zm-7 15c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm6-6c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm8 6c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
        </svg>
      </div>
    );
  }

  if (c === 'FACIAL' || c === 'MASSAGE' || n.includes('facial') || n.includes('spa') || n.includes('massage')) {
    return (
      <div className="self-stretch w-[72px] sm:w-[80px] rounded-xl bg-[#E0F2FE] flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-10 sm:h-10 text-sky-600 fill-current" aria-hidden="true">
          <circle cx="24" cy="22" r="11" opacity="0.8" />
          <path d="M24 7l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zm12 21l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3zM10 28l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3z" />
        </svg>
      </div>
    );
  }

  // Default: Men's Haircut styling
  return (
    <div className="self-stretch w-[72px] sm:w-[80px] rounded-xl bg-[#D1FAE5] flex items-center justify-center shrink-0 overflow-hidden">
      <svg viewBox="0 0 48 48" className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-700 fill-current" aria-hidden="true">
        <path d="M26 8c-6.6 0-11 4.5-11 10.5 0 2.2.8 4.2 2 5.8v4.7c0 1.7 1.3 3 3 3h7c1.7 0 3-1.3 3-3v-4.7c1.2-1.6 2-3.6 2-5.8C32 12.5 27.6 8 26 8zm-8 7c1-3 3.5-5 6.5-5 4 0 7 2.5 7.5 6.5-2.5-.5-5.5-.5-8.5 1-2 1-3.5 2.5-4.5 4.5-.5-2.5-.5-5-1-7z" />
        <path d="M19 28c-.5 2-1 4.5-1 6.5 0 2.2 1.8 4 4 4h7c2.2 0 4-1.8 4-4 0-2-.5-4.5-1-6.5h-13z" opacity="0.6" />
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
      <div className="self-stretch w-[72px] sm:w-[80px] rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 shadow-2xs">
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
  const [selectedGender, setSelectedGender] = useState('MEN');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Gender-specific services (defaults to MEN)
  const genderFilteredServices = useMemo(() => {
    return services.filter((service) => {
      const g = (service.gender || '').toUpperCase();
      const name = (service.name || '').toLowerCase();
      const isWomen =
        name.includes('women') ||
        name.includes('female') ||
        name.includes('girl') ||
        name.includes('lady');

      if (selectedGender === 'WOMEN') {
        return (
          g === 'WOMEN' ||
          g === 'UNISEX' ||
          g === 'ALL' ||
          (!g && isWomen)
        );
      }

      // Default: MEN
      return (
        g === 'MEN' ||
        g === 'UNISEX' ||
        g === 'ALL' ||
        (!g && !isWomen)
      );
    });
  }, [services, selectedGender]);

  // 2. Categories derived dynamically from current gender's services
  const presentCategories = useMemo(() => {
    const set = new Set(genderFilteredServices.map((s) => s.category).filter(Boolean));
    return Array.from(set);
  }, [genderFilteredServices]);

  // 3. Reset category if switching gender renders current category empty
  useEffect(() => {
    if (selectedCategory !== 'ALL' && !presentCategories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [selectedGender, presentCategories, selectedCategory]);

  // 4. Filtered services sorted in ascending order by id
  const filteredServices = useMemo(() => {
    return [...genderFilteredServices]
      .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))
      .filter((service) => {
        const matchesCategory =
          selectedCategory === 'ALL' || service.category === selectedCategory;
        const matchesSearch =
          !searchQuery.trim() ||
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (service.description &&
            service.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
      });
  }, [genderFilteredServices, selectedCategory, searchQuery]);

  return (
    <div className="pb-28 lg:pb-6 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Services Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 min-w-0">
          {/* Combined Gender Toggle (Left) & Search Bar (Right) Row */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3.5 sm:mb-4">
            {/* 1. Men / Women Gender Toggle */}
            <div className="inline-flex p-1 bg-white border border-slate-200/90 rounded-xl shadow-2xs gap-1 items-center shrink-0">
              <button
                type="button"
                id="toggle-men-services"
                onClick={() => setSelectedGender('MEN')}
                aria-label="Men's Services"
                className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer ${selectedGender === 'MEN'
                  ? 'bg-slate-100 text-slate-900 border border-black/30 shadow-2xs'
                  : 'bg-transparent text-slate-400 hover:text-slate-600 border border-transparent'
                  }`}
              >
                MEN
              </button>

              <button
                type="button"
                id="toggle-women-services"
                onClick={() => setSelectedGender('WOMEN')}
                aria-label="Women's Services"
                className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer ${selectedGender === 'WOMEN'
                  ? 'bg-pink-50 text-pink-500 border border-pink-200/90 shadow-2xs'
                  : 'bg-transparent text-slate-400 hover:text-slate-600 border border-transparent'
                  }`}
              >
                WOMEN
              </button>
            </div>

            {/* 2. Search Bar */}
            <div className="relative flex-1 min-w-0">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search services, haircuts, styling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>


          {/* 3. Services List: 2-Row Horizontal Scroll Grid */}
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
            <div
              className={`grid ${filteredServices.length === 1 ? 'grid-rows-1' : 'grid-rows-2'
                } grid-flow-col auto-cols-[230px] sm:auto-cols-[260px] gap-2.5 sm:gap-3 overflow-x-auto pb-3 pt-1 hide-scrollbar scroll-smooth overscroll-x-contain`}
              style={{
                gridTemplateRows:
                  filteredServices.length === 1
                    ? 'repeat(1, minmax(88px, 1fr))'
                    : 'repeat(2, minmax(88px, 1fr))',
              }}
            >
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);

                return (
                  <div
                    key={service.id}
                    onClick={() => onToggleService(service)}
                    className={`p-1 sm:p-1.5 pr-3 sm:pr-3.5 rounded-2xl transition-all duration-150 cursor-pointer flex items-center gap-2.5 sm:gap-3 select-none shrink-0 h-[88px] sm:h-[96px] ${isSelected
                      ? 'bg-slate-900/[0.04] border border-black/40 shadow-xs'
                      : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                      }`}
                  >
                    {/* Left Compact Service Image / Avatar - minimal margin from left, top, bottom */}
                    <ServiceImage service={service} />

                    {/* Middle Info Details - maximum space for texts */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5 gap-0.5">
                      <h3
                        className="font-body font-normal text-sm sm:text-[15px] text-black tracking-tight leading-snug truncate"
                        title={service.name}
                      >
                        {service.name}
                      </h3>
                      {service.description && (
                        <p
                          className="font-body text-xs text-slate-500 font-normal leading-normal truncate"
                          title={service.description}
                        >
                          {service.description}
                        </p>
                      )}

                      {/* Time and Price row */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 font-body text-xs font-medium text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded shrink-0 leading-normal">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>{service.durationMinutes}m</span>
                        </span>
                        <span className="font-body font-normal text-sm sm:text-base text-black tracking-tight leading-normal">
                          ₹{service.price}
                        </span>
                      </div>
                    </div>
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
    </div>
  );
}

