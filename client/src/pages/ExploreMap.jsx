import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchObstacles, upvoteObstacle, resolveObstacle, dispatchDpupr, fetchRouteComparison } from '../services/api.js';

export default function ExploreMap({ setActiveTab }) {
  const [obstacles, setObstacles] = useState([]);
  const [selectedObstacle, setSelectedObstacle] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLayerMode, setActiveLayerMode] = useState('standard');
  const [searchQuery, setSearchQuery] = useState('Jl. Pemuda 34, Embong Kaliasin, Surabaya');
  const [actionFeedback, setActionFeedback] = useState('');
  const [legendOpen, setLegendOpen] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const routesGroupRef = useRef(null);
  const userGpsMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);

  useEffect(() => {
    loadObstacles();
  }, [activeFilter]);

  const loadObstacles = async () => {
    try {
      const res = await fetchObstacles({ severity: activeFilter });
      setObstacles(res.data);
      if (res.data.length > 0 && !selectedObstacle) {
        setSelectedObstacle(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Titik pusat di Surabaya Pusat (Balai Pemuda / Jl. Pemuda)
    const map = L.map(mapContainerRef.current, {
      center: [-7.2635, 112.7470],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    // Layer tile default: OpenStreetMap Official (Gratis, Tanpa API Key)
    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    routesGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Gambar Koridor Ramah Kursi Roda (Rute Aman, Segmen Waspada, Segmen Terblokir)
    renderCorridors(routesGroupRef.current);

    // Pin GPS awal (default Balai Pemuda, kemudian mendeteksi lokasi perangkat)
    updateUserGpsMarker(map, -7.2642, 112.7449, 'Balai Pemuda Surabaya');
    locateDevice(false);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer saat mode layer berganti
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;

    let newUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    if (activeLayerMode === 'satellite') {
      newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (activeLayerMode === 'hot') {
      newUrl = 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    } else {
      newUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    tileLayerRef.current.setUrl(newUrl);
  }, [activeLayerMode]);

  // Update Pin Marker saat data rintangan atau filter berubah
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    obstacles.forEach((obs) => {
      const lat = obs.coordinates?.lat || -7.2655;
      const lng = obs.coordinates?.lng || 112.7482;

      const isImpassable = obs.severity === 'impassable';
      const isDifficult = obs.severity === 'difficult';
      const isPassable = obs.severity === 'passable';

      const iconBg = isImpassable ? 'bg-error' : isDifficult ? 'bg-[#d99a19]' : 'bg-secondary';
      const iconSymbol = isImpassable ? 'block' : isDifficult ? 'warning' : 'check_circle';
      const labelBadge = isImpassable
        ? `<div class="bg-error text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 mb-1 whitespace-nowrap animate-bounce"><span class="material-symbols-outlined text-[13px]">dangerous</span><span>${obs.clearanceLabel || '0 cm Terblokir'}</span></div>`
        : isDifficult
        ? `<div class="bg-[#d99a19] text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 mb-1 whitespace-nowrap"><span class="material-symbols-outlined text-[13px]">warning</span><span>${obs.clearanceLabel || 'Sempit 65cm'}</span></div>`
        : `<div class="bg-secondary text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 mb-1 whitespace-nowrap"><span class="material-symbols-outlined text-[13px]">check_circle</span><span>180cm Bisa Lewat</span></div>`;

      const html = `
        <div class="flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform">
          ${labelBadge}
          <div class="w-8 h-8 rounded-full ${iconBg} text-white flex items-center justify-center shadow-xl ring-2 ring-white">
            <span class="material-symbols-outlined text-base font-bold">${iconSymbol}</span>
          </div>
          <div class="w-2 h-2 ${iconBg} -mt-1 [clip-path:polygon(50%_100%,0_0,100%_0)]"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: html,
        iconSize: [120, 60],
        iconAnchor: [60, 52]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersGroupRef.current);
      marker.on('click', () => {
        handleSelectPin(obs);
        mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
      });
    });
  }, [obstacles]);

  const renderCorridors = async (layerGroup) => {
    try {
      const res = await fetchRouteComparison();
      const routeA = res.data?.routeA;
      const routeB = res.data?.routeB;

      // 1. Gambar Rute AI Leluasa Menggunakan Geometri Jaringan Nyata OpenStreetMap
      const safeCoords = routeB?.coordinates?.length ? routeB.coordinates : [
        [-7.2642, 112.7449],
        [-7.2647, 112.7456],
        [-7.2650, 112.7463],
        [-7.2653, 112.7472],
        [-7.2656, 112.7485],
        [-7.2659, 112.7497],
        [-7.2662, 112.7508],
        [-7.2664, 112.7518],
        [-7.2663, 112.7535],
        [-7.2664, 112.7552],
        [-7.2667, 112.7568],
        [-7.2678, 112.7582]
      ];

      const safePolyline = L.polyline(safeCoords, {
        color: '#006a62',
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      L.polyline(safeCoords, {
        color: '#83f6e7',
        weight: 3.5,
        opacity: 1,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      safePolyline.bindTooltip(`✨ ${routeB?.title || 'Rute AI Leluasa'}: ${routeB?.distance || '1,6 km'} (${routeB?.safetyScore || 98}/100 - Terverifikasi Penuh)`, {
        sticky: true
      });

      // 2. Gambar Segmen Terblokir Merah di Jl. Pemuda 34
      const blockedCoords = [
        [-7.2654, 112.7475],
        [-7.2657, 112.7486]
      ];
      const blockedPolyline = L.polyline(blockedCoords, {
        color: '#ba1a1a',
        weight: 9,
        opacity: 0.95,
        dashArray: '6, 6'
      }).addTo(layerGroup);

      blockedPolyline.bindTooltip('⛔ Rintangan Terblokir: Galian Utilitas & Trotoar Amblas (Jl. Pemuda No. 34)', {
        sticky: true
      });

      // 3. Jalur Pengalihan Aman (Bypass)
      const detourCoords = [
        [-7.2652, 112.7471],
        [-7.2650, 112.7474],
        [-7.2652, 112.7486],
        [-7.2656, 112.7488]
      ];
      const detourPolyline = L.polyline(detourCoords, {
        color: '#006a62',
        weight: 4,
        dashArray: '5, 5',
        opacity: 0.9
      }).addTo(layerGroup);

      detourPolyline.bindTooltip('🔄 Pengalihan Aman: Menyeberang ke Trotoar Sisi Utara Jl. Pemuda (+80m)', {
        sticky: true
      });

      // Pin Penanda Awal (Balai Pemuda) & Tujuan (RSUD Dr. Soetomo)
      const startIcon = L.divIcon({
        className: 'start-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full">
            <div class="px-2.5 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
              📍 Balai Pemuda (Mulai)
            </div>
            <div class="w-8 h-8 rounded-full bg-[#006a62] text-white flex items-center justify-center shadow-md ring-2 ring-white">
              <span class="material-symbols-outlined text-sm font-bold">directions_walk</span>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      L.marker([-7.2642, 112.7449], { icon: startIcon }).addTo(layerGroup);

      const endIcon = L.divIcon({
        className: 'end-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full">
            <div class="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
              🎯 RSUD Dr. Soetomo (Tujuan)
            </div>
            <div class="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md ring-2 ring-white">
              <span class="material-symbols-outlined text-sm font-bold">local_hospital</span>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      L.marker([-7.2678, 112.7582], { icon: endIcon }).addTo(layerGroup);
    } catch (err) {
      console.warn('Fallback rendering corridors:', err);
    }
  };

  const updateUserGpsMarker = (map, lat, lng, label = 'Posisi Anda Saat Ini') => {
    const userHtml = `
      <div class="relative flex flex-col items-center justify-center cursor-pointer -translate-x-1/2 -translate-y-1/2">
        <div class="w-12 h-12 rounded-full bg-secondary/30 animate-ping absolute"></div>
        <div class="w-10 h-10 rounded-full bg-[#006a62] text-white flex items-center justify-center shadow-2xl ring-4 ring-white z-20">
          <span class="material-symbols-outlined text-xl font-bold">accessible_forward</span>
        </div>
        <div class="w-2.5 h-3 bg-[#006a62] -mt-1 [clip-path:polygon(50%_100%,0_0,100%_0)] z-20"></div>
        <div class="mt-1 bg-primary text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xl whitespace-nowrap z-30 ring-1 ring-white/30">
          📍 ${label}
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'user-gps-marker',
      html: userHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    if (userGpsMarkerRef.current) {
      userGpsMarkerRef.current.setLatLng([lat, lng]);
      userGpsMarkerRef.current.setIcon(userIcon);
    } else {
      userGpsMarkerRef.current = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 2000
      }).addTo(map);
    }
  };

  const locateDevice = (centerMap = true) => {
    if (!navigator.geolocation) {
      setActionFeedback('Geolokasi tidak didukung oleh browser Anda.');
      setTimeout(() => setActionFeedback(''), 3000);
      return;
    }

    if (centerMap) {
      setActionFeedback('Mendeteksi koordinat GPS perangkat Anda...');
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (mapInstanceRef.current) {
          updateUserGpsMarker(mapInstanceRef.current, latitude, longitude, 'Posisi Anda');

          if (centerMap) {
            mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
          }
        }
        setActionFeedback(`📍 Lokasi Terkunci: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)}m)`);
        setTimeout(() => setActionFeedback(''), 4500);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        if (centerMap) {
          setActionFeedback('Izin lokasi belum diberikan. Membuka pusat peta Surabaya.');
          mapInstanceRef.current?.setView([-7.2625, 112.7441], 16, { animate: true });
          setTimeout(() => setActionFeedback(''), 4000);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const handleSelectPin = (obs) => {
    setSelectedObstacle(obs);
    setDrawerOpen(true);
  };

  const handleUpvote = async (id) => {
    try {
      const res = await upvoteObstacle(id);
      setSelectedObstacle(res.data);
      setActionFeedback('Verifikasi terkonfirmasi! Data telemetri diperbarui.');
      setTimeout(() => setActionFeedback(''), 3000);
      loadObstacles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await resolveObstacle(id);
      setSelectedObstacle(res.data);
      setActionFeedback('Rintangan ditandai telah dibersihkan / normal kembali!');
      setTimeout(() => setActionFeedback(''), 3000);
      loadObstacles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDispatch = async (id) => {
    try {
      const res = await dispatchDpupr(id);
      setActionFeedback(`Terkirim ke DPUPR Surabaya! No. Tiket #${res.ticketId}`);
      setTimeout(() => setActionFeedback(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([-7.2635, 112.7470], 16, { animate: true });
  };

  const severityTitle = (sev) => {
    if (sev === 'impassable') return 'Terblokir';
    if (sev === 'difficult') return 'Sulit Lewat';
    return 'Bisa Lewat';
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-hidden bg-surface-container select-none animate-fadeIn">
      {/* KONTAINER PETA REAL LEAFLET / OPENSTREETMAP */}
      <div
        ref={mapContainerRef}
        id="leaflet-map"
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* HEADER KONTROL PETA MENGAMBANG (ATAS - RESPONSIVE) */}
      <div
        className={`absolute top-2 sm:top-4 left-2 sm:left-4 z-30 flex flex-col gap-2 transition-all duration-300 ${
          drawerOpen ? 'right-2 sm:right-4 lg:right-[440px]' : 'right-2 sm:right-4 lg:right-6'
        }`}
      >
        {/* Kolom Pencarian Omnibox */}
        <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-[0_8px_24px_-4px_rgba(16,42,67,0.12)] p-2 sm:p-2.5 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-primary-container text-on-primary shrink-0">
            <span className="material-symbols-outlined text-xl sm:text-2xl text-secondary-container">travel_explore</span>
          </div>
          <div className="flex-1 relative flex items-center min-w-0">
            <input
              className="w-full h-9 sm:h-11 pr-8 sm:pr-10 text-on-surface placeholder:text-outline font-body-sm text-xs sm:text-sm bg-transparent focus:outline-none font-medium truncate"
              placeholder="Cari rintangan trotoar atau rampa di Surabaya..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                type="button"
                aria-label="Hapus pencarian"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">close</span>
              </button>
            )}
          </div>

          <div className="hidden sm:block h-7 w-px bg-outline-variant/40 shrink-0"></div>

          {/* Pemilih Mode Tampilan Layer */}
          <div className="flex items-center gap-1 shrink-0 bg-surface-container-low p-0.5 sm:p-1 rounded-xl">
            <button
              onClick={() => setActiveLayerMode('standard')}
              className={`h-8 sm:h-9 px-2 sm:px-3 rounded-lg font-label-sm text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                activeLayerMode === 'standard' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-sm sm:text-base text-secondary">map</span>
              <span className="hidden md:inline">OpenStreetMap</span>
            </button>
            <button
              onClick={() => setActiveLayerMode('hot')}
              className={`h-8 sm:h-9 px-2 sm:px-3 rounded-lg font-label-sm text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                activeLayerMode === 'hot' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-sm sm:text-base text-secondary">accessible_forward</span>
              <span className="hidden md:inline">Trotoar (HOT)</span>
            </button>
            <button
              onClick={() => setActiveLayerMode('satellite')}
              className={`h-8 sm:h-9 px-2 sm:px-3 rounded-lg font-label-sm text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                activeLayerMode === 'satellite' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-sm sm:text-base">satellite_alt</span>
              <span className="hidden md:inline">Satelit</span>
            </button>
          </div>
        </div>

        {/* Pil Filter Cepat Horizontal */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`h-8 sm:h-9 px-3 rounded-full font-label-sm text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-all ${
              activeFilter === 'all' ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span>Semua</span>
            <span className="px-1.5 py-0.2 rounded-full bg-on-primary-container/30 text-on-primary text-[10px] font-bold">18</span>
          </button>
          <button
            onClick={() => setActiveFilter('passable')}
            className={`h-8 sm:h-9 px-3 rounded-full font-label-sm text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors ${
              activeFilter === 'passable' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span>Bisa Lewat</span>
            <span className="text-[10px] opacity-80">(7)</span>
          </button>
          <button
            onClick={() => setActiveFilter('caution')}
            className={`h-8 sm:h-9 px-3 rounded-full font-label-sm text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors ${
              activeFilter === 'caution' ? 'bg-amber-600 text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Hati-hati</span>
            <span className="text-[10px] opacity-80">(8)</span>
          </button>
          <button
            onClick={() => setActiveFilter('impassable')}
            className={`h-8 sm:h-9 px-3 rounded-full font-label-sm text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0 ring-2 ring-error/30 transition-colors ${
              activeFilter === 'impassable' ? 'bg-error text-on-error' : 'bg-error-container text-on-error-container'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            <span>Terblokir</span>
            <span className="font-bold text-[10px]">(3)</span>
          </button>
        </div>
      </div>

      {/* DOCK ALAT PETA MENGAMBANG (KIRI BAWAH) */}
      <div className="absolute left-3 sm:left-6 bottom-20 lg:bottom-24 z-20 flex flex-col gap-2">
        <button
          onClick={() => locateDevice(true)}
          className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-surface-container-lowest text-primary hover:text-secondary shadow-[0_4px_16px_rgba(16,42,67,0.12)] flex items-center justify-center transition-transform active:scale-95 group"
          title="Deteksi dan pusatkan ke koordinat GPS device saya"
          type="button"
          aria-label="Cari posisi saya"
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl text-secondary group-hover:scale-110 transition-transform">my_location</span>
        </button>

        {/* Kontrol Zoom */}
        <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-[0_4px_16px_rgba(16,42,67,0.12)] overflow-hidden">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-10 sm:w-12 h-9 sm:h-11 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
            title="Perbesar peta"
            type="button"
            aria-label="Perbesar peta"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
          </button>
          <div className="h-px bg-outline-variant/30 w-6 sm:w-8 mx-auto"></div>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-10 sm:w-12 h-9 sm:h-11 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
            title="Perkecil peta"
            type="button"
            aria-label="Perkecil peta"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">remove</span>
          </button>
        </div>

        {/* Tombol Lapor Bahaya */}
        <button
          onClick={() => setActiveTab('report-obstacle')}
          className="min-h-[44px] sm:min-h-[48px] px-3 sm:px-4 rounded-xl bg-secondary text-on-secondary shadow-[0_6px_20px_rgba(0,106,98,0.35)] flex items-center gap-1.5 sm:gap-2 font-label-md text-xs font-semibold hover:bg-secondary/90 transition-all active:scale-95 mt-1"
          type="button"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl">add_location_alt</span>
          <span className="hidden sm:inline whitespace-nowrap">Lapor Rintangan</span>
        </button>
      </div>

      {/* LEGENDA RUTE PETA MENGAMBANG (KANAN BAWAH) */}
      <div className="absolute right-3 sm:right-6 bottom-20 lg:bottom-24 z-20 flex flex-col gap-1.5 p-3 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md shadow-xl border border-outline-variant/30 text-xs pointer-events-auto">
        <span className="font-bold text-primary text-[11px] uppercase tracking-wider flex items-center gap-1">
          <span className="material-symbols-outlined text-sm text-secondary">alt_route</span>
          Legenda Peta
        </span>
        <div className="flex items-center gap-2">
          <span className="w-5 h-2 rounded-full bg-[#006a62]"></span>
          <span className="text-on-surface text-[11px] font-medium">Rute AI Leluasa (Aman)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-2 rounded-full bg-error"></span>
          <span className="text-on-surface text-[11px] font-medium">Trotoar Terblokir (Bahaya)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-1 border-t-2 border-dashed border-[#006a62]"></span>
          <span className="text-on-surface text-[11px] font-medium">Jalur Pengalihan (+180m)</span>
        </div>
      </div>

      {/* BOTTOM SHEET MOBILE / PANEL SAMPING DESKTOP DETAIL RINTANGAN */}
      {selectedObstacle && (
        <>
          {/* Backdrop gelap di mobile */}
          {drawerOpen && (
            <div
              className="lg:hidden fixed inset-0 z-30 bg-primary/40 backdrop-blur-xs"
              onClick={() => setDrawerOpen(false)}
            ></div>
          )}

          <aside
            className={`fixed lg:absolute inset-x-0 bottom-0 max-h-[85vh] lg:max-h-full lg:w-[420px] lg:top-0 lg:right-0 lg:left-auto rounded-t-3xl lg:rounded-none bg-surface-container-lowest shadow-2xl lg:shadow-[-8px_0_32px_rgba(16,42,67,0.12)] z-40 flex flex-col overflow-y-auto transition-transform duration-300 pb-safe ${
              drawerOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full'
            }`}
          >
            {/* Gagang geser di mobile */}
            <div className="lg:hidden w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto my-2.5 shrink-0"></div>

            {/* Banner Header Status */}
            <div className={`p-3 sm:p-4 text-on-error flex items-center justify-between shadow-xs sticky top-0 z-10 ${
              selectedObstacle.severity === 'impassable' ? 'bg-error' : selectedObstacle.severity === 'difficult' ? 'bg-amber-600' : 'bg-secondary'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl sm:text-2xl">
                  {selectedObstacle.severity === 'impassable' ? 'error' : selectedObstacle.severity === 'difficult' ? 'warning' : 'verified'}
                </span>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-xs uppercase font-bold tracking-wider">
                    Rintangan {severityTitle(selectedObstacle.severity)}
                  </span>
                  <span className="font-label-sm text-[10px] sm:text-[11px] opacity-90">ID #{selectedObstacle.id} · Prioritas P1</span>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-black/15 hover:bg-black/30 flex items-center justify-center transition-colors"
                aria-label="Tutup detail rintangan"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Feedback Notifikasi Aksi */}
            {actionFeedback && (
              <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold animate-pulse flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{actionFeedback}</span>
              </div>
            )}

            {/* Isi Konten Detail */}
            <div className="p-space-md sm:p-space-lg flex flex-col gap-space-md flex-1">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary tracking-tight leading-snug">
                  {selectedObstacle.title}
                </h2>
                <div className="flex items-start gap-1.5 text-on-surface-variant font-body-sm text-xs">
                  <span className="material-symbols-outlined text-secondary text-base mt-0.5 shrink-0">pin_drop</span>
                  <span className="font-medium text-on-surface">{selectedObstacle.location}</span>
                </div>
              </div>

              {/* Data Pelapor */}
              <div className="p-2.5 sm:p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-secondary flex items-center justify-center font-bold text-xs">
                    <span className="material-symbols-outlined text-lg">accessible</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs font-semibold text-primary">{selectedObstacle.reporter || 'Rian Sastrowardoyo'}</span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant">{selectedObstacle.reportedTime || 'Hari ini, 08:45 WIB'}</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container/70 text-on-secondary-container">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span className="font-label-sm text-[10px] font-bold">{selectedObstacle.confirmedCount || selectedObstacle.upvotes} Diverifikasi</span>
                </div>
              </div>

              {/* Bukti Foto Lapangan */}
              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Bukti Foto Lapangan</span>
                <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden shadow-md group">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={selectedObstacle.photoUrl}
                    alt={selectedObstacle.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-on-primary">
                    <span className="font-label-sm text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">camera_alt</span> 1 Foto terlampir
                    </span>
                    <span className="font-label-sm text-[10px] bg-primary/60 backdrop-blur-xs px-2 py-0.5 rounded">
                      GPS Tersemat
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel Analisis AI Vision */}
              <div className="p-3 bg-surface-container rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-secondary">
                    <span className="material-symbols-outlined text-base">psychology</span>
                    <span className="font-label-md text-xs font-bold text-primary">Analisis AI Vision</span>
                  </div>
                  <span className="font-label-sm text-[10px] bg-secondary-container px-2 py-0.5 rounded-full font-bold text-on-secondary-container">
                    Akurasi {selectedObstacle.aiTelemetry?.confidence || 94}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-body-sm">
                  <div className="bg-surface-container-lowest p-2 rounded-lg flex flex-col">
                    <span className="font-label-sm text-[9px] text-on-surface-variant uppercase">Jenis Rintangan</span>
                    <span className="font-label-md text-xs font-bold text-on-surface mt-0.5">
                      {selectedObstacle.aiTelemetry?.detectedBarrier || 'Galian Parit & Pagar'}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded-lg flex flex-col">
                    <span className="font-label-sm text-[9px] text-on-surface-variant uppercase">Lebar Bersih</span>
                    <span className="font-label-md text-xs font-bold text-error mt-0.5">
                      {selectedObstacle.clearanceLabel || `${selectedObstacle.clearance} cm`}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 bg-error-container/60 p-2 rounded-lg text-on-error-container font-label-sm text-[11px]">
                  <span className="material-symbols-outlined text-error text-sm shrink-0 mt-0.5">warning</span>
                  <span>
                    {selectedObstacle.aiTelemetry?.warning || 'Bahaya kritis: Menghindari rintangan ini memaksa pengguna turun ke jalan raya. Pengalihan rute sangat dianjurkan.'}
                  </span>
                </div>
              </div>

              {/* Tombol Rute Alternatif */}
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  onClick={() => setActiveTab('plan-route')}
                  className="w-full min-h-[48px] rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-lg text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  type="button"
                >
                  <span className="material-symbols-outlined text-secondary-container text-lg">alt_route</span>
                  <span>Cari Rute Alternatif (+180m)</span>
                </button>
                <span className="text-center font-label-sm text-[10px] text-on-surface-variant">
                  {selectedObstacle.suggestedDetour || 'Trotoar mulus lebar 140cm via jalur pengalihan Jl. Simpang Dukuh.'}
                </span>
              </div>

              {/* Aksi Verifikasi Warga */}
              <div className="flex flex-col gap-2 pt-1 pb-4">
                <span className="font-label-sm text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Verifikasi Warga</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpvote(selectedObstacle.id)}
                    className="min-h-[44px] px-2 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim font-label-md text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">thumb_up</span>
                    <span>Masih Ada ({selectedObstacle.upvotes || 9})</span>
                  </button>
                  <button
                    onClick={() => handleResolve(selectedObstacle.id)}
                    className="min-h-[44px] px-2 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-outline-variant/50"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base text-secondary">task_alt</span>
                    <span>Sudah Bersih</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDispatch(selectedObstacle.id)}
                  className="min-h-[40px] px-3 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-sm text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">forward_to_inbox</span>
                  <span>Teruskan ke DPUPR Surabaya</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* DOCK LEGENDA PETA (BAWAH) */}
      <div className="absolute bottom-20 lg:bottom-4 left-3 lg:left-6 z-20 pointer-events-none">
        <div className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-[0_4px_16px_rgba(16,42,67,0.08)] p-2 sm:p-3 px-3 sm:px-5 flex items-center gap-3 sm:gap-4 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar">
          {/* Legenda Bisa Lewat */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-xs">
              <span className="material-symbols-outlined text-[8px] font-bold">check</span>
            </div>
            <span className="font-label-sm text-[11px] font-bold text-on-surface">Bisa Lewat (&gt;120cm)</span>
          </div>

          <div className="h-4 w-px bg-outline-variant/30 shrink-0"></div>

          {/* Legenda Hati-hati */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-primary shadow-xs">
              <span className="material-symbols-outlined text-[8px] font-bold">priority_high</span>
            </div>
            <span className="font-label-sm text-[11px] font-bold text-on-surface">Hati-hati (80-120cm)</span>
          </div>

          <div className="h-4 w-px bg-outline-variant/30 shrink-0"></div>

          {/* Legenda Terblokir */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-error flex items-center justify-center text-on-error shadow-xs">
              <span className="material-symbols-outlined text-[8px] font-bold">close</span>
            </div>
            <span className="font-label-sm text-[11px] font-bold text-on-surface">Terblokir (&lt;80cm)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
