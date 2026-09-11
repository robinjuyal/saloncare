import React from 'react';
import {
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function AboutTab({ salon }) {
  if (!salon) return null;

  const openGoogleMaps = () => {
    const query = encodeURIComponent(`${salon.name}, ${salon.address || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const openWhatsApp = () => {
    const phone = salon.phone || '919876543210';
    const text = encodeURIComponent(
      `Hello ${salon.name}, I am booking an appointment via SalonCare!`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  const callPhone = () => {
    if (salon.phone) {
      window.location.href = `tel:${salon.phone}`;
    }
  };

  const schedule = [
    { day: 'Monday – Friday', hours: `${salon.openingTime || '09:00 AM'} – ${salon.closingTime || '09:00 PM'}` },
    { day: 'Saturday', hours: `${salon.openingTime || '09:00 AM'} – ${salon.closingTime || '10:00 PM'}` },
    { day: 'Sunday', hours: `${salon.openingTime || '09:00 AM'} – ${salon.closingTime || '10:00 PM'}` },
  ];

  const amenities = [
    'Air Conditioned',
    'UV Sanitized Tools',
    'High-Speed Wi-Fi',
    'Live Queue Tracking',
    'Complimentary Beverages',
    'UPI & Cards Accepted',
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Location & Directions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Location & Quick Contact
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Easily navigate or reach out to the front desk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openGoogleMaps}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Navigation size={14} />
              <span>Directions</span>
            </button>
            {salon.phone && (
              <button
                type="button"
                onClick={callPhone}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Phone size={14} />
                <span>Call</span>
              </button>
            )}
            <button
              type="button"
              onClick={openWhatsApp}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 sm:p-4 flex items-start gap-3">
          <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <div className="font-bold text-slate-900">{salon.name}</div>
            <div className="text-slate-600 mt-0.5">{salon.address || 'Address provided upon appointment confirmation'}</div>
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock size={16} className="text-emerald-600" />
          Operating Hours
        </h3>

        <div className="divide-y divide-slate-100 text-xs sm:text-sm">
          {schedule.map((item, idx) => (
            <div key={idx} className="py-2.5 flex justify-between items-center">
              <span className="font-medium text-slate-600">{item.day}</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/50">
                {item.hours}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities & Standards */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600" />
          Salon Amenities & Hygiene Standards
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {amenities.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-xs text-slate-700 flex items-center gap-2 font-medium"
            >
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Service & Policies */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600" />
          Arrival & Queue Guarantee Policies
        </h3>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="font-bold text-slate-900 block mb-0.5">Arrival Buffer</span>
            Please arrive 5 to 10 minutes before your estimated time. Your chair will be held for a 10-minute grace window before proceeding to the next person.
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span className="font-bold text-slate-900 block mb-0.5">Cancellation & Instant Refund</span>
            In the rare event of emergency salon closure, a 100% full refund is issued back to your original payment method automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
