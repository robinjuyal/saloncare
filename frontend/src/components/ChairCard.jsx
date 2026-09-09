import React, { useState, useEffect, useRef } from 'react';
import { User, Check, Timer, Play, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Modern, lightweight ChairCard for Barber Dashboard.
 * Displays active customer in chair or vacant state with instant quick-start action.
 */
export default function ChairCard({
  chairNumber,
  entry,
  onComplete,
  twoChairMode,
  nextWaitingCustomer,
  onStartNext,
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!entry) {
      setElapsedSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const startTimeStr = entry.actualStartTime || entry.startTime;
    const startTime = startTimeStr ? new Date(startTimeStr) : new Date();

    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
      setElapsedSeconds(seconds);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [entry?.id, entry?.actualStartTime]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedMins = entry?.estimatedDurationMinutes || 30;
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const isOverrunning = entry && elapsedMins > estimatedMins;
  const overrunMins = isOverrunning ? elapsedMins - estimatedMins : 0;
  const progressPct = entry
    ? Math.min(100, Math.round(((elapsedSeconds / 60) / estimatedMins) * 100))
    : 0;

  // Initials for avatar
  const initials = entry?.customerName
    ? entry.customerName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        entry
          ? isOverrunning
            ? 'bg-white border-amber-300 shadow-md shadow-amber-500/5 ring-1 ring-amber-300/60'
            : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
          : 'bg-slate-50/80 border-dashed border-2 border-slate-300/80'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-100 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              entry
                ? isOverrunning
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-emerald-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap">
            Chair {chairNumber}
          </span>
          <span
            className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${
              entry
                ? isOverrunning
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {entry ? (isOverrunning ? 'Running Over' : 'In Service') : 'Available'}
          </span>
        </div>

        {entry?.type && (
          <span
            className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 ${
              entry.type === 'ONLINE_BOOKING'
                ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
            }`}
          >
            {entry.type === 'ONLINE_BOOKING' ? (
              <>
                <CheckCircle2 size={11} className="text-blue-600" /> Paid Online
              </>
            ) : (
              'Walk-in'
            )}
          </span>
        )}
      </div>

      {entry ? (
        /* Occupied Chair State */
        <div className="p-3 sm:p-3.5 md:p-4">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
              {initials || <User size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-snug">
                {entry.customerName}
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
                {entry.serviceName}
              </p>
            </div>
          </div>

          {/* Service & Timer Metric Grid */}
          <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] gap-1 sm:gap-1.5 bg-slate-50/90 rounded-xl p-2 sm:p-2.5 mb-2.5 border border-slate-100">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase tracking-wider truncate">
                Service
              </span>
              <span className="text-xs sm:text-[13px] font-semibold text-slate-800 truncate block" title={entry.serviceName}>
                {entry.serviceName}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                Expected
              </span>
              <span className="text-xs sm:text-[13px] font-semibold text-slate-800 font-mono block">
                {estimatedMins} min
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase tracking-wider flex items-center gap-0.5">
                <Timer size={10} /> Elapsed
              </span>
              <span
                className={`text-xs sm:text-[13px] font-bold font-mono block ${
                  isOverrunning ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Progress Bar & Overrun Badge */}
          <div className="mb-2.5 sm:mb-3">
            <div className="flex justify-between items-center text-[11px] mb-1 font-medium">
              <span className="text-slate-500">Service Progress</span>
              {isOverrunning ? (
                <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-amber-200">
                  +{overrunMins}m overtime
                </span>
              ) : (
                <span className="text-slate-600 font-mono text-[11px]">
                  {progressPct}% complete
                </span>
              )}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isOverrunning
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Complete Button */}
          <button
            onClick={() => onComplete(entry.id)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Check size={15} />
            <span>Complete Service</span>
          </button>
        </div>
      ) : (
        /* Vacant Chair State */
        <div className="p-3.5 sm:p-5 text-center flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px]">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mb-2 text-slate-400">
            <User size={18} />
          </div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-1">
            Chair {chairNumber} is Open
          </h4>

          {nextWaitingCustomer && onStartNext ? (
            <div className="mt-2 w-full max-w-xs">
              <p className="text-[11px] text-slate-500 mb-1.5">Next in queue waiting for service:</p>
              <button
                onClick={() => onStartNext(nextWaitingCustomer)}
                className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white py-1.5 sm:py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Play size={12} className="fill-current text-white shrink-0" />
                <span className="truncate">
                  Seat {nextWaitingCustomer.customerName} ({nextWaitingCustomer.serviceName})
                </span>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 max-w-xs">
              Waiting for next walk-in customer or online booking
            </p>
          )}
        </div>
      )}
    </div>
  );
}
