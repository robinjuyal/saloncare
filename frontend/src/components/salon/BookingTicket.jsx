import React from 'react';
import {
  Clock,
  CreditCard,
  Shield,
  AlertCircle,
  Loader,
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function BookingTicket({
  selectedServices,
  totalPrice,
  totalDuration,
  estimatedArrivalMs,
  totalChairs,
  waitMinutes,
  payState,
  payError,
  onRemoveService,
  onPayNow,
}) {
  const formatTime = (ms) =>
    new Date(ms).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const isPaymentInProgress = ['CREATING', 'PROCESSING', 'VERIFYING'].includes(payState);

  if (selectedServices.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center shadow-xs">
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles size={20} />
        </div>
        <h3 className="font-bold text-slate-900 text-base">Select Your Services</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Choose a haircut, beard styling, or combo to calculate your exact arrival time and book a live slot.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
            Token & Booking Summary
          </div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight">
            {selectedServices.length} Service{selectedServices.length > 1 ? 's' : ''} Selected
          </h3>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-mono font-bold px-2.5 py-1 rounded-full">
          ~{totalDuration} mins
        </span>
      </div>

      {/* Selected Items List */}
      <div className="p-4 sm:p-5 space-y-2 border-b border-slate-100">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Items in your visit
        </div>
        {selectedServices.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between text-xs sm:text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200/60"
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="font-semibold text-slate-800 truncate">
                {service.name}
              </div>
              <div className="text-[11px] text-slate-500">
                {service.durationMinutes} mins
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900">
                ₹{service.price}
              </span>
              <button
                type="button"
                onClick={() => onRemoveService(service.id)}
                className="w-6 h-6 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                title="Remove service"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing & Duration Row */}
      <div className="p-4 sm:p-5 space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Estimated Service Duration</span>
          <span className="font-bold text-slate-900">{totalDuration} mins</span>
        </div>
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-slate-600 font-medium">Subtotal</span>
          <span className="font-mono font-bold text-lg sm:text-xl text-slate-900">
            ₹{totalPrice}
          </span>
        </div>
      </div>

      {/* Perforated tear line with ticket notch */}
      <div className="relative flex items-center px-4 my-1">
        <div className="flex-1 border-t-2 border-dashed border-slate-200 ticket-notch" />
      </div>

      {/* Turn Time & Multi-Chair explanation */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-emerald-800 text-xs font-medium flex items-center gap-1">
              <Clock size={13} className="text-emerald-600" />
              Your Estimated Turn
            </span>
            <div className="text-[11px] text-emerald-700/80">
              {waitMinutes === 0
                ? 'A chair is free right now!'
                : `Based on ${totalChairs} active chair${totalChairs > 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-800">
              {formatTime(estimatedArrivalMs)}
            </div>
            <div className="text-[10px] font-mono font-medium text-emerald-700">
              {waitMinutes === 0 ? 'Instant Seat' : `in ~${waitMinutes} min`}
            </div>
          </div>
        </div>

        {/* Error message if payment fails */}
        {payError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-xs text-red-800">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p>{payError}</p>
          </div>
        )}

        {/* Pay Button */}
        <button
          type="button"
          onClick={onPayNow}
          disabled={isPaymentInProgress}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all shadow-md shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {payState === 'CREATING' && (
            <>
              <Loader size={18} className="animate-spin" />
              Preparing secure order…
            </>
          )}
          {payState === 'PROCESSING' && (
            <>
              <Loader size={18} className="animate-spin" />
              Completing Razorpay checkout…
            </>
          )}
          {payState === 'VERIFYING' && (
            <>
              <Loader size={18} className="animate-spin" />
              Verifying payment & issuing token…
            </>
          )}
          {(payState === 'IDLE' || payState === 'FAILED') && (
            <>
              <CreditCard size={18} />
              Pay ₹{totalPrice} & Join Live Queue
            </>
          )}
        </button>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield size={14} className="text-emerald-600" />
          <span>Secured by Razorpay · UPI, GPay, Paytm, Cards</span>
        </div>
      </div>
    </div>
  );
}
