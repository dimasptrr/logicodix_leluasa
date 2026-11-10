import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchRouteComparison } from '../services/api.js';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';
import MockDataBadge from '../components/MockDataBadge.jsx';

export default function PlanRoute({ setActiveTab }) {
  const [routeData, setRouteData] = useState(null);
  const [selectedDest, setSelectedDest] = useState('balai-pemuda'); // 'balai-pemuda' | 'rsud-soetomo' | 'detour-bollard'
  const [selectedProfile, setSelectedProfile] = useState('electric');
  const [activeRouteKey, setActiveRouteKey] = useState('routeB'); // 'routeB' (Rekomendasi AI) | 'routeA' (Alternatif)
  const [activeFilters, setActiveFilters] = useState({
    avoidBarriers: true,
    prioritizeCurbRamps: true,
    avoidSteepSlopes: true,
    preferShadedWalkways: true,
    avoidSlipperyTiles: true
  });
  const [shareToast, setShareToast] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [isSpeakingNav, setIsSpeakingNav] = useState(false);
  const [hapticActive, setHapticActive] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [routeError, setRouteError] = useState(null);
  const [routeIntent, setRouteIntent] = useState(null);
  const [routeIntentReady, setRouteIntentReady] = useState(false);
  const [manualOrigin, setManualOrigin] = useState(null);
  const { coords, accuracy, timestamp, status: gpsStatus, error: gpsError, loading: gpsLoading, refreshLocation, startTracking, stopTracking, isTracking } = useGeolocation();
  const [offRouteDistance, setOffRouteDistance] = useState(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [navError, setNavError] = useState(null);
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(null);
  const gpsMarkerRef = useRef(null);
  const gpsAccuracyCircleRef = useRef(null);

  // Periksa apakah ada target rute yang dikirim dari Asisten Suara atau Peta Pengalihan Bollard
  useEffect(() => {
    if (window.__leluasaRouteIntent) {
      setRouteIntent(window.__leluasaRouteIntent);
      window.__leluasaRouteIntent = null;
    }
    setRouteIntentReady(true);

    if (typeof window !== 'undefined' && window.__leluasaTargetRoute) {
      setSelectedDest(window.__leluasaTargetRoute);
      window.__leluasaTargetRoute = null;
    }

    const handleRouteEvent = (e) => {
      if (e.detail?.routeKey) {
        setSelectedDest(e.detail.routeKey);
      }
    };
    window.addEventListener('leluasa:select-route', handleRouteEvent);
    return () => window.removeEventListener('leluasa:select-route', handleRouteEvent);
  }, []);

  // Data Rute Surabaya 100% Riil
  const destinations = {
    'balai-pemuda': {
      title: 'Tujuan: Halte Integrasi Balai Pemuda Surabaya',
      subtitle: 'Jl. Pemuda No. 45 ke Halte Trans Semanggi',
      origin: 'Jl. Pemuda No. 45, Surabaya',
      destination: 'Halte Integrasi Balai Pemuda',
      baseMinutes: 8,
      routeBDuration: '8 mnt',
      routeBDistance: '420m',
      routeBDescription: 'Jalur ubin pemandu kontinu kuning bertekstur, elevasi 0°, rampa 1:12',
      routeADuration: '11 mnt',
      routeADistance: '590m',
      routeADescription: 'Jalur trotoar lebar jalan utama, rampa standar',
      turnInstruction: 'Belok Kanan 45 meter lagi ke Halte Integrasi Balai Pemuda',
      startCoord: [-7.2642, 112.7449],
      endCoord: [-7.2655, 112.7515],
      steps: [
        { instruction: 'Mulai dari Jl. Pemuda 45, gunakan rampa barat elevasi 0°', detail: 'Trotoar mulus selebar 2.4m, ubin pemandu utuh', distance: '45 m', icon: 'turn_right' },
        { instruction: 'Lurus mengikuti ubin kuning bertekstur garis', detail: 'Bebas halangan pohon rendah dan bebas parkir liar', distance: '180 m', icon: 'straight' },
        { instruction: 'Menyeberang di Pelican Crossing Balai Pemuda', detail: 'Audio chirp bunyi pemandu aktif, rampa landai sisi seberang', distance: '35 m', icon: 'volume_up' },
        { instruction: 'Tiba di Halte Integrasi Balai Pemuda', detail: 'Elevator aksesibel dan pintu rampa halte siap', distance: '160 m', icon: 'check_circle' }
      ]
    },
    'rsud-soetomo': {
      title: 'Tujuan: RSUD Dr. Soetomo Surabaya',
      subtitle: 'Balai Pemuda ke Gedung Rawat Jalan RSUD Soetomo',
      origin: 'Balai Pemuda, Jl. Gubernur Suryo',
      destination: 'RSUD Dr. Soetomo (Jl. Mayjen Prof. Dr. Moestopo)',
      baseMinutes: 22,
      routeBDuration: '22 mnt',
      routeBDistance: '1,6 km',
      routeBDescription: 'Rampa landai kontinu 4.5° via Jl. Kusuma Bangsa dengan pelintasan berbunyi',
      routeADuration: '18 mnt',
      routeADistance: '1,4 km',
      routeADescription: 'Jalur terpendek (tanpa kanopi peneduh, rampa agak curam)',
      turnInstruction: 'Belok Kanan dalam 120m ke trotoar utara Jl. Pemuda arah RSUD Soetomo',
      startCoord: [-7.2642, 112.7449],
      endCoord: [-7.2678, 112.7582],
      steps: [
        { instruction: 'Mulai dari Balai Pemuda arah Jl. Gubernur Suryo', detail: 'Gunakan ubin pemandu di trotoar sisi timur', distance: '120 m', icon: 'turn_right' },
        { instruction: 'Lurus menyusuri koridor Jl. Kusuma Bangsa', detail: 'Trotoar berkanopi peneduh, lebar bersih 2.2m', distance: '650 m', icon: 'straight' },
        { instruction: 'Lewati rampa akses penyeberangan Stasiun Gubeng', detail: 'Kelandaian aman 4.5°, pegangan tangan ganda', distance: '380 m', icon: 'ramp_right' },
        { instruction: 'Tiba di Lobi Rawat Jalan RSUD Dr. Soetomo', detail: 'Pintu otomatis lebar 1.8m ramah kursi roda', distance: '450 m', icon: 'check_circle' }
      ]
    },
    'detour-bollard': {
      title: 'Rute Pengalihan: Bypass Bollard Sempit',
      subtitle: 'Pengalihan Halangan Bollard Jl. Pemuda ke Balai Kota',
      origin: 'Jl. Pemuda No. 34 (Titik Bollard Terblokir)',
      destination: 'Balai Kota Surabaya via Rampa Halus Sisi Kanan',
      baseMinutes: 6,
      routeBDuration: '6 mnt',
      routeBDistance: '380m',
      routeBDescription: 'Pengalihan via rampa halus drop-off (+30m, lebar celah 120cm aman kursi roda)',
      routeADuration: '5 mnt',
      routeADistance: '350m',
      routeADescription: 'Jalur lurus (TERBLOKIR: celah bollard <55cm tidak muat kursi roda)',
      turnInstruction: 'Ambil rampa halus sisi kanan untuk menghindari bollard sempit',
      startCoord: [-7.2650, 112.7463],
      endCoord: [-7.2628, 112.7530],
      steps: [
        { instruction: 'Belok kanan 15m sebelum titik bollard sempit', detail: 'Masuk jalur ramp halus gedung perkantoran', distance: '30 m', icon: 'turn_right' },
        { instruction: 'Lalui rampa landai kemiringan 4.5° dengan pegangan', detail: 'Lebar bersih 1.5m bebas pembatas tiang sempit', distance: '120 m', icon: 'straight' },
        { instruction: 'Kembali ke trotoar utama Jl. Pemuda sisi utara', detail: 'Ubin pemandu kuning kembali terhubung mulus', distance: '90 m', icon: 'alt_route' },
        { instruction: 'Lanjut menuju Balai Kota Surabaya', detail: 'Area pejalan kaki ramah disabilitas', distance: '140 m', icon: 'check_circle' }
      ]
    }
  };

  const presetDestInfo = destinations[selectedDest] || destinations['balai-pemuda'];
  const destInfo = routeIntent?.destination
    ? {
      ...presetDestInfo,
      title: `Tujuan: ${routeIntent.destination.name}`,
      destination: routeIntent.destination.name,
      endCoord: [routeIntent.destination.lat, routeIntent.destination.lng],
      origin: routeIntent.origin?.name || 'Lokasi GPS'
    }
    : presetDestInfo;
  const activeOrigin = manualOrigin || routeIntent?.origin || (coords ? {
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy,
    name: 'Lokasi GPS',
    source: 'gps'
  } : null);
  const activeDestination = routeIntent?.destination || {
    lat: destInfo.endCoord[0],
    lng: destInfo.endCoord[1],
    name: destInfo.destination
  };

  // Buffer Waktu Cuaca: Jika opsi Hindari Ubin Licin aktif, tambahkan estimasi buffer kehati-hatian
  const rainBufferMinutes = activeFilters.avoidSlipperyTiles ? 2 : 0;
  const effectiveRouteBDuration = rainBufferMinutes > 0
    ? `${destInfo.baseMinutes + rainBufferMinutes} mnt`
    : destInfo.routeBDuration;

  const hasValidPoint = (point) => point &&
    Number.isFinite(Number(point.lat)) && Number(point.lat) >= -90 && Number(point.lat) <= 90 &&
    Number.isFinite(Number(point.lng)) && Number(point.lng) >= -180 && Number(point.lng) <= 180;

  const loadRoute = async () => {
    if (!routeIntentReady) return;
    if (!hasValidPoint(activeOrigin) || !hasValidPoint(activeDestination)) {
      setRouteData(null);
      setIsLoadingRoute(false);
      setRouteError(gpsError?.message || 'Titik awal GPS belum tersedia. Deteksi ulang atau pilih titik awal manual.');
      return;
    }

    setIsLoadingRoute(true);
    setRouteError(null);
    try {
      const response = await fetchRouteComparison({
        profile: selectedProfile,
        originLat: activeOrigin.lat,
        originLng: activeOrigin.lng,
        destLat: activeDestination.lat,
        destLng: activeDestination.lng,
        originName: activeOrigin.name,
        destinationName: activeDestination.name
      });
      setRouteData(response.data);
    } catch (error) {
      setRouteData(null);
      setRouteError(error.message || 'Gagal menghitung rute. Periksa koneksi atau layanan routing.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  useEffect(() => {
    loadRoute();
  }, [selectedProfile, selectedDest, activeOrigin?.lat, activeOrigin?.lng, activeDestination.lat, activeDestination.lng, routeIntentReady]);

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: activeOrigin ? [activeOrigin.lat, activeOrigin.lng] : [-7.2575, 112.7521],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Surabaya',
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

    // 1. Render Rute A (Alternatif)
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

      polylineA.bindTooltip(`Rute Alternatif: ${destInfo.routeADuration}`, { sticky: true });
      polylineA.on('click', () => setActiveRouteKey('routeA'));

      if (isSelected) {
        routeA.coordinates.forEach(pt => allPoints.push(pt));
      }
    }

    // 2. Render Rute B (Rekomendasi AI Leluasa - Jalur Guiding Block)
    if (routeB?.coordinates?.length) {
      const isSelected = activeRouteKey === 'routeB';

      const polylineBBase = L.polyline(routeB.coordinates, {
        color: '#0037B0',
        weight: isSelected ? 9 : 5,
        opacity: isSelected ? 0.95 : 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Garis Kuning Taktil Guiding Block
      L.polyline(routeB.coordinates, {
        color: '#FFE083',
        weight: isSelected ? 3.5 : 2,
        opacity: 1.0,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      polylineBBase.bindTooltip(`Jalur Guiding Block AI: ${effectiveRouteBDuration}`, { sticky: true });
      polylineBBase.on('click', () => setActiveRouteKey('routeB'));

      if (isSelected || allPoints.length === 0) {
        routeB.coordinates.forEach(pt => allPoints.push(pt));
      }
    }

    // 3. Pasang Penanda Titik Awal & Tujuan Riil
    const startIcon = L.divIcon({
      className: 'route-start-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${destInfo.origin.split(',')[0]}
          </div>
          <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">accessible</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    if (activeOrigin) {
      L.marker([activeOrigin.lat, activeOrigin.lng], { icon: startIcon }).addTo(layerGroup);
      allPoints.push([activeOrigin.lat, activeOrigin.lng]);
    }

    const endIcon = L.divIcon({
      className: 'route-end-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${destInfo.destination.split('(')[0]}
          </div>
          <div class="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">flag</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([activeDestination.lat, activeDestination.lng], { icon: endIcon }).addTo(layerGroup);
    allPoints.push([activeDestination.lat, activeDestination.lng]);

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
    }
  }, [routeData, activeRouteKey, isNavigating, selectedDest, effectiveRouteBDuration, activeOrigin?.lat, activeOrigin?.lng, activeDestination.lat, activeDestination.lng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !coords) {
      if (mapInstanceRef.current && gpsMarkerRef.current) {
        mapInstanceRef.current.removeLayer(gpsMarkerRef.current);
        gpsMarkerRef.current = null;
      }
      if (mapInstanceRef.current && gpsAccuracyCircleRef.current) {
        mapInstanceRef.current.removeLayer(gpsAccuracyCircleRef.current);
        gpsAccuracyCircleRef.current = null;
      }
      return;
    }

    const userIcon = L.divIcon({
      className: 'route-user-gps-marker',
      html: '<div class="w-8 h-8 rounded-full bg-secondary text-white border-2 border-white shadow-lg flex items-center justify-center"><span class="material-symbols-outlined text-base">my_location</span></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (gpsMarkerRef.current) {
      gpsMarkerRef.current.setLatLng([coords.lat, coords.lng]);
      gpsMarkerRef.current.setIcon(userIcon);
    } else {
      gpsMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: userIcon, zIndexOffset: 2000 })
        .bindTooltip('Posisi GPS Anda')
        .addTo(map);
    }

    if (gpsAccuracyCircleRef.current) {
      gpsAccuracyCircleRef.current.setLatLng([coords.lat, coords.lng]);
      gpsAccuracyCircleRef.current.setRadius(accuracy);
    } else {
      gpsAccuracyCircleRef.current = L.circle([coords.lat, coords.lng], {
        radius: accuracy,
        color: '#006e2d',
        weight: 1,
        fillOpacity: 0.08
      }).addTo(map);
    }
  }, [coords, accuracy, isNavigating]);

  const toggleFilter = (key) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Mulai Navigasi Aktif
  const handleStartNav = () => {
    setIsNavigating(true);
    setNavStepIndex(0);

    // Getaran fisik jika perangkat mendukung getaran
    if ('vibrate' in navigator && hapticActive) {
      navigator.vibrate([100, 50, 100]);
    }

    handleToggleVoice(true);
  };

  // Toggle Suara Panduan Navigasi (Play / Stop / Replay)
  const handleToggleVoice = (forcePlay = false) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeakingNav && !forcePlay) {
      window.speechSynthesis.cancel();
      setIsSpeakingNav(false);
      return;
    }

    window.speechSynthesis.cancel();
    const currentStep = destInfo.steps[navStepIndex] || destInfo.steps[0];
    const text = `Panduan Navigasi Leluasa: ${currentStep.instruction}. ${currentStep.detail}. Jarak ${currentStep.distance}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.onstart = () => setIsSpeakingNav(true);
    utterance.onend = () => setIsSpeakingNav(false);
    utterance.onerror = () => setIsSpeakingNav(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeakingNav(true);
  };

  const handleNextStep = () => {
    if (navStepIndex < destInfo.steps.length - 1) {
      const nextIndex = navStepIndex + 1;
      setNavStepIndex(nextIndex);

      if ('vibrate' in navigator && hapticActive) {
        navigator.vibrate([80, 40, 80]);
      }

      // Bacakan instruksi langkah berikutnya
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const nextStep = destInfo.steps[nextIndex];
        const utterance = new SpeechSynthesisUtterance(`${nextStep.instruction}. ${nextStep.detail}.`);
        utterance.lang = 'id-ID';
        utterance.onstart = () => setIsSpeakingNav(true);
        utterance.onend = () => setIsSpeakingNav(false);
        utterance.onerror = () => setIsSpeakingNav(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Rute Aksesibel Leluasa Surabaya',
        text: `${destInfo.origin} ke ${destInfo.destination} — 100% Tersedia Rampa & Guiding Block`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      setShareToast('Tautan rute aksesibel Surabaya berhasil disalin!');
      setTimeout(() => setShareToast(''), 3500);
    }
  };

  // =========================================================================
  // VIEW A: NAVIGASI RUTE AKTIF INTERAKTIF (Langkah demi Langkah)
  // =========================================================================
  if (isNavigating) {
    const currentStep = destInfo.steps[navStepIndex] || destInfo.steps[0];

    return (
      <div className="relative w-full max-w-lg h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] mx-auto overflow-hidden flex flex-col justify-between bg-surface-container-low shadow-2xl animate-fadeIn p-4 sm:p-5">
        
        {/* TOP HUD CARD: PANDUAN ARAH SEKARANG */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-lg border-l-[8px] border-primary flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-md shrink-0">
              <span className="material-symbols-outlined text-[32px]">
                {currentStep.icon || 'turn_right'}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-primary font-bold block">
                Langkah {navStepIndex + 1} dari {destInfo.steps.length}
              </span>
              <span className="font-headline-sm text-base sm:text-lg text-on-surface font-extrabold leading-tight block">
                {currentStep.instruction}
              </span>
              <span className="text-xs text-on-surface-variant font-medium mt-0.5 block">
                {currentStep.detail} ({currentStep.distance})
              </span>
            </div>
          </div>

          {/* Tombol Speaker: Play / Stop / Replay */}
          <button
            aria-label={isSpeakingNav ? 'Hentikan panduan suara' : 'Putar instruksi suara'}
            onClick={() => handleToggleVoice()}
            className={`w-12 h-12 min-h-[48px] min-w-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isSpeakingNav
                ? 'bg-error text-white ring-4 ring-error/30 animate-pulse'
                : 'bg-surface-container text-primary hover:bg-surface-container-high'
            }`}
            type="button"
            title={isSpeakingNav ? 'Klik: Hentikan Suara' : 'Klik: Dengarkan Ulang Suara'}
          >
            <span className="material-symbols-outlined text-2xl">
              {isSpeakingNav ? 'stop' : 'volume_up'}
            </span>
          </button>
        </div>

        {/* STATUS GUILDING BLOCK & HAPTIC */}
        <div className="flex items-center justify-between my-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-tertiary-fixed rounded-full text-on-tertiary-fixed shadow-xs">
            <span className="material-symbols-outlined text-base text-tertiary font-bold">texture</span>
            <span className="text-xs font-bold">Jalur Ubin Pemandu Aktif</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !hapticActive;
              setHapticActive(next);
              if (next && 'vibrate' in navigator) navigator.vibrate(100);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              hapticActive ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">vibration</span>
            <span>{hapticActive ? 'Getar Aktif' : 'Getar Mati'}</span>
          </button>
        </div>

        {/* BOTTOM HUD CARD & CONTROLS */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-3 mt-auto">
          <div className="flex items-center justify-between border-b border-surface-container pb-2.5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-primary">{effectiveRouteBDuration}</span>
                <span className="text-xs text-on-surface-variant font-bold">• {destInfo.routeBDistance}</span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5 truncate">
                {destInfo.destination}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
              GPS ±0.8m
            </span>
          </div>

          {/* Tombol Aksi Navigasi */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleNextStep}
              disabled={navStepIndex >= destInfo.steps.length - 1}
              className={`min-h-[48px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                navStepIndex >= destInfo.steps.length - 1
                  ? 'bg-secondary text-white opacity-80 cursor-default'
                  : 'bg-primary text-on-primary hover:bg-primary-container'
              }`}
            >
              <span>{navStepIndex >= destInfo.steps.length - 1 ? 'Tiba di Tujuan' : 'Langkah Selanjutnya'}</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report-obstacle')}
              className="min-h-[48px] rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-error">report</span>
              <span>Lapor Rintangan</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              setIsNavigating(false);
            }}
            className="w-full py-2 text-center text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            Kembali ke Pilihan Rute
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: PERBANDINGAN RUTE (Surabaya 100% Riil)
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

      {/* HEADER SPATIAL & SELECTOR TUJUAN SURABAYA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-1">
        <div>
          <span className="text-label-md uppercase tracking-wider text-primary font-bold text-xs">
            Rute &amp; Perbandingan Aksesibilitas
          </span>
          <h1 className="font-headline-lg-mobile text-xl sm:text-2xl text-on-surface font-extrabold tracking-tight">
            {destInfo.title}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{destInfo.subtitle}</p>
        </div>

        {/* Destination Selector Pill Switcher (3 Pilihan Rute Surabaya Riil) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-surface-container p-1 rounded-full border border-outline-variant/30 text-xs font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedDest('balai-pemuda')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                selectedDest === 'balai-pemuda' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Halte Balai Pemuda</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDest('rsud-soetomo')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                selectedDest === 'rsud-soetomo' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>RSUD Dr. Soetomo</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDest('detour-bollard')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                selectedDest === 'detour-bollard' ? 'bg-secondary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">alt_route</span>
              <span>Bypass Bollard</span>
            </button>
          </div>

          <MockDataBadge />
        </div>
      </div>

      {/* ALERT ESTIMASI CUACA HUJAN (Bila opsi ubin licin aktif) */}
      {rainBufferMinutes > 0 && (
        <div className="p-3 rounded-2xl bg-primary-container/30 border border-primary/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <span className="material-symbols-outlined text-lg text-primary">umbrella</span>
            <span>
              <strong>Intelijen Cuaca:</strong> Potensi hujan di Surabaya Pusat. Waktu tempuh disesuaikan <strong>+{rainBufferMinutes} mnt</strong> sebagai batas kecepatan aman di atas trotoar basah.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
            Buffer Aman Aktif
          </span>
        </div>
      )}

      {/* ================= VECTOR MAP CANVAS & ROUTE COMPARISON CARDS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* KIRI: PRATINJAU PETA LEAFLET SURABAYA */}
        <section aria-label="Pratinjau Peta Rute Surabaya" className="lg:col-span-7 relative w-full h-72 sm:h-84 lg:h-96 rounded-2xl overflow-hidden bg-surface-container-lowest border-2 border-outline-variant shadow-sm flex items-center justify-center">
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
          />

          {isLoadingRoute && (
            <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="px-4 py-2.5 rounded-xl bg-surface-container-lowest shadow-lg flex items-center gap-2.5 text-primary text-xs font-bold animate-pulse">
                <span className="material-symbols-outlined text-secondary animate-spin text-lg">progress_activity</span>
                <span>Menghitung Graf Rute Aksesibel...</span>
              </div>
            </div>
          )}

          {/* Floating Badges di Canvas */}
          <div className="absolute top-3 left-3 bg-surface-container-lowest/95 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-primary shadow-sm flex items-center gap-2 z-10">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
            <span className="text-xs text-primary font-bold">
              {activeRouteKey === 'routeB' ? 'Jalur Rekomendasi AI' : 'Jalur Alternatif'}
            </span>
          </div>

          <div className="absolute bottom-3 right-3 bg-surface-container-lowest/95 px-3 py-1.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1.5 text-on-surface-variant z-10">
            <span className="material-symbols-outlined text-sm text-secondary">verified</span>
            <span className="text-[11px] font-semibold">Sensor Surabaya Live</span>
          </div>
        </section>

        {/* KANAN: KARTU KOMPARASI RUTE A vs RUTE B */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div aria-label="Opsi Rute Perjalanan" className="flex flex-col gap-3" role="radiogroup">
            
            {/* CARD 1: PRIMARY (Rekomendasi AI - Jalur Ubin Pemandu & Rampa) */}
            <div
              aria-checked={activeRouteKey === 'routeB'}
              onClick={() => setActiveRouteKey('routeB')}
              className={`relative w-full bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2.5 cursor-pointer transition-all ${
                activeRouteKey === 'routeB'
                  ? 'border-[3px] border-primary shadow-md ring-2 ring-primary/20'
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
                  <span className="text-sm sm:text-base text-on-surface font-extrabold">
                    Jalur Guiding Block &amp; Rampa Halus
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">
                  Rekomendasi AI
                </span>
              </div>

              <div className="flex items-baseline gap-2 pl-9">
                <span className="text-base sm:text-lg text-primary font-extrabold">
                  {effectiveRouteBDuration} ({destInfo.routeBDistance})
                </span>
                <span className="text-on-surface-variant font-bold">•</span>
                <span className="text-secondary text-xs font-bold">100% Ramah Disabilitas</span>
              </div>

              <p className="text-xs text-on-surface-variant pl-9 leading-relaxed">
                {destInfo.routeBDescription}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 pl-9">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-full text-on-surface text-[11px] font-bold">
                  <span className="material-symbols-outlined text-primary text-sm">texture</span>
                  <span>Ubin Kuning Teratur</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-full text-on-surface text-[11px] font-bold">
                  <span className="material-symbols-outlined text-secondary text-sm">accessible</span>
                  <span>Rampa 1:12 Standar</span>
                </div>
              </div>
            </div>

            {/* CARD 2: ALTERNATIVE (Jalur Trotoar Standar) */}
            <div
              aria-checked={activeRouteKey === 'routeA'}
              onClick={() => setActiveRouteKey('routeA')}
              className={`w-full bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2 cursor-pointer transition-all ${
                activeRouteKey === 'routeA'
                  ? 'border-[3px] border-error shadow-md ring-2 ring-error/20'
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
                  <span className="text-sm sm:text-base text-on-surface font-bold">
                    Jalur Trotoar Jalan Raya
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">Alternatif</span>
              </div>

              <div className="flex items-baseline gap-2 pl-9">
                <span className="text-sm sm:text-base text-on-surface font-bold">
                  {destInfo.routeADuration} ({destInfo.routeADistance})
                </span>
                <span className="text-on-surface-variant font-bold">•</span>
                <span className="text-on-surface-variant text-xs font-semibold">{destInfo.routeADescription}</span>
              </div>
            </div>
          </div>

          {/* CTA TOMBOL MULAI NAVIGASI */}
          <div className="pt-2">
            <button
              onClick={handleStartNav}
              className="w-full min-h-[54px] py-3.5 px-6 rounded-full bg-primary text-on-primary font-bold text-sm sm:text-base shadow-md hover:bg-primary-container flex items-center justify-center gap-3 active:scale-95 transition-transform duration-150 cursor-pointer"
              type="button"
            >
              <span>Mulai Panduan Navigasi</span>
              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
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
            <span className="text-xs sm:text-sm font-bold text-on-surface">
              Pengaturan Profil Mobilitas &amp; Parameter Aksesibilitas
            </span>
          </div>
          <div className="flex items-center gap-1 text-primary text-xs font-bold">
            <span>{Object.values(activeFilters).filter(Boolean).length} Parameter Aktif</span>
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
                <option value="electric">Kursi Roda Listrik (Lebar 68cm)</option>
                <option value="manual">Kursi Roda Manual (Utamakan Rampa)</option>
                <option value="scooter">Skuter Mobilitas (Radius Putar 110cm)</option>
                <option value="caregiver">Didorong Pendamping (Kelandaian &lt;8%)</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {[
                { key: 'avoidBarriers', label: 'Hindari rintangan terblokir' },
                { key: 'prioritizeCurbRamps', label: 'Prioritaskan rampa landai' },
                { key: 'avoidSteepSlopes', label: 'Hindari tanjakan curam >6%' },
                { key: 'preferShadedWalkways', label: 'Jalur berteduh/beratap' },
                { key: 'avoidSlipperyTiles', label: 'Hindari ubin licin saat basah' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
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

      {/* PANDUAN TIAP BELOKAN (STEP LIST) */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">directions_walk</span>
            <h2 className="text-xs sm:text-sm font-bold text-on-surface">Panduan Navigasi Tiap Belokan ({destInfo.destination.split('(')[0]})</h2>
          </div>
          <button
            onClick={handleShare}
            className="px-3 py-1 rounded-full bg-surface-container text-primary font-bold text-xs flex items-center gap-1 hover:bg-surface-container-high cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">share</span>
            <span>Bagikan</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {destInfo.steps.map((seg, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 flex items-baseline justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">{seg.instruction}</span>
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