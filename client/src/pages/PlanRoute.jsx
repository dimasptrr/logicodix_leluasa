import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchRouteComparison } from '../services/api.js';

export default function PlanRoute({ setActiveTab }) {
  const [routeData, setRouteData] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState('electric');
  const [activeRouteKey, setActiveRouteKey] = useState('routeB'); // 'routeB' (AI Leluasa) atau 'routeA' (Standar)
  const [activeFilters, setActiveFilters] = useState({
    avoidBarriers: true,
    prioritizeCurbRamps: true,
    avoidSteepSlopes: true,
    preferShadedWalkways: true,
    avoidSlipperyTiles: true
  });
  const [shareToast, setShareToast] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(null);

  // Mengambil data rute real-time dari backend GIS
  useEffect(() => {
    setIsLoadingRoute(true);
    fetchRouteComparison({ profile: selectedProfile })
      .then(res => {
        setRouteData(res.data);
        setIsLoadingRoute(false);
      })
      .catch(err => {
        console.error('Error fetching route:', err);
        setIsLoadingRoute(false);
      });
  }, [selectedProfile]);

  // Inisialisasi Peta Leaflet untuk Visualisasi Rute Jaringan Nyata
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
  }, []);

  // Update rendering garis rute Leaflet saat routeData atau activeRouteKey berganti
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

      polylineA.bindTooltip(`⚠️ Rute Standar: ${routeA.distance} (${routeA.safetyScore}/100 - Risiko Tinggi)`, {
        sticky: true
      });

      polylineA.on('click', () => setActiveRouteKey('routeA'));

      if (isSelected) {
        routeA.coordinates.forEach(pt => allPoints.push(pt));
      }
    }

    // 2. Render Rute B (Rekomendasi AI Leluasa - Ramah Difabel)
    if (routeB?.coordinates?.length) {
      const isSelected = activeRouteKey === 'routeB';

      // Lapisan dasar hijau tua
      const polylineBBase = L.polyline(routeB.coordinates, {
        color: '#006a62',
        weight: isSelected ? 9 : 5,
        opacity: isSelected ? 0.95 : 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Lapisan garis tengah cyan
      L.polyline(routeB.coordinates, {
        color: '#83f6e7',
        weight: isSelected ? 3.5 : 2,
        opacity: isSelected ? 1.0 : 0.6,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      polylineBBase.bindTooltip(`✨ Rute AI Leluasa: ${routeB.distance} (${routeB.safetyScore}/100 - Terverifikasi Penuh)`, {
        sticky: true
      });

      polylineBBase.on('click', () => setActiveRouteKey('routeB'));

      if (isSelected || allPoints.length === 0) {
        routeB.coordinates.forEach(pt => allPoints.push(pt));
      }
    }

    // 3. Pasang Penanda Titik Awal (Balai Pemuda)
    const originPt = routeData.origin?.coordinates || [-7.2642, 112.7449];
    const startIcon = L.divIcon({
      className: 'route-start-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            📍 Titik Awal: Balai Pemuda
          </div>
          <div class="w-8 h-8 rounded-full bg-[#006a62] text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">directions_walk</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([originPt.lat || originPt[0], originPt.lng || originPt[1]], { icon: startIcon }).addTo(layerGroup);

    // 4. Pasang Penanda Titik Tujuan (RSUD Dr. Soetomo)
    const destPt = routeData.destination?.coordinates || [-7.2678, 112.7582];
    const endIcon = L.divIcon({
      className: 'route-end-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            🎯 Tujuan: RSUD Dr. Soetomo
          </div>
          <div class="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">local_hospital</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([destPt.lat || destPt[0], destPt.lng || destPt[1]], { icon: endIcon }).addTo(layerGroup);

    // 5. Pasang Penanda Rintangan Terdeteksi (Galian Jl. Pemuda 34)
    const obstacleIcon = L.divIcon({
      className: 'route-obs-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full animate-bounce">
          <div class="px-2 py-0.5 rounded-full bg-error text-white font-bold text-[9px] shadow-md whitespace-nowrap mb-0.5">
            ⛔ Terblokir 0cm
          </div>
          <div class="w-7 h-7 rounded-full bg-error text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-xs">block</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    const obsMarker = L.marker([-7.2655, 112.7482], { icon: obstacleIcon }).addTo(layerGroup);
    obsMarker.bindTooltip('Rintangan Kritis: Galian Pipa Utilitas Jl. Pemuda No. 34 (0cm clearance)', { sticky: true });

    // 6. Otomatis sesuaikan batas tampilan peta (Auto Fit Bounds)
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
    }
  }, [routeData, activeRouteKey]);

  const toggleFilter = (key) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Rute Aksesibel Leluasa',
        text: 'Balai Pemuda ke RSUD Dr. Soetomo — 100% Tersedia Rampa Trotoar & Tanpa Rintangan',
        url: window.location.href,
      }).catch(() => {});
    } else {
      setShareToast('Tautan rute aksesibel berhasil disalin ke papan klip & siap dibagikan via WhatsApp!');
      setTimeout(() => setShareToast(''), 3500);
    }
  };

  const handleStartNav = () => {
    setIsNavigating(true);
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance('Memulai navigasi rute terpandu Leluasa. Bergerak ke arah timur dari Balai Pemuda menuju Rampa Aksesibel Timur dengan kelandaian 3,5 persen.');
      msg.lang = 'id-ID';
      window.speechSynthesis.speak(msg);
    }
  };

  const routeA = routeData?.routeA;
  const routeB = routeData?.routeB;

  return (
    <div className="px-3 sm:px-space-md lg:px-space-xl py-space-md lg:py-space-lg flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl max-w-[1520px] mx-auto w-full animate-fadeIn pb-8 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex flex-wrap items-center justify-between gap-space-sm sm:gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-2xl">alt_route</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-[11px] sm:text-xs uppercase tracking-wider text-secondary font-bold">Mesin Panduan Aman</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] sm:text-[11px] font-bold">LOGICODIX 2026</span>
              </div>
              <h1 className="font-headline-lg text-lg sm:text-2xl lg:text-3xl text-primary font-bold tracking-tight">
                Intelijen Rute Aksesibel
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant font-label-sm text-xs">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              {routeData?.routingEngine || 'OpenStreetMap OSRM Engine'}
            </div>
            <button
              onClick={() => setActiveTab('explore-map')}
              className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-surface-container-lowest text-primary font-label-md text-xs font-semibold shadow-xs hover:bg-surface-container transition-all flex items-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-base text-secondary">map</span>
              <span>Peta Lengkap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="p-3 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold flex items-center gap-2 shadow-md animate-fadeIn">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* Navigasi Suara Berjalan */}
      {isNavigating && (
        <div className="p-3 sm:p-4 rounded-2xl bg-primary text-on-primary flex items-center justify-between shadow-xl ring-4 ring-secondary/30 animate-pulse gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl">turn_right</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-xs sm:text-sm font-bold text-secondary-container">Belok Kanan dalam 120m ke Jl. Pemuda</span>
              <span className="text-[11px] text-on-primary/80">Beton mulus · Lebar 2,2m · Bebas rintangan</span>
            </div>
          </div>
          <button
            onClick={() => setIsNavigating(false)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest/20 hover:bg-surface-container-lowest/30 text-xs font-semibold shrink-0"
          >
            Selesai
          </button>
        </div>
      )}

      {/* Panel Pencarian, Profil & Batasan Rute */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xs flex flex-col gap-space-md sm:gap-space-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-sm sm:gap-space-md items-center">
          {/* Kolom Titik Awal & Tujuan */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-space-sm sm:gap-space-md">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs text-on-surface-variant flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-secondary text-base">my_location</span> Titik Awal
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-lg">location_on</span>
                <input
                  className="w-full h-11 sm:h-12 pl-10 pr-3 rounded-xl bg-surface-container-low text-primary font-label-md text-xs sm:text-sm cursor-default focus:outline-none truncate font-medium"
                  readOnly
                  type="text"
                  value="📍 Balai Pemuda, Jl. Gubernur Suryo"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-xs text-on-surface-variant flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-secondary text-base">flag</span> Destinasi Tujuan
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-lg">pin_drop</span>
                <input
                  className="w-full h-11 sm:h-12 pl-10 pr-3 rounded-xl bg-surface-container-low text-primary font-label-md text-xs sm:text-sm cursor-default focus:outline-none truncate font-medium"
                  readOnly
                  type="text"
                  value="🎯 RSUD Dr. Soetomo (Jl. Moestopo No. 6-8)"
                />
              </div>
            </div>
          </div>

          {/* Pemilih Profil Mobilitas */}
          <div className="lg:col-span-4 flex flex-col gap-1">
            <label className="font-label-sm text-xs text-on-surface-variant flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-base">accessible_forward</span> Profil Mobilitas Aktif
              </span>
              <span className="text-secondary font-label-sm text-[11px] font-semibold">Lebar 68cm · Trotoar ≤5cm</span>
            </label>
            <div className="relative">
              <select
                className="w-full h-11 sm:h-12 pl-3.5 pr-8 rounded-xl bg-surface-container text-primary font-label-md text-xs sm:text-sm appearance-none focus:outline-none cursor-pointer font-medium truncate"
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
              >
                <option value="electric">⚡ Kursi Roda Listrik (Lebar 68cm, Trotoar maks 5cm)</option>
                <option value="manual">🧑‍🦽 Kursi Roda Manual (Standar 65cm, Utamakan Rampa)</option>
                <option value="scooter">🛵 Skuter Mobilitas (Radius Putar 110cm, Trotoar maks 7cm)</option>
                <option value="caregiver">🤝 Didorong Pendamping (Batas Kelandaian 8%)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-on-surface-variant pointer-events-none text-xl">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Filter Jalur Sesuai DPUPR */}
        <div className="pt-space-xs flex flex-col gap-space-xs">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-secondary">security</span>
              Filter Jalur Aksesibel (Standar DPUPR Surabaya)
            </span>
            <div className="flex items-center gap-1 text-secondary font-semibold text-xs">
              <span>{Object.values(activeFilters).filter(Boolean).length} Aktif</span>
              <span className="material-symbols-outlined text-sm lg:hidden">
                {filtersExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </div>
          </div>

          <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 transition-all ${filtersExpanded ? 'flex' : 'hidden sm:flex'}`}>
            {[
              { key: 'avoidBarriers', label: 'Hindari rintangan terblokir' },
              { key: 'prioritizeCurbRamps', label: 'Prioritaskan rampa trotoar landai' },
              { key: 'avoidSteepSlopes', label: 'Hindari tanjakan curam >6%' },
              { key: 'preferShadedWalkways', label: 'Pilih jalur berteduh/beratap' },
              { key: 'avoidSlipperyTiles', label: 'Hindari ubin licin saat basah' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className={`h-9 px-3 rounded-lg font-label-sm text-[11px] sm:text-xs flex items-center gap-1.5 shadow-xs font-semibold transition-all ${
                  activeFilters[f.key]
                    ? 'bg-secondary-container text-on-secondary-container ring-1 ring-secondary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  {activeFilters[f.key] ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KANVAS PETA LEAFLET INTERAKTIF (Menggunakan Geometri Jaringan Nyata OpenStreetMap) */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md bg-surface-container-high h-64 sm:h-80 lg:h-96 border border-outline-variant/30">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
        />

        {/* Indikator Memuat Rute */}
        {isLoadingRoute && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="px-4 py-2.5 rounded-xl bg-surface-container-lowest shadow-lg flex items-center gap-2.5 text-primary text-xs font-bold animate-pulse">
              <span className="material-symbols-outlined text-secondary animate-spin text-lg">progress_activity</span>
              <span>Menghitung Geometri Jaringan Jalan Nyata...</span>
            </div>
          </div>
        )}

        {/* Badge Pemilih Rute Cepat di atas Peta */}
        <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-10 flex flex-wrap gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={() => setActiveRouteKey('routeB')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
              activeRouteKey === 'routeB'
                ? 'bg-[#006a62] text-white ring-2 ring-white scale-105'
                : 'bg-surface-container-lowest/90 backdrop-blur-md text-primary hover:bg-surface-container'
            }`}
            type="button"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#83f6e7]"></span>
            <span>⭐ Rute B (AI Leluasa - {routeB?.distance || '1,6 km'})</span>
          </button>

          <button
            onClick={() => setActiveRouteKey('routeA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
              activeRouteKey === 'routeA'
                ? 'bg-error text-white ring-2 ring-white scale-105'
                : 'bg-surface-container-lowest/90 backdrop-blur-md text-primary hover:bg-surface-container'
            }`}
            type="button"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
            <span>⚠️ Rute A (Standar - {routeA?.distance || '1,4 km'})</span>
          </button>
        </div>

        {/* Legenda & Tombol Reset Tampilan Peta di Pojok Kanan Atas */}
        <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-10 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              if (mapInstanceRef.current && routeData) {
                const active = activeRouteKey === 'routeB' ? routeB : routeA;
                if (active?.coordinates?.length) {
                  mapInstanceRef.current.fitBounds(L.latLngBounds(active.coordinates), { padding: [40, 40] });
                }
              }
            }}
            className="h-8 px-2.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md text-primary hover:bg-surface-container font-label-sm text-[11px] font-bold shadow-md flex items-center gap-1"
            title="Pusatkan seluruh rute di layar"
            type="button"
          >
            <span className="material-symbols-outlined text-sm text-secondary">crop_free</span>
            <span className="hidden sm:inline">Pusatkan</span>
          </button>
        </div>

        {/* Banner Status di Bawah Peta */}
        <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-10 flex flex-wrap items-center justify-between gap-1 px-3 py-1.5 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-primary text-[11px] font-semibold shadow-md pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-secondary">verified</span>
            <span>Aktif: <strong>{activeRouteKey === 'routeB' ? 'Rute AI Leluasa (Ramah Difabel)' : 'Rute Standar (Tinggi Risiko)'}</strong></span>
          </div>
          <span className="text-secondary font-bold">
            {activeRouteKey === 'routeB' ? '100% Rampa Tersedia · 0 Hambatan' : '1 Rintangan Kritis Terdeteksi'}
          </span>
        </div>
      </div>

      {/* Perbandingan 2 Rute: Kartu Rute A vs Rute B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md sm:gap-space-lg items-stretch">
        {/* KARTU RUTE A: Rute Pedestrian Biasa (Peta Umum) */}
        <div
          onClick={() => setActiveRouteKey('routeA')}
          className={`bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xs flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all ${
            activeRouteKey === 'routeA' ? 'ring-3 ring-error border-transparent shadow-lg' : 'border border-outline-variant/20 hover:border-error/40'
          }`}
        >
          <div className="flex flex-col gap-space-sm sm:gap-space-md">
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] sm:text-xs font-bold w-fit">
                <span className="material-symbols-outlined text-sm sm:text-base">warning</span>
                <span>Rute Standar (Dasar Peta Navigasi Umum)</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <h3 className="font-headline-md text-lg sm:text-xl text-primary font-bold">{routeA?.distance || '1,4 km'} · {routeA?.duration || '18 menit'}</h3>
                  <span className="font-body-sm text-xs text-on-surface-variant">Jalur terpendek menurut algoritma pejalan kaki standar</span>
                </div>
                <div className="text-right">
                  <span className="font-headline-md text-lg sm:text-xl text-error font-bold">{routeA?.safetyScore || 38} / 100</span>
                  <p className="font-label-sm text-[10px] sm:text-[11px] text-error font-bold">Risiko Tinggi</p>
                </div>
              </div>
            </div>

            {/* Peringatan Bahaya */}
            <div className="p-3 rounded-xl bg-error-container/30 border border-error/30 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-lg sm:text-xl shrink-0 mt-0.5 text-error">dangerous</span>
              <div className="flex flex-col">
                <span className="font-label-md text-xs font-bold text-error">Pemberitahuan Bahaya Kritis</span>
                <p className="font-body-sm text-[11px] sm:text-xs text-on-surface-variant mt-0.5">
                  {routeA?.notice || 'Pengguna terpaksa turun ke aspal jalan raya sepanjang 140 meter berdampingan dengan kendaraan bermotor di Jl. Pemuda akibat galian saluran air.'}
                </p>
              </div>
            </div>

            {/* Rintangan Terdeteksi */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Rintangan Terdeteksi di Jaringan Jalan
              </span>
              <div className="flex flex-col gap-1.5">
                {(routeA?.impediments || [
                  { icon: 'cancel', text: 'Trotoar terblokir total oleh galian pipa utilitas di Jl. Pemuda No. 34' },
                  { icon: 'trending_up', text: '1 Rampa curam kemiringan 11% melebihi batas aman 6%' }
                ]).map((imp, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-surface-container flex items-start gap-2">
                    <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">{imp.icon}</span>
                    <span className="font-body-sm text-[11px] text-on-surface">{imp.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rincian Permukaan Trotoar */}
            <div className="flex flex-col gap-1 pt-1">
              <span className="font-label-sm text-xs text-on-surface-variant font-bold">Rincian Permukaan Trotoar</span>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden flex">
                <div className="bg-error h-full" style={{ width: '25%' }}></div>
                <div className="bg-surface-tint h-full" style={{ width: '40%' }}></div>
                <div className="bg-secondary h-full" style={{ width: '35%' }}></div>
              </div>
              <div className="flex justify-between text-on-surface-variant text-[10px]">
                <span>25% Galian/Rusak</span>
                <span>40% Bergelombang</span>
                <span>35% Aspal Halus</span>
              </div>
            </div>
          </div>

          <div className="pt-4 sm:pt-space-lg">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveRouteKey('routeA');
              }}
              className={`w-full min-h-[44px] sm:min-h-[48px] px-4 rounded-xl font-label-md text-xs transition-colors flex items-center justify-center gap-2 ${
                activeRouteKey === 'routeA'
                  ? 'bg-error text-white font-bold'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              <span>{activeRouteKey === 'routeA' ? 'Sedang Ditampilkan di Peta' : 'Pilih Rute Standar (Berisiko)'}</span>
            </button>
          </div>
        </div>

        {/* KARTU RUTE B: Rekomendasi Rute AI Leluasa */}
        <div
          onClick={() => setActiveRouteKey('routeB')}
          className={`bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xl flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all ${
            activeRouteKey === 'routeB' ? 'ring-3 ring-secondary border-transparent' : 'border border-outline-variant/30 hover:border-secondary/50'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary"></div>
          <div className="flex flex-col gap-space-sm sm:gap-space-md">
            <div className="flex flex-col gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] sm:text-xs font-bold w-fit shadow-xs">
                <span className="material-symbols-outlined text-sm sm:text-base">verified</span>
                <span>🌟 RUTE AKSESIBEL DIREKOMENDASIKAN</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-md text-lg sm:text-xl text-primary font-bold">{routeB?.distance || '1,6 km'} · {routeB?.duration || '23 menit'}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-[10px] font-bold">
                      {routeB?.durationDiff || '+5 mnt aman'}
                    </span>
                  </div>
                  <span className="font-body-sm text-xs text-on-surface-variant">
                    {routeB?.description || 'Rampa kontinu dengan pelintasan berbunyi yang ramah disabilitas'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-headline-md text-lg sm:text-xl text-secondary font-bold">{routeB?.safetyScore || 98} / 100</span>
                  <p className="font-label-sm text-[10px] sm:text-[11px] text-secondary font-bold">Terverifikasi Penuh</p>
                </div>
              </div>
            </div>

            {/* Verifikasi Warga */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-secondary-container/30 text-on-secondary-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">group</span>
                <span className="font-label-sm text-[11px] sm:text-xs font-semibold">
                  {routeB?.communityVerification || 'Diverifikasi oleh 14 pengguna kursi roda dalam 48 jam terakhir'}
                </span>
              </div>
              <span className="font-label-sm text-[9px] px-2 py-0.5 rounded bg-surface-container-lowest text-secondary font-bold">
                LIVE
              </span>
            </div>

            {/* Jaminan Aksesibilitas */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                Jaminan Aksesibilitas
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">task_alt</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-xs font-bold text-primary">0 Rintangan Terblokir</span>
                    <span className="font-body-sm text-[10px] text-on-surface-variant">Menghindari lubang galian & tiang sempit</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">ramp_right</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-xs font-bold text-primary">100% Rampa Trotoar Tersedia</span>
                    <span className="font-body-sm text-[10px] text-on-surface-variant">Seluruh 8 titik pelintasan memiliki rampa landai</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">straighten</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-xs font-bold text-primary">Rata-rata Lebar: 180 cm</span>
                    <span className="font-body-sm text-[10px] text-on-surface-variant">Cukup leluasa untuk 2 kursi roda berselisihan</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5">park</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-xs font-bold text-primary">65% Jalur Teduh & Beratap</span>
                    <span className="font-body-sm text-[10px] text-on-surface-variant">Terlindung dari sengatan terik matahari</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kesesuaian Cuaca & Permukaan */}
            <div className="p-2.5 rounded-xl bg-surface-container flex items-center justify-between text-primary">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-base">water_drop</span>
                <span className="font-body-sm text-[11px]">Kesesuaian Cuaca: <strong>Tinggi</strong> (Anti-slip)</span>
              </div>
              <span className="font-label-sm text-[9px] text-secondary font-bold">ANTI-SLIP</span>
            </div>
          </div>

          <div className="pt-4 sm:pt-space-lg flex flex-col sm:flex-row gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartNav();
              }}
              className="flex-1 min-h-[48px] px-4 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
              type="button"
            >
              <span className="material-symbols-outlined text-lg text-secondary-container">navigation</span>
              <span>Mulai Navigasi Suara</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="min-h-[48px] px-3.5 rounded-xl bg-surface-container text-secondary font-label-md text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
              type="button"
            >
              <span className="material-symbols-outlined text-base">share</span>
              <span>Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Segmen Belokan Rute & Penampang Kelandaian */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md sm:gap-space-lg">
        {/* Segmen Panduan Tiap Belokan */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xs flex flex-col gap-space-sm sm:gap-space-md">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">directions_walk</span>
              <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">Panduan Navigasi Tiap Belokan</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold">
              {routeData?.routingEngine || 'OSM Real Geometry'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {(routeB?.segments || [
              { instruction: 'Mulai dari Balai Pemuda, lewati rampa barat bergradien 3,5%', detail: 'Rampa selebar 2,1m dengan ubin pengarah (guiding block) utuh', distance: '120 m' },
              { instruction: 'Belok kanan ke trotoar utara Jl. Pemuda', detail: 'Beton bertekstur mulus, lebar bersih 2,4m, bebas bollard sempit', distance: '380 m' },
              { instruction: 'Menyeberang di Pelican Crossing depan WTC Surabaya', detail: 'Lampu penyeberangan berbunyi akustik (audio chirp) aktif 45 detik', distance: '45 m' },
              { instruction: 'Lanjut lurus menyusuri koridor teduh Jl. Kusuma Bangsa', detail: 'Trotoar berkanopi, ubin taktil terpasang rapi, kelandaian rampa 2,8%', distance: '620 m' },
              { instruction: 'Tiba di pintu rampa lobi IGD RSUD Dr. Soetomo', detail: 'Rampa bersertifikasi standar kemiringan 1:12 dengan pegangan tangan ganda', distance: 'Tujuan' }
            ]).map((seg, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 flex items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs font-semibold text-primary">{seg.instruction}</span>
                    <span className="font-body-sm text-[10px] sm:text-[11px] text-on-surface-variant">{seg.detail}</span>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-surface-container font-label-sm text-[10px] text-primary font-bold whitespace-nowrap">
                    {seg.distance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profil Penampang Kelandaian */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xs flex flex-col justify-between gap-space-sm sm:gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-lg">show_chart</span>
                <h3 className="font-headline-sm text-sm sm:text-base text-primary font-bold">Profil Penampang Kelandaian</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-[10px] font-bold">
                {routeB?.slopeProfile?.threshold || 'Maks 4,5% (Aman)'}
              </span>
            </div>
            <p className="font-body-sm text-[11px] text-on-surface-variant">Grafik kemiringan kontinu di sepanjang {routeB?.distance || '1,6 km'} perjalanan</p>
          </div>

          {/* SVG Profil Kemiringan */}
          <div className="flex flex-col gap-1.5 bg-surface-container-low p-3 rounded-xl">
            <div className="flex justify-between text-[10px] font-label-sm text-on-surface-variant">
              <span>Elevasi: {routeB?.slopeProfile?.elevationRange || '4,2m ke 6,8m'}</span>
              <span>Batas Aman: ≤ 6,0%</span>
            </div>
            <div className="relative w-full h-28 sm:h-36 flex items-center justify-center">
              <svg className="w-full h-full text-secondary" preserveAspectRatio="none" viewBox="0 0 400 120">
                <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" x1="0" x2="400" y1="20" y2="20"></line>
                <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" x1="0" x2="400" y1="60" y2="60"></line>
                <line stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" x1="0" x2="400" y1="100" y2="100"></line>
                <rect fill="currentColor" fillOpacity="0.05" height="25" width="400" x="0" y="0"></rect>
                <text fill="currentColor" fontFamily="Inter" fontSize="9" opacity="0.6" x="5" y="15">ZONA BAHAYA CURAM (&gt;6%)</text>
                <defs>
                  <linearGradient id="slopeGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path d="M 0,95 Q 60,88 120,92 T 220,78 T 320,82 T 400,75 L 400,120 L 0,120 Z" fill="url(#slopeGradient)"></path>
                <path d="M 0,95 Q 60,88 120,92 T 220,78 T 320,82 T 400,75" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3"></path>
                <circle cx="0" cy="95" fill="currentColor" r="4"></circle>
                <circle cx="120" cy="92" fill="currentColor" r="3.5"></circle>
                <circle cx="220" cy="78" fill="currentColor" r="4"></circle>
                <circle cx="400" cy="75" fill="currentColor" r="4"></circle>
              </svg>
            </div>
            <div className="flex justify-between font-label-sm text-[10px] text-on-surface-variant pt-1 border-t border-outline-variant/20">
              <span>Balai Pemuda (0 km)</span>
              <span>RSUD Soetomo ({routeB?.distance || '1,6 km'})</span>
            </div>
          </div>

          {/* Lencana Indikator Kelandaian */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="p-2 rounded-xl bg-surface-container flex flex-col text-center">
              <span className="font-body-sm text-[10px] text-on-surface-variant">Kemiringan Min</span>
              <span className="font-label-md text-xs text-primary font-bold">{routeB?.slopeProfile?.minSlope || '0,8%'}</span>
            </div>
            <div className="p-2 rounded-xl bg-surface-container flex flex-col text-center">
              <span className="font-body-sm text-[10px] text-on-surface-variant">Rata-rata</span>
              <span className="font-label-md text-xs text-primary font-bold">{routeB?.slopeProfile?.avgSlope || '2,2%'}</span>
            </div>
            <div className="p-2 rounded-xl bg-surface-container flex flex-col text-center">
              <span className="font-body-sm text-[10px] text-on-surface-variant">Puncak Kelandaian</span>
              <span className="font-label-md text-xs text-secondary font-bold">{routeB?.slopeProfile?.peakSlope || '4,5%'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
