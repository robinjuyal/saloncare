import React from 'react';
import {
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export default function SalonHeader({ salon, waitMinutes, queueLength, onSelectTab }) {
  if (!salon) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: salon.name,
          text: `Check live queue and book slots at ${salon.name} on SalonCare!`,
          url: window.location.href,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Salon link copied to clipboard!');
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden mb-3 sm:mb-4">
      <div className="p-3.5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                Verified Salon
              </span>
              <span className="bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full">
                {salon.genderCategory || 'Unisex'}
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate">
              {salon.name}
            </h1>

            {salon.address && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{salon.address}</span>
              </p>
            )}

            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-emerald-600 shrink-0" />
                <span>{salon.openingTime || '09:00 AM'} – {salon.closingTime || '09:00 PM'}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Share Salon"
          >
            <Share2 size={15} />
          </button>
        </div>

        {/* 3-Stat Metric Strip: Wait Time (Big & Blinking), In line, Chairs */}
        <div className="grid grid-cols-3 divide-x divide-slate-200/80 mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-2.5">
          {/* 1. Wait Time: Big text + subtle blinking effect */}
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('queue')}
            className="text-center px-1 group cursor-pointer flex flex-col items-center justify-center"
          >
            <div className="flex items-center justify-center gap-1 animate-pulse">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xl sm:text-2xl md:text-3xl font-mono font-black text-emerald-600 tracking-tight">
                {waitMinutes === 0 ? '0m' : `~${waitMinutes}m`}
              </span>
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider mt-0.5 whitespace-nowrap">
              Wait Time
            </div>
          </button>

          {/* 2. In line (renamed from In Queue) */}
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('queue')}
            className="text-center px-1 group cursor-pointer flex flex-col items-center justify-center"
          >
            <div className="text-lg sm:text-xl md:text-2xl font-mono font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <Users size={16} className="text-slate-400 group-hover:text-slate-700 transition shrink-0" />
              <span>{queueLength}</span>
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
              In line
            </div>
          </button>

          {/* 3. Chairs */}
          <div className="text-center px-1 flex flex-col items-center justify-center">
            <div className="text-lg sm:text-xl md:text-2xl font-mono font-bold text-slate-800 flex items-center justify-center gap-1">
              <span>{salon.totalChairs || 1}</span>
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
              Chairs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
