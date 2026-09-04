import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { BookOpen, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

const STATUS_TABS = [
  { label: 'All',             value: ''                },
  { label: 'Confirmed',       value: 'CONFIRMED'       },
  { label: 'Pending Payment', value: 'PENDING_PAYMENT' },
  { label: 'Completed',       value: 'COMPLETED'       },
  { label: 'Cancelled',       value: 'CANCELLED'       },
];

const StatusBadge = ({ status }) => {
  const map = {
    CONFIRMED:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    COMPLETED:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CANCELLED:       'bg-red-500/10 text-red-400 border-red-500/20',
    PENDING_PAYMENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${map[status] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

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

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState({ field: 'date', dir: 'desc' });

  const status  = searchParams.get('status')  || '';
  const salonId = searchParams.get('salonId') || '';

  useEffect(() => {
    setLoading(true);
    adminAPI.getBookings(status || undefined, salonId || undefined)
      .then(r => setBookings(r.data.data))
      .finally(() => setLoading(false));
  }, [status, salonId]);

  const handleSort = (field) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = bookings.filter(b =>
      !q ||
      b.customerName?.toLowerCase().includes(q) ||
      b.customerPhone?.includes(q) ||
      b.salonName?.toLowerCase().includes(q) ||
      b.bookingCode?.toLowerCase().includes(q) ||
      b.serviceName?.toLowerCase().includes(q)
    );
    list = [...list].sort((a, b) => {
      let av, bv;
      switch (sort.field) {
        case 'customer': av = a.customerName || ''; bv = b.customerName || ''; break;
        case 'salon':    av = a.salonName    || ''; bv = b.salonName    || ''; break;
        case 'amount':   av = Number(a.amount) || 0; bv = Number(b.amount) || 0; break;
        case 'status':   av = a.status || ''; bv = b.status || ''; break;
        default:
          av = new Date(a.scheduledTime || 0).getTime();
          bv = new Date(b.scheduledTime || 0).getTime();
      }
      if (av < bv) return sort.dir === 'asc' ? -1 :  1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [bookings, search, sort]);

  const todayCount = bookings.filter(b => isToday(b.scheduledTime)).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-500 text-sm">{filtered.length} of {bookings.length} bookings
            {salonId && ' (filtered by salon)'}
          </p>
          {todayCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {todayCount} today
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit flex-wrap">
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
            placeholder="Search customer, salon, booking code, service…"
            className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-72" />
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
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          {search ? `No results for "${search}"` : 'No bookings found'}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Code</th>
                <SortTh label="Customer" field="customer" sort={sort} onSort={handleSort} />
                <SortTh label="Salon"    field="salon"    sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Service</th>
                <SortTh label="Amount"   field="amount"   sort={sort} onSort={handleSort} />
                <SortTh label="Status"   field="status"   sort={sort} onSort={handleSort} />
                <SortTh label="Date"     field="date"     sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Cancelled By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(b => {
                const today = isToday(b.scheduledTime);
                return (
                  <tr key={b.id} className={`transition-colors ${today ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/50'}`}>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400">{b.bookingCode}</td>
                    <td className="px-5 py-4">
                      <div className="text-white">{b.customerName}</div>
                      <div className="text-slate-500 text-xs">{b.customerPhone}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{b.salonName}</td>
                    <td className="px-5 py-4 text-slate-400">{b.serviceName || '—'}</td>
                    <td className="px-5 py-4 text-white font-mono">
                      {b.amount ? `₹${Number(b.amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4 text-xs">
                      <div className={today ? 'text-emerald-400 font-medium' : 'text-slate-400'}>{fmtDate(b.scheduledTime)}</div>
                      {today && <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-wide">Today</div>}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {b.cancelledBy ? (
                        <div>
                          <div className="text-red-400">{b.cancelledBy}</div>
                          <div className="text-slate-600">{b.cancellationReason?.replace('_', ' ')}</div>
                        </div>
                      ) : '—'}
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