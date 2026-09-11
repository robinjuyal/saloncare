import React from 'react';
import { Scissors, Users, Star, Info } from 'lucide-react';

export default function TabBar({
  activeTab,
  onTabChange,
  queueCount,
  rating,
  selectedServicesCount,
}) {
  const tabs = [
    {
      id: 'services',
      label: 'Services',
      shortLabel: 'Services',
      icon: Scissors,
      hasDot: selectedServicesCount > 0,
      badgeText: null,
    },
    {
      id: 'queue',
      label: 'In Line',
      shortLabel: 'In Line',
      icon: Users,
      isLive: true,
      badgeText: queueCount > 0 ? `${queueCount}` : null,
    },
    {
      id: 'reviews',
      label: 'Reviews',
      shortLabel: 'Reviews',
      icon: Star,
      badgeText: `${Number(rating || 0).toFixed(1)}★`,
    },
    {
      id: 'about',
      label: 'About',
      shortLabel: 'About',
      icon: Info,
      badgeText: null,
    },
  ];

  return (
    <div className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200/80 hardware-accelerated pt-1 pb-2.5 mb-3 sm:mb-4 font-sans">
      {/* 4-Column Mobile Grid: perfectly balanced, zero overflow */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-1 sm:p-1.5 shadow-xs grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`py-2.5 sm:py-3 px-1 sm:px-3 rounded-xl transition-colors duration-150 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer select-none text-center ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  size={17}
                  className={
                    isActive
                      ? 'text-emerald-400'
                      : tab.isLive
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }
                />
                {tab.isLive && (
                  <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                {tab.hasDot && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm md:text-base font-bold tracking-tight whitespace-nowrap">
                  <span>{tab.shortLabel}</span>
                </span>

                {tab.badgeText && !tab.isLive && (
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.badgeText}
                  </span>
                )}

                {tab.isLive && (
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {tab.badgeText}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
