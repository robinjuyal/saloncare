import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { Users, ToggleLeft, ToggleRight, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

const ROLE_TABS = [
  { label: 'All',          value: ''           },
  { label: 'Customers',    value: 'CUSTOMER'   },
  { label: 'Salon Owners', value: 'SALON_OWNER'},
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric'
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

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState(null);
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState({ field: 'joined', dir: 'desc' });

  const role = searchParams.get('role') || '';

  const load = () => {
    setLoading(true);
    adminAPI.getUsers(role || undefined)
      .then(r => setUsers(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [role]);

  const handleSort = (field) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = users.filter(u =>
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
    list = [...list].sort((a, b) => {
      let av, bv;
      switch (sort.field) {
        case 'name':   av = a.name  || ''; bv = b.name  || ''; break;
        case 'email':  av = a.email || ''; bv = b.email || ''; break;
        case 'role':   av = a.role  || ''; bv = b.role  || ''; break;
        case 'status': av = String(a.active); bv = String(b.active); break;
        default:
          av = new Date(a.createdAt || 0).getTime();
          bv = new Date(b.createdAt || 0).getTime();
      }
      if (av < bv) return sort.dir === 'asc' ? -1 :  1;
      if (av > bv) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [users, search, sort]);

  const todayCount = users.filter(u => isToday(u.createdAt)).length;

  const toggle = async (id) => {
    setToggling(id);
    try {
      await adminAPI.toggleUser(id);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Action failed');
    } finally { setToggling(null); }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-500 text-sm">{filtered.length} of {users.length} users</p>
          {todayCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {todayCount} joined today
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
          {ROLE_TABS.map(t => (
            <button key={t.value}
              onClick={() => { setSearchParams(t.value ? { role: t.value } : {}); setSearch(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                role === t.value ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-64" />
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
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          {search ? `No results for "${search}"` : 'No users found'}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <SortTh label="Name"   field="name"   sort={sort} onSort={handleSort} />
                <SortTh label="Email"  field="email"  sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Phone</th>
                <SortTh label="Role"   field="role"   sort={sort} onSort={handleSort} />
                <SortTh label="Status" field="status" sort={sort} onSort={handleSort} />
                <SortTh label="Joined" field="joined" sort={sort} onSort={handleSort} />
                <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(u => {
                const today = isToday(u.createdAt);
                return (
                  <tr key={u.id} className={`transition-colors ${today ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/50'}`}>
                    <td className="px-5 py-4 text-white font-medium">{u.name}</td>
                    <td className="px-5 py-4 text-slate-400">{u.email}</td>
                    <td className="px-5 py-4 text-slate-400 font-mono">{u.phone}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs border ${
                        u.role === 'ADMIN'       ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        u.role === 'SALON_OWNER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                   'bg-slate-700 text-slate-400 border-slate-600'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs border ${
                        u.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className={today ? 'text-emerald-400 font-medium' : 'text-slate-500'}>{fmtDate(u.createdAt)}</div>
                      {today && <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-wide">Today</div>}
                    </td>
                    <td className="px-5 py-4">
                      {u.role !== 'ADMIN' && (
                        <button onClick={() => toggle(u.id)} disabled={toggling === u.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                            u.active
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}>
                          {u.active ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                          {toggling === u.id ? '...' : u.active ? 'Deactivate' : 'Activate'}
                        </button>
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