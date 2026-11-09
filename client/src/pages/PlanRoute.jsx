import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchRouteComparison } from '../features/dashboard/services/safeApi.js';
import MockDataBadge from '../components/MockDataBadge.jsx';

export default function PlanRoute({ setActiveTab }) {
  const [routeData, setRouteData] = useState(null);
  const [selectedDest, setSelectedDest] = useState('halte-transjakarta'); // 'halte-transjakarta' (Stitch) atau 'rsud-soetomo' (Surabaya)
  const [selectedProfile, setSelectedProfile] = useState('electric');
  const [activeRouteKey, setActiveRouteKey] = useState('routeB'); // 'routeB' (Jalur Kuning Guiding Block) atau 'routeA' (Jalur Trotoar Lebar)
  const [activeFilters, setActiveFilters] = useState({
    avoidBarriers: true,
    prioritizeCurbRamps: true,
    avoidSteepSlopes: true,
    preferShadedWalkways: true,
    avoidSlipperyTiles: true
  });
  const [shareToast, setShareToast] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [hapticActive, setHapticActive] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [routeError, setRouteError] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(null);

  const destInfo = selectedDest === 'halte-transjakarta' ? {
    title: 'Tujuan: Halte TransJakarta',
    subtitle: 'Jalan Cikini Raya ke Halte Stasiun Cikini',
    origin: '📍 Jalan Cikini Raya',
    destination: '🎯 Halte TransJakarta / Stasiun Cikini',
    routeBDuration: '7 mnt',
    routeBDistance: '420m',
    routeBDescription: 'Jalur ubin pemandu kontinu via Jl. Pegangsaan Timur, tanpa tangga penyeberangan',
    routeADuration: '9 mnt',
    routeADistance: '580m',
    routeADescription: 'Jalur trotoar lebar standar 2.4m, ramah tongkat',
    turnInstruction: 'Belok Kanan 45 meter lagi ke Halte Stasiun Cikini'
  } : {
    title: 'Tujuan: RSUD Dr. Soetomo (Jl. Moestopo)',
    subtitle: 'Balai Pemuda ke RSUD Dr. Soetomo',
    origin: '📍 Balai Pemuda, Jl. Gubernur Suryo',
    destination: '🎯 RSUD Dr. Soetomo (Jl. Moestopo No. 6-8)',
    routeBDuration: '22 mnt',
    routeBDistance: '1,6 km',
    routeBDescription: 'Rampa kontinu dengan pelintasan berbunyi ramah disabilitas',
    routeADuration: '18 mnt',
    routeADistance: '1,4 km',
    routeADescription: 'Jalur terpendek pejalan kaki (140m turun ke aspal jalan raya)',
    turnInstruction: 'Belok Kanan dalam 120m ke trotoar utara Jl. Pemuda'
  };

  const loadRoute = () => {
    setIsLoadingRoute(true);
    setRouteError(null);
    fetchRouteComparison({ profile: selectedProfile })
      .then(res => {
        setRouteData(res.data);
        setIsLoadingRoute(false);
      })
      .catch(err => {
        setRouteError('Gagal menghitung perbandingan rute. Klik Coba Lagi.');
        setIsLoadingRoute(false);
      });
  };

  useEffect(() => {
    loadRoute();
  }, [selectedProfile, selectedDest]);

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-7.2655, 112.7515],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
      maxZoom: 19
    }).addTo(map);

    routeLayersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isNavigating]);

  // Update rendering garis rute Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayersRef.current || !routeData) return;

    const layerGroup = routeLayersRef.current;
    layerGroup.clearLayers();

    const routeA = routeData.routeA;
    const routeB = routeData.routeB;

    if (!routeA?.coordinates?.length && !routeB?.coordinates?.length) return;

    const allPoints = [];

    // 1. Render Rute A (Standar Navigasi Umum)
    if (routeA?.coordinates?.length) {
      const isSelected = activeRouteKey === 'routeA';
      const polylineA = L.polyline(routeA.coordinates, {
        color: '#ba1a1a',
        weight: isSelected ? 8 : 4,
        opacity: isSelected ? 0.95 : 0.45,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      polylineA.bindTooltip(`⚠️ Rute Alternatif: ${destInfo.routeADuration} (${destInfo.routeADistance})`, {
        sticky: true
      });

      polylineA.on('click', () => setActiveRouteKey('routeA'));

      if (isSelected) {
        routeA.coordinates.forEach(pt => allPoints.push(pt));
      }
    }

    // 2. Render Rute B (Rekomendasi AI Leluasa - Jalur Kuning Guiding Block)
    if (routeB?.coordinates?.length) {
      const isSelected = activeRouteKey === 'routeB';

      const polylineBBase = L.polyline(routeB.coordinates, {
        color: '#0037B0',
        weight: isSelected ? 9 : 5,
        opacity: isSelected ? 0.95 : 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Jalur Taktil Kuning
      L.polyline(routeB.coordinates, {
        color: '#FFE083',
        weight: isSelected ? 3.5 : 2,
        opacity: 1.0,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      polylineBBase.bindTooltip(`✨ Jalur Kuning Guiding Block: ${destInfo.routeBDuration} (${destInfo.routeBDistance})`, {
        sticky: true
      });

      polylineBBase.on('click', () => setActiveRouteKey('routeB'));

      if (isSelected || allPoints.length === 0) {
        routeB.coordinates.forEach(pt => allPoints.push(pt));
      }
    }

    // 3. Pasang Penanda Titik Awal & Tujuan
    const startIcon = L.divIcon({
      className: 'route-start-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${destInfo.origin}
          </div>
          <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">accessible</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([-7.2642, 112.7449], { icon: startIcon }).addTo(layerGroup);

    const endIcon = L.divIcon({
      className: 'route-end-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${destInfo.destination}
          </div>
          <div class="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">directions_bus</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([-7.2678, 112.7582], { icon: endIcon }).addTo(layerGroup);

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
    }
  }, [routeData, activeRouteKey, isNavigating, selectedDest]);

  const toggleFilter = (key) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartNav = () => {
    setIsNavigating(true);
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(`Memulai navigasi rute aktif Leluasa. ${destInfo.turnInstruction}. Mengikuti jalur guiding block aman.`);
      msg.lang = 'id-ID';
      window.speechSynthesis.speak(msg);
    }
  };

  const handleRepeatVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${destInfo.turnInstruction}. Mengikuti jalur guiding block aman.`);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Rute Aksesibel Leluasa',
        text: `${destInfo.origin} ke ${destInfo.destination} — 100% Tersedia Rampa Trotoar & Tanpa Rintangan`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      setShareToast('Tautan rute aksesibel berhasil disalin ke papan klip!');
      setTimeout(() => setShareToast(''), 3500);
    }
  };

  // =========================================================================
  // VIEW A: NAVIGASI RUTE AKTIF MOTION (stitch_leluasa)
  // =========================================================================
  if (isNavigating) {
    return (
      <div className="relative w-full max-w-md h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] mx-auto overflow-hidden flex flex-col justify-between bg-surface-container-low shadow-2xl animate-fadeIn">
        {/* 1. SENSORY ROUTE MOTION CANVAS */}
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-[#F4F6F9]">
          <svg className="w-full h-full" fill="none" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
            <rect fill="#F8FAFC" height="844" width="390"></rect>
            <path d="M-20 280 H420 V360 H-20 Z" fill="#EEF2F6"></path>
            <path d="M120 -20 V860 H270 V-20 Z" fill="#EEF2F6"></path>

            {/* Tactile Guiding Block Walkways (Kuning Indikator Jalur Pemandu) */}
            <path d="M195 720 L195 320 Q195 305 210 305 L320 305" opacity="0.65" stroke="#FDE047" strokeLinecap="round" strokeLinejoin="round" strokeWidth="14"></path>
            <path d="M195 720 L195 320 Q195 305 210 305 L320 305" opacity="0.75" stroke="#CA8A04" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>

            {/* Sensory Sonar Radar Rings */}
            <circle className="pulse-ring-1" cx="195" cy="540" fill="none" r="10" stroke="#0284C7"></circle>
            <circle className="pulse-ring-2" cx="195" cy="540" fill="none" r="10" stroke="#1D4ED8"></circle>
            <circle className="pulse-ring-3" cx="195" cy="540" fill="none" r="10" stroke="#38BDF8"></circle>

            {/* Dynamic Animated Active Route */}
            <path d="M195 540 L195 320 Q195 305 210 305 L320 305" stroke="#0037B0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8"></path>
            <path className="animate-dash-flow" d="M195 540 L195 320 Q195 305 210 305 L320 305" stroke="#38BDF8" strokeDasharray="14 10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5"></path>

            {/* Turn Target Node */}
            <circle cx="210" cy="305" fill="#FFFFFF" r="9" stroke="#0037B0" strokeWidth="4"></circle>
            <circle cx="210" cy="305" fill="#0037B0" r="3.5"></circle>

            {/* User Sensor Beacon */}
            <g className="beacon-glow">
              <circle cx="195" cy="540" fill="#FFFFFF" r="14" stroke="#1D4ED8" strokeWidth="4"></circle>
              <circle cx="195" cy="540" fill="#1D4ED8" r="6"></circle>
            </g>
          </svg>
        </div>

        {/* 2. TOP FLOATING HUD CARD: URGENT HIGH-CONTRAST TACTILE CUE */}
        <div className="relative z-20 px-4 sm:px-5 pt-3">
          <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-[0_12px_28px_rgba(17,24,39,0.12)] border-l-[8px] border-primary flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div aria-label="Arah: Belok Kanan" className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-md shrink-0">
                <span className="material-symbols-outlined text-[34px]">turn_right</span>
              </div>
              <div>
                <span className="font-headline-lg-mobile text-on-surface tracking-tight block">
                  Belok Kanan
                </span>
                <span className="text-body-lg text-primary font-bold block -mt-1">
                  45 meter lagi
                </span>
              </div>
            </div>

            {/* Audio cue repeating button */}
            <button
              aria-label="Ulangi instruksi suara"
              onClick={handleRepeatVoice}
              className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-full bg-surface-container text-primary flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95 focus:outline focus:outline-[3px] focus:outline-primary"
              type="button"
            >
              <span className="material-symbols-outlined text-2xl">volume_up</span>
            </button>
          </div>

          {/* Quick Guiding Block Road Status Pill */}
          <div className="mt-2.5 flex items-center justify-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-tertiary-fixed rounded-full text-on-tertiary-fixed shadow-sm">
              <span className="material-symbols-outlined text-lg text-tertiary font-bold">blind</span>
              <span className="text-label-md font-extrabold text-xs text-on-tertiary-fixed">Jalur Guiding Block Tersedia</span>
            </div>
          </div>
        </div>

        {/* 3. FLOATING VOICE ASSISTANT FAB */}
        <div className="relative z-20 px-5 flex justify-end my-auto pointer-events-none">
          <div className="relative pointer-events-auto">
            <span className="mic-ripple absolute inset-0 rounded-full bg-primary opacity-30"></span>
            <button
              aria-label="Perintah Suara Pintar Leluasa"
              onClick={handleRepeatVoice}
              className="relative w-14 h-14 rounded-full bg-primary text-on-primary shadow-xl flex items-center justify-center active:scale-95 transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined text-2xl">mic</span>
            </button>
          </div>
        </div>

        {/* 4. BOTTOM FLOATING TRIP COMPACT HUD & CONTROLS */}
        <div className="relative z-20 px-4 sm:px-5 pb-6 space-y-3">
          <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-[0_12px_28px_rgba(17,24,39,0.12)]">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg-mobile text-on-surface font-extrabold">{destInfo.routeBDuration}</span>
                  <span className="font-headline-sm text-outline font-semibold">• {destInfo.routeBDistance}</span>
                </div>
                <p className="text-body-sm text-on-surface-variant font-medium mt-0.5">
                  {destInfo.subtitle}
                </p>
              </div>

              {/* Haptic Mode Toggle */}
              <button
                aria-label="Beralih ke getar taktil"
                onClick={() => setHapticActive(!hapticActive)}
                className={`min-h-[48px] px-3.5 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                  hapticActive ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-xl">vibration</span>
                <span className="text-label-md text-xs">{hapticActive ? 'Haptik' : 'Mute'}</span>
              </button>
            </div>

            {/* Quick Actions (min 52px height) */}
            <div className="pt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  loadRoute();
                  handleRepeatVoice();
                }}
                className="min-h-[50px] w-full rounded-full bg-surface-container text-primary font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-xl">alt_route</span>
                <span>Rute Ulang</span>
              </button>
              <button
                onClick={() => setActiveTab('report-obstacle')}
                className="min-h-[50px] w-full rounded-full bg-error-container text-on-error-container font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-xl">report</span>
                <span>Hambatan</span>
              </button>
            </div>

            {/* Selesai Navigasi Button */}
            <button
              onClick={() => setIsNavigating(false)}
              className="w-full mt-2.5 py-2 rounded-xl text-center text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              ← Kembali ke Pilihan Rute
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: PILIHAN RUTE MINIMALIS (stitch_leluasa)
  // =========================================================================
  return (
    <div className="px-3 sm:px-space-md lg:px-space-xl py-3 sm:py-space-md flex flex-col gap-4 max-w-[1520px] mx-auto w-full animate-fadeIn pb-8">
      {/* Toast Notifikasi */}
      {shareToast && (
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold shadow-xl flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* MINIMAL SPATIAL HEADER (stitch_leluasa) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <span className="text-label-md uppercase tracking-wider text-primary font-bold">Pilih Jalur Aman</span>
          <h1 className="font-headline-lg-mobile text-xl sm:text-2xl text-on-surface font-extrabold">
            {destInfo.title}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{destInfo.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Destination Selector Pill Switcher */}
          <div className="flex items-center bg-surface-container p-1 rounded-full border border-outline-variant/30 text-xs font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedDest('halte-transjakarta')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                selectedDest === 'halte-transjakarta' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Halte TransJakarta (Stitch)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDest('rsud-soetomo')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                selectedDest === 'rsud-soetomo' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>RSUD Dr. Soetomo (SBY)</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant shadow-xs">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-label-md text-xs text-on-surface font-semibold">GPS Akurat</span>
          </div>
          <MockDataBadge />
        </div>
      </div>

      {/* ================= VECTOR MAP CANVAS: INTERACTIVE ROUTE PREVIEW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* KIRI: PRATINJAU PETA TAKTIL (stitch_leluasa + Leaflet) */}
        <section aria-label="Pratinjau Peta Rute Taktil" className="lg:col-span-7 relative w-full h-72 sm:h-84 lg:h-96 rounded-2xl overflow-hidden bg-surface-container-lowest border-2 border-outline-variant shadow-sm flex items-center justify-center">
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
          />

          {isLoadingRoute && (
            <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="px-4 py-2.5 rounded-xl bg-surface-container-lowest shadow-lg flex items-center gap-2.5 text-primary text-xs font-bold animate-pulse">
                <span className="material-symbols-outlined text-secondary animate-spin text-lg">progress_activity</span>
                <span>Menghitung Rute Taktil Aman...</span>
              </div>
            </div>
          )}

          {/* Floating Badges di Canvas */}
          <div className="absolute top-3 left-3 bg-surface-container-lowest/95 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-primary shadow-sm flex items-center gap-2 z-10">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
            <span className="text-label-md text-xs text-primary font-bold">
              {activeRouteKey === 'routeB' ? 'Jalur Kuning Aktif' : 'Jalur Trotoar Aktif'}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 bg-surface-container-lowest/95 px-3 py-1.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1.5 text-on-surface-variant z-10">
            <span className="material-symbols-outlined text-sm text-secondary">hearing</span>
            <span className="text-label-md text-[11px] font-semibold">Audio Beacon Siap</span>
          </div>
        </section>

        {/* KANAN: MINIMAL ROUTE COMPARISON CARDS (stitch_leluasa) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div aria-label="Opsi Rute Perjalanan" className="flex flex-col gap-3" role="radiogroup">
            
            {/* CARD 1: PRIMARY (Jalur Kuning Guiding Block) */}
            <div
              aria-checked={activeRouteKey === 'routeB'}
              onClick={() => setActiveRouteKey('routeB')}
              className={`relative w-full bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2.5 cursor-pointer transition-all ${
                activeRouteKey === 'routeB'
                  ? 'border-[3px] border-primary shadow-[0_4px_16px_rgba(29,78,216,0.15)] ring-2 ring-primary/20'
                  : 'border-2 border-outline-variant hover:border-outline shadow-xs'
              }`}
              role="radio"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${activeRouteKey === 'routeB' ? 'bg-primary text-on-primary' : 'border-2 border-outline'}`}>
                    {activeRouteKey === 'routeB' && <span className="material-symbols-outlined text-base">check</span>}
                  </span>
                  <span className="font-headline-sm text-sm sm:text-base text-on-surface font-extrabold">
                    Jalur Kuning (Guiding Block)
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">
                  Paling Aman
                </span>
              </div>

              <div className="flex items-baseline gap-2 pl-9">
                <span className="font-headline-md text-base sm:text-lg text-primary font-extrabold">{destInfo.routeBDuration} ({destInfo.routeBDistance})</span>
                <span className="text-on-surface-variant font-bold">•</span>
                <span className="text-secondary text-xs font-bold">Aman 100% (Bebas Halangan)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 pl-9">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-full text-on-surface text-[11px] font-bold">
                  <span className="material-symbols-outlined text-primary text-sm">texture</span>
                  <span>Ubin Pengarah Mulus</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-full text-on-surface text-[11px] font-bold">
                  <span className="material-symbols-outlined text-secondary text-sm">volume_up</span>
                  <span>Pelikan Suara</span>
                </div>
              </div>
            </div>

            {/* CARD 2: ALTERNATIVE (Jalur Trotoar Lebar Standar) */}
            <div
              aria-checked={activeRouteKey === 'routeA'}
              onClick={() => setActiveRouteKey('routeA')}
              className={`w-full bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2 cursor-pointer transition-all ${
                activeRouteKey === 'routeA'
                  ? 'border-[3px] border-error shadow-[0_4px_16px_rgba(186,26,26,0.15)] ring-2 ring-error/20'
                  : 'border-2 border-outline-variant hover:border-outline shadow-xs'
              }`}
              role="radio"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${activeRouteKey === 'routeA' ? 'bg-error text-white' : 'border-2 border-outline'}`}>
                    {activeRouteKey === 'routeA' && <span className="material-symbols-outlined text-base">check</span>}
                  </span>
                  <span className="font-headline-sm text-sm sm:text-base text-on-surface font-bold">
                    Jalur Trotoar Lebar (Standar)
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">Alternatif</span>
              </div>

              <div className="flex items-baseline gap-2 pl-9">
                <span className="font-headline-sm text-sm sm:text-base text-on-surface font-bold">{destInfo.routeADuration} ({destInfo.routeADistance})</span>
                <span className="text-on-surface-variant font-bold">•</span>
                <span className="text-on-surface-variant text-xs font-semibold">{destInfo.routeADescription}</span>
              </div>

              <div className="flex items-center gap-2 pl-9">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container-low rounded-full text-on-surface-variant text-[11px]">
                  <span className="material-symbols-outlined text-sm">straighten</span>
                  <span>Lebar 2.4m</span>
                </div>
              </div>
            </div>
          </div>

          {/* FULL WIDTH HIGH-CONTRAST PRIMARY ACTION (stitch_leluasa) */}
          <div className="pt-2">
            <button
              onClick={handleStartNav}
              className="w-full min-h-[56px] py-3.5 px-6 rounded-full bg-primary text-on-primary font-headline-sm text-base font-extrabold shadow-[0_8px_20px_rgba(0,55,176,0.25)] flex items-center justify-center gap-3 active:scale-95 transition-transform duration-150 focus:outline focus:outline-[3px] focus:outline-primary"
              type="button"
            >
              <span>Mulai Navigasi</span>
              <span className="material-symbols-outlined text-2xl animate-pulse">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* PROFIL & FILTER JALUR */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">tune</span>
            <span className="font-headline-sm text-xs sm:text-sm font-bold text-on-surface">
              Pengaturan Profil Mobilitas & Parameter Jalur
            </span>
          </div>
          <div className="flex items-center gap-1 text-primary text-xs font-bold">
            <span>{Object.values(activeFilters).filter(Boolean).length} Filter Aktif</span>
            <span className="material-symbols-outlined text-base">
              {filtersExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>

        {filtersExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20 animate-fadeIn">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">Profil Pengguna</label>
              <select
                className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface text-xs font-semibold focus:outline-none"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
              >
                <option value="electric">⚡ Kursi Roda Listrik (Lebar 68cm)</option>
                <option value="manual">🧑‍🦽 Kursi Roda Manual (Utamakan Rampa)</option>
                <option value="scooter">🛵 Skuter Mobilitas (Radius Putar 110cm)</option>
                <option value="caregiver">🤝 Didorong Pendamping (Kelandaian &lt;8%)</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {[
                { key: 'avoidBarriers', label: 'Hindari rintangan terblokir' },
                { key: 'prioritizeCurbRamps', label: 'Prioritaskan rampa landai' },
                { key: 'avoidSteepSlopes', label: 'Hindari tanjakan curam &gt;6%' },
                { key: 'preferShadedWalkways', label: 'Jalur berteduh/beratap' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    activeFilters[f.key] ? 'bg-secondary-container text-secondary font-bold' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {activeFilters[f.key] ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PANDUAN TIAP BELOKAN */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">directions_walk</span>
            <h2 className="font-headline-sm text-xs sm:text-sm font-bold text-on-surface">Panduan Navigasi Tiap Belokan</h2>
          </div>
          <button
            onClick={handleShare}
            className="px-3 py-1 rounded-full bg-surface-container text-primary font-bold text-xs flex items-center gap-1 hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-xs">share</span>
            <span>Bagikan</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {(routeB?.segments || [
            { instruction: 'Mulai dari titik awal, lewati rampa barat bergradien 3,5%', detail: 'Rampa selebar 2,1m dengan ubin pengarah (guiding block) utuh', distance: '120 m' },
            { instruction: 'Belok kanan ke trotoar utara', detail: 'Beton bertekstur mulus, lebar bersih 2,4m, bebas bollard sempit', distance: '380 m' },
            { instruction: 'Menyeberang di Pelican Crossing pelikan suara', detail: 'Lampu penyeberangan berbunyi akustik (audio chirp) aktif 45 detik', distance: '45 m' },
            { instruction: 'Lanjut lurus menyusuri koridor teduh berkanopi', detail: 'Trotoar berkanopi, ubin taktil terpasang rapi, kelandaian rampa 2,8%', distance: '620 m' },
            { instruction: 'Tiba di pintu rampa lobi tujuan utama', detail: 'Rampa bersertifikasi standar kemiringan 1:12 dengan pegangan tangan ganda', distance: 'Tujuan' }
          ]).map((seg, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 flex items-baseline justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-label-md text-xs font-semibold text-on-surface">{seg.instruction}</span>
                  <span className="text-[11px] text-on-surface-variant">{seg.detail}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-primary font-bold shrink-0">
                  {seg.distance}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
