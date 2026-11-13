import React, { useEffect } from 'react';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof setActiveTab === 'function') {
      window.__setLeluasaTab = setActiveTab;
    }
  }, [setActiveTab]);

  const tabs = [
    { id: 'home',            label: 'Beranda', icon: 'space_dashboard' },
    { id: 'explore-map',     label: 'Peta',    icon: 'map' },
    { id: 'plan-route',      label: 'Rute',    icon: 'alt_route' },
    { id: 'report-obstacle', label: 'Lapor',   icon: 'notification_important' },
    { id: 'reports-impact',  label: 'Riwayat', icon: 'history' },
    { id: 'profile',         label: 'Reward',  icon: 'military_tech' },
  ];

  const isTabActive = (tab) => tab.id === activeTab;

  return (
    <nav
      aria-label="Menu Utama Navigasi Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-1.5 py-1.5 bg-surface-container-lowest shadow-[0_-4px_16px_rgba(17,24,39,0.12)] border-t border-outline-variant/30"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab);
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (typeof setActiveTab === 'function') {
                setActiveTab(tab.id);
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('leluasa:navigate', { detail: { tab: tab.id } }));
              }
            }}
            aria-label={active ? `Halaman aktif: ${tab.label}` : `Buka ${tab.label}`}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] px-2.5 py-1 rounded-2xl transition-all duration-150 active:scale-95 focus:outline focus:outline-[2px] focus:outline-primary cursor-pointer ${
              active
                ? 'bg-primary text-on-primary shadow-xs font-bold'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px] leading-none"
              style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              aria-hidden="true"
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold leading-none mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}