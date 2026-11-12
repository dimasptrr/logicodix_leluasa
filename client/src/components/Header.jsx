import React, { useState, useEffect } from 'react';

export default function Header({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onOpenVoice,
  onOpenAccessibility,
  onOpenNotifications,
  onOpenMobileMenu,
  onNavigateHome,
  // Props opsional (bila dikirim dari App)
  activeTab,
  setActiveTab
}) {
  const [currentTab, setCurrentTab] = useState(activeTab || 'home');
  const [unreadCount, setUnreadCount] = useState(2);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Sinkronkan tab aktif bila ada perubahan via props atau event window
  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail?.tab) {
        setCurrentTab(e.detail.tab);
      }
    };
    window.addEventListener('leluasa:navigate', handleNav);
    return () => window.removeEventListener('leluasa:navigate', handleNav);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      onSearchSubmit(searchQuery);
    }
  };

  // Navigasi tab ke halaman tujuan (didukung via props, bridge global, atau event)
  const navigate = (tabId) => {
    setCurrentTab(tabId);
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    } else if (typeof window !== 'undefined' && typeof window.__setLeluasaTab === 'function') {
      window.__setLeluasaTab(tabId);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('leluasa:navigate', { detail: { tab: tabId } }));
    }
  };

  const handleLogoClick = () => {
    navigate('home');
    if (onNavigateHome) onNavigateHome();
  };

  const handleToggleHighContrast = () => {
    const next = !isHighContrast;
    setIsHighContrast(next);
    document.documentElement.classList.toggle('high-contrast', next);
  };

  // Link navigasi atas untuk laptop/desktop (seluruh halaman dapat diakses dari navbar atas)
  const navLinks = [
    { id: 'home',                 label: 'Dashboard' },
    { id: 'explore-map',          label: 'Peta Navigasi' },
    { id: 'plan-route',           label: 'Rute & Perbandingan' },
    { id: 'reports-impact',       label: 'Riwayat Komunitas' },
    { id: 'weather-intelligence', label: 'Intelijen Cuaca' },
  ];

  const resolvedActiveTab = activeTab || currentTab;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 sm:h-[72px] bg-surface-container-lowest/97 backdrop-blur-xl shadow-[0_1px_6px_rgba(16,42,67,0.07)] z-40 flex items-center px-3 sm:px-6 lg:px-8 gap-3 border-b border-outline-variant/20">

      {/* Logo / Brand — Mengarah ke Beranda (Dashboard) */}
      <button
        type="button"
        onClick={handleLogoClick}
        aria-label="Kembali ke beranda Leluasa"
        className="flex items-center gap-2.5 shrink-0 group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 transition-all duration-200"
      >
        <img
          src="/logo.png"
          alt="Logo Leluasa"
          className="w-8 h-8 rounded-full object-contain shadow-sm group-hover:scale-105 transition-transform"
        />
        <span className="font-headline-sm text-base sm:text-lg font-extrabold text-primary tracking-tight">
          Leluasa
        </span>
      </button>

      {/* Search Bar */}
      <div className="relative flex-1 min-w-0 max-w-xs xl:max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]" aria-hidden="true">
          search
        </span>
        <input
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface-container text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          placeholder="Cari jalan, halte, trotoar..."
          type="text"
          aria-label="Cari destinasi ramah akses"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Desktop Nav Links: Mengarah ke halaman yang tepat dan terverifikasi */}
      <nav aria-label="Navigasi Utama" className="hidden lg:flex items-end gap-0 h-full">
        {navLinks.map((link) => {
          const isActive = resolvedActiveTab === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => navigate(link.id)}
              className={`h-full px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap outline-none relative border-b-2 cursor-pointer ${
                isActive
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface hover:border-primary/30'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* Right Action Group */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">

        {/* Icon controls: contrast, text-size, notifications (1 fitur untuk 1 tombol unik) */}
        <div className="hidden md:flex items-center">
          {/* 1. Toggle Kontras Tinggi Langsung */}
          <button
            aria-label={isHighContrast ? 'Nonaktifkan Mode Kontras Tinggi' : 'Aktifkan Mode Kontras Tinggi'}
            onClick={handleToggleHighContrast}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              isHighContrast ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            type="button"
            title="Klik untuk Kontras Tinggi Nyata"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">contrast</span>
          </button>

          {/* 2. Panel Notifikasi Sistem */}
          <button
            aria-label={`Pemberitahuan${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
            onClick={() => {
              setUnreadCount(0);
              if (onOpenNotifications) onOpenNotifications();
            }}
            className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            type="button"
            title="Pemberitahuan Sistem"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">notifications</span>
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-error text-white font-bold text-[9px]"
                aria-hidden="true"
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>


        {/* 5. CTA Tunggal: Lapor Hambatan Baru */}
        <button
          type="button"
          onClick={() => navigate('report-obstacle')}
          aria-label="Buka formulir lapor hambatan baru"
          className="flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-primary text-on-primary font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 whitespace-nowrap cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notification_important</span>
          <span className="hidden sm:inline text-xs font-bold">Lapor Hambatan</span>
        </button>

        {/* 6. Avatar Pengguna: Mengarah ke Halaman Riwayat & Kontribusi Profil */}
        <button
          type="button"
          onClick={() => navigate('reports-impact')}
          aria-label="Buka profil kontributor dan riwayat laporan"
          title="Profil Dian Kartika - Riwayat & Kontribusi"
          className="hidden lg:flex w-9 h-9 rounded-full bg-secondary-container border-2 border-secondary/30 items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Foto Profil Dian Kartika"
            className="w-full h-full object-cover"
          />
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          type="button"
        >
          <span className="material-symbols-outlined text-[26px]" aria-hidden="true">menu</span>
        </button>
      </div>
    </header>
  );
}