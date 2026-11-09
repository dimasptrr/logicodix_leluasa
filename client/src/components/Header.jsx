import React, { useState } from 'react';

export default function Header({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onOpenVoice,
  onOpenAccessibility,
  onOpenNotifications,
  onOpenMobileMenu,
  onNavigateHome
}) {
  const [unreadCount, setUnreadCount] = useState(2);
  const [mobileSearchActive, setMobileSearchActive] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      onSearchSubmit(searchQuery);
    }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-80 right-0 h-16 sm:h-20 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(16,42,67,0.04)] z-40 px-3 sm:px-space-md lg:px-space-xl flex items-center justify-between gap-2 sm:gap-space-lg transition-all">
      {/* Mobile Menu & Brand (Visible on < lg) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div
          onClick={onNavigateHome}
          className="flex lg:hidden items-center gap-1.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-on-secondary shadow-xs">
            <span className="material-symbols-outlined text-xl font-bold">accessible</span>
          </div>
          <span className="font-headline-sm text-base text-primary font-bold tracking-tight hidden sm:inline">
            Leluasa
          </span>
        </div>
      </div>

      {/* Global Destination Search Input */}
      <div className={`flex-1 max-w-xl transition-all ${mobileSearchActive ? 'fixed inset-x-2 top-2 z-50 bg-surface-container-lowest p-2 rounded-2xl shadow-xl' : 'relative'}`}>
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant pointer-events-none text-xl">
            search
          </span>
          <input
            className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-10 sm:pr-12 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-xs sm:text-sm shadow-[0_2px_8px_-2px_rgba(16,42,67,0.06)] focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
            placeholder="Cari tujuan Surabaya, rumah sakit, rampa trotoar..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-1.5 flex items-center gap-0.5">
            <button
              aria-label="Pencarian suara"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container transition-colors"
              type="button"
              onClick={onOpenVoice}
              title="Perintah suara"
            >
              <span className="material-symbols-outlined text-lg">mic</span>
            </button>
            {mobileSearchActive && (
              <button
                onClick={() => setMobileSearchActive(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header Right Action Group */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Network Status Badge (Tablet / Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/60 text-secondary">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span className="font-label-sm text-xs font-semibold whitespace-nowrap">
            94% Jaringan Aktif
          </span>
        </div>

        {/* Voice Command Button */}
        <button
          aria-label="Perintah Suara"
          onClick={onOpenVoice}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shadow-xs"
          type="button"
          title="Tekan V untuk Asisten Suara"
        >
          <span className="material-symbols-outlined text-xl">keyboard_voice</span>
        </button>

        {/* Notifications Button */}
        <button
          aria-label="Pemberitahuan"
          onClick={() => {
            setUnreadCount(0);
            if (onOpenNotifications) onOpenNotifications();
          }}
          className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shadow-xs"
          type="button"
          title="Pemberitahuan"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-error text-on-error font-label-sm text-[9px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Accessibility Preferences Trigger */}
        <button
          aria-label="Preferensi Aksesibilitas"
          onClick={onOpenAccessibility}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shadow-xs"
          type="button"
          title="Pengaturan Aksesibilitas"
        >
          <span className="material-symbols-outlined text-xl">accessibility_new</span>
        </button>
      </div>
    </header>
  );
}
