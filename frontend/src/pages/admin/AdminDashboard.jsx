import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  Store, Users, BookOpen, CreditCard,
  Clock, TrendingUp, AlertTriangle, CheckCircle,
  XCircle, Activity, ArrowRight
} from 'lucide-react';

const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

const StatCard = ({ label, value, sub, icon: Icon, color, to }) => (
  <Link to={to || '#'} className={`block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-${color}-500/50 transition-all group`}>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
        <Icon size={20} className={`text-${color}-400`} />
      </div>
      <ArrowRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
    </div>
    <div className={`text-2xl font-bold text-white mb-1`}>{value}</div>
    <div className="text-sm text-slate-400">{label}</div>
    {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
  </Link>
);

export default function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    adminAPI.getSummary()
      .then(r => {
        setData(r.data.data);
        setLoading(false);
      })
      .catch((err) => {
        // Same reasoning as DashboardWrapper: a 401 here means the global
        // interceptor is already redirecting to /login. Don't clear the
        // loading state and race it with our own error screen.
        if (err.response?.status !== 401) {
          setError('Failed to load analytics');
          setLoading(false);
        }
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-red-400">{error}</div>
  );

  const d = data || {};

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview — live data</p>
      </div>

      {/* Salons */}
      <section className="mb-8">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Salons</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Salons"    value={d.totalSalons}    icon={Store}        color="emerald" to="/admin/salons" />
          <StatCard label="Verified"        value={d.verifiedSalons} icon={CheckCircle}  color="green"   to="/admin/salons?status=active" />
          <StatCard
            label="Pending Approval"
            value={d.pendingSalons}
            icon={AlertTriangle}
            color={d.pendingSalons > 0 ? 'amber' : 'slate'}
            to="/admin/salons?status=pending"
            sub={d.pendingSalons > 0 ? 'Action required' : ''}
          />
          <StatCard label="Inactive"        value={d.totalSalons - d.activeSalons} icon={XCircle} color="red" to="/admin/salons?status=inactive" />
        </div>
      </section>

      {/* Users */}
      <section className="mb-8">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Users</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Users"    value={d.totalUsers}     icon={Users}       color="blue"   to="/admin/users" />
          <StatCard label="Customers"      value={d.totalCustomers} icon={Users}       color="indigo" to="/admin/users?role=CUSTOMER" />
          <StatCard label="Salon Owners"   value={d.totalOwners}    icon={Store}       color="violet" to="/admin/users?role=SALON_OWNER" />
        </div>
      </section>

      {/* Bookings */}
      <section className="mb-8">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Bookings</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings"   value={d.totalBookings}     icon={BookOpen}     color="cyan"   to="/admin/bookings" />
          <StatCard label="Today"            value={d.todayBookings}     icon={TrendingUp}   color="teal"   to="/admin/bookings" />
          <StatCard label="Confirmed"        value={d.confirmedBookings} icon={CheckCircle}  color="green"  to="/admin/bookings?status=CONFIRMED" />
          <StatCard label="Cancelled"        value={d.cancelledBookings} icon={XCircle}      color="red"    to="/admin/bookings?status=CANCELLED" />
        </div>
      </section>

      {/* Revenue */}
      <section className="mb-8">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Payments</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue"
            value={fmt(d.totalRevenuePaise)}
            icon={CreditCard}
            color="emerald"
            to="/admin/payments"
          />
          <StatCard label="Successful"    value={d.totalPayments}  icon={CheckCircle} color="green" to="/admin/payments?status=CAPTURED" />
          <StatCard label="Failed"        value={d.failedPayments} icon={XCircle}     color="red"   to="/admin/payments?status=FAILED" />
        </div>
      </section>

      {/* Live queue snapshot */}
      <section>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Live Queue</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-amber-400" />
              <span className="text-sm text-slate-400">Currently Waiting</span>
            </div>
            <div className="text-3xl font-bold text-white">{d.currentlyWaiting}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={18} className="text-emerald-400" />
              <span className="text-sm text-slate-400">In Service</span>
            </div>
            <div className="text-3xl font-bold text-white">{d.currentlyServing}</div>
          </div>
        </div>
        <Link to="/admin/queues" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 mt-3 transition-colors">
          View live queue monitor <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}