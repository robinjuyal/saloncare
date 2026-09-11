import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Home, Settings, MoreVertical, FileText, Mail, Instagram, X, Copy, Check } from 'lucide-react';

// Contact Us dialog — rendered via a portal straight into document.body
// Styled in the modern green, black, and white theme.
function ContactModal({ onClose }) {
  const [copied, setCopied] = useState(null);

  const copy = async (e, text, field) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
    } catch {
      // Clipboard access can fail (older browsers, permissions) — fallback gracefully
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 hardware-accelerated"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-xs p-5 relative text-slate-900"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-emerald-600/25 rotate-3">
            <Mail size={20} className="text-white -rotate-3" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Get in Touch</h2>
          <p className="text-xs text-slate-500 mt-0.5">We're here to help anytime</p>
        </div>

        <div className="space-y-2.5">
          <a
            href="mailto:saloncare.in@gmail.com"
            className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-3 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Mail size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Email</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">saloncare.in@gmail.com</p>
            </div>
            <button
              type="button"
              onClick={(e) => copy(e, 'saloncare.in@gmail.com', 'email')}
              title="Copy email"
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              {copied === 'email' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </a>

          <a
            href="https://instagram.com/saloncare.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-3 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Instagram size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Instagram</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">@saloncare.in</p>
            </div>
            <button
              type="button"
              onClick={(e) => copy(e, 'saloncare.in', 'instagram')}
              title="Copy username"
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              {copied === 'instagram' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

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

  const navItems = user.role === 'SALON_OWNER'
    ? [
        { to: '/my-salon',  label: 'My Salon',  icon: Settings },
      ]
    : [
        { to: '/my-bookings', label: 'My Bookings', icon: Calendar },
      ];

  return (
    <nav className="bg-slate-950 sm:backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shadow-md font-body hardware-accelerated">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">

          {/* Home Nav Link with Green Accent on Active/Click */}
          <Link
            to={homeRoute}
            title="Home"
            className={`group flex items-center gap-2 rounded-xl transition-colors duration-150 flex-shrink-0 p-2 sm:px-3 sm:py-2 select-none ${
              isActive(homeRoute)
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 ${
              isActive(homeRoute)
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
            }`}>
              <Home size={15} />
            </div>
            <span className="font-semibold text-sm">Home</span>
          </Link>

          {/* Right side — nav links + user + overflow menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {navItems.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`group flex items-center gap-2 rounded-xl transition-colors duration-150 p-2 sm:px-3 sm:py-2 select-none text-sm font-medium ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 active:bg-slate-800'
                  }`}
                >
                  <Icon
                    size={17}
                    className={`transition-colors duration-150 ${
                      active
                        ? 'text-emerald-400'
                        : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}

            {/* User name+role indicator */}
            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-3 sm:ml-1 sm:border-l border-slate-800">
              <div
                title={`${user.name} · ${user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}`}
                className="hidden sm:flex flex-col items-end mr-1"
              >
                <span className="text-sm font-semibold text-white leading-tight">{user.name}</span>
                <span className="text-[11px] font-medium text-emerald-400 leading-tight">
                  {user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}
                </span>
              </div>

              {/* Overflow menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  title="More options"
                  className={`p-2 sm:p-2 rounded-xl transition-colors duration-150 flex-shrink-0 cursor-pointer ${
                    menuOpen
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <MoreVertical size={18} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden text-slate-200 animate-in fade-in-50 zoom-in-95">
                    {/* Signed-in-as header on mobile */}
                    <div className="px-4 py-2.5 border-b border-slate-800 sm:hidden">
                      <p className="text-sm font-semibold text-white leading-tight truncate">{user.name}</p>
                      <p className="text-[11px] font-medium text-emerald-400 leading-tight mt-0.5">
                        {user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}
                      </p>
                    </div>

                    <Link
                      to="/terms"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <FileText size={16} className="text-slate-400" />
                      <span>Terms & Conditions</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setContactOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left cursor-pointer"
                    >
                      <Mail size={16} className="text-emerald-400" />
                      <span>Contact Us</span>
                    </button>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left cursor-pointer font-medium"
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
