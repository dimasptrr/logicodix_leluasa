import React from 'react';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  // Sesuai Folder Stitch Baru (leluasa_navigasi_rute_aktif_motion):
  // Labels: Navigasi, Rute, Suara, Lapor
  // Icons: explore, alt_route, volume_up, photo_camera
  const tabs = [
    { id: 'explore-map', label: 'Navigasi', icon: 'explore' },
    { id: 'plan-route', label: 'Rute', icon: 'alt_route' },
    { id: 'voice-assistant', label: 'Suara', icon: 'volume_up', isModal: true },
    { id: 'report-obstacle', label: 'Lapor', icon: 'photo_camera' },
  ];

  const handleTabClick = (tab) => {
    if (tab.isModal) {
      // Trigger global shortcut 'V' or click voice button to open voice assistant modal
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
    } else {
      setActiveTab(tab.id);
    }
  };

  return (
    <nav
      aria-label="Menu Utama Navigasi"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-3 max-w-md mx-auto bg-surface-container-lowest shadow-[0_-4px_16px_rgba(17,24,39,0.08)] border-t border-outline-variant/30 pb-safe"
    >
      {tabs.map((tab) => {
        const isActive = !tab.isModal && (activeTab === tab.id || (tab.id === 'explore-map' && activeTab === 'home'));

        if (isActive) {
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              aria-current="page"
              aria-label={`Halaman aktif: ${tab.label}`}
              className="flex flex-col items-center justify-center gap-1 bg-primary text-on-primary rounded-full px-5 py-2.5 min-h-[52px] active:scale-95 transition-transform duration-150 focus:outline focus:outline-[3px] focus:outline-primary shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {tab.icon}
              </span>
              <span className="text-label-lg font-label-lg leading-none font-bold">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            aria-label={`Buka ${tab.label}`}
            className="flex flex-col items-center justify-center gap-1 text-on-surface px-4 py-2 min-h-[52px] rounded-full hover:bg-surface-container transition-colors duration-150 active:scale-95 focus:outline focus:outline-[3px] focus:outline-primary"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">
              {tab.icon}
            </span>
            <span className="text-label-lg font-label-lg leading-none">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
