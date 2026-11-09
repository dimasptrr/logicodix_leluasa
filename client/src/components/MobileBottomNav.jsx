import React from 'react';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Beranda', icon: 'space_dashboard' },
    { id: 'explore-map', label: 'Peta', icon: 'map' },
    { id: 'report-obstacle', label: 'Lapor', icon: 'photo_camera', isFab: true },
    { id: 'plan-route', label: 'Rute', icon: 'alt_route' },
    { id: 'reports-impact', label: 'Dampak', icon: 'assessment' },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant/30 shadow-[0_-4px_16px_rgba(16,42,67,0.08)] pb-safe"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          if (tab.isFab) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative -top-4 flex flex-col items-center justify-center focus:outline-none group"
                aria-label="Lapor Rintangan Trotoar"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    isActive
                      ? 'bg-error text-on-error ring-4 ring-error/30'
                      : 'bg-secondary text-on-secondary ring-4 ring-surface-container-lowest'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {tab.icon}
                  </span>
                </div>
                <span className="font-label-sm text-[10px] font-bold text-primary mt-1">
                  Lapor
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors ${
                isActive ? 'text-secondary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className={`material-symbols-outlined text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-secondary"></span>
                )}
              </div>
              <span className="font-label-sm text-[11px] leading-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
