import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';
import MockDataBadge from '../components/MockDataBadge.jsx';
import { geocodeSearch, reverseGeocode } from '../features/dashboard/services/safeApi.js';

// Data Lokasi Surabaya Populer untuk Pencarian & Multi-Stop
const SURABAYA_DESTINATIONS = [
  {
    id: 'rsud-soetomo',
    name: 'RSUD Dr. Soetomo',
    category: 'Fasilitas Kesehatan',
    address: 'Jl. Mayjen Prof. Dr. Moestopo No. 6-8',
    lat: -7.2678,
    lng: 112.7582,
    accessibility: '100% Rampa & Lift',
    time: '10 Menit',
    distance: '650 m'
  },
  {
    id: 'sentra-kuliner',
    name: 'Sentra Kuliner Pemuda',
    category: 'Sentra Kuliner & UMKM',
    address: 'Jl. Pemuda Sisi Selatan',
    lat: -7.2662,
    lng: 112.7485,
    accessibility: 'Trotoar Lebar Bebas Parkir Liar',
    time: '6 Menit',
    distance: '380 m'
  },
  {
    id: 'halte-pemuda',
    name: 'Halte Integrasi Balai Pemuda',
    category: 'Halte Trans Semanggi',
    address: 'Jl. Pemuda No. 45, Embong Kaliasin',
    lat: -7.2655,
    lng: 112.7515,
    accessibility: 'Elevator & Ubin Pemandu Kuning',
    time: '8 Menit',
    distance: '420 m'
  },
  {
    id: 'balai-kota',
    name: 'Balai Kota Surabaya',
    category: 'Pusat Pemerintahan',
    address: 'Jl. Taman Surya No. 1',
    lat: -7.2628,
    lng: 112.7530,
    accessibility: 'Arkade Teduh & Rampa 1:12',
    time: '14 Menit',
    distance: '850 m'
  },
  {
    id: 'tunjungan-plaza',
    name: 'Tunjungan Plaza Mall',
    category: 'Pusat Perbelanjaan',
    address: 'Jl. Jenderal Basuki Rahmat',
    lat: -7.2618,
    lng: 112.7392,
    accessibility: 'Jembatan Penyeberangan Berlift',
    time: '18 Menit',
    distance: '1,1 km'
  }
];

export default function Dashboard({ setActiveTab, onOpenVoice }) {
  // State Navigasi Tujuan & Multi-Stop
  const [hasSelectedDestination, setHasSelectedDestination] = useState(false);
  const [customOrigin, setCustomOrigin] = useState(null); // null = default GPS, atau objek lokasi kustom
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [stop1, setStop1] = useState(null); // Lokasi tujuan 1
  const [stop2, setStop2] = useState(null); // Lokasi tujuan 2 (Multi-stop)
  const [isAddingStop2, setIsAddingStop2] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState('stop1'); // 'origin' | 'stop1' | 'stop2'
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const {
    coords,
    accuracy,
    timestamp,
    status: gpsStatus,
    error: gpsError,
    loading: gpsLoading,
    refreshLocation
  } = useGeolocation();
  const userCoords = coords ? { lat: coords.lat, lng: coords.lng } : null;
  const userLocationName = coords
    ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
    : gpsError?.message || 'Lokasi pengguna belum tersedia';
  const gpsStatusLabel = {
    idle: 'Belum mencari lokasi',
    loading: 'Sedang mencari lokasi...',
    located: 'Lokasi GPS ditemukan',
    denied: 'Izin lokasi ditolak',
    unavailable: 'Lokasi tidak tersedia',
    timeout: 'Pencarian lokasi timeout',
    unsupported: 'Browser tidak mendukung GPS',
    'insecure-context': 'GPS memerlukan HTTPS atau localhost'
  }[gpsStatus];

  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const searchTargetRef = useRef(searchTarget);

  useEffect(() => {
    searchTargetRef.current = searchTarget;
  }, [searchTarget]);

  // Live Geocoding Search: Cari tempat bebas di manapun di Indonesia saat user mengetik
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setLiveSearchResults([]);
      setIsSearchingGeocode(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGeocode(true);
      try {
        const res = await geocodeSearch(trimmed, userCoords?.lat, userCoords?.lng);
        setLiveSearchResults(res.data || []);
      } catch (err) {
        console.warn('Live geocode search failed:', err);
        setLiveSearchResults([]);
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, userCoords?.lat, userCoords?.lng]);

  // State Kontrol Rute HUD
  const [selectedRouteKey, setSelectedRouteKey] = useState('ubin'); // 'ubin' | 'ramp'
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [audioFeedback, setAudioFeedback] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapRotation, setMapRotation] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Refs Peta Leaflet Utama
  const leafletMapRef = useRef(null);
  const leafletInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const centerMapOnNextFixRef = useRef(false);

  // Inisialisasi Peta Leaflet Utama saat belum memilih tujuan
  useEffect(() => {
    if (hasSelectedDestination) {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
      return;
    }

    if (!leafletMapRef.current || leafletInstanceRef.current) return;

    const map = L.map(leafletMapRef.current, {
      center: userCoords ? [userCoords.lat, userCoords.lng] : [-7.2575, 112.7521],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    // Tangkap klik langsung di peta untuk memilih tujuan atau titik awal
    map.on('click', async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setAudioFeedback('Menentukan lokasi dari titik peta...');
      try {
        const res = await reverseGeocode(lat, lng);
        const name = res.data?.name || `Titik Peta (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        const address = res.data?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const loc = {
          id: `map-${Date.now()}`,
          name,
          address,
          lat,
          lng,
          accessibility: 'Titik Dipilih Langsung di Peta',
          time: 'Menyesuaikan',
          distance: 'Menyesuaikan'
        };
        handleSelectLocation(loc);
        setAudioFeedback(`Lokasi dipilih: ${name}`);
        setTimeout(() => setAudioFeedback(''), 2500);
      } catch (err) {
        const loc = {
          id: `map-${Date.now()}`,
          name: `Titik Peta (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          accessibility: 'Titik Dipilih Langsung di Peta',
          time: 'Menyesuaikan',
          distance: 'Menyesuaikan'
        };
        handleSelectLocation(loc);
      }
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    leafletInstanceRef.current = map;
    centerMapOnNextFixRef.current = true;

    return () => {
      map.remove();
      leafletInstanceRef.current = null;
      markersLayerRef.current = null;
      originMarkerRef.current = null;
    };
  }, [hasSelectedDestination]);

  // Pasang Pin Lokasi di Peta Leaflet
  useEffect(() => {
    if (!leafletInstanceRef.current || !markersLayerRef.current || hasSelectedDestination) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    // Pin destinasi Surabaya
    SURABAYA_DESTINATIONS.forEach((dest) => {
      const isSelected = stop1?.id === dest.id || stop2?.id === dest.id;
      const destMarkerHtml = `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full ${isSelected ? 'bg-secondary' : 'bg-primary'} text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${dest.name}
          </div>
          <div class="w-8 h-8 rounded-full ${isSelected ? 'bg-secondary' : 'bg-surface-container-lowest border-2 border-primary'} text-primary flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-base ${isSelected ? 'text-white' : 'text-primary'}">
              ${dest.id.includes('rsud') ? 'local_hospital' : dest.id.includes('kuliner') ? 'restaurant' : 'location_on'}
            </span>
          </div>
        </div>
      `;
      const icon = L.divIcon({ className: `dest-pin-${dest.id}`, html: destMarkerHtml, iconSize: [0, 0] });
      const marker = L.marker([dest.lat, dest.lng], { icon }).addTo(layer);

      marker.on('click', () => {
        handleSelectLocation(dest);
      });
    });

    // Pin untuk Stop 1 jika merupakan lokasi kustom / hasil pencarian / klik peta
    if (stop1 && !SURABAYA_DESTINATIONS.some(d => d.id === stop1.id)) {
      const stop1MarkerHtml = `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${stop1.name}
          </div>
          <div class="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-base">flag</span>
          </div>
        </div>
      `;
      const icon = L.divIcon({ className: 'custom-stop1-pin', html: stop1MarkerHtml, iconSize: [0, 0] });
      L.marker([stop1.lat, stop1.lng], { icon }).addTo(layer);
    }

    // Pin untuk Stop 2 jika kustom
    if (stop2 && !SURABAYA_DESTINATIONS.some(d => d.id === stop2.id)) {
      const stop2MarkerHtml = `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${stop2.name}
          </div>
          <div class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-base">flag</span>
          </div>
        </div>
      `;
      const icon = L.divIcon({ className: 'custom-stop2-pin', html: stop2MarkerHtml, iconSize: [0, 0] });
      L.marker([stop2.lat, stop2.lng], { icon }).addTo(layer);
    }
  }, [hasSelectedDestination, stop1, stop2]);

  useEffect(() => {
    const map = leafletInstanceRef.current;
    if (!map || hasSelectedDestination) return;

    const origin = customOrigin || userCoords;
    if (!origin) {
      if (originMarkerRef.current) {
        map.removeLayer(originMarkerRef.current);
        originMarkerRef.current = null;
      }
      return;
    }

    const originIcon = L.divIcon({
      className: 'dashboard-origin-marker',
      html: '<div class="w-8 h-8 rounded-full bg-primary text-white border-2 border-white shadow-xl flex items-center justify-center"><span class="material-symbols-outlined text-base">navigation</span></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    const label = customOrigin ? `Titik Awal: ${customOrigin.name}` : 'Lokasi Anda (GPS)';

    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([origin.lat, origin.lng]);
      originMarkerRef.current.setIcon(originIcon);
      originMarkerRef.current.unbindTooltip().bindTooltip(label);
    } else {
      originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon: originIcon, zIndexOffset: 1500 })
        .bindTooltip(label)
        .addTo(map);
    }

    if (!customOrigin && centerMapOnNextFixRef.current) {
      map.setView([origin.lat, origin.lng], 16, { animate: true });
      centerMapOnNextFixRef.current = false;
    }
  }, [coords, customOrigin, hasSelectedDestination]);

  const handleSelectLocation = (dest) => {
    const currentTarget = searchTargetRef.current || searchTarget;
    if (currentTarget === 'origin') {
      setCustomOrigin(dest);
      setIsEditingOrigin(false);
      setSearchQuery('');
      setIsSearchFocused(false);
      setSearchTarget('stop1');
    } else if (currentTarget === 'stop2' || (stop1 && isAddingStop2 && !stop2)) {
      setStop2(dest);
      setSearchQuery('');
      setIsSearchFocused(false);
    } else {
      setStop1(dest);
      setSearchQuery('');
      setIsSearchFocused(false);
    }

    if (leafletInstanceRef.current && dest.lat && dest.lng) {
      leafletInstanceRef.current.panTo([dest.lat, dest.lng]);
    }
  };

  const originDisplay = customOrigin
    ? customOrigin.name
    : coords
    ? `Lokasi Saya (${userLocationName})`
    : gpsStatusLabel;

  const originLabel = customOrigin ? customOrigin.name : 'Lokasi Saya';

  // Kalkulasi info rute aktif
  const currentRouteTitle = stop2
    ? `${originLabel} → ${stop1?.name} → ${stop2?.name}`
    : stop1
    ? `${originLabel} → ${stop1?.name}`
    : 'Menuju Halte Balai Pemuda Surabaya';

  const currentRouteSubtitle = stop2
    ? `2 Perhentian: ${stop1?.address.split(',')[0]} → ${stop2?.address.split(',')[0]}`
    : stop1
    ? `${stop1?.address} (${stop1?.accessibility})`
    : 'Jl. Pemuda ke Halte Balai Pemuda';

  const estimatedTime = stop2 ? '16 Menit' : stop1 ? stop1.time : '8 Menit';
  const estimatedDistance = stop2 ? '1,1 km' : stop1 ? stop1.distance : '420 m';

  const handleApplyRoute = () => {
    if (!stop1) return;
    if (!customOrigin && !coords) {
      setAudioFeedback(gpsError?.message || 'Lokasi GPS belum tersedia. Coba deteksi ulang atau pilih titik awal manual.');
      return;
    }
    handleOpenPlanRoute();

    if ('vibrate' in navigator && hapticEnabled) {
      navigator.vibrate([80, 40, 80]);
    }
  };

  // Handler untuk event rute eksternal (dari Asisten Suara AI)
  useEffect(() => {
    const applyDest = (destId) => {
      const found = SURABAYA_DESTINATIONS.find(d => d.id === destId);
      if (found) {
        handleSelectLocation(found);
      }
    };

    if (window.__leluasaDashboardDestination) {
      applyDest(window.__leluasaDashboardDestination);
      window.__leluasaDashboardDestination = null;
    }

    const handler = (e) => {
      if (e.detail?.destId) {
        applyDest(e.detail.destId);
      }
    };
    window.addEventListener('leluasa:dashboard-route', handler);
    return () => window.removeEventListener('leluasa:dashboard-route', handler);
  }, []);

  const handleOpenPlanRoute = () => {
    if (!stop1) return;
    window.__leluasaRouteIntent = {
      origin: customOrigin
        ? { lat: customOrigin.lat, lng: customOrigin.lng, name: customOrigin.name, source: 'manual' }
        : coords
        ? { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy, name: 'Lokasi GPS', source: 'gps' }
        : null,
      destination: { lat: stop1.lat, lng: stop1.lng, name: stop1.name, id: stop1.id }
    };
    setActiveTab('plan-route');
  };

  const handleLocateMe = () => {
    if (userCoords) {
      leafletInstanceRef.current?.setView([userCoords.lat, userCoords.lng], 16, { animate: true });
      return;
    }
    centerMapOnNextFixRef.current = true;
    refreshLocation();
  };

  const handleResetDestination = () => {
    setHasSelectedDestination(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleToggleHaptic = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    if (next && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  };

  // Logika Pemutaran Suara Toggle
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      setAudioFeedback('Browser Anda tidak mendukung output sintesis suara.');
      setTimeout(() => setAudioFeedback(''), 3000);
      return;
    }

    if (isAudioMuted) {
      setIsAudioMuted(false);
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setAudioFeedback('Suara dihentikan. Klik lagi untuk mengulang penjelasan rute.');
      setTimeout(() => setAudioFeedback(''), 3500);
      return;
    }

    window.speechSynthesis.cancel();
    const text = `Panduan Leluasa: ${currentRouteTitle}. Estimasi waktu tiba ${estimatedTime}, jarak ${estimatedDistance}. Ubin pemandu teratur tanpa rintangan galian.`;

    setAudioFeedback(`Memutar penjelasan: ${currentRouteTitle}`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setAudioFeedback('');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setAudioFeedback('');
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const filteredDestinations = SURABAYA_DESTINATIONS.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] h-full flex flex-col justify-between w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 pb-20 lg:pb-3 animate-fadeIn">
      
      {/* Toast Notifikasi Status Suara Realtime */}
      {audioFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3.5 sm:p-4 rounded-2xl bg-primary text-on-primary shadow-2xl max-w-lg w-[90%] flex items-start gap-3 border border-secondary/40 text-xs sm:text-sm font-semibold animate-fadeIn"
        >
          <span className="material-symbols-outlined text-secondary-container text-xl shrink-0 mt-0.5" aria-hidden="true">
            {isSpeaking ? 'volume_up' : 'info'}
          </span>
          <div className="flex-1">
            <span className="text-[11px] uppercase tracking-wider text-secondary-container font-bold block mb-0.5">
              {isSpeaking ? 'Sedang Memutar Panduan Suara' : 'Status Panduan Suara'}
            </span>
            <p>{audioFeedback}</p>
          </div>
          <button
            type="button"
            onClick={() => setAudioFeedback('')}
            className="text-on-primary/70 hover:text-on-primary cursor-pointer"
            aria-label="Tutup notifikasi panduan suara"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      {/* Grid Utama 2 Kolom: Kiri (Pencarian & Kontrol) & Kanan (Peta Interaktif / Rute HUD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-1 items-stretch">
        
        {/* ======================================================== */}
        {/* KOLOM KIRI (lg:col-span-5 xl:col-span-4): Control Hub   */}
        {/* ======================================================== */}
        <aside className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between gap-3.5 w-full">
          
          <div className="flex flex-col gap-3.5">
            {/* Hub Header & Status Bar */}
            <div className="bg-surface-container-lowest p-4 rounded-[1.5rem] border border-outline-variant shadow-[0_4px_12px_rgba(17,24,39,0.06)] flex flex-col gap-2.5 transition-shadow hover:shadow-md duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-secondary ring-4 ring-secondary/20 inline-block animate-breathing-green" aria-hidden="true"></span>
                  <span className="text-label-md font-label-md text-on-surface font-bold tracking-tight text-xs sm:text-sm">
                    {hasSelectedDestination ? 'Navigasi Rute Aktif' : 'Peta Navigasi Surabaya'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MockDataBadge />
                </div>
              </div>
              <h1 className="text-headline-sm font-headline-sm text-primary font-bold text-base sm:text-lg">
                {hasSelectedDestination ? 'Panduan Rute Taktil Surabaya' : 'Cari & Tentukan Rute Tujuan'}
              </h1>
            </div>

            {/* KARTU PENCARIAN RUTE & MULTI-STOP (Mirip Google Maps) */}
            <div className="bg-surface-container-lowest rounded-[1.5rem] border border-outline-variant shadow-sm p-4 flex flex-col gap-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-secondary">alt_route</span>
                <span>Rencana Perjalanan (Maksimal 2 Stop)</span>
              </span>

              {/* Titik Awal (Default GPS, Dapat Dipindah/Kustom) */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
                <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Titik Awal</span>
                    {customOrigin ? (
                      <button
                        type="button"
                        onClick={() => { setCustomOrigin(null); setIsEditingOrigin(false); }}
                        className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                        title="Kembalikan ke Lokasi GPS Anda"
                      >
                        Reset ke GPS
                      </button>
                    ) : null}
                  </div>
                  {isEditingOrigin ? (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ketik lokasi awal atau klik peta..."
                      value={searchTarget === 'origin' ? searchQuery : ''}
                      onFocus={() => { setSearchTarget('origin'); setIsSearchFocused(true); }}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredDestinations.length > 0) handleSelectLocation(filteredDestinations[0]);
                          else if (liveSearchResults.length > 0) handleSelectLocation(liveSearchResults[0]);
                        }
                      }}
                      className="w-full bg-transparent font-medium text-on-surface placeholder:text-outline focus:outline-none mt-0.5"
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="font-bold text-on-surface truncate">{originDisplay}</span>
                      <button
                        type="button"
                        onClick={() => { setIsEditingOrigin(true); setSearchTarget('origin'); setIsSearchFocused(true); }}
                        className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold text-[10px] shrink-0 cursor-pointer"
                        title="Pilih Titik Awal Lain"
                      >
                        Ubah
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                  {customOrigin ? 'Kustom' : 'GPS'}
                </span>
              </div>

              {/* Stop 1 (Tujuan Pertama) */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-lowest border-2 border-primary shadow-xs text-xs relative">
                <div className="w-3 h-3 rounded-full bg-secondary ring-4 ring-secondary/20 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-secondary block">Tujuan 1 (Wajib)</span>
                  {stop1 ? (
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-on-surface truncate">{stop1.name}</span>
                      <button
                        type="button"
                        onClick={() => setStop1(null)}
                        className="text-on-surface-variant hover:text-error text-xs font-bold px-1"
                        title="Hapus Tujuan 1"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ketik lokasi bebas atau klik peta..."
                      value={searchTarget === 'stop1' ? searchQuery : ''}
                      onFocus={() => { setSearchTarget('stop1'); setIsSearchFocused(true); }}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredDestinations.length > 0) handleSelectLocation(filteredDestinations[0]);
                          else if (liveSearchResults.length > 0) handleSelectLocation(liveSearchResults[0]);
                        }
                      }}
                      className="w-full bg-transparent font-medium text-on-surface placeholder:text-outline focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Stop 2 (Perhentian Kedua - Opsional) */}
              {isAddingStop2 ? (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs relative animate-fadeIn">
                  <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-600 block">Tujuan 2 (Perhentian Tambahan)</span>
                    {stop2 ? (
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-on-surface truncate">{stop2.name}</span>
                        <button
                          type="button"
                          onClick={() => setStop2(null)}
                          className="text-on-surface-variant hover:text-error text-xs font-bold px-1"
                          title="Hapus Tujuan 2"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Ketik lokasi atau klik peta..."
                        value={searchTarget === 'stop2' ? searchQuery : ''}
                        onFocus={() => { setSearchTarget('stop2'); setIsSearchFocused(true); }}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredDestinations.length > 0) handleSelectLocation(filteredDestinations[0]);
                            else if (liveSearchResults.length > 0) handleSelectLocation(liveSearchResults[0]);
                          }
                        }}
                        className="w-full bg-transparent font-medium text-on-surface placeholder:text-outline focus:outline-none"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsAddingStop2(false); setStop2(null); }}
                    className="text-on-surface-variant hover:text-error text-xs font-bold"
                    title="Batal Tambah Stop 2"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsAddingStop2(true); setSearchTarget('stop2'); }}
                  className="py-1.5 px-3 rounded-xl border border-dashed border-primary/50 text-primary hover:bg-primary/5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">add_location_alt</span>
                  <span>+ Tambah Perhentian (Stop 2)</span>
                </button>
              )}

              {/* Hasil Pencarian Dropdown Cepat & Live Geocoding */}
              {isSearchFocused && searchQuery && (
                <div className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xl max-h-60 overflow-y-auto space-y-1 z-30">
                  {/* Status Loading Geocoding */}
                  {isSearchingGeocode && (
                    <div className="flex items-center gap-2 p-2 text-xs text-primary font-semibold">
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Mencari lokasi di peta se-Indonesia...</span>
                    </div>
                  )}

                  {/* Preset Landmark Surabaya */}
                  {filteredDestinations.length > 0 && (
                    <>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase px-2 block">Landmark Surabaya:</span>
                      {filteredDestinations.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectLocation(item)}
                          className="w-full p-2 text-left rounded-lg hover:bg-surface-container flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-primary block">{item.name}</span>
                            <span className="text-[10px] text-on-surface-variant block">{item.address}</span>
                          </div>
                          <span className="text-[10px] font-bold text-secondary">{item.distance}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Hasil Live Geocoding (Bisa dari Probolinggo, Jakarta, dsb) */}
                  {liveSearchResults.length > 0 && (
                    <>
                      <span className="text-[10px] font-bold text-secondary uppercase px-2 pt-1 block">Hasil Pencarian Se-Indonesia:</span>
                      {liveSearchResults.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectLocation(item)}
                          className="w-full p-2 text-left rounded-lg hover:bg-surface-container flex items-start gap-2 text-xs cursor-pointer border-b border-outline-variant/15 last:border-0"
                        >
                          <span className="material-symbols-outlined text-secondary text-base mt-0.5 shrink-0">location_on</span>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-on-surface block truncate">{item.name}</span>
                            <span className="text-[10px] text-on-surface-variant block truncate">{item.address}</span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Jika Tidak Menemukan atau Ingin Menggunakan Nama Pencarian Bebas */}
                  {!isSearchingGeocode && (
                    <div className="pt-1 border-t border-outline-variant/20 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const base = userCoords || { lat: -7.7511, lng: 113.215 };
                          handleSelectLocation({
                            id: `query-${Date.now()}`,
                            name: searchQuery,
                            address: `Area sekitar ${base.lat.toFixed(4)}, ${base.lng.toFixed(4)}`,
                            lat: base.lat + 0.003,
                            lng: base.lng + 0.003,
                            accessibility: 'Titik Kustom Pencarian',
                            time: '10 Menit',
                            distance: '800 m'
                          });
                        }}
                        className="w-full p-2 text-left rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 flex items-center gap-2 text-xs text-primary font-bold cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">near_me</span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">Gunakan "{searchQuery}" sebagai Tujuan</span>
                          <span className="text-[10px] text-on-surface-variant font-normal block">Tetapkan titik rute otomatis di area sekitar</span>
                        </div>
                      </button>
                      <p className="text-[10px] text-on-surface-variant text-center mt-1.5 px-2">
                        💡 Anda juga dapat <strong>klik langsung titik mana pun di peta</strong> sebelah kanan.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Rekomendasi Cepat (Pills) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] font-bold text-on-surface-variant shrink-0">Cepat:</span>
                {SURABAYA_DESTINATIONS.slice(0, 3).map(dest => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleSelectLocation(dest)}
                    className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-primary hover:text-white text-[11px] font-bold text-on-surface transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {dest.name.split(' ')[0]} {dest.name.split(' ')[1] || ''}
                  </button>
                ))}
              </div>

              {/* Tombol Terapkan Rute */}
              {stop1 && !hasSelectedDestination && (
                <button
                  type="button"
                  onClick={handleApplyRoute}
                  disabled={!customOrigin && !coords}
                  className="w-full mt-1 min-h-[46px] rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-98 transition-all cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-lg">directions</span>
                  <span>Lihat Rute GPS ({estimatedTime})</span>
                </button>
              )}

              {hasSelectedDestination && (
                <button
                  type="button"
                  onClick={handleResetDestination}
                  className="w-full py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">map</span>
                  <span>← Kembali ke Peta Utama / Ubah Tujuan</span>
                </button>
              )}
            </div>

            {/* Active Turn-by-Turn Guidance Card (Ditampilkan saat Rute Aktif) */}
            {hasSelectedDestination && (
              <div className="bg-surface-container-lowest rounded-[1.5rem] border-2 border-primary shadow-[0_12px_28px_rgba(17,24,39,0.10)] flex flex-col gap-3 relative overflow-hidden p-4 sm:p-5 transition-all duration-200">
                
                {/* Top Status Indicator with Time & Distance */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-headline-md text-primary font-extrabold">
                      {estimatedTime}
                    </span>
                    <span className="text-xs sm:text-sm text-on-surface-variant font-bold">
                      ({estimatedDistance})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary rounded-full border border-secondary/30 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block animate-breathing-green" aria-hidden="true"></span>
                    <span className="text-[11px] sm:text-xs font-bold">100% Ramah Roda</span>
                  </div>
                </div>

                {/* Big Direction Arrow & Turn Instruction */}
                <div className="flex items-start gap-3.5 my-1">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                      turn_right
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-headline-sm text-on-surface font-extrabold leading-tight">
                      Menuju {stop1?.name || 'tujuan pilihan'}
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-1 truncate">
                      {currentRouteSubtitle}
                    </p>
                  </div>
                </div>

                {/* 3 BADGE KONDISI TROTOAR: DIUBAH 1 BARIS KEBAWAH (VERTIKAL) SESUAI INSTRUKSI */}
                <div className="flex flex-col gap-2.5 pt-3 pb-1 border-t border-surface-container">
                  {/* Row 1: Green Safe Badge */}
                  <div className="bg-[#10b981]/10 border-l-4 border-[#10b981] px-3.5 py-2 rounded-r-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5 text-[#006e2d]">
                      <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">verified_user</span>
                      <div>
                        <span className="text-xs font-extrabold block">Bebas Halangan</span>
                        <span className="text-[11px] text-on-surface font-medium block">Trotoar Rata 2.4m Mulus</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#006e2d]">
                      100% Aman
                    </span>
                  </div>

                  {/* Row 2: Yellow Guiding Block Badge */}
                  <div className="bg-[#f59e0b]/10 border-l-4 border-[#f59e0b] px-3.5 py-2 rounded-r-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5 text-[#735c00]">
                      <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">texture</span>
                      <div>
                        <span className="text-xs font-extrabold block">Ubin Pemandu</span>
                        <span className="text-[11px] text-on-surface font-medium block">Jalur Kuning Bertekstur Teratur</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#735c00]">
                      Taktil Siap
                    </span>
                  </div>

                  {/* Row 3: Red Hazard Warning Badge */}
                  <div className="bg-[#ef4444]/10 border-l-4 border-[#ef4444] px-3.5 py-2 rounded-r-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5 text-error">
                      <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">warning</span>
                      <div>
                        <span className="text-xs font-extrabold block">Hindari Sisi Kiri</span>
                        <span className="text-[11px] text-on-surface font-medium block">Kabel Proyek &amp; Pohon Rendah</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ef4444]/20 text-error">
                      Sensor 120m
                    </span>
                  </div>
                </div>

                {/* Tactile Haptic Vibration Toggle & Audio Toggle (Play / Stop / Replay) */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleHaptic}
                      aria-label={hapticEnabled ? 'Nonaktifkan getaran taktil' : 'Aktifkan getaran taktil'}
                      className={`h-9 px-3 rounded-full flex items-center gap-1.5 font-bold text-xs transition-all duration-200 cursor-pointer ${
                        hapticEnabled
                          ? 'bg-primary/10 text-primary border border-primary/30'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">vibration</span>
                      <span>{hapticEnabled ? 'Haptic Aktif' : 'Haptic Mati'}</span>
                    </button>

                    {/* Tombol Speaker: Play / Stop / Replay */}
                    <button
                      type="button"
                      onClick={handleToggleAudio}
                      aria-label={isSpeaking ? 'Hentikan panduan audio' : 'Putar panduan audio rute'}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isSpeaking
                          ? 'bg-error text-white ring-2 ring-error/40 animate-pulse'
                          : 'bg-surface-container hover:bg-surface-container-high text-primary'
                      }`}
                      title={isSpeaking ? 'Klik: Hentikan Suara' : 'Klik: Dengarkan Panduan Suara'}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        {isSpeaking ? 'stop' : 'volume_up'}
                      </span>
                    </button>
                  </div>

                  <span className="text-xs font-bold text-secondary flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-secondary inline-block animate-breathing-green" aria-hidden="true"></span>
                    <span className="truncate max-w-[130px]">{gpsStatusLabel}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Voice Command AI Interactive Bar */}
          <div className="bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant shadow-xs flex items-center justify-between gap-2 mt-auto">
            <button
              type="button"
              onClick={() => {
                if (onOpenVoice) onOpenVoice();
              }}
              className="flex-1 min-h-[46px] px-4 bg-primary text-on-primary font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container focus:outline-none focus:ring-4 focus:ring-primary shadow-xs transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                mic
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
                <span>Asisten AI</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !isAudioMuted;
                setIsAudioMuted(next);
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setIsSpeaking(false);
                setAudioFeedback(next ? 'Suara panduan dibisukan (Mute)' : 'Suara panduan diaktifkan');
                setTimeout(() => setAudioFeedback(''), 3000);
              }}
              aria-label={isAudioMuted ? 'Aktifkan Suara Panduan' : 'Bisukan Suara Panduan'}
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                isAudioMuted ? 'bg-error/10 text-error ring-1 ring-error/40' : 'bg-surface-container hover:bg-surface-container-high text-primary'
              }`}
              title={isAudioMuted ? 'Suara Dibisukan (Klik untuk Aktifkan)' : 'Suara Aktif (Klik untuk Bisukan)'}
            >
              <div className="flex items-center justify-center gap-0.5 h-5 w-5" aria-hidden="true">
                <span className={`w-[2px] rounded-full sound-bar-1 h-2 ${isAudioMuted ? 'bg-error' : 'bg-primary'}`}></span>
                <span className={`w-[2px] rounded-full sound-bar-2 h-4 ${isAudioMuted ? 'bg-error' : 'bg-primary'}`}></span>
                <span className={`w-[2px] rounded-full sound-bar-3 h-3 ${isAudioMuted ? 'bg-error' : 'bg-primary'}`}></span>
                <span className={`w-[2px] rounded-full sound-bar-4 h-2 ${isAudioMuted ? 'bg-error' : 'bg-primary'}`}></span>
              </div>
            </button>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* KOLOM KANAN (lg:col-span-7 xl:col-span-8): Dynamic Map   */}
        {/* ======================================================== */}
        <section
          aria-label="Kanvas Peta Navigasi Interaktif"
          className="lg:col-span-7 xl:col-span-8 flex flex-col relative bg-surface-container-low rounded-[2rem] border-2 border-outline-variant overflow-hidden shadow-lg h-full min-h-[420px] sm:min-h-[500px] lg:min-h-[640px] flex-1"
        >
          {/* ===================================================== */}
          {/* TAMPILAN 1: PETA UTAMA INTERAKTIF (SEBELUM MEMILIH TUJUAN) */}
          {/* ===================================================== */}
          {!hasSelectedDestination && (
            <div className="relative w-full h-full flex-1 flex flex-col">
              {/* Header Floating Peta Awal */}
              <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-outline-variant shadow-md flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block animate-ping"></span>
                  <span className="text-xs font-extrabold text-on-surface">Peta Aksesibilitas Leluasa</span>
                  <span className="text-[10px] text-on-surface-variant">• Klik titik mana pun di peta untuk memilih rute</span>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={gpsLoading}
                    className="h-9 px-3 bg-surface-container-lowest/95 backdrop-blur-md text-primary font-bold text-xs rounded-full border border-outline-variant shadow-md flex items-center gap-1 hover:bg-surface-container transition-all cursor-pointer disabled:opacity-60"
                    title={userCoords ? 'Pusatkan peta pada lokasi GPS terbaru' : 'Deteksi GPS dan pusatkan peta'}
                  >
                    <span className="material-symbols-outlined text-base">my_location</span>
                    <span className="hidden sm:inline">Lokasi Saya</span>
                  </button>
                </div>
              </div>

              {/* Kontainer Leaflet Peta Utama */}
              <div ref={leafletMapRef} className="w-full h-full flex-1 min-h-[380px] sm:min-h-[480px] z-0" />

              {/* Info Bottom Floating Bar Peta Awal */}
              <div className="p-3 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant z-20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-on-surface">
                  {gpsStatusLabel}{coords ? ` · Akurasi GPS ±${Math.round(accuracy)} m` : ''}
                </span>
                {stop1 && (
                  <button
                    type="button"
                    onClick={handleApplyRoute}
                    className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-container active:scale-95 transition-all cursor-pointer"
                  >
                    Tampilkan Rute ke {stop1.name} →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAMPILAN 2: RUTE DASHBOARD SEDERHANA (SETELAH MEMILIH TUJUAN) */}
          {/* ===================================================== */}
          {hasSelectedDestination && (
            <div className="relative w-full h-full flex-1 flex flex-col">
              {/* Top Canvas Header Overlay */}
              <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                {/* Live Trip Indicator */}
                <div className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full border border-outline-variant shadow-md flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-3 w-3 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                  </span>
                  <div className="text-left min-w-0">
                    <span className="text-xs sm:text-sm font-extrabold text-on-surface block truncate">
                      {currentRouteTitle}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-on-surface-variant block font-medium">
                      {coords
                        ? `${gpsStatusLabel} · Akurasi GPS ±${Math.round(accuracy)} m · ${userLocationName}`
                        : gpsError?.message || gpsStatusLabel}
                    </span>
                  </div>
                </div>

                {/* Quick Tools: Umumkan & Simulasi Rute */}
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAudio}
                    aria-label={isSpeaking ? 'Hentikan pengumuman suara' : 'Dengarkan pengumuman suara rute'}
                    className={`h-10 sm:h-11 px-3 backdrop-blur-md font-bold text-xs sm:text-sm rounded-full border shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                      isSpeaking
                        ? 'bg-error text-white border-error animate-pulse'
                        : 'bg-surface-container-lowest/95 text-primary border-outline-variant hover:bg-surface-container'
                    }`}
                    title={isSpeaking ? 'Klik: Hentikan Pengumuman' : 'Klik: Dengarkan Pengumuman (Dapat Dihentikan & Diulang)'}
                  >
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                      {isSpeaking ? 'stop' : 'volume_up'}
                    </span>
                    <span className="hidden sm:inline">{isSpeaking ? 'Stop Suara' : 'Umumkan'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenPlanRoute}
                    aria-label="Buka navigasi GPS untuk rute ini"
                    className="h-10 sm:h-11 px-3.5 sm:px-4 bg-primary text-on-primary font-bold text-xs sm:text-sm rounded-full shadow-md hover:bg-primary-container transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                      navigation
                    </span>
                    <span>Navigasi GPS</span>
                  </button>
                </div>
              </div>

              {/* Map Graphic Canvas (Scalable Tactile Vector Cartography Rute Sederhana) */}
              <div
                className="relative w-full h-full flex-1 bg-[#e5e9f5] overflow-hidden select-none transition-transform duration-300"
                style={{ minHeight: '440px', transform: `scale(${mapZoom}) rotate(${mapRotation}deg)`, transformOrigin: 'center center' }}
              >
                {/* City Streets SVG Pattern & Grid */}
                <svg
                  className="absolute inset-0 w-full h-full object-cover"
                  height="100%"
                  width="100%"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="sidewalkGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d5dbec" strokeWidth="1.5" />
                    </pattern>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1D4ED8" />
                      <stop offset="60%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#sidewalkGrid)" />

                  <g transform="translate(60, 0)">
                    {/* Blok 1: Balai Pemuda */}
                    <rect x="50" y="40" width="220" height="180" rx="20" fill="#ffffff" stroke="#c4c5d7" strokeWidth="2" />
                    <text x="70" y="80" fill="#747686" fontFamily="Manrope" fontSize="12" fontWeight="700">
                      Balai Pemuda Surabaya
                    </text>
                    <text x="70" y="100" fill="#434655" fontFamily="Atkinson Hyperlegible Next" fontSize="11">
                      Area Ramah Kursi Roda
                    </text>

                    {/* Blok 2: Kompleks Sentral Bisnis */}
                    <rect x="340" y="40" width="340" height="150" rx="20" fill="#ffffff" stroke="#c4c5d7" strokeWidth="2" />
                    <text x="360" y="75" fill="#747686" fontFamily="Manrope" fontSize="12" fontWeight="700">
                      Kompleks Bisnis Jl. Pemuda
                    </text>
                    <text x="360" y="95" fill="#434655" fontFamily="Atkinson Hyperlegible Next" fontSize="11">
                      Ramp Elevasi Miring 4.5°
                    </text>

                    {/* Blok 3: Sentra Kuliner */}
                    <rect x="50" y="290" width="240" height="260" rx="20" fill="#ffffff" stroke="#c4c5d7" strokeWidth="2" />
                    <text x="70" y="325" fill="#747686" fontFamily="Manrope" fontSize="12" fontWeight="700">
                      Sentra Kuliner Pemuda
                    </text>
                    <text x="70" y="345" fill="#434655" fontFamily="Atkinson Hyperlegible Next" fontSize="11">
                      Jalur Bebas Parkir Liar
                    </text>

                    {/* Blok 4: Halte & Stasiun */}
                    <rect x="370" y="270" width="360" height="280" rx="20" fill="#ffffff" stroke="#c4c5d7" strokeWidth="2" />
                    <text x="390" y="305" fill="#747686" fontFamily="Manrope" fontSize="12" fontWeight="700">
                      Halte Integrasi Pemuda
                    </text>
                    <text x="390" y="325" fill="#006e2d" fontFamily="Atkinson Hyperlegible Next" fontSize="11" fontWeight="700">
                      Lift &amp; Pemandu Taktil Siap
                    </text>

                    {/* Jalur Jalan Horizontal & Vertikal */}
                    <rect x="-110" y="228" width="120%" height="48" fill="#e9edff" />
                    <line x1="-110" y1="252" x2="120%" y2="252" stroke="#ffffff" strokeWidth="3" strokeDasharray="16, 12" />

                    <rect x="290" y="0" width="56" height="100%" fill="#e9edff" />
                    <line x1="318" y1="0" x2="318" y2="100%" stroke="#ffffff" strokeWidth="3" strokeDasharray="16, 12" />

                    {/* Underlay Guiding Block Kuning */}
                    <path
                      d="M 120 238 L 310 238 L 310 390 L 520 390"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="12"
                      strokeLinecap="round"
                      opacity="0.3"
                    />

                    {/* Glow Corridor Biru */}
                    <path
                      d="M 120 238 L 310 238 L 310 390 L 520 390"
                      fill="none"
                      stroke="#1D4ED8"
                      strokeWidth="14"
                      filter="url(#glow)"
                      opacity="0.25"
                    />

                    {/* Active Moving Dash Route (Animate Route Flow) */}
                    <path
                      className="animate-route-flow"
                      d="M 120 238 L 310 238 L 310 390 L 520 390"
                      fill="none"
                      stroke="#0037b0"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.95"
                    />

                    {/* Route Inner Highlight */}
                    <path
                      className="animate-route-flow"
                      d="M 120 238 L 310 238 L 310 390 L 520 390"
                      fill="none"
                      stroke="#7cf994"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  </g>
                </svg>

                {/* Pin 1: Posisi Anda Saat Ini (Radar Pulse) */}
                <div className="absolute" style={{ top: '220px', left: '74px' }} title="Posisi Anda Saat Ini">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-16 h-16 bg-primary rounded-full pulse-radar"></div>
                    <div className="absolute w-16 h-16 bg-primary/30 rounded-full pulse-radar-delay"></div>
                    <div className="relative w-8 h-8 rounded-full bg-primary border-4 border-white shadow-xl flex items-center justify-center text-white z-10 transition-transform duration-200 hover:scale-110">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">navigation</span>
                    </div>
                    <div className="absolute -top-7 whitespace-nowrap bg-on-surface text-surface text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md font-label-md animate-float z-10">
                      Anda di Sini
                    </div>
                  </div>
                </div>

                {/* Pin 2: Hazard Hotspot (Sonar Pulse Merah) */}
                <div className="absolute" style={{ top: '210px', left: '215px' }}>
                  <div className="relative group cursor-pointer flex items-center justify-center">
                    <div className="absolute w-12 h-12 bg-error rounded-full pulse-warning-sonar pointer-events-none"></div>
                    <div className="w-9 h-9 rounded-full bg-error border-2 border-white shadow-lg flex items-center justify-center text-white ring-2 ring-error/40 hover:scale-110 transition-all duration-200 z-10">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                        warning
                      </span>
                    </div>
                    {/* Tooltip Hover Box */}
                    <div className="absolute bottom-11 -left-20 bg-surface-container-lowest border-2 border-error p-2.5 rounded-xl shadow-xl w-48 pointer-events-none opacity-90 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 z-20">
                      <span className="text-error font-extrabold text-[11px] block">PERINGATAN SENSOR</span>
                      <p className="text-on-surface text-[12px] font-bold">Kabel Proyek Melintang</p>
                      <p className="text-[11px] text-on-surface-variant">Disarankan belok ke ubin kanan</p>
                    </div>
                  </div>
                </div>

                {/* Pin 3: Amber Guiding Block Pin (Floating) */}
                <div className="absolute animate-float" style={{ top: '300px', left: '280px' }}>
                  <div className="flex items-center gap-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold text-[11px] px-2.5 py-1 rounded-full shadow-md border-2 border-white cursor-pointer transition-all duration-200 hover:scale-105">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">texture</span>
                    <span>Ubin Bertekstur Teratur</span>
                  </div>
                </div>

                {/* Pin 4: Green Destination Marker Card */}
                <div className="absolute animate-float-delayed" style={{ top: '340px', left: '460px' }}>
                  <div className="bg-surface-container-lowest p-2.5 rounded-2xl border-2 border-secondary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
                    <div className="flex items-center gap-1.5 text-secondary font-bold text-[12px]">
                      <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                      <span>Tujuan Tercapai</span>
                    </div>
                    <p className="text-on-surface font-extrabold text-xs sm:text-sm">
                      {stop1 ? stop1.name : 'Halte Integrasi Balai Pemuda'}
                    </p>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {stop2 ? `Lanjut ke Stop 2: ${stop2.name}` : 'Elevator Aksesibel 10m ke depan'}
                    </span>
                  </div>
                </div>

                {/* Right Side Floating Map Controls */}
                <div className="absolute right-3 sm:right-4 top-24 flex flex-col gap-2 z-20">
                  {/* Compass */}
                  <button
                    type="button"
                    onClick={() => setMapRotation((prev) => (prev === 0 ? 30 : 0))}
                    aria-label="Putar kompas"
                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-lowest/95 backdrop-blur-md rounded-full border shadow-md flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      mapRotation !== 0 ? 'text-secondary border-secondary ring-2 ring-secondary/30' : 'text-primary border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary text-xl sm:text-2xl font-bold transition-transform duration-300" style={{ transform: `rotate(${-mapRotation}deg)` }} aria-hidden="true">
                      explore
                    </span>
                  </button>

                  {/* Re-center */}
                  <button
                    type="button"
                    onClick={() => {
                      setMapZoom(1);
                      setMapRotation(0);
                      setAudioFeedback('Peta dikembalikan ke posisi awal.');
                      setTimeout(() => setAudioFeedback(''), 2500);
                    }}
                    aria-label="Pusatkan Ulang"
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-lowest/95 backdrop-blur-md text-primary rounded-full border border-outline-variant shadow-md flex items-center justify-center hover:bg-surface-container hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                      my_location
                    </span>
                  </button>

                  {/* Zoom In */}
                  <button
                    type="button"
                    onClick={() => setMapZoom((prev) => Math.min(prev + 0.15, 1.6))}
                    aria-label="Perbesar Peta"
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-lowest/95 backdrop-blur-md text-on-surface rounded-full border border-outline-variant shadow-md flex items-center justify-center hover:bg-surface-container hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-2xl" aria-hidden="true">add</span>
                  </button>

                  {/* Zoom Out */}
                  <button
                    type="button"
                    onClick={() => setMapZoom((prev) => Math.max(prev - 0.15, 0.75))}
                    aria-label="Perkecil Peta"
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-lowest/95 backdrop-blur-md text-on-surface rounded-full border border-outline-variant shadow-md flex items-center justify-center hover:bg-surface-container hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-2xl" aria-hidden="true">remove</span>
                  </button>

                  {/* Toggle Layer: Navigasi ke Peta OpenStreetMap Interaktif Penuh */}
                  <button
                    type="button"
                    onClick={() => setHasSelectedDestination(false)}
                    aria-label="Buka Peta Navigasi Lengkap"
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-lowest/95 backdrop-blur-md text-primary rounded-full border border-outline-variant shadow-md flex items-center justify-center hover:bg-surface-container hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                    title="Buka Peta Utama"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-2xl" aria-hidden="true">layers</span>
                  </button>
                </div>
              </div>

              {/* Bottom Floating Route Alternative Summary Cards */}
              <div className="p-3.5 sm:p-4 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant z-20 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 self-start md:self-center">
                  <span className="text-xs sm:text-sm font-bold text-on-surface">Pilihan Alternatif:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-space-md w-full flex-1">
                  {/* Option 1 */}
                  <div
                    onClick={() => setSelectedRouteKey('ubin')}
                    tabIndex="0"
                    role="button"
                    className={`min-h-[64px] px-4 py-2.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer shadow-xs transition-all ${
                      selectedRouteKey === 'ubin'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#f59e0b] text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">texture</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-on-surface block">Rute Ubin Pemandu</span>
                        <p className="text-[11px] text-on-surface-variant font-medium truncate">
                          Via Jalur Kuning Bertekstur · Elevasi 0°
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs sm:text-sm font-extrabold text-primary block">{estimatedTime}</span>
                      <span className="text-[10px] text-on-surface-variant">{estimatedDistance}</span>
                    </div>
                  </div>

                  {/* Option 2 */}
                  <div
                    onClick={() => setSelectedRouteKey('ramp')}
                    tabIndex="0"
                    role="button"
                    className={`min-h-[64px] px-4 py-2.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer shadow-xs transition-all ${
                      selectedRouteKey === 'ramp'
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">accessible</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-on-surface block">Rute Ramp Halus</span>
                        <p className="text-[11px] text-on-surface-variant font-medium truncate">
                          Ramp Lebar 1.8m · Hindari Keramaian
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs sm:text-sm font-extrabold text-on-surface block">12 Mnt</span>
                      <span className="text-[10px] text-on-surface-variant">590 m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer Leluasa */}
      <footer className="mt-auto pt-3 pb-2 border-t border-outline-variant/20 flex items-center text-on-surface-variant text-xs">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo Leluasa" className="w-5 h-5 rounded-full object-contain" />
          <span className="font-bold text-primary">Leluasa</span>
          <span>·</span>
          <span>2026 Leluasa All Access, All Ways.</span>
        </div>
      </footer>
    </div>
  );
}