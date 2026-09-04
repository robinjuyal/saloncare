import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  ArrowLeft, MapPin, Phone, Mail, CheckCircle,
  XCircle, ToggleLeft, ToggleRight, Edit2, Save, X, AlertTriangle
} from 'lucide-react';

const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

export default function AdminSalonDetail() {
  const { id } = useParams();
  const [salon,   setSalon]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editCoords, setEditCoords] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getSalonDetail(id)
      .then(r => {
        setSalon(r.data.data);
        setLat(r.data.data.latitude || '');
        setLng(r.data.data.longitude || '');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const saveCoords = async () => {
    setSaving(true);
    await adminAPI.updateCoords(id, parseFloat(lat), parseFloat(lng));
    setSaving(false);
    setEditCoords(false);
    load();
  };

  const toggle = async () => {
    setToggling(true);
    await adminAPI.toggleSalon(id);
    setToggling(false);
    load();
  };

  const approve = async () => {
    await adminAPI.approveSalon(id);
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!salon) return <div className="p-8 text-red-400">Salon not found</div>;

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link to="/admin/salons" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Salons
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{salon.name}</h1>
            {!salon.active && <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">Inactive</span>}
            {salon.active && !salon.verified && <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Approval</span>}
            {salon.verified && salon.active && <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified & Active</span>}
          </div>
          <p className="text-slate-500 text-sm">{salon.description || 'No description'}</p>
        </div>

        <div className="flex gap-2">
          {!salon.verified && salon.active && (
            <button onClick={approve}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors">
              <CheckCircle size={14} /> Approve
            </button>
          )}
          <button onClick={toggle} disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
              salon.active ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                           : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
            }`}>
            {salon.active ? <><ToggleLeft size={14} /> Deactivate</> : <><ToggleRight size={14} /> Activate</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Contact</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-slate-300">
                <MapPin size={14} className="text-slate-500" />
                <span>{salon.address}, {salon.city}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Phone size={14} className="text-slate-500" />
                <span>{salon.phone}</span>
              </div>
            </div>
          </div>

          {/* Owner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Owner</div>
            <div className="space-y-2 text-sm">
              <div className="text-white font-medium">{salon.ownerName}</div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail size={12} /> {salon.ownerEmail}
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone size={12} /> {salon.ownerPhone}
              </div>
              <Link to={`/admin/users`} className="text-xs text-emerald-400 hover:underline">
                View user profile →
              </Link>
            </div>
          </div>

          {/* Coordinates */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Coordinates</div>
              {!editCoords && (
                <button onClick={() => setEditCoords(true)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>

            {!salon.latitude && !editCoords && (
              <div className="flex items-center gap-2 text-amber-400 text-xs">
                <AlertTriangle size={14} />
                No coordinates set — salon won't appear in nearby search
              </div>
            )}

            {editCoords ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Latitude</label>
                  <input value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 30.3165"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Longitude</label>
                  <input value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. 78.0322"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveCoords} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50">
                    <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditCoords(false)}
                    className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-white transition-colors">
                    <X size={12} />
                  </button>
                </div>
                <a href={`https://www.google.com/maps/search/${salon.name}+${salon.city}`} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-emerald-400 hover:underline">
                  Find coordinates on Google Maps →
                </a>
              </div>
            ) : salon.latitude ? (
              <div className="font-mono text-sm text-slate-300">
                {salon.latitude}, {salon.longitude}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column - stats */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Statistics</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Bookings',  value: salon.totalBookings,     color: 'text-blue-400'    },
                { label: 'Confirmed',       value: salon.confirmedBookings,  color: 'text-emerald-400' },
                { label: 'Cancelled',       value: salon.cancelledBookings,  color: 'text-red-400'     },
                { label: 'Total Revenue',   value: fmt(salon.totalRevenuePaise), color: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800 rounded-lg p-3">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Links</div>
            <div className="space-y-2">
              <Link to={`/admin/bookings?salonId=${id}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 hover:text-white transition-colors">
                View all bookings <ArrowLeft size={12} className="rotate-180" />
              </Link>
              <Link to={`/admin/payments`}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 hover:text-white transition-colors">
                View payments <ArrowLeft size={12} className="rotate-180" />
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Registered On</div>
            <div className="text-sm text-slate-300">
              {salon.createdAt ? new Date(salon.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              }) : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}