import React from 'react';
import {
  Clock,
  Users,
  MapPin,
  Share2,
} from 'lucide-react';

// Format time string to 12-hour AM/PM format e.g. "09:00:00" -> "9:00 AM", "20:30:00" -> "8:30 PM"
function formatTo12Hour(t) {
  if (!t) return '';
  const trimmed = t.trim();

  // Already has AM/PM
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  }

  // 24-hour HH:mm or HH:mm:ss format
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2];
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  }

  return trimmed;
}

function SalonHeader({ salon, waitMinutes, queueLength }) {
  if (!salon) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: salon.name,
          text: `Check live queue and book slots at ${salon.name} on SalonQueue!`,
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

  const openTime = formatTo12Hour(salon.openingTime) || '9:00 AM';
  const closeTime = formatTo12Hour(salon.closingTime) || '9:00 PM';
  // Use the same coverImage property as in CustomerHome salon card
  const salonImg = salon.coverImage || salon.imageUrl;

  return (
    <div className="bg-white border border-slate-100/90 rounded-3xl shadow-sm overflow-hidden mb-4 font-sans transform-gpu">
      {/* 1. Hero Image Container with Overlaid Info */}
      <div className="relative w-full h-48 sm:h-56 md:h-64 bg-slate-900 overflow-hidden transform-gpu">
        {/* Monogram fallback layer (always rendered behind) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white z-0">
          <span className="font-display font-bold text-4xl sm:text-5xl text-emerald-400">
            {salon.name?.charAt(0) || 'S'}
          </span>
          <span className="font-sans text-xs sm:text-sm text-slate-400 tracking-widest uppercase mt-0.5">
            SALON
          </span>
        </div>

        {/* Real salon image matching CustomerHome item */}
        {salonImg && (
          <img
            src={salonImg}
            alt={salon.name || 'Salon'}
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover z-10 transform-gpu"
            onError={(e) => {
              e.currentTarget.remove();
            }}
          />
        )}

        {/* Top-Right: Category / Unisex Badge */}
        <div className="absolute top-3 right-3 sm:top-3.5 sm:right-4 z-20 pointer-events-auto">
          <div className="bg-slate-950/80 border border-white/20 text-white text-xs font-bold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-md">
            {salon.genderCategory || 'Unisex'}
          </div>
        </div>

        {/* Bottom Overlay: Salon Name, Location, Time (Left) & Share Button (Right) */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent pt-16 pb-3 sm:pb-4 px-3.5 sm:px-5 flex items-end justify-between gap-3 pointer-events-none">
          {/* Bottom-Left: Salon Name, Location, Operating Hours */}
          <div className="flex flex-col items-start text-left min-w-0 max-w-[75%] sm:max-w-[82%] pointer-events-auto">
            <h1 className="font-cormorant italic font-bold text-3xl sm:text-4xl md:text-5xl text-white tracking-wide leading-none truncate max-w-full drop-shadow-md pb-0.5">
              {salon.name || 'Salon Care'}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 items-start gap-0.5 text-xs sm:text-sm text-slate-200 font-body mt-1 sm:mt-1.5">
              <div className="flex items-center gap-1.5 truncate max-w-full">
                <MapPin size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">
                  {salon.address ? `${salon.address}${salon.city ? `, ${salon.city}` : ''}` : 'Bhauwala, Dehradun'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Clock size={14} className="text-emerald-400 shrink-0" />
                <span>{openTime} – {closeTime}</span>
              </div>
            </div>
          </div>

          {/* Bottom-Right: Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/80 hover:bg-slate-900 active:bg-black border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-md pointer-events-auto active:scale-95 shrink-0"
            title="Share Salon"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* 2. 3-Stat Metric Strip: Wait Time, In Line, Chairs */}
      <div className="p-3 sm:p-4 bg-white">
        <div className="grid grid-cols-3 divide-x divide-emerald-100/90 bg-[#F4FBF7] border border-emerald-100/70 rounded-2xl p-3 sm:p-3.5">
          {/* 1. Wait Time */}
          <div className="text-center px-1 sm:px-2 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 transform-gpu" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-xl sm:text-2xl text-emerald-800 tracking-tight leading-none">
                  {waitMinutes === 0 ? '0' : `~${waitMinutes}`}
                </span>
                <span className="font-display font-semibold text-xs sm:text-sm text-emerald-700">
                  mins
                </span>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider mt-1 whitespace-nowrap">
              WAIT TIME
            </div>
          </div>

          {/* 2. In Line */}
          <div className="text-center px-1 flex flex-col items-center justify-center">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center gap-1.5 font-mono leading-none">
              <Users size={18} className="text-slate-600 shrink-0" />
              <span>{queueLength}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wider mt-1.5 whitespace-nowrap">
              IN LINE
            </div>
          </div>

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

export default React.memo(SalonHeader);

