import React from 'react';

export default function AccessibilityModal({ isOpen, onClose, preferences, setPreferences }) {
  if (!isOpen) return null;

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleProfileChange = (profile) => {
    setPreferences(prev => ({
      ...prev,
      profile
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-primary/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl p-4 sm:p-space-lg flex flex-col gap-space-sm sm:gap-space-md border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-2xl">accessibility_new</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-sm sm:text-base text-primary font-bold">Preferensi Aksesibilitas</h2>
              <span className="font-label-sm text-[10px] sm:text-xs text-on-surface-variant">Standar WCAG 2.2 AAA & Mobilitas Inklusif</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors"
            aria-label="Tutup preferensi"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Mobility Profile Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-bold">
            Spesifikasi Perangkat Mobilitas
          </span>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {[
              { id: 'electric', label: 'Kursi Listrik', desc: 'Lebar 68cm · Rampa ≤5cm' },
              { id: 'manual', label: 'Kursi Manual', desc: 'Lebar 65cm · Fokus landai' },
              { id: 'scooter', label: 'Skuter Mobilitas', desc: 'Lebar 75cm · Radius 110cm' },
              { id: 'caregiver', label: 'Didorong Teman', desc: 'Batas tanjakan ≤6%' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleProfileChange(p.id)}
                className={`p-2.5 sm:p-3 rounded-xl flex flex-col text-left transition-all min-h-[48px] ${
                  preferences.profile === p.id
                    ? 'bg-secondary-container text-on-secondary-container ring-2 ring-secondary font-bold'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                }`}
              >
                <span className="text-xs sm:text-sm">{p.label}</span>
                <span className="text-[10px] opacity-80">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Display & Vision Guards */}
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-bold">
            Bantuan Visual & Suara Navigasi
          </span>

          <label className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors min-h-[48px]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">contrast</span>
              <div className="flex flex-col">
                <span className="font-label-md text-xs sm:text-sm text-primary font-semibold">Mode Kontras Tinggi</span>
                <span className="text-[10px] text-on-surface-variant">Lingkaran kontras tajam pada pin rute & peta</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={() => handleToggle('highContrast')}
              className="w-5 h-5 accent-secondary cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors min-h-[48px]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">record_voice_over</span>
              <div className="flex flex-col">
                <span className="font-label-md text-xs sm:text-sm text-primary font-semibold">Panduan Suara Rute</span>
                <span className="text-[10px] text-on-surface-variant">Instruksi suara untuk tanjakan, belokan & genangan</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.audioWayfinding}
              onChange={() => handleToggle('audioWayfinding')}
              className="w-5 h-5 accent-secondary cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors min-h-[48px]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">touch_app</span>
              <div className="flex flex-col">
                <span className="font-label-md text-xs sm:text-sm text-primary font-semibold">Perbesar Target Sentuh (56px)</span>
                <span className="text-[10px] text-on-surface-variant">Tombol ekstra besar ramah tremor / disabilitas motorik</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.largeTouchTargets}
              onChange={() => handleToggle('largeTouchTargets')}
              className="w-5 h-5 accent-secondary cursor-pointer shrink-0"
            />
          </label>
        </div>

        {/* Save button */}
        <button
          onClick={onClose}
          className="w-full min-h-[48px] rounded-xl bg-primary text-on-primary font-label-md text-xs sm:text-sm font-bold shadow-md hover:bg-primary-container transition-all mt-1"
        >
          Terapkan Preferensi
        </button>
      </div>
    </div>
  );
}
