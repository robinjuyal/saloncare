import React, { useState, useEffect } from 'react';
import { ownerAPI } from '../services/api';
import BarberDashboard from './BarberDashboard';
import {
  Scissors, BarChart2, Power, TrendingUp,
  Users, CreditCard, Star, Calendar,
  CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';

const fmt = (rupees) => `₹${Number(rupees || 0).toLocaleString('en-IN')}`;

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className={`bg-white rounded-2xl border-2 ${color} p-5`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
        <Icon size={20} className={color.replace('border-', 'text-').replace('-200', '-600')} />
      </div>
    </div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    <div className="text-sm text-slate-500 mt-1">{label}</div>
  </div>
);

// ── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ salonId }) {
  const [tab,       setTab]       = useState('today');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [rangeErr,  setRangeErr]  = useState('');

  const loadToday = () => {
    setLoading(true);
    ownerAPI.getToday(salonId)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  const loadRange = () => {
    if (!fromDate || !toDate) { setRangeErr('Please select both dates'); return; }
    if (fromDate > toDate)    { setRangeErr('From date must be before To date'); return; }
    setRangeErr('');
    setLoading(true);
    ownerAPI.getRange(salonId, fromDate, toDate)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'today') loadToday();
  }, [tab, salonId]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics & Revenue</h2>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('today')}
          className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
            tab === 'today'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-300'
          }`}>
          Today
        </button>
        <button onClick={() => setTab('range')}
          className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
            tab === 'range'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-300'
          }`}>
          Custom Range
        </button>
      </div>

      {/* Date range picker */}
      {tab === 'range' && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 mb-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <button onClick={loadRange}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition">
              <RefreshCw size={14} /> Show Results
            </button>
          </div>
          {rangeErr && <p className="text-red-500 text-xs mt-2">{rangeErr}</p>}
        </div>
      )}

      {/* Refresh for today */}
      {tab === 'today' && (
        <button onClick={loadToday}
          className="flex items-center gap-2 text-sm text-blue-600 font-semibold hover:underline mb-4">
          <RefreshCw size={13} /> Refresh
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-16 text-slate-400">
          <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>No data found for this period</p>
        </div>
      ) : (
        <>
          {/* Date label */}
          <p className="text-sm text-slate-500 mb-4">
            {data.from === data.to
              ? `Showing data for ${data.from}`
              : `Showing data from ${data.from} to ${data.to}`}
          </p>

          {/* Revenue highlight */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <CreditCard size={16} />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <div className="text-4xl font-bold">{fmt(data.revenueRupees)}</div>
            <div className="text-sm opacity-70 mt-1">from online payments</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Bookings"   value={data.totalBookings}     icon={Calendar}     color="border-blue-200" />
            <StatCard label="Completed"        value={data.completedBookings} icon={CheckCircle}  color="border-green-200" />
            <StatCard label="Cancelled"        value={data.cancelledBookings} icon={XCircle}      color="border-red-200" />
            <StatCard label="No Shows"         value={data.noShowBookings}    icon={AlertCircle}  color="border-amber-200" />
            <StatCard label="Walk-ins Served"  value={data.walkInsServed}     icon={Users}        color="border-purple-200" />
            <StatCard label="Online Served"    value={data.onlineServed}      icon={TrendingUp}   color="border-indigo-200" />
          </div>

          {/* Rating */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500 mb-1">Overall Rating</div>
              <div className="flex items-center gap-2">
                <Star size={20} className="fill-amber-400 text-amber-400" />
                <span className="text-3xl font-bold text-slate-900">{data.averageRating || '—'}</span>
                <span className="text-slate-400 text-sm">/ 5</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{data.totalReviews}</div>
              <div className="text-sm text-slate-500">Total Reviews</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main OwnerDashboard ──────────────────────────────────────────────────────
export default function OwnerDashboard({ salonId }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [isOpen,    setIsOpen]    = useState(null);
  const [toggling,  setToggling]  = useState(false);

  // Load current open/close status on mount
  useEffect(() => {
    if (!salonId) return;
    ownerAPI.getStatus(salonId)
      .then(r => setIsOpen(r.data.data.isOpen))
      .catch(() => setIsOpen(null));
  }, [salonId]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await ownerAPI.toggleShop(salonId);
      setIsOpen(res.data.data.isOpen);
    } catch (e) {
      alert('Failed to update salon status');
    } finally {
      setToggling(false);
    }
  };

  const TABS = [
    { key: 'queue',     label: 'Queue',     icon: Scissors  },
    { key: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top bar with tabs + open/close toggle */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === t.key
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}>
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Open / Close toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling || isOpen === null}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 active:scale-[0.98] ${
              isOpen
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}>
            <Power size={16} className={toggling ? 'animate-spin' : ''} />
            {toggling ? 'Updating...' : isOpen ? 'Shop is OPEN' : 'Shop is CLOSED'}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'queue' && <BarberDashboard salonId={salonId} />}
      {activeTab === 'analytics' && <AnalyticsPanel salonId={salonId} />}
    </div>
  );
}