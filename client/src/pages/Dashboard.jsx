import React, { useState, useEffect } from 'react';
import { fetchWeather, fetchStats } from '../services/api.js';

export default function Dashboard({ setActiveTab, onOpenVoice }) {
  const [weather, setWeather] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeLayer, setActiveLayer] = useState('surface');

  useEffect(() => {
    fetchWeather().then(res => setWeather(res.data)).catch(console.error);
    fetchStats().then(res => setStats(res.data)).catch(console.error);
  }, []);

  const handleQuickDestination = (dest) => {
    setSearchInput(dest);
    setActiveTab('plan-route');
  };

  return (
    <div className="p-3 sm:p-space-md lg:p-space-xl flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl max-w-7xl mx-auto w-full animate-fadeIn pb-6 lg:pb-0">
      {/* PANEL PENCARIAN & SAMBUTAN */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-4 sm:p-space-lg lg:p-space-xl shadow-[0_8px_24px_-4px_rgba(16,42,67,0.06)] flex flex-col gap-space-md lg:gap-space-lg">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none"></div>
        <div className="absolute right-48 -bottom-10 w-48 h-48 rounded-full bg-primary-fixed/50 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-space-sm sm:gap-space-md">
          <div className="flex flex-col gap-1 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-[11px] sm:text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                Sesi Surabaya Aktif
              </span>
              <span className="font-label-sm text-[11px] sm:text-xs text-on-surface-variant">Akurasi GPS: ±1.2m</span>
            </div>
            <h1 className="font-headline-lg text-xl sm:text-2xl lg:text-3xl text-primary tracking-tight font-bold">
              Selamat pagi, Dian! 🌅
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              Mau bepergian ke mana hari ini? Temukan rute trotoar ramah kursi roda dan jelajahi Surabaya dengan aman, nyaman & mandiri.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-sm text-xs shadow-xs">
              <span className="material-symbols-outlined text-secondary text-base">keyboard</span>
              <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-surface-container-lowest font-mono text-primary font-bold shadow-xs">V</kbd> untuk Suara</span>
            </div>
          </div>
        </div>

        {/* Kolom Pencarian Aksesibel */}
        <div className="relative z-10 flex flex-col gap-space-sm">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 sm:left-4 text-secondary text-xl sm:text-2xl pointer-events-none">
              search
            </span>
            <input
              id="global-destination-input"
              className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-24 sm:pr-28 rounded-xl bg-surface text-on-surface placeholder:text-outline font-body-md text-xs sm:text-sm shadow-[0_2px_8px_-2px_rgba(16,42,67,0.06)] focus:outline-none focus:bg-surface-container-lowest transition-all"
              placeholder="Cari faskes, stasiun, rampa trotoar, gedung..."
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveTab('plan-route')}
            />
            <div className="absolute right-1.5 sm:right-2 flex items-center gap-1">
              <button
                aria-label="Pencarian suara"
                onClick={onOpenVoice}
                className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-colors shadow-xs"
                type="button"
                title="Input Suara"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">mic</span>
              </button>
              <button
                aria-label="Preferensi rute"
                onClick={() => setActiveTab('plan-route')}
                className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                type="button"
                title="Preferensi Rute"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">tune</span>
              </button>
            </div>
          </div>

          {/* Destinasi Cepat */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <button
              onClick={() => handleQuickDestination('Balai Pemuda, Jl. Gubernur Suryo')}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-xs font-semibold hover:opacity-90 transition-opacity"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">my_location</span>
              <span>Balai Pemuda</span>
            </button>
            <button
              onClick={() => handleQuickDestination('RSUD Dr. Soetomo')}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition-colors"
              type="button"
            >
              <span>🏥 RSUD Dr. Soetomo</span>
            </button>
            <button
              onClick={() => handleQuickDestination('Taman Bungkul')}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition-colors"
              type="button"
            >
              <span>🌳 Taman Bungkul</span>
            </button>
            <button
              onClick={() => handleQuickDestination('Grand City Mall')}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition-colors"
              type="button"
            >
              <span>🏢 Grand City</span>
            </button>
            <button
              onClick={() => handleQuickDestination('Stasiun Gubeng')}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition-colors"
              type="button"
            >
              <span>🚉 Stasiun Gubeng</span>
            </button>
          </div>
        </div>
      </section>

      {/* PETA & KARTU INTELIJEN KONTEKSTUAL (2 KOLOM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md lg:gap-space-lg items-start">
        {/* KOLOM KIRI: PREVIEW PETA INTERAKTIF (60%) */}
        <section className="lg:col-span-7 flex flex-col rounded-2xl bg-surface-container-lowest overflow-hidden shadow-[0_8px_24px_-4px_rgba(16,42,67,0.08)]">
          {/* Header Peta */}
          <div className="p-3 sm:p-space-md bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-on-secondary shrink-0">
                <span className="material-symbols-outlined text-base sm:text-lg">explore</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Koridor Pusat Surabaya</span>
                <span className="font-label-sm text-[10px] sm:text-xs text-on-surface-variant">Jaringan Sensor & Trotoar Real-time</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('explore-map')}
                className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-secondary font-label-sm text-xs font-semibold hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-xs">fullscreen</span>
                <span className="hidden sm:inline">Peta Penuh</span>
              </button>
              <button
                onClick={() => setActiveTab('explore-map')}
                className="px-2.5 py-1 rounded-md bg-secondary text-on-secondary font-label-sm text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-xs">near_me</span>
                <span>Pusatkan</span>
              </button>
            </div>
          </div>

          {/* Area Peta Vektor Ilustratif */}
          <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[460px] bg-[#dbe8f5] overflow-hidden select-none">
            <svg className="absolute inset-0 w-full h-full object-cover" preserveAspectRatio="none" viewBox="0 0 700 460" xmlns="http://www.w3.org/2000/svg">
              <rect fill="#eaf2f8" height="460" width="700"></rect>
              <rect fill="#d3ecd9" height="90" opacity="0.8" rx="8" width="130" x="70" y="50"></rect>
              <text fill="#1b5e20" fontFamily="Plus Jakarta Sans" fontSize="10" fontWeight="600" x="80" y="70">Taman Apsari</text>
              <rect fill="#d3ecd9" height="130" opacity="0.6" rx="8" width="160" x="480" y="240"></rect>
              <text fill="#1b5e20" fontFamily="Plus Jakarta Sans" fontSize="10" fontWeight="600" x="495" y="260">Kompleks RSUD Soetomo</text>

              <path d="M 0 110 L 700 110" fill="none" stroke="#cbd5e1" strokeWidth="26"></path>
              <path d="M 190 0 L 190 460" fill="none" stroke="#cbd5e1" strokeWidth="28"></path>
              <path d="M 430 0 L 430 460" fill="none" stroke="#cbd5e1" strokeWidth="24"></path>
              <path d="M 0 290 L 700 290" fill="none" stroke="#cbd5e1" strokeWidth="22"></path>
              <path d="M 190 110 L 430 290" fill="none" stroke="#cbd5e1" strokeWidth="18"></path>

              <text fill="#475569" fontFamily="Inter" fontSize="11" fontWeight="600" x="20" y="105">Jl. Gubernur Suryo</text>
              <text fill="#475569" fontFamily="Inter" fontSize="11" fontWeight="600" transform="rotate(90, 200, 45)" x="200" y="45">Jl. Basuki Rahmat</text>
              <text fill="#475569" fontFamily="Inter" fontSize="11" fontWeight="600" transform="rotate(90, 440, 45)" x="440" y="45">Jl. Panglima Sudirman</text>
              <text fill="#475569" fontFamily="Inter" fontSize="11" fontWeight="600" x="20" y="285">Jl. Pemuda</text>
              <text fill="#475569" fontFamily="Inter" fontSize="10" fontWeight="600" transform="rotate(37, 260, 170)" x="260" y="170">Jl. Yos Sudarso</text>

              {/* Jalur Hijau Teal: Aman & Luas */}
              <path d="M 198 122 L 198 280 L 420 280 L 420 380 L 490 380" fill="none" opacity="0.95" stroke="#006a62" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6"></path>
              <path d="M 198 122 L 198 280 L 420 280 L 420 380 L 490 380" fill="none" opacity="0.3" stroke="#83f6e7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10"></path>

              {/* Segmen Waspada */}
              <path d="M 190 110 L 420 280" fill="none" stroke="#d97706" strokeDasharray="7 5" strokeLinecap="round" strokeWidth="5"></path>

              {/* Segmen Merah Terblokir */}
              <path d="M 70 280 L 180 280" fill="none" stroke="#ba1a1a" strokeLinecap="round" strokeWidth="6"></path>
              <line stroke="#ba1a1a" strokeWidth="4" x1="120" x2="132" y1="272" y2="288"></line>
              <line stroke="#ba1a1a" strokeWidth="4" x1="132" x2="120" y1="272" y2="288"></line>

              {/* Pin Pengguna Saat Ini */}
              <circle cx="198" cy="122" fill="#006a62" opacity="0.25" r="14"></circle>
              <circle cx="198" cy="122" fill="#006a62" r="8"></circle>
              <circle cx="198" cy="122" fill="#ffffff" r="4"></circle>

              {/* Pin Destinasi */}
              <circle cx="490" cy="380" fill="#102a43" r="10"></circle>
              <circle cx="490" cy="380" fill="#83f6e7" r="5"></circle>
            </svg>

            {/* Label Pin di Peta */}
            <div className="absolute top-[60px] sm:top-[85px] left-[90px] sm:left-[130px] z-20 flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-secondary text-on-secondary shadow-md font-label-sm text-[10px] sm:text-xs font-semibold cursor-pointer">
              <span className="material-symbols-outlined text-[10px] sm:text-xs">accessible</span>
              <span>Anda: Balai Pemuda</span>
            </div>

            {/* Kartu Pin Terblokir Merah */}
            <div
              onClick={() => setActiveTab('explore-map')}
              className="absolute top-[160px] sm:top-[230px] left-[10px] sm:left-[20px] z-20 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-container-lowest text-error shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span className="material-symbols-outlined text-sm sm:text-base">block</span>
              <div className="flex flex-col leading-tight">
                <span className="font-label-sm text-[10px] sm:text-xs font-bold text-error">Terblokir</span>
                <span className="font-body-sm text-[9px] sm:text-[10px] text-on-surface-variant">Jl. Pemuda 42</span>
              </div>
            </div>

            {/* Kontrol Zoom Mengambang */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <div className="flex flex-col rounded-xl bg-surface-container-lowest shadow-md overflow-hidden">
                <button
                  aria-label="Perbesar peta"
                  className="w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">add</span>
                </button>
                <div className="h-px bg-surface-container"></div>
                <button
                  aria-label="Perkecil peta"
                  className="w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">remove</span>
                </button>
              </div>
            </div>

            {/* Pilihan Layer Aktif */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[calc(100%-2rem)]">
              <button
                onClick={() => setActiveLayer('surface')}
                className={`px-2 py-0.5 rounded-full backdrop-blur font-label-sm text-[10px] sm:text-xs shadow-xs flex items-center gap-1 ${
                  activeLayer === 'surface' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-lowest/90 text-primary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>Permukaan</span>
              </button>
              <button
                onClick={() => setActiveLayer('ramps')}
                className={`px-2 py-0.5 rounded-full backdrop-blur font-label-sm text-[10px] sm:text-xs shadow-xs flex items-center gap-1 ${
                  activeLayer === 'ramps' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-lowest/90 text-primary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Rampa</span>
              </button>
            </div>
          </div>

          {/* Legenda & Status Jaringan */}
          <div className="p-2.5 sm:p-space-md bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <span className="text-[11px] font-semibold text-on-surface">Bisa Lewat</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-[11px] font-semibold text-on-surface">Hati-hati</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                <span className="text-[11px] font-semibold text-on-surface">Terblokir</span>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Jaringan DPUPR Surabaya 2026
            </span>
          </div>
        </section>

        {/* KOLOM KANAN: KARTU INTELIJEN KONTEKSTUAL (40%) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* KARTU A: Peringatan Intelijen Cuaca */}
          <div className="rounded-2xl bg-surface-container-lowest p-4 sm:p-space-md shadow-[0_4px_16px_rgba(16,42,67,0.06)] flex flex-col gap-space-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-secondary-container/20 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-xs font-bold">
                <span className="material-symbols-outlined text-sm sm:text-base">rainy</span>
                <span>{weather?.alertMessage || 'Potensi Hujan dalam 35 Menit'}</span>
              </div>
              <span className="font-label-sm text-xs text-on-surface-variant">{weather?.district || 'Surabaya Pusat'}</span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div className="flex items-baseline gap-2">
                <span className="font-display-lg text-2xl sm:text-3xl lg:text-4xl text-primary font-bold">{weather?.temperature || 29}°C</span>
                <span className="font-label-md text-xs sm:text-sm text-on-surface-variant">{weather?.condition || 'Gerimis Ringan'}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container font-label-sm text-xs text-secondary font-bold">
                <span className="material-symbols-outlined text-sm">water_drop</span>
                <span>{weather?.precipitationProb || 78}% Peluang</span>
              </div>
            </div>

            {/* Catatan Anjuran */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">info</span>
                <p className="font-body-sm text-xs text-on-surface">
                  Hujan ringan membuat ubin keramik dekoratif trotoar sepanjang <span className="font-semibold text-primary">Jl. Basuki Rahmat</span> licin. Disarankan melewati koridor berkanopi atau bahu jalan aspal.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('weather-intelligence')}
              className="w-full min-h-[44px] rounded-xl bg-surface-container text-secondary font-label-md text-xs font-bold hover:bg-secondary-container hover:text-on-secondary-container transition-colors flex items-center justify-center gap-2"
              type="button"
            >
              <span className="material-symbols-outlined text-base">umbrella</span>
              <span>Cek Rute Bebas Cuaca Buruk</span>
            </button>
          </div>

          {/* KARTU B: Rekomendasi Rute Terbaik AI */}
          <div className="rounded-2xl bg-surface-container-lowest p-4 sm:p-space-md shadow-[0_4px_16px_rgba(16,42,67,0.06)] flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-bold">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                <span>Rute Rekomendasi AI</span>
              </span>
              <span className="font-label-sm text-[11px] text-secondary font-semibold">Diperbarui 3 menit lalu</span>
            </div>

            <div className="flex flex-col">
              <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Balai Pemuda ➔ RSUD Dr. Soetomo</span>
              <span className="font-label-sm text-xs text-on-surface-variant">Optimal untuk Kursi Roda Listrik & Manual</span>
            </div>

            {/* Baris Metrik */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="flex flex-col items-center p-2 rounded-xl bg-surface-container-low text-center">
                <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">1.6 km</span>
                <span className="font-label-sm text-[10px] text-on-surface-variant">Jarak</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-surface-container-low text-center">
                <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">22 mnt</span>
                <span className="font-label-sm text-[10px] text-on-surface-variant">Waktu Tempuh</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-secondary-container/40 text-center">
                <span className="font-headline-sm text-sm sm:text-base text-secondary font-bold">98%</span>
                <span className="font-label-sm text-[10px] text-secondary font-semibold">Skor Aman</span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setActiveTab('plan-route')}
                className="flex-1 min-h-[44px] sm:min-h-[48px] rounded-xl bg-primary text-on-primary font-label-md text-xs sm:text-sm font-bold hover:bg-primary-container transition-colors flex items-center justify-center gap-2 shadow-md"
                type="button"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">navigation</span>
                <span>Mulai Panduan Navigasi</span>
              </button>
              <button
                aria-label="Bandingkan rute alternatif"
                onClick={() => setActiveTab('plan-route')}
                className="min-h-[44px] sm:min-h-[48px] px-3 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center"
                type="button"
                title="Bandingkan Rute Alternatif"
              >
                <span className="material-symbols-outlined text-lg">compare_arrows</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BARIS AKSI NAVIGASI CEPAT */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-base sm:text-lg text-primary font-bold">Aksi Navigasi Cepat</h2>
          <span className="font-label-sm text-[11px] text-on-surface-variant">Target sentuh minimal 48px</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-space-md">
          {/* Aksi 1 */}
          <div
            onClick={() => setActiveTab('plan-route')}
            className="group flex flex-col justify-between p-4 min-h-[120px] sm:min-h-[140px] rounded-2xl bg-surface-container-lowest hover:bg-surface-container transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl sm:text-2xl">alt_route</span>
              </div>
              <span className="material-symbols-outlined text-outline text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
            <div className="flex flex-col mt-2">
              <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Rencanakan Rute Baru</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Atur toleransi rintangan & kemiringan</span>
            </div>
          </div>

          {/* Aksi 2 */}
          <div
            onClick={() => setActiveTab('report-obstacle')}
            className="group flex flex-col justify-between p-4 min-h-[120px] sm:min-h-[140px] rounded-2xl bg-surface-container-lowest hover:bg-surface-container transition-all shadow-xs hover:shadow-md relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -right-2 -top-2 w-16 h-16 bg-error-container/40 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-start justify-between">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-error-container text-error flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl sm:text-2xl">photo_camera</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[9px] font-bold">
                Cepat 30 dtk
              </span>
            </div>
            <div className="flex flex-col mt-2">
              <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Lapor Rintangan</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Foto trotoar terblokir & rampa curam</span>
            </div>
          </div>

          {/* Aksi 3 */}
          <div
            onClick={() => setActiveTab('explore-map')}
            className="group flex flex-col justify-between p-4 min-h-[120px] sm:min-h-[140px] rounded-2xl bg-surface-container-lowest hover:bg-surface-container transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl sm:text-2xl">domain_verification</span>
              </div>
              <span className="material-symbols-outlined text-outline text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
            <div className="flex flex-col mt-2">
              <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Jelajah Fasilitas Publik</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Pintu masuk, lift & rampa terverifikasi</span>
            </div>
          </div>

          {/* Aksi 4 */}
          <div
            onClick={onOpenVoice}
            className="group flex flex-col justify-between p-4 min-h-[120px] sm:min-h-[140px] rounded-2xl bg-surface-container-lowest hover:bg-surface-container transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-primary-container text-secondary-container flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl sm:text-2xl">graphic_eq</span>
              </div>
              <span className="material-symbols-outlined text-outline text-lg group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
            <div className="flex flex-col mt-2">
              <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Tanya Asisten AI Suara</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Panduan audio navigasi hands-free</span>
            </div>
          </div>
        </div>
      </section>

      {/* DAMPAK SOSIAL KOMUNITAS & VERIFIKASI WARGA */}
      <section className="p-4 sm:p-space-lg rounded-2xl bg-surface-container-low flex flex-col gap-space-sm sm:gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs sm:gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl">groups</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">Dampak Sosial Trotoar di Surabaya</span>
              <span className="font-label-sm text-[11px] text-on-surface-variant">Terhubung langsung ke Tim Perbaikan DPUPR Surabaya</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest text-secondary font-label-sm text-[11px] font-bold shadow-xs w-fit">
            <span className="material-symbols-outlined text-sm">military_tech</span>
            <span>LOGICODIX 2026</span>
          </div>
        </div>

        {/* Grid Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-space-md">
          <div className="flex flex-col p-3 sm:p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
            <span className="font-headline-lg text-lg sm:text-2xl text-primary font-bold">{stats?.sidewalkKmMapped?.toLocaleString() || '1.420'} km</span>
            <span className="font-label-md text-[11px] sm:text-xs text-on-surface font-semibold">Km Trotoar Terpetakan</span>
            <span className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">18 kecamatan</span>
          </div>
          <div className="flex flex-col p-3 sm:p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
            <span className="font-headline-lg text-lg sm:text-2xl text-amber-600 font-bold">{stats?.obstaclesReported || '384'}</span>
            <span className="font-label-md text-[11px] sm:text-xs text-on-surface font-semibold">Rintangan Dilaporkan</span>
            <span className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">30 hari terakhir</span>
          </div>
          <div className="flex flex-col p-3 sm:p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
            <span className="font-headline-lg text-lg sm:text-2xl text-secondary font-bold">{stats?.communityVerified || '291'}</span>
            <span className="font-label-md text-[11px] sm:text-xs text-on-surface font-semibold">Diverifikasi Warga</span>
            <span className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">Oleh sesama pengguna</span>
          </div>
          <div className="flex flex-col p-3 sm:p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
            <span className="font-headline-lg text-lg sm:text-2xl text-primary font-bold">{stats?.dpuprRepaired || '148'}</span>
            <span className="font-label-md text-[11px] sm:text-xs text-on-surface font-semibold">Diperbaiki DPUPR</span>
            <span className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">Rampa dipulihkan</span>
          </div>
        </div>
      </section>
    </div>
  );
}
