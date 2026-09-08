import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Calendar, Home, Settings, MoreVertical, FileText, Mail, Instagram, X, Copy, Check } from 'lucide-react';

// Contact Us dialog — rendered via a portal straight into document.body
// (see the call site below) rather than as a plain child of <nav>. The
// navbar has backdrop-blur on it, and backdrop-filter/filter/transform on
// an ancestor creates a new containing block for any `fixed` descendant —
// so a fixed-position modal nested inside the navbar ends up positioned
// relative to the *navbar's* box, not the viewport, which is exactly the
// "stuck at the top" bug. Porting it out from under that ancestor fixes it
// at the source instead of fighting z-index/position after the fact.
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
      // Clipboard access can fail (older browsers, permissions) — the
      // link itself still works as a fallback, so just no-op here.
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-paper-card border border-ink/10 rounded-2xl shadow-2xl w-full max-w-xs p-5 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-ink/35 hover:text-ink transition-colors"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-5">
          <div className="w-11 h-11 bg-rose rounded-xl flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-rose/30 rotate-3">
            <Mail size={19} className="text-white -rotate-3" />
          </div>
          <h2 className="text-base font-display font-semibold text-ink">Get in Touch</h2>
        </div>

        <div className="space-y-2">
          <a
            href="mailto:saloncare.in@gmail.com"
            className="flex items-center gap-3 bg-paper border border-ink/10 rounded-xl px-3 py-2.5 hover:border-rose/40 hover:bg-rose/5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-rose/10 flex items-center justify-center flex-shrink-0 group-hover:bg-rose/20 transition-colors">
              <Mail size={15} className="text-rose" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold">Email</p>
              <p className="text-sm font-medium text-ink truncate">saloncare.in@gmail.com</p>
            </div>
            <button
              onClick={(e) => copy(e, 'saloncare.in@gmail.com', 'email')}
              title="Copy email"
              className="flex-shrink-0 p-1.5 rounded-lg text-ink/35 hover:text-rose hover:bg-rose/10 transition-colors"
            >
              {copied === 'email' ? <Check size={16} className="text-ink" /> : <Copy size={16} />}
            </button>
          </a>

          <a
            href="https://instagram.com/saloncare.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-paper border border-ink/10 rounded-xl px-3 py-2.5 hover:border-rose/40 hover:bg-rose/5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-rose/10 flex items-center justify-center flex-shrink-0 group-hover:bg-rose/20 transition-colors">
              <Instagram size={15} className="text-rose" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold">Instagram</p>
              <p className="text-sm font-medium text-ink truncate">@saloncare.in</p>
            </div>
            <button
              onClick={(e) => copy(e, 'saloncare.in', 'instagram')}
              title="Copy username"
              className="flex-shrink-0 p-1.5 rounded-lg text-ink/35 hover:text-rose hover:bg-rose/10 transition-colors"
            >
              {copied === 'instagram' ? <Check size={16} className="text-ink" /> : <Copy size={16} />}
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

  // Close the overflow menu on any tap/click outside it. Deliberately a
  // real document-level listener rather than a `fixed inset-0` click-catcher
  // div — that div would have the same "trapped by the navbar's
  // backdrop-blur containing block" problem as the modal did, so it'd only
  // ever cover a thin strip near the top instead of the whole page.
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
  // Where the new left-side Home icon points — each role's own landing page.
  const homeRoute = user.role === 'SALON_OWNER' ? '/dashboard' : '/home';

  // Nav items depend on role. Home used to be listed here for customers
  // (and Dashboard for owners) — both now live as the Home icon on the far
  // left instead, so they're dropped here to avoid showing the same
  // destination twice.
  const navItems = user.role === 'SALON_OWNER'
    ? [
        { to: '/my-salon',  label: 'My Salon',  icon: Settings },
      ]
    : [
        { to: '/my-bookings', label: 'My Bookings', icon: Calendar },
      ];

  return (
    <nav className="bg-ink/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-lg font-body">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">

          {/* Home — replaces the old SalonQueue wordmark/logo. Styled as
              a plain nav link (icon + label, same active-state highlight
              as the items on the right) rather than a separate brand box,
              since it's now just "go to my home page", not a logo. */}
          <Link
            to={homeRoute}
            title="Home"
            className={`flex items-center gap-2 rounded-xl transition-colors flex-shrink-0
              p-2.5 sm:px-3.5 sm:py-2
              ${isActive(homeRoute) ? 'bg-rose/25 text-rose' : 'text-paper/60 hover:text-paper hover:bg-white/10'}`}
          >
            <Home size={19} />
            <span className="font-medium text-sm">Home</span>
          </Link>

          {/* Right side — nav links + user + overflow menu, compacted on mobile.
              Labels are always visible now (not hidden below sm:) — with the
              logo gone and logout folded into the overflow menu below, there's
              room for them on a phone-width screen too. */}
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
                  <span className="font-medium text-sm">{label}</span>
                </Link>
              );
            })}

            {/* User name+role — desktop only. On mobile there's no
                persistent identity indicator in the bar anymore (see the
                signed-in-as header inside the overflow menu instead) —
                more width for the nav links above. */}
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

              {/* Overflow menu — Terms & Conditions, Contact Us, Logout.
                  Replaces the old standalone logout button; deliberately
                  opening this menu and then tapping Logout is itself enough
                  of a two-step action, so there's no separate tap-to-confirm
                  step anymore. */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  title="More"
                  className={`p-2.5 sm:p-2 rounded-xl transition-colors flex-shrink-0 ${
                    menuOpen ? 'bg-white/15 text-paper' : 'text-paper/50 hover:text-paper hover:bg-white/10'
                  }`}
                >
                  <MoreVertical size={19} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-paper-card border border-ink/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                    <Link
                      to="/terms"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition-colors"
                    >
                      <FileText size={17} /> Terms & Conditions
                    </Link>
                    <button
                      onClick={() => { setMenuOpen(false); setContactOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink/70 hover:bg-ink/5 hover:text-ink transition-colors text-left"
                    >
                      <Mail size={17} /> Contact Us
                    </button>
                    <div className="border-t border-ink/10 my-1" />
                    {/* Signed-in-as header, right above Logout — this is now
                        the only place a mobile user sees their name at all,
                        since the persistent avatar circle in the bar itself
                        was removed for space/clarity. */}
                    <div className="px-4 pt-1.5 pb-1">
                      <p className="text-sm font-semibold text-ink leading-tight truncate">{user.name}</p>
                      <p className="text-[11px] text-ink/40 leading-tight">
                        {user.role === 'SALON_OWNER' ? 'Salon Owner' : 'Customer'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose hover:bg-rose/10 transition-colors text-left"
                    >
                      <LogOut size={17} /> Logout
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
