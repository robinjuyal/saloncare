import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { CreditCard, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

const STATUS_TABS = [
  { label: 'All',      value: ''         },
  { label: 'Captured', value: 'CAPTURED' },
  { label: 'Failed',   value: 'FAILED'   },
  { label: 'Refunded', value: 'REFUNDED' },
  { label: 'Created',  value: 'CREATED'  },
];

const StatusBadge = ({ status }) => {
  const map = {
    CAPTURED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED:   'bg-red-500/10 text-red-400 border-red-500/20',
    REFUNDED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CREATED:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${map[status] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
      {status}
    </span>
  );
};

const fmt     = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
}) : '—';

const isToday = (d) => {
  if (!d) return false;
  const date = new Date(d);
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

const SortTh = ({ label, field, sort, onSort }) => {
  const active = sort.field === field;
  return (
    <th className="px-5 py-3 text-left cursor-pointer select-none group" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1 text-xs text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
        {label}
        {active
          ? sort.dir === 'asc' ? <ArrowUp size={11} className="text-emerald-400" /> : <ArrowDown size={11} className="text-emerald-400" />
          : <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-70" />}
      </div>
    </th>
  );
};

export default function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refunding, setRefunding] = useState(null);
  const [search,    setSearch]    = useState('');
  const [sort,      setSort]      = useState({ field: 'date', dir: 'desc' });
  const status = searchParams.get('status') || '';

  const load = () => {
    setLoading(true);
    adminAPI.getPayments(status || undefined)
      .then(r => setPayments(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const handleSort = (field) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = payments.filter(p =>
      !q ||
      p.customerName?.toLowerCase().includes(q) ||
      p.customerPhone?.includes(q) ||
      p.salonName?.toLowerCase().includes(q) ||
      p.bookingCode?.toLowerCase().includes(q) ||
      p.razorpayOrderId?.toLowerCase().includes(q) ||
      p.razorpayPaymentId?.toLowerCase().includes(q)
    );
    list = [...list].sort((a, b) => {
      let av, bv;
      switch (sort.field) {
        case 'customer': av = a.customerName || ''; bv = b.customerName || ''; break;
        case 'salon':    av = a.salonName    || ''; bv = b.salonName    || ''; break;
        case 'amount':   av = a.amountPaise  || 0;  bv = b.amountPaise  || 0;  break;
        case 'status':   av = a.status       || ''; bv = b.status       || ''; break;
        default:
          av = new Date(a.capturedAt || a.createdAt || 0).getTime();
          bv = new Date(b.capturedAt || b.createdAt || 0).getTime();
      }
      if (av < bv) return sort.dir === 'asc' ? -1 :  1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [payments, search, sort]);

  const todayCount = payments.filter(p => isToday(p.capturedAt || p.createdAt)).length;

  const refund = async (payment) => {
    const reason = window.prompt(`Refund ${fmt(payment.amountPaise)} for ${payment.customerName}?\n\nReason:`);
    if (reason === null) return;
    setRefunding(payment.id);
    try {
      await adminAPI.initiateRefund(payment.id, reason || 'Admin initiated refund');
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Refund failed');
    } finally { setRefunding(null); }
  };

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm">{filtered.length} of {payments.length} transactions</p>
            {todayCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {todayCount} today
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
          {STATUS_TABS.map(t => (
            <button key={t.value}
              onClick={() => { setSearchParams(t.value ? { status: t.value } : {}); setSearch(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                status === t.value ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, salon, booking code, Razorpay ID…"
            className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-80" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          {search ? `No results for "${search}"` : 'No payments found'}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortTh label="Customer" field="customer" sort={sort} onSort={handleSort} />
                <SortTh label="Salon"    field="salon"    sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Booking</th>
                <SortTh label="Amount"   field="amount"   sort={sort} onSort={handleSort} />
                <SortTh label="Status"   field="status"   sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Razorpay ID</th>
                <SortTh label="Date"     field="date"     sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(p => {
                const today = isToday(p.capturedAt || p.createdAt);
                return (
                  <tr key={p.id} className={`transition-colors ${today ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/50'}`}>
                    <td className="px-5 py-4">
                      <div className="text-white font-medium">{p.customerName || '—'}</div>
                      <div className="text-slate-500 text-xs">{p.customerPhone}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{p.salonName || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-emerald-400">{p.bookingCode || '—'}</div>
                      <div className="text-slate-600 text-xs">#{p.bookingId}</div>
                    </td>
                    <td className="px-5 py-4 text-white font-mono font-medium">{fmt(p.amountPaise)}</td>
                    <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      <div title={p.razorpayOrderId}>{p.razorpayOrderId?.slice(-12) || '—'}</div>
                      {p.razorpayPaymentId && (
                        <div className="text-slate-600" title={p.razorpayPaymentId}>{p.razorpayPaymentId?.slice(-12)}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className={today ? 'text-emerald-400 font-medium' : 'text-slate-400'}>{fmtDate(p.capturedAt || p.createdAt)}</div>
                      {today && <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-wide">Today</div>}
                    </td>
                    <td className="px-5 py-4">
                      {p.status === 'CAPTURED' && (
                        <button onClick={() => refund(p)} disabled={refunding === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                          <RefreshCw size={11} className={refunding === p.id ? 'animate-spin' : ''} />
                          {refunding === p.id ? 'Processing...' : 'Refund'}
                        </button>
                      )}
                      {p.status === 'REFUNDED' && (
                        <span className="text-xs text-slate-600">Refunded {fmtDate(p.refundedAt)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}