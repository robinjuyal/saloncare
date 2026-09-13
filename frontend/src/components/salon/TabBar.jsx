import React from 'react';
import { Scissors, Users, Star, Info } from 'lucide-react';

export default function TabBar({
  activeTab,
  onTabChange,
  queueCount = 0,
  rating = 5.0,
  selectedServicesCount = 0,
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 font-sans">
      {/* 1. Services */}
      <button
        type="button"
        onClick={() => onTabChange('services')}
        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-150 cursor-pointer select-none text-center flex flex-col items-center justify-center relative ${
          activeTab === 'services'
            ? 'bg-[#0B2524] text-white shadow-md'
            : 'bg-white border border-slate-100/90 text-slate-700 hover:border-slate-200 shadow-xs'
        }`}
      >
        <div className="relative">
          <Scissors
            size={20}
            className={activeTab === 'services' ? 'text-white' : 'text-slate-700'}
          />
          {selectedServicesCount > 0 && activeTab !== 'services' && (
            <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          )}
        </div>
        <span className="text-xs sm:text-sm font-bold mt-1.5 leading-tight">
          Services
        </span>
        {activeTab === 'services' ? (
          <span className="w-6 h-1 bg-emerald-400 rounded-full mt-1.5"></span>
        ) : (
          <span className="w-6 h-1 bg-transparent mt-1.5"></span>
        )}
      </button>

      {/* 2. In Line */}
      <button
        type="button"
        onClick={() => onTabChange('queue')}
        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-150 cursor-pointer select-none text-center flex flex-col items-center justify-center relative ${
          activeTab === 'queue'
            ? 'bg-[#0B2524] text-white shadow-md'
            : 'bg-white border border-slate-100/90 text-slate-700 hover:border-slate-200 shadow-xs'
        }`}
      >
        <div className="relative inline-flex items-center justify-center">
          <Users
            size={20}
            className={activeTab === 'queue' ? 'text-emerald-400' : 'text-emerald-600'}
          />
          <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
            {queueCount}
          </span>
        </div>
        <span className="text-xs sm:text-sm font-semibold mt-1.5 leading-tight">
          In Line
        </span>
        {activeTab === 'queue' ? (
          <span className="w-6 h-1 bg-emerald-400 rounded-full mt-1.5"></span>
        ) : (
          <span className="w-6 h-1 bg-transparent mt-1.5"></span>
        )}
      </button>

      {/* 3. Reviews */}
      <button
        type="button"
        onClick={() => onTabChange('reviews')}
        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-150 cursor-pointer select-none text-center flex flex-col items-center justify-center relative ${
          activeTab === 'reviews'
            ? 'bg-[#0B2524] text-white shadow-md'
            : 'bg-white border border-slate-100/90 text-slate-700 hover:border-slate-200 shadow-xs'
        }`}
      >
        <Star
          size={20}
          className={
            activeTab === 'reviews'
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-700'
          }
        />
        <span className="text-xs sm:text-sm font-semibold mt-1.5 leading-tight">
          Reviews
        </span>
        <span
          className={`text-[11px] font-bold mt-0.5 leading-none ${
            activeTab === 'reviews' ? 'text-emerald-300' : 'text-emerald-600'
          }`}
        >
          {rating ? Number(rating).toFixed(1) : '5.0'} ★
        </span>
        {activeTab === 'reviews' ? (
          <span className="w-6 h-1 bg-emerald-400 rounded-full mt-1"></span>
        ) : (
          <span className="w-6 h-1 bg-transparent mt-1"></span>
        )}
      </button>

      {/* 4. About */}
      <button
        type="button"
        onClick={() => onTabChange('about')}
        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-150 cursor-pointer select-none text-center flex flex-col items-center justify-center relative ${
          activeTab === 'about'
            ? 'bg-[#0B2524] text-white shadow-md'
            : 'bg-white border border-slate-100/90 text-slate-700 hover:border-slate-200 shadow-xs'
        }`}
      >
        <Info
          size={20}
          className={activeTab === 'about' ? 'text-white' : 'text-slate-700'}
        />
        <span className="text-xs sm:text-sm font-semibold mt-1.5 leading-tight">
          About
        </span>
        {activeTab === 'about' ? (
          <span className="w-6 h-1 bg-emerald-400 rounded-full mt-1.5"></span>
        ) : (
          <span className="w-6 h-1 bg-transparent mt-1.5"></span>
        )}
      </button>
    </div>
  );
}

