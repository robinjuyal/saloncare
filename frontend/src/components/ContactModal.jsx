import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Instagram, X, Copy, Check } from 'lucide-react';

export default function ContactModal({ onClose }) {
  const [copied, setCopied] = useState(null);

  const copy = async (e, text, field) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
    } catch {
      // Graceful fallback if clipboard API is restricted
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 hardware-accelerated"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-xs p-5 relative text-slate-900 animate-in fade-in zoom-in-95"
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
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center flex-shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
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
