import React from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

export default function WaitingLineTab({
  queue = [],
  waitMinutes = 0,
}) {
  const waitingEntries = queue.filter((q) => q.status === 'WAITING');

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner: Status Overview */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Live Waiting Line
              </h2>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE QUEUE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Synced with in-store counter terminal and automated queue dispatch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-center">
              <div className="text-xs text-slate-400 font-medium">Estimated Wait</div>
              <div className="text-base font-mono font-bold text-emerald-600">
                {waitMinutes === 0 ? 'Instant' : `~${waitMinutes} min`}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 text-center">
              <div className="text-xs text-slate-400 font-medium">In Line</div>
              <div className="text-base font-mono font-bold text-slate-800">
                {waitingEntries.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Waiting List Section (Without chairs stations and without token text) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Customers in Waiting Line
            </h3>
            <p className="text-xs text-slate-500">
              Arrival order of verified bookings.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {waitingEntries.length} waiting
          </span>
        </div>

        {waitingEntries.length === 0 ? (
          <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Users size={32} className="mx-auto mb-2 opacity-40 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">No Customers in Queue</p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
              Walk-in or book online to get seated without having to wait!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {waitingEntries.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{entry.customerName || `Customer ${idx + 1}`}</span>
                      {idx === 0 && (
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                          Up Next
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                      <span>{entry.serviceName}</span>
                      <span>•</span>
                      <span>~{entry.estimatedDurationMinutes || 25} mins</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {entry.type === 'ONLINE_BOOKING' ? 'Online' : 'Walk-in'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-500">
          <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <p>
            Customers are called in exact queue order as barbers complete their current service.
          </p>
        </div>
      </div>
    </div>
  );
}
