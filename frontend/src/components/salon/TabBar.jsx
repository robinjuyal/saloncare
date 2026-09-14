import React from 'react';
import { Scissors, Star, Info } from 'lucide-react';

export default function TabBar({
  activeTab,
  onTabChange,
  rating = 5.0,
  selectedServicesCount = 0,
}) {
  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto font-sans">
      <div className="grid grid-cols-3 gap-1 p-1 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
        {/* 1. Services */}
        <button
          type="button"
          id="tab-services"
          onClick={() => onTabChange('services')}
          className={`py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 relative ${
            activeTab === 'services'
              ? 'bg-[#0B2524] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
          }`}
        >
          <div className="relative shrink-0 flex items-center">
            <Scissors
              size={18}
              className={activeTab === 'services' ? 'text-white' : 'text-slate-600'}
            />
            {selectedServicesCount > 0 && activeTab !== 'services' && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            )}
          </div>
          <span className="text-xs sm:text-sm tracking-tight truncate">
            Services
          </span>
        </button>

        {/* 2. Reviews */}
        <button
          type="button"
          id="tab-reviews"
          onClick={() => onTabChange('reviews')}
          className={`py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 relative ${
            activeTab === 'reviews'
              ? 'bg-[#0B2524] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
          }`}
        >
          <Star
            size={18}
            className={`shrink-0 ${
              activeTab === 'reviews'
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-500'
            }`}
          />
          <span className="text-xs sm:text-sm tracking-tight truncate">
            Reviews
          </span>
          <span
            className={`text-[11px] font-bold leading-none ${
              activeTab === 'reviews' ? 'text-emerald-300' : 'text-emerald-600'
            }`}
          >
            {rating ? Number(rating).toFixed(1) : '5.0'}★
          </span>
        </button>

        {/* 3. About */}
        <button
          type="button"
          id="tab-about"
          onClick={() => onTabChange('about')}
          className={`py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 relative ${
            activeTab === 'about'
              ? 'bg-[#0B2524] text-white shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
          }`}
        >
          <Info
            size={18}
            className={`shrink-0 ${activeTab === 'about' ? 'text-white' : 'text-slate-600'}`}
          />
          <span className="text-xs sm:text-sm tracking-tight truncate">
            About
          </span>
        </button>
      </div>
    </div>
  );
}
