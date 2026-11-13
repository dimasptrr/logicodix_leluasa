import React, { useEffect } from 'react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onToggleAccessibility,
  isMobileOpen,
  onCloseMobile
}) {
  // Pasang bridge global secara sinkron agar Header dan komponen lain selalu dapat memicu navigasi
  if (typeof window !== 'undefined') {
    window.__setLeluasaTab = setActiveTab;
    window.__activeLeluasaTab = activeTab;
  }

  // Dengarkan custom event leluasa:navigate
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__setLeluasaTab = setActiveTab;
    }
    const handleNavEvent = (e) => {
      if (e.detail?.tab && typeof setActiveTab === 'function') {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('leluasa:navigate', handleNavEvent);
    return () => window.removeEventListener('leluasa:navigate', handleNavEvent);
  }, [setActiveTab]);

  const navItems = [
    { id: 'home', label: 'Beranda (Dashboard)', icon: 'space_dashboard' },
    { id: 'explore-map', label: 'Peta Navigasi', icon: 'map' },
    { id: 'plan-route', label: 'Rute & Perbandingan Akses', icon: 'alt_route' },
    { id: 'report-obstacle', label: 'Buat Laporan', icon: 'notification_important', isAction: true },
    { id: 'reports-impact', label: 'Riwayat & Verifikasi Komunitas', icon: 'history' },
    { id: 'weather-intelligence', label: 'Intelijen Cuaca', icon: 'routine' },
  ];

  const handleItemClick = (id) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(id);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-80 bg-surface-container-lowest shadow-[0_1px_8px_rgba(16,42,67,0.06)] overflow-y-auto">
      <div className="p-space-lg flex flex-col gap-space-md">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-start gap-space-sm cursor-pointer"
            onClick={() => handleItemClick('home')}
          >
            <img
              src="/logo.png"
              alt="Logo Leluasa"
              className="w-9 h-9 rounded-full object-contain shrink-0 mt-0.5"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-extrabold">Leluasa</span>
              </div>
              <span className="font-label-sm text-on-surface-variant text-xs">All Access, All Ways.</span>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors"
            aria-label="Tutup navigasi mobile"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 mt-space-sm">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            if (item.isAction) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between min-h-[52px] px-4 py-3 rounded-full font-label-md text-label-md transition-all text-left focus:outline focus:outline-[3px] focus:outline-primary ${isActive
                      ? 'bg-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(0,55,176,0.25)]'
                      : 'text-on-surface hover:bg-surface-container'
                    }`}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-secondary-container' : 'text-primary'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-on-secondary font-label-md text-sm font-bold shadow-xs">
                    +
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-space-sm min-h-[52px] px-4 py-3 rounded-full font-label-md text-label-md transition-all text-left focus:outline focus:outline-[3px] focus:outline-primary ${isActive
                    ? 'bg-primary text-on-primary font-bold shadow-[0_4px_12px_rgba(0,55,176,0.25)]'
                    : 'text-on-surface hover:bg-surface-container'
                  }`}
              >
                <span className={`material-symbols-outlined text-2xl ${isActive ? 'text-secondary-container' : 'text-on-surface-variant'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Only (Desktop Sidebar dinonaktifkan sesuai desain web laptop full-width) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[1200] flex animate-fadeIn">
          <div
            className="fixed inset-0 bg-primary/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          ></div>
          <div className="relative z-10 w-80 max-w-[85vw] h-full shadow-2xl bg-surface-container-lowest">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}