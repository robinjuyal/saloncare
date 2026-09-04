import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Activity, RefreshCw, AlertTriangle, Clock, Users, Scissors } from 'lucide-react';

export default function AdminQueues() {
  const [queues,   setQueues]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = () => {
    setLoading(true);
    adminAPI.getLiveQueues()
      .then(r => { setQueues(r.data.data); setLastRefresh(new Date()); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalWaiting  = queues.reduce((s, q) => s + q.waiting,   0);
  const totalServing  = queues.reduce((s, q) => s + q.inProgress, 0);
  const longWaitCount = queues.filter(q => q.hasLongWait).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Queue Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">
            {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString('en-IN')}` : 'Loading...'}
            {' · '}Auto-refreshes every 30s
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-sm hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-amber-400" />
            <span className="text-xs text-slate-500">Total Waiting</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalWaiting}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Scissors size={16} className="text-emerald-400" />
            <span className="text-xs text-slate-500">In Service Now</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalServing}</div>
        </div>
        <div className={`bg-slate-900 border rounded-xl p-5 ${longWaitCount > 0 ? 'border-amber-500/30' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className={longWaitCount > 0 ? 'text-amber-400' : 'text-slate-500'} />
            <span className="text-xs text-slate-500">Long Waits (&gt;45 min)</span>
          </div>
          <div className={`text-3xl font-bold ${longWaitCount > 0 ? 'text-amber-400' : 'text-white'}`}>{longWaitCount}</div>
        </div>
      </div>

      {/* Queue cards */}
      {loading && queues.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queues.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          No active queues right now
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {queues.map(q => (
            <div key={q.salonId}
              className={`bg-slate-900 border rounded-xl p-5 transition-all ${
                q.hasLongWait ? 'border-amber-500/40' : 'border-slate-800'
              }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-white font-semibold text-sm">{q.salonName}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{q.city}</div>
                </div>
                {q.hasLongWait && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                    <AlertTriangle size={10} /> Long wait
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{q.waiting}</div>
                  <div className="text-xs text-slate-500 mt-1">Waiting</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{q.inProgress}</div>
                  <div className="text-xs text-slate-500 mt-1">In Service</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{q.total}</div>
                  <div className="text-xs text-slate-500 mt-1">Total</div>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (q.total / 20) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-600 mt-1">{q.total} of 20 capacity</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}