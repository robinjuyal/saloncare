import React from 'react';
import { CheckCircle2, X, ArrowRight, Clock, Users } from 'lucide-react';

export default function BookingSuccessModal({
  booking,
  onTrackQueue,
  onViewMyBookings,
  onClose,
}) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        )}

        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Booking Confirmed!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Your spot is secured on the live barber floor.
          </p>
        </div>

        {/* Digital Ticket Stub */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden mb-5">
          <div className="p-4 sm:p-5 text-center bg-white border-b border-slate-100">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-slate-400">
              Live Token Number
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-600 tracking-wider mt-1">
              {booking.bookingCode}
            </div>
          </div>

          <div className="relative flex items-center px-4">
            <div className="flex-1 border-t-2 border-dashed border-slate-200 ticket-notch" />
          </div>

          <div className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Salon</span>
              <span className="font-semibold text-slate-900">{booking.salonName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Services</span>
              <span className="font-semibold text-slate-900">{booking.serviceName}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200/70">
              <span className="text-slate-500 font-medium">Amount Paid</span>
              <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                ₹{booking.amount}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onTrackQueue}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users size={16} />
            Track in Live Waiting Line
          </button>

          <button
            type="button"
            onClick={onViewMyBookings}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            View All My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
