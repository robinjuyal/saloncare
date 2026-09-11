import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  Calendar,
  Home,
  Settings,
  MoreVertical,
  FileText,
  Mail,
} from 'lucide-react';
import ContactModal from './ContactModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close the overflow menu on any tap/click outside it
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  // Where the left-side Home icon points — each role's own landing page.
  const homeRoute = user.role === 'SALON_OWNER' ? '/dashboard' : '/home';

  const navItems =
    user.role === 'SALON_OWNER'
      ? [
          { to: '/my-salon', label: 'My Salon', icon: Settings },
        ]
      : [
          { to: '/my-bookings', label: 'My Bookings', icon: Calendar },
        ];

  return (
    <nav className="bg-slate-950 sm:backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shadow-md font-body hardware-accelerated">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Home Nav Link with White text on Active */}
          <Link
            to={homeRoute}
            title="Home"
            className={`group flex items-center gap-2 rounded-xl transition-colors duration-150 flex-shrink-0 p-2 sm:px-3.5 sm:py-2 select-none ${
              isActive(homeRoute)
                ? 'bg-white/10 text-white font-bold border border-white/20 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800 font-medium'
            }`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                isActive(homeRoute)
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
              }`}
            >
              <Home size={16} />
            </div>
            <span className="text-sm sm:text-base tracking-tight">Home</span>
          </Link>

          {/* Right side — nav links + user + overflow menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`group flex items-center gap-2 rounded-xl transition-colors duration-150 p-2 sm:px-3.5 sm:py-2 select-none ${
                    active
                      ? 'bg-white/10 text-white font-bold border border-white/20 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800 font-medium'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`transition-colors duration-150 ${
                      active
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="text-sm sm:text-base tracking-tight">{label}</span>
                </Link>
              );
            })}

            {/* User name+role indicator */}
            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-3 sm:ml-1 sm:border-l border-slate-800">
              <div
                title={`${user.name} · ${user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}`}
                className="hidden sm:flex flex-col items-end mr-1"
              >
                <span className="text-sm font-semibold text-white leading-tight">
                  {user.name}
                </span>
                <span className="text-[11px] font-medium text-emerald-400 leading-tight">
                  {user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}
                </span>
              </div>

              {/* Overflow menu (Three dots) */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  title="More options"
                  className={`p-2 sm:p-2 rounded-xl transition-colors duration-150 flex-shrink-0 cursor-pointer ${
                    menuOpen
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <MoreVertical size={18} />
                </button>

                {/* Dropdown with white background, top margin and right margin */}
                {menuOpen && (
                  <div className="absolute right-1 sm:right-2 top-full mt-3 sm:mt-3.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 overflow-hidden text-slate-700 animate-in fade-in-50 zoom-in-95">
                    {/* Signed-in-as header on mobile */}
                    <div className="px-4 py-2.5 border-b border-slate-100 sm:hidden">
                      <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-600 leading-tight mt-0.5">
                        {user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}
                      </p>
                    </div>

                    <Link
                      to="/terms"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
                    >
                      <FileText size={16} className="text-slate-400" />
                      <span>Terms & Conditions</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setContactOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer font-medium"
                    >
                      <Mail size={16} className="text-emerald-600" />
                      <span>Contact Us</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left cursor-pointer font-semibold"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </nav>
  );
}
