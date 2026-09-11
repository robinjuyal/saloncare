import React, { useState, useMemo } from 'react';
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
  LayoutGrid
} from 'lucide-react';
import BookingTicket from './BookingTicket';

const CATEGORY_META = {
  HAIRCUT: { label: 'Haircut', icon: Scissors },
  BEARD: { label: 'Beard', icon: User },
  HAIR_AND_BEARD: { label: 'Hair+Beard', icon: Scissors },
  HAIR_COLOR: { label: 'Color', icon: Palette },
  FACIAL: { label: 'Facial', icon: Sparkles },
  MASSAGE: { label: 'Massage', icon: Sparkles },
  STYLING: { label: 'Styling', icon: Scissors },
  OTHER: { label: 'Other', icon: LayoutGrid },
};

const getCategoryMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.OTHER;

export default function ServicesTab({
  services = [],
  servicesLoading = false,
  selectedServices = [],
  onToggleService,
  onRemoveService,
  totalPrice,
  totalDuration,
  estimatedArrivalMs,
  totalChairs,
  waitMinutes,
  payState,
  payError,
  onPayNow,
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false);

  // Available categories
  const presentCategories = useMemo(() => {
    return Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
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

  return (
    <div className="pb-28 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Services Catalog - Single Unified Card */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            {/* Integrated Top Controls Area: Search bar + Category selection pills */}
            <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search haircut, beard, facial, styling…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition placeholder:text-slate-400 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Category horizontal pills */}
              {presentCategories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 hide-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                      selectedCategory === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    All Services
                  </button>
                  {presentCategories.map((cat) => {
                    const meta = getCategoryMeta(cat);
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                          active
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Services List / Grid inside same unified card */}
            <div className="p-3.5 sm:p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-0.5">
                <span className="font-medium text-slate-500">
                  {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} available
                </span>
                {selectedServices.length > 0 && (
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    {selectedServices.length} chosen
                  </span>
                )}
              </div>

              {servicesLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading services…</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">No services found</p>
                  <p className="text-xs mt-0.5">Try a different category or search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServices.some((s) => s.id === service.id);
                    const meta = getCategoryMeta(service.category);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={service.id}
                        onClick={() => onToggleService(service)}
                        className={`content-auto group relative p-3.5 sm:p-4 rounded-2xl border transition-colors duration-150 cursor-pointer flex flex-col justify-between select-none ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                }`}
                              >
                                <Icon size={14} />
                              </span>
                              <h3 className="font-bold text-sm text-slate-900 leading-snug">
                                {service.name}
                              </h3>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleService(service);
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                            </button>
                          </div>

                          {service.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                              {service.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 mt-2">
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Clock size={12} className="text-slate-400" />
                            {service.durationMinutes} mins
                          </span>
                          <span className="font-mono font-bold text-sm sm:text-base text-slate-900">
                            ₹{service.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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

      {/* Mobile Sticky Bottom Summary Bar */}
      {selectedServices.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 hardware-accelerated px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-lg">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-500 font-medium truncate">
                {selectedServices.length} selected (~{totalDuration}m)
              </div>
              <div className="text-base font-mono font-bold text-slate-900 leading-tight">
                ₹{totalPrice}
              </div>
              <div className="text-[11px] sm:text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <Clock size={11} className="text-emerald-600 shrink-0" />
                <span>
                  Arrival: ~{new Date(estimatedArrivalMs).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTicketOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition cursor-pointer"
              >
                View Ticket
              </button>
              <button
                type="button"
                onClick={() => setMobileTicketOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
              >
                Book Now
              </button>
            </div>
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
                onClick={() => setMobileTicketOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
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
              onPayNow={() => {
                setMobileTicketOpen(false);
                onPayNow();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
