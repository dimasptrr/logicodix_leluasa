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
  // Props navigasi riwayat dari App
  activeTab,
  setActiveTab,
  canGoBack,
  onGoBack,
  previousTab,
  wakeWordEnabled = true,
  toggleWakeWord,
  isWakeWordListening = false,
  wakeWordPermissionStatus = 'prompt',
  requestWakeWordPermission,
  onMicPermissionDenied
}) {
  const [currentTab, setCurrentTab] = useState(activeTab || 'home');
  const [isHighContrast, setIsHighContrast] = useState(false);

  const TAB_LABELS = {
    'home': 'Dashboard',
    'explore-map': 'Peta Navigasi',
    'plan-route': 'Rute & Perbandingan',
    'report-obstacle': 'Lapor Hambatan',
    'reports-impact': 'Riwayat Komunitas',
    'weather-intelligence': 'Intelijen Cuaca',
  };

  const resolvedActiveTab = activeTab || currentTab;
  const isBackEnabled = canGoBack !== undefined ? canGoBack : (resolvedActiveTab !== 'home');
  const previousTabLabel = previousTab
    ? (TAB_LABELS[previousTab] || previousTab)
    : (resolvedActiveTab !== 'home' ? 'Dashboard' : '');

  const handleBackClick = () => {
    if (typeof onGoBack === 'function') {
      onGoBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

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

  return (
    <header className="fixed top-0 left-0 right-0 h-16 sm:h-[72px] bg-surface-container-lowest/97 backdrop-blur-xl shadow-[0_1px_6px_rgba(16,42,67,0.07)] z-40 flex items-center px-3 sm:px-6 lg:px-8 gap-2.5 sm:gap-3.5 border-b border-outline-variant/20">

      {/* Button Back di Pojok Kiri Atas */}
      <button
        type="button"
        onClick={handleBackClick}
        disabled={!isBackEnabled}
        aria-label={isBackEnabled ? `Kembali ke ${previousTabLabel || 'halaman sebelumnya'}` : 'Kembali ke halaman sebelumnya'}
        title={isBackEnabled ? `Kembali ke ${previousTabLabel || 'halaman sebelumnya'}` : 'Tidak ada halaman sebelumnya'}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 outline-none shrink-0 ${
          isBackEnabled
            ? 'bg-surface-container hover:bg-primary hover:text-white text-primary shadow-xs cursor-pointer active:scale-90 ring-1 ring-outline-variant/40'
            : 'opacity-30 text-on-surface-variant cursor-not-allowed bg-surface-container/50'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[22px]" aria-hidden="true">
          arrow_back
        </span>
      </button>

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

        {/* Icon controls: contrast, wake word mic, notifications */}
        <div className="flex items-center gap-1.5">
          {/* Tombol Panggil AI & Status Wake Word */}
          <button
            type="button"
            onClick={async () => {
              // Jika izin mikrofon belum aktif atau pernah ditolak, minta izin langsung ke browser
              if (wakeWordPermissionStatus !== 'granted' && requestWakeWordPermission) {
                const ok = await requestWakeWordPermission();
                if (!ok) {
                  if (onMicPermissionDenied) onMicPermissionDenied();
                  return;
                }
              }
              onOpenVoice();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer ${
              wakeWordPermissionStatus === 'denied'
                ? 'bg-error/15 text-error border border-error/30 hover:bg-error/25'
                : wakeWordPermissionStatus === 'prompt'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/25'
                : isWakeWordListening
                ? 'bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
            title={
              wakeWordPermissionStatus === 'denied'
                ? 'Izin mikrofon terblokir. Klik untuk info membuka blokir.'
                : wakeWordPermissionStatus === 'prompt'
                ? 'Klik di sini untuk mengaktifkan izin mikrofon "Hai LUMI"'
                : 'Asisten Suara LUMI aktif. Katakan "Hai LUMI" kapan saja atau klik tombol ini'
            }
            aria-label="Status Wake Word Asisten Suara LUMI"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wakeWordPermissionStatus === 'denied'
                  ? 'bg-error'
                  : wakeWordPermissionStatus === 'prompt'
                  ? 'bg-amber-500 animate-ping'
                  : isWakeWordListening
                  ? 'bg-secondary animate-pulse'
                  : 'bg-outline'
              }`}
            />
            <span className="material-symbols-outlined text-[17px]">
              {wakeWordPermissionStatus === 'denied' ? 'mic_off' : 'mic'}
            </span>
            <span className="hidden sm:inline">
              {wakeWordPermissionStatus === 'denied'
                ? 'Mic Terblokir'
                : wakeWordPermissionStatus === 'prompt'
                ? 'Aktifkan "Hai LUMI"'
                : '"Hai LUMI"'}
            </span>
          </button>

          {/* 1. Toggle Kontras Tinggi Langsung */}
          <button
            aria-label={isHighContrast ? 'Nonaktifkan Mode Kontras Tinggi' : 'Aktifkan Mode Kontras Tinggi'}
            onClick={handleToggleHighContrast}
            className={`hidden md:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              isHighContrast ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            type="button"
            title="Klik untuk Kontras Tinggi Nyata"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">contrast</span>
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