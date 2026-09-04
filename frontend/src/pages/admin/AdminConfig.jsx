import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Settings, Save, Edit2, X } from 'lucide-react';

export default function AdminConfig() {
  const [config,  setConfig]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // key being edited
  const [editVal, setEditVal] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(null);

  const load = () => {
    setLoading(true);
    adminAPI.getConfig()
      .then(r => setConfig(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (item) => {
    setEditing(item.key);
    setEditVal(item.value);
  };

  const cancelEdit = () => { setEditing(null); setEditVal(''); };

  const save = async (key) => {
    setSaving(true);
    try {
      await adminAPI.updateConfig(key, editVal);
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
      setEditing(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '—';

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Config</h1>
        <p className="text-slate-500 text-sm mt-1">
          Runtime settings — changes take effect immediately without redeployment
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : config.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Settings size={40} className="mx-auto mb-3 opacity-30" />
          No config found. Run V7 migration.
        </div>
      ) : (
        <div className="space-y-3">
          {config.map(item => (
            <div key={item.key}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-emerald-400">{item.key}</span>
                    {saved === item.key && (
                      <span className="text-xs text-emerald-400 animate-pulse">✓ Saved</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{item.description}</p>

                  {editing === item.key ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') save(item.key); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <button onClick={() => save(item.key)} disabled={saving}
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50">
                        <Save size={12} /> {saving ? '...' : 'Save'}
                      </button>
                      <button onClick={cancelEdit}
                        className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="font-mono text-lg text-white">{item.value}</div>
                  )}
                </div>

                {editing !== item.key && (
                  <button onClick={() => startEdit(item)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors flex-shrink-0 mt-1">
                    <Edit2 size={12} /> Edit
                  </button>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-600">
                Last updated: {fmtDate(item.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400/80">
        <strong className="text-amber-400">Note:</strong> Config values are read dynamically.
        However, some values like <code className="font-mono">noshow_timeout_minutes</code> need
        the <code className="font-mono">NoShowScheduler</code> to be updated to read from the database
        instead of the hardcoded property — that's a future improvement.
      </div>
    </div>
  );
}