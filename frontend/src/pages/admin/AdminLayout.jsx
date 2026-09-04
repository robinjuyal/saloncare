import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Store, Users, BookOpen,
  CreditCard, Activity, Settings, LogOut,
  Scissors, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

const NAV = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard',   exact: true  },
  { to: '/admin/salons',   icon: Store,           label: 'Salons'                    },
  { to: '/admin/users',    icon: Users,           label: 'Users'                     },
  { to: '/admin/bookings', icon: BookOpen,        label: 'Bookings'                  },
  { to: '/admin/payments', icon: CreditCard,      label: 'Payments'                  },
  { to: '/admin/queues',   icon: Activity,        label: 'Live Queues'               },
  { to: '/admin/config',   icon: Settings,        label: 'Config'                    },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (nav) => nav.exact
    ? location.pathname === nav.to
    : location.pathname.startsWith(nav.to);

  return (
    <div className="flex h-screen bg-slate-950 font-mono overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-slate-950" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-sm leading-tight">SalonQueue</div>
              <div className="text-emerald-400 text-xs">Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map((nav) => {
            const active = isActive(nav);
            return (
              <Link
                key={nav.to}
                to={nav.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={collapsed ? nav.label : ''}
              >
                <nav.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{nav.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + collapse */}
        <div className="border-t border-slate-800 p-2 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 text-xs text-slate-500">
              <div className="text-white font-medium truncate">{user?.name}</div>
              <div className="text-emerald-400">Administrator</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
            title="Logout"
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all w-full"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}