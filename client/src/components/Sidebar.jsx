import React from 'react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onToggleAccessibility,
  isMobileOpen,
  onCloseMobile
}) {
  const navItems = [
    { id: 'home', label: 'Beranda (Dashboard)', icon: 'space_dashboard' },
    { id: 'explore-map', label: 'Peta Navigasi', icon: 'map' },
    { id: 'plan-route', label: 'Rute & Perbandingan Akses', icon: 'alt_route' },
    { id: 'report-obstacle', label: 'Buat Laporan', icon: 'notification_important', isAction: true },
    { id: 'reports-impact', label: 'Riwayat & Verifikasi Komunitas', icon: 'history' },
    { id: 'weather-intelligence', label: 'Intelijen Cuaca', icon: 'routine' },
    { id: 'voice-assistant', label: 'Asisten Suara AI', icon: 'graphic_eq' },
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
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
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shadow-md mt-0.5">
              <span className="material-symbols-outlined text-2xl font-bold">accessible</span>
            </div>
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

        {/* Competition Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container w-fit shadow-xs">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          <span className="font-label-sm uppercase tracking-wider font-bold text-[11px]">LOGICODIX 2026 · Kesehatan Inklusif</span>
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
                  className={`flex items-center justify-between min-h-[52px] px-4 py-3 rounded-full font-label-md text-label-md transition-all text-left focus:outline focus:outline-[3px] focus:outline-primary ${
                    isActive
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
                className={`flex items-center gap-space-sm min-h-[52px] px-4 py-3 rounded-full font-label-md text-label-md transition-all text-left focus:outline focus:outline-[3px] focus:outline-primary ${
                  isActive
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

      {/* Quick Accessibility & User Profile Card */}
      <div className="p-space-md m-space-md bg-surface-container-low rounded-xl flex flex-col gap-space-md shadow-xs mb-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">tune</span>
            <span className="font-label-sm text-on-surface font-semibold text-xs">Aksesibilitas Cepat</span>
          </div>
          <button
            onClick={() => {
              onToggleAccessibility();
              if (onCloseMobile) onCloseMobile();
            }}
            className="min-h-[32px] px-2.5 rounded-lg bg-surface-container-lowest text-secondary font-label-sm text-xs hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1 shadow-[0_1px_3px_rgba(16,42,67,0.04)]"
            type="button"
          >
            <span className="material-symbols-outlined text-xs">contrast</span>
            <span>Preferensi</span>
          </button>
        </div>

        <div className="flex items-center gap-space-sm pt-space-xs border-t border-outline-variant/30">
          <img
            alt="Profil Dian Kartika"
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-secondary/30"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-primary font-semibold truncate text-sm">Dian Kartika</span>
            <span className="font-label-sm text-on-surface-variant truncate text-xs">Pengguna Kursi Roda · Level 3</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-80 z-50 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (with backdrop) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
          <div
            className="fixed inset-0 bg-primary/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          ></div>
          <div className="relative z-10 w-80 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
