import React, { useState, useEffect, useRef } from 'react';
import { User, Check, Timer } from 'lucide-react';

/**
 * One chair's "currently serving" card. Fully self-contained — owns its
 * own elapsed-time timer keyed off `entry.actualStartTime`, so two of
 * these can sit side by side on one shared screen without stepping on
 * each other's state (each chair's clock is independent).
 *
 * entry = the IN_PROGRESS queue entry seated in this chair, or null if
 * the chair is empty right now.
 */
export default function ChairCard({ chairNumber, entry, onComplete, twoChairMode }) {
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

  const isOverrunning = entry && Math.floor(elapsedSeconds / 60) > entry.estimatedDurationMinutes;
  const progressPct = entry
    ? Math.min(100, ((elapsedSeconds / 60) / entry.estimatedDurationMinutes) * 100)
    : 0;

  return (
    <div className={`relative rounded-2xl shadow-lg p-6 transition-all font-body ${
      entry ? 'bg-ink text-paper' : 'bg-paper-card border-2 border-dashed border-ink/12 text-ink'
    }`}>
      {/* Chair badge — only shown when two chairs are active, so a single-chair
          salon's screen stays exactly as simple as it's always been. */}
      {twoChairMode && (
        <div className={`absolute top-4 right-4 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
          entry ? 'bg-paper/15 text-paper' : 'bg-ink/8 text-ink/50'
        }`}>
          CHAIR {chairNumber}
        </div>
      )}

      {entry ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-rose/20 backdrop-blur-sm p-3 rounded-full">
              <User size={24} className="text-rose" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-paper/50 font-medium uppercase tracking-wide">Currently Serving</div>
              <div className="text-xl sm:text-2xl font-display font-semibold truncate">{entry.customerName}</div>
            </div>
          </div>

          {entry.type === 'ONLINE_BOOKING' && (
            <div className="inline-block bg-sage text-white px-3 py-1 rounded-full text-xs font-bold shadow mb-4">
              PAID ONLINE
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-5 bg-paper/8 rounded-xl p-4">
            <div className="min-w-0">
              <div className="text-[11px] text-paper/50">Service</div>
              <div className="text-sm font-semibold truncate">{entry.serviceName}</div>
            </div>
            <div>
              <div className="text-[11px] text-paper/50">Duration</div>
              <div className="text-sm font-semibold font-mono">{entry.estimatedDurationMinutes} min</div>
            </div>
            <div>
              <div className="text-[11px] text-paper/50 flex items-center gap-1">
                <Timer size={11} /> Elapsed
              </div>
              <div className={`text-base font-bold font-mono ${isOverrunning ? 'text-rose' : 'text-paper'}`}>
                {formatTimer(elapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <div className="w-full bg-paper/15 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${isOverrunning ? 'bg-rose' : 'bg-sage'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => onComplete(entry.id)}
            className="w-full bg-rose hover:bg-rose-dark text-white py-3.5 rounded-xl font-bold text-base transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-rose/25"
          >
            <Check size={20} />
            Finish
          </button>
        </div>
      ) : (
        <div className="text-center py-10">
          <User size={40} className="mx-auto mb-3 text-ink/25" />
          <div className="text-base font-display font-semibold mb-1 text-ink/60">
            {twoChairMode ? `Chair ${chairNumber} is free` : 'No Customer in Chair'}
          </div>
          <div className="text-sm text-ink/40">Start serving the next customer from queue</div>
        </div>
      )}
    </div>
  );
}
