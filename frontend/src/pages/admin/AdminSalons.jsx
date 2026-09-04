import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
  MapPin, Phone, Eye, Plus, X, Store, AlertTriangle,
  Search, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

const STATUS_TABS = [
  { label: 'All',      value: ''        },
  { label: 'Pending',  value: 'pending' },
  { label: 'Active',   value: 'active'  },
  { label: 'Inactive', value: 'inactive'},
];

const Badge = ({ verified, active }) => {
  if (!active)   return <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">Inactive</span>;
  if (!verified) return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>;
  return              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>;
};

const isToday = (d) => {
  if (!d) return false;
  const date = new Date(d);
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

function RegisterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', description: '', address: '', city: '', phone: '',
    latitude: '', longitude: '',
    ownerName: '', ownerEmail: '', ownerPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await adminAPI.registerSalon(form);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const Field = ({ label, k, type = 'text', placeholder = '' }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-bold">Register New Salon</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Salon Info</div>
          <Field label="Salon Name *"  k="name" />
          <Field label="Description"   k="description" />
          <Field label="Address *"     k="address" />
          <Field label="City *"        k="city" placeholder="e.g. Dehradun" />
          <Field label="Phone *"       k="phone" placeholder="10-digit number" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"    k="latitude"  placeholder="e.g. 30.3165" />
            <Field label="Longitude"   k="longitude" placeholder="e.g. 78.0322" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pt-2">Owner Info</div>
          <Field label="Owner Name *"  k="ownerName" />
          <Field label="Owner Email *" k="ownerEmail" type="email" />
          <Field label="Owner Phone *" k="ownerPhone" placeholder="10-digit number" />
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400">
            Owner will be created with a temporary password. Ask them to reset it on first login.
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50">
            {loading ? 'Registering...' : 'Register Salon'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSalons() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [salons,  setSalons]      = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch]       = useState('');
  const [sort,   setSort]         = useState({ field: 'date', dir: 'desc' });
  const status = searchParams.get('status') || '';

  const load = () => {
    setLoading(true);
    adminAPI.getSalons(status || undefined)
      .then(r => setSalons(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const handleSort = (field) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = salons.filter(s =>
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.ownerName?.toLowerCase().includes(q) ||
      s.ownerEmail?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
    list = [...list].sort((a, b) => {
      let av, bv;
      switch (sort.field) {
        case 'name':  av = a.name  || ''; bv = b.name  || ''; break;
        case 'city':  av = a.city  || ''; bv = b.city  || ''; break;
        case 'owner': av = a.ownerName || ''; bv = b.ownerName || ''; break;
        default:
          av = new Date(a.createdAt || 0).getTime();
          bv = new Date(b.createdAt || 0).getTime();
      }
      if (av < bv) return sort.dir === 'asc' ? -1 :  1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [salons, search, sort]);

  const todayCount = salons.filter(s => isToday(s.createdAt)).length;

  const SortBtn = ({ label, field }) => {
    const active = sort.field === field;
    return (
      <button onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-xs transition-colors ${active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
        {label}
        {active
          ? sort.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
          : <ArrowUpDown size={10} className="opacity-50" />}
      </button>
    );
  };

  const approve = async (id) => {
    setActionLoading(id + '_approve');
    await adminAPI.approveSalon(id);
    await load(); setActionLoading(null);
  };
  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (optional):');
    setActionLoading(id + '_reject');
    await adminAPI.rejectSalon(id, reason);
    await load(); setActionLoading(null);
  };
  const toggle = async (id) => {
    setActionLoading(id + '_toggle');
    await adminAPI.toggleSalon(id);
    await load(); setActionLoading(null);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Salons</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm">{filtered.length} of {salons.length} salons</p>
            {todayCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {todayCount} added today
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors">
          <Plus size={16} /> Register Salon
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
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
        <div className="flex items-center gap-3">
          {/* Sort buttons */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            Sort:
            <SortBtn label="Name"  field="name"  />
            <SortBtn label="City"  field="city"  />
            <SortBtn label="Owner" field="owner" />
            <SortBtn label="Date"  field="date"  />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search salon, city, owner…"
              className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-56" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Store size={40} className="mx-auto mb-3 opacity-30" />
          {search ? `No results for "${search}"` : 'No salons found'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(salon => {
            const today = isToday(salon.createdAt);
            return (
              <div key={salon.id}
                className={`border rounded-xl px-5 py-4 flex items-center gap-4 transition-colors ${
                  today
                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{salon.name}</span>
                    <Badge verified={salon.verified} active={salon.active} />
                    {today && <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">New today</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={10} />{salon.city}</span>
                    <span className="flex items-center gap-1"><Phone size={10} />{salon.phone}</span>
                    <span>Owner: {salon.ownerName}</span>
                    {salon.latitude
                      ? <span className="text-slate-600">{salon.latitude?.toFixed(4)}, {salon.longitude?.toFixed(4)}</span>
                      : <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={10} />No coords</span>
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/admin/salons/${salon.id}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="View details">
                    <Eye size={16} />
                  </Link>
                  {!salon.verified && salon.active && (
                    <>
                      <button onClick={() => approve(salon.id)} disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button onClick={() => reject(salon.id)} disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50">
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  )}
                  {salon.verified && (
                    <button onClick={() => toggle(salon.id)} disabled={!!actionLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        salon.active
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}>
                      {salon.active ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                      {salon.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showModal && <RegisterModal onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  );
}