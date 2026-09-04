import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Home, Settings, Scissors } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;
  const initial = (user.name || '?').charAt(0).toUpperCase();

  // Nav items depend on role — built once so mobile + desktop stay in sync
  const navItems = user.role === 'SALON_OWNER'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: Scissors },
        { to: '/my-salon',  label: 'My Salon',  icon: Settings },
      ]
    : [
        { to: '/home',        label: 'Home',        icon: Home },
        { to: '/my-bookings', label: 'My Bookings', icon: Calendar },
      ];

  return (
    <nav className="bg-ink/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-lg font-body">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">

          {/* Logo — icon-only chip on mobile, full wordmark from sm: up */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-rose rounded-xl flex items-center justify-center flex-shrink-0 rotate-3 shadow-sm shadow-rose/30">
              <Scissors className="text-white -rotate-3" size={18} />
            </div>
            <span className="hidden sm:inline text-xl font-display font-semibold text-paper truncate">
              SalonQueue
            </span>
          </Link>

          {/* Right side — nav links + user + logout, all compacted on mobile */}
          <div className="flex items-center gap-1 sm:gap-2">

            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`flex items-center gap-2 rounded-xl transition-colors
                    p-2.5 sm:px-3.5 sm:py-2
                    ${active ? 'bg-rose/25 text-rose' : 'text-paper/60 hover:text-paper hover:bg-white/10'}`}
                >
                  <Icon size={19} />
                  <span className="hidden sm:inline font-medium text-sm">{label}</span>
                </Link>
              );
            })}

            {/* User info — full name+role pill from sm: up, just an avatar
                circle on mobile (tap/long-press shows the name via title) */}
            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-4 sm:ml-1 sm:border-l border-white/15">
              <div
                title={`${user.name} · ${user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}`}
                className="hidden sm:flex flex-col items-end mr-1"
              >
                <span className="text-sm font-semibold text-paper leading-tight">{user.name}</span>
                <span className="text-[11px] text-paper/45 leading-tight">
                  {user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}
                </span>
              </div>

              {/* Avatar initial — always visible, doubles as identity on mobile */}
              <div
                title={user.name}
                className="flex sm:hidden w-8 h-8 rounded-full bg-brass/20 border border-brass/30 text-brass font-display font-semibold text-sm items-center justify-center flex-shrink-0"
              >
                {initial}
              </div>

              {/* Logout — click to arm, click again to confirm, so a mis-tap
                  on a cramped mobile bar can't log someone out by accident */}
              <button
                onClick={() => confirmLogout ? handleLogout() : setConfirmLogout(true)}
                onBlur={() => setConfirmLogout(false)}
                title="Logout"
                className={`p-2.5 sm:p-2 rounded-xl transition-colors flex-shrink-0 ${
                  confirmLogout
                    ? 'bg-rose text-white'
                    : 'text-paper/50 hover:text-rose hover:bg-rose/15'
                }`}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Confirm-logout hint — only appears once armed, doesn't shift layout */}
        {confirmLogout && (
          <div className="pb-2 -mt-1 text-right">
            <span className="text-[11px] text-rose font-medium">Tap logout again to confirm</span>
          </div>
        )}
      </div>
    </nav>
  );
}
