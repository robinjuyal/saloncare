import React from 'react';
import {
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  Share2,
} from 'lucide-react';

// Format time string to remove outermost zeros e.g. "08:30:00" -> "8:30", "20:30:00" -> "20:30"
function cleanTimeString(t) {
  if (!t) return '';
  const match = t.trim().match(/^0?(\d+):(\d+)(?::\d+)?(?:\s*([APap][Mm]))?$/);
  if (match) {
    const hours = match[1];
    const minutes = match[2];
    const ampm = match[3] ? ` ${match[3].toUpperCase()}` : '';
    return `${hours}:${minutes}${ampm}`;
  }
  return t;
}

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

  const openTime = cleanTimeString(salon.openingTime) || '8:30';
  const closeTime = cleanTimeString(salon.closingTime) || '20:30';
  const salonImg = salon.imageUrl || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="bg-white border border-slate-100/90 rounded-3xl shadow-sm overflow-hidden mb-4 font-sans">
      {/* 1. Hero Image Container with Overlaid Badges */}
      <div className="relative w-full h-52 sm:h-64 md:h-72 bg-slate-100 overflow-hidden">
        <img
          src={salonImg}
          alt={salon.name}
          className="w-full h-full object-cover"
        />
        {/* Top-Left: Verified Salon Pill Badge */}
        <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 bg-[#10B981] text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
          <CheckCircle2 size={15} className="text-white fill-white/20 shrink-0" />
          <span>Verified Salon</span>
        </div>

        {/* Top-Right: Category Pill Badge */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md">
          {salon.genderCategory || 'Unisex'}
        </div>
      </div>

      {/* 2. Salon Info Body */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Salon Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
              {salon.name || 'Salon Care'}
            </h1>

            {/* Location */}
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1.5 truncate">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <span className="truncate">{salon.address || 'Shauwala'}</span>
            </div>

            {/* Operating Hours */}
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
              <Clock size={16} className="text-slate-400 shrink-0" />
              <span>{openTime} - {closeTime}</span>
            </div>
          </div>

          {/* Circular Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition shrink-0 cursor-pointer shadow-2xs"
            title="Share Salon"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* 3. 3-Stat Metric Strip: Wait Time, In Line, Chairs */}
        {/* Retains current functional wait-time simulation and live indicator while matching image styling */}
        <div className="grid grid-cols-3 divide-x divide-emerald-100/90 mt-4 bg-[#F4FBF7] border border-emerald-100/70 rounded-2xl p-3 sm:p-3.5">
          {/* 1. Wait Time: Big blinking minutes with live indicator */}
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('queue')}
            className="text-center px-1 sm:px-2 group cursor-pointer flex flex-col items-center justify-center"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <div className="flex items-baseline gap-1 animate-pulse">
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-800 tracking-tight leading-none">
                  {waitMinutes === 0 ? '0' : `~${waitMinutes}`}
                </span>
                <span className="font-display font-bold text-sm sm:text-base text-emerald-700 ">
                  mins
                </span>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider mt-1 whitespace-nowrap">
              WAIT TIME
            </div>
          </button>

          {/* 2. In Line */}
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('queue')}
            className="text-center px-1 group cursor-pointer flex flex-col items-center justify-center"
          >
            <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center gap-1.5 font-mono leading-none">
              <Users size={18} className="text-slate-600 group-hover:text-slate-900 transition shrink-0" />
              <span>{queueLength}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wider mt-1.5 whitespace-nowrap">
              IN LINE
            </div>
          </button>

          {/* 3. Chairs */}
          <div className="text-center px-1 flex flex-col items-center justify-center">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center gap-1.5 font-mono leading-none">
              <Users size={18} className="text-slate-600 shrink-0" />
              <span>{salon.totalChairs || 2}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wider mt-1.5 whitespace-nowrap">
              CHAIRS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

