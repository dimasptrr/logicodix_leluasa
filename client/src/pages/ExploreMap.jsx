import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchObstacles, upvoteObstacle, resolveObstacle, dispatchDpupr, deleteObstacle } from '../features/dashboard/services/safeApi.js';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';
import EditObstacleModal from '../components/EditObstacleModal.jsx';

// Format waktu relatif berbasis WIB (Jakarta / Surabaya GMT+7)
function formatReportTimeWIB(dateString) {
  if (!dateString) return 'Baru saja';
  if (typeof dateString === 'string' && (dateString.includes('lalu') || dateString.includes('menit') || dateString.includes('jam'))) {
    return dateString;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Baru saja';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const timeWIB = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB';

  if (diffMin < 1) return `Baru saja (${timeWIB})`;
  if (diffMin < 60) return `${diffMin} menit lalu (${timeWIB})`;
  if (diffHour < 24) return `${diffHour} jam lalu (${timeWIB})`;
  if (diffDay === 1) return `Kemarin (${timeWIB})`;
  return `${diffDay} hari lalu (${timeWIB})`;
}

export default function ExploreMap({ setActiveTab }) {
  const [obstacles, setObstacles] = useState([]);
  const [selectedObstacle, setSelectedObstacle] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLayerMode, setActiveLayerMode] = useState('standard');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const {
    coords,
    accuracy,
    timestamp,
    status: gpsStatus,
    error: gpsError,
    loading: gpsLoading,
    isAccurate,
    refreshLocation
  } = useGeolocation();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const routesGroupRef = useRef(null);
  const userGpsMarkerRef = useRef(null);
  const centerOnNextLocationRef = useRef(false);

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

  useEffect(() => {
    loadObstacles();
  }, [activeFilter]);

  const loadObstacles = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchObstacles({ severity: activeFilter });
      const dataList = res.data || [];
      setObstacles(dataList);

      const target = typeof window !== 'undefined' ? window.__leluasaTargetObstacle : null;
      if (target) {
        const found = dataList.find(o => String(o.id) === String(target.id));
        const activeItem = found ? { ...found, ...target } : target;
        setSelectedObstacle(activeItem);
        setDrawerOpen(true);
        centerOnNextLocationRef.current = false;

        const tLat = Number(activeItem.lat ?? activeItem.latitude ?? activeItem.coordinates?.lat);
        const tLng = Number(activeItem.lng ?? activeItem.longitude ?? activeItem.coordinates?.lng);
        if (Number.isFinite(tLat) && Number.isFinite(tLng) && mapInstanceRef.current) {
          mapInstanceRef.current.setView([tLat, tLng], 17, { animate: true });
        }
        window.__leluasaTargetObstacle = null;
      } else if (dataList.length > 0 && !selectedObstacle) {
        setSelectedObstacle(dataList[0]);
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setDrawerOpen(true);
        }
      }
    } catch (err) {
      setErrorMessage('Gagal memuat rintangan pada peta. Klik untuk memuat ulang.');
    } finally {
      setIsLoading(false);
    }
  };

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const target = typeof window !== 'undefined' ? window.__leluasaTargetObstacle : null;
    const targetLat = Number(target?.lat ?? target?.latitude ?? target?.coordinates?.lat);
    const targetLng = Number(target?.lng ?? target?.longitude ?? target?.coordinates?.lng);
    const hasValidTarget = Number.isFinite(targetLat) && Number.isFinite(targetLng);

    const map = L.map(mapContainerRef.current, {
      center: hasValidTarget ? [targetLat, targetLng] : [-7.2575, 112.7521],
      zoom: hasValidTarget ? 17 : 15,
      zoomControl: false,
      attributionControl: true
    });

    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    routesGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Jika ada rintangan target dari daftar laporan, jangan timpa fokus kamera dengan GPS posisi user
    centerOnNextLocationRef.current = !hasValidTarget;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!coords) {
      if (userGpsMarkerRef.current) {
        map.removeLayer(userGpsMarkerRef.current);
        userGpsMarkerRef.current = null;
      }
      return;
    }

    updateUserGpsMarker(map, coords.lat, coords.lng);
    if (centerOnNextLocationRef.current) {
      map.setView([coords.lat, coords.lng], 17, { animate: true });
      centerOnNextLocationRef.current = false;
    }
  }, [coords]);

  // Update Tile Layer saat mode layer berganti
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return;

    let newUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    if (activeLayerMode === 'satellite') {
      newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (activeLayerMode === 'hot') {
      newUrl = 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    }

    tileLayerRef.current.setUrl(newUrl);
  }, [activeLayerMode]);

  // Update Pin Marker saat data rintangan atau filter berubah
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    obstacles.forEach((obs) => {
      const lat = Number(obs.lat ?? obs.latitude ?? obs.coordinates?.lat);
      const lng = Number(obs.lng ?? obs.longitude ?? obs.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const isImpassable = obs.severity === 'impassable';
      const isDifficult = obs.severity === 'difficult';
      const isPassable = obs.severity === 'passable';

      const iconBg = isImpassable ? 'bg-error' : isDifficult ? 'bg-warning' : 'bg-secondary';
      const iconText = isDifficult ? 'text-on-warning' : 'text-white';
      const iconSymbol = isImpassable ? 'block' : isDifficult ? 'build' : 'accessible';
      const displayTitle = obs.title || obs.name || 'Rintangan Trotoar';

      const labelBadge = isImpassable
        ? `<div class="bg-error text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 mb-1 whitespace-nowrap"><span class="material-symbols-outlined text-[12px]">cancel</span><span>${displayTitle}</span></div>`
        : isDifficult
        ? `<div class="bg-warning text-on-warning font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 mb-1 whitespace-nowrap"><span class="material-symbols-outlined text-[12px]">warning</span><span>Sulit (${displayTitle})</span></div>`
        : `<div class="bg-secondary text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 mb-1 whitespace-nowrap"><span class="material-symbols-outlined text-[12px]">check_circle</span><span>Bisa dilewati</span></div>`;

      const html = `
        <div class="flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform">
          ${labelBadge}
          <div class="w-8 h-8 rounded-full ${iconBg} ${iconText} flex items-center justify-center shadow-xl ring-2 ring-white">
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

  const updateUserGpsMarker = (map, lat, lng) => {
    const userHtml = `
      <div class="relative flex flex-col items-center justify-center cursor-pointer -translate-x-1/2 -translate-y-1/2">
        <div class="w-12 h-12 rounded-full bg-secondary/30 animate-ping absolute"></div>
        <div class="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shadow-2xl ring-4 ring-white z-20">
          <span class="material-symbols-outlined text-xl font-bold">accessible_forward</span>
        </div>
        <div class="w-2.5 h-3 bg-secondary -mt-1 [clip-path:polygon(50%_100%,0_0,100%_0)] z-20"></div>
        <div class="mt-1 bg-primary text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xl whitespace-nowrap z-30 ring-1 ring-white/30">
          Posisi Anda
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

  const handleLocateMe = () => {
    centerOnNextLocationRef.current = true;
    refreshLocation();
  };

  const handleAudioWayfinding = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        'Peta Pantau Aksesibilitas Leluasa aktif. Menampilkan laporan kondisi trotoar dan rintangan di sekitar Anda.'
      );
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
      setActionFeedback('Membacakan panduan audio...');
      setTimeout(() => setActionFeedback(''), 4000);
    }
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

  const handleDispatch = async (obs) => {
    if (!obs) return;
    try {
      // 1. Simpan status disposisi di sistem internal
      await dispatchDpupr(obs.id);

      // 2. Susun format pesan resmi pengaduan WhatsApp
      const lat = Number(obs.lat ?? obs.latitude ?? obs.coordinates?.lat);
      const lng = Number(obs.lng ?? obs.longitude ?? obs.coordinates?.lng);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      const latStr = hasCoords ? lat.toFixed(6) : '-';
      const lngStr = hasCoords ? lng.toFixed(6) : '-';
      const mapLink = hasCoords ? `https://maps.google.com/?q=${latStr},${lngStr}` : '-';
      const photoUrl = obs.photo_url || obs.image_url || '';
      const obstacleTitle = obs.title || obs.name || obs.category || 'Rintangan Trotoar';

      const lines = [
        `[PENGADUAN PERBAIKAN TROTOAR DIFABEL - LELUASA SURABAYA]`,
        `Kepada Yth. Tim Pemeliharaan DSDABM / Pemkot Surabaya,`,
        ``,
        `Ditemukan hambatan aksesibilitas trotoar yang menghalangi pengguna kursi roda:`,
        `• Jenis Rintangan: ${obstacleTitle}`,
        hasCoords ? `• Titik Koordinat: ${latStr}, ${lngStr}` : null,
        hasCoords ? `• Lokasi Peta: ${mapLink}` : null,
        photoUrl ? `• Bukti Foto Lapangan: ${photoUrl}` : null,
        ``,
        `Mohon bantuan disposisi dan perbaikan teknis di lapangan. Terima kasih.`,
        `(Dilaporkan via Aplikasi Mobilitas Inklusif Leluasa)`
      ].filter(l => l !== null).join('\n');

      // 3. Salin juga ke clipboard sebagai cadangan
      if (navigator.clipboard) {
        navigator.clipboard.writeText(lines).catch(() => {});
      }

      // 4. Buka WhatsApp dengan teks pesan yang sudah terisi otomatis (Command Center 112 / Pengaduan Surabaya)
      const encodedText = encodeURIComponent(lines);
      const waUrl = `https://wa.me/6281131112112?text=${encodedText}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setActionFeedback('Format aduan disalin & membuka WhatsApp Pemkot Surabaya...');
      setTimeout(() => setActionFeedback(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [editingObstacle, setEditingObstacle] = useState(null);

  const handleObstacleSaved = (updated) => {
    setObstacles((prev) =>
      prev.map((o) => (String(o.id) === String(updated.id) ? { ...o, ...updated } : o))
    );
    setSelectedObstacle((prev) => (prev ? { ...prev, ...updated } : updated));
    const uLat = Number(updated.lat ?? updated.latitude);
    const uLng = Number(updated.lng ?? updated.longitude);
    if (Number.isFinite(uLat) && Number.isFinite(uLng) && mapInstanceRef.current) {
      mapInstanceRef.current.setView([uLat, uLng], 17, { animate: true });
    }
    setActionFeedback(`Laporan #${updated.id} berhasil diperbarui di database!`);
    setTimeout(() => setActionFeedback(''), 3500);
  };

  const handleObstacleDeleted = (deletedId) => {
    setObstacles((prev) => prev.filter((o) => String(o.id) !== String(deletedId)));
    setDrawerOpen(false);
    setSelectedObstacle(null);
    setActionFeedback(`Laporan #${deletedId} berhasil dihapus dari database!`);
    setTimeout(() => setActionFeedback(''), 3500);
  };

  const handleDeleteObstacle = async (obs) => {
    if (!obs) return;
    const confirmDelete = window.confirm(
      `Yakin ingin menghapus laporan "${obs.title || obs.name || 'Rintangan'}" (ID #${obs.id})?\n\nData dan file foto terkait akan dihapus secara permanen dari database Supabase.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteObstacle(obs.id);
      setObstacles((prev) => prev.filter((o) => String(o.id) !== String(obs.id)));
      setDrawerOpen(false);
      setSelectedObstacle(null);
      setActionFeedback(`Laporan #${obs.id} berhasil dihapus dari database!`);
      setTimeout(() => setActionFeedback(''), 3500);
    } catch (err) {
      alert(err.message || 'Gagal menghapus laporan.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-hidden bg-surface-container select-none animate-fadeIn">
      {/* KONTAINER PETA REAL LEAFLET */}
      <div
        ref={mapContainerRef}
        id="leaflet-map"
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* FLOATING HEADER TOP BAR (Responsive: Mobile & Desktop) */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 lg:right-6 z-30 flex flex-col gap-2 pointer-events-none">
        {errorMessage && (
          <div className="pointer-events-auto p-2 sm:p-2.5 rounded-xl bg-warning-container text-on-warning-container border border-warning/40 text-xs flex items-center justify-between shadow-md">
            <span>{errorMessage}</span>
            <button onClick={loadObstacles} className="px-2 py-0.5 rounded bg-primary text-on-primary font-bold">Coba Lagi</button>
          </div>
        )}

        {/* Card Header Navigasi Sesuai Mockup UI */}
        <div className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-[0_8px_24px_-4px_rgba(16,42,67,0.12)] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-outline-variant/30">
          {/* Logo & Tagline di Mobile */}
          <div className="flex items-center justify-between sm:hidden">
            <div className="flex flex-col">
              <span className="font-headline-sm text-base text-primary font-bold tracking-tight">Leluasa</span>
              <span className="text-[10px] text-on-surface-variant font-medium">All Access, All Ways.</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/50 border border-outline-variant/30 text-[11px] font-bold text-primary">
              <span className="material-symbols-outlined text-xs text-amber-600" aria-hidden="true">wb_sunny</span>
              <span>Cerah 31°C</span>
            </div>
          </div>

          {/* Kolom Pencarian */}
          <div className="flex-1 relative flex items-center min-w-0">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none">
              search
            </span>
            <input
              className="w-full h-10 sm:h-11 pl-9 pr-10 text-on-surface placeholder:text-outline font-body-sm text-xs sm:text-sm bg-surface-container-low/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary font-medium truncate"
              placeholder="Cari tujuan ramah akses.."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={handleAudioWayfinding}
              className="absolute right-2 w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-surface-container transition-colors"
              type="button"
              aria-label="Pencarian suara"
            >
              <span className="material-symbols-outlined text-lg">mic</span>
            </button>
          </div>

          {/* Weather Badge, Sonar Status & Layer Controls di Desktop (Civic Sapphire) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-[11px] font-bold text-primary shadow-xs">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
              <span>Sonar Aktif</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/30 text-[11px] font-bold text-primary shadow-xs">
              <span className="material-symbols-outlined text-xs text-amber-600" aria-hidden="true">wb_sunny</span>
              <span>Cerah 31°C</span>
            </div>

            <div className="h-6 w-px bg-outline-variant/40"></div>

            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
              <button
                onClick={() => setActiveLayerMode('standard')}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  activeLayerMode === 'standard' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
                }`}
                type="button"
              >
                <span>OSM</span>
              </button>
              <button
                onClick={() => setActiveLayerMode('hot')}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  activeLayerMode === 'hot' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
                }`}
                type="button"
              >
                <span>Trotoar (HOT)</span>
              </button>
              <button
                onClick={() => setActiveLayerMode('satellite')}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  activeLayerMode === 'satellite' ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant'
                }`}
                type="button"
              >
                <span>Satelit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-[118px] sm:top-[92px] left-2 sm:left-4 z-20 max-w-[calc(100%-5rem)] rounded-xl border border-outline-variant/30 bg-surface-container-lowest/95 px-3 py-2 text-[10px] sm:text-xs text-on-surface shadow-md pointer-events-none">
        <div className="font-bold text-primary">{gpsStatusLabel}</div>
        {coords ? (
          <div className="mt-0.5 text-on-surface-variant">
            Lat {coords.lat.toFixed(6)} · Lng {coords.lng.toFixed(6)} · Akurasi ±{Math.round(accuracy)} m
            {!isAccurate && <span className="block text-warning">Akurasi rendah; posisi dapat kurang tepat.</span>}
            {timestamp && <span className="block">Diperbarui {new Date(timestamp).toLocaleTimeString()}</span>}
          </div>
        ) : gpsError ? (
          <div className="mt-0.5 text-on-surface-variant">{gpsError.message}</div>
        ) : null}
      </div>

      {/* FLOATING ACTION BUTTONS KANAN (Sesuai Mockup UI 1: Speaker, Locate, + Lapor) */}
      <div className="absolute right-3 sm:right-6 top-36 sm:top-28 z-20 flex flex-col items-center gap-2.5 pointer-events-auto">
        {/* Tombol Audio Wayfinding */}
        <button
          type="button"
          onClick={handleAudioWayfinding}
          aria-label="Dengarkan panduan audio navigasi"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-surface-container-lowest text-primary shadow-[0_4px_16px_rgba(16,42,67,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-outline-variant/30"
          title="Panduan Audio Trotoar"
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl text-secondary">volume_up</span>
        </button>

        {/* Tombol Pusatkan GPS */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={gpsLoading}
          aria-label="Pusatkan posisi saya"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-surface-container-lowest text-primary shadow-[0_4px_16px_rgba(16,42,67,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-outline-variant/30 disabled:opacity-60"
          title="Deteksi ulang dan pusatkan ke lokasi GPS saya"
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl text-secondary">my_location</span>
        </button>

        {/* Tombol Kuning Mengambang: + Lapor (Mockup UI) */}
        <button
          type="button"
          onClick={() => setActiveTab('report-obstacle')}
          aria-label="Laporkan rintangan baru"
          className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-warning text-on-warning font-label-md text-xs sm:text-sm font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 border-2 border-white ring-2 ring-warning/30"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl font-bold">notification_important</span>
          <span>+ Lapor</span>
        </button>
      </div>

      {/* KONTROL ZOOM KIRI BAWAH */}
      <div className="hidden sm:flex absolute left-4 bottom-24 z-20 flex-col bg-surface-container-lowest rounded-xl shadow-[0_4px_16px_rgba(16,42,67,0.12)] overflow-hidden border border-outline-variant/30">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          type="button"
          aria-label="Perbesar peta"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
        <div className="h-px bg-outline-variant/30 w-6 mx-auto"></div>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          type="button"
          aria-label="Perkecil peta"
        >
          <span className="material-symbols-outlined text-lg">remove</span>
        </button>
      </div>

      {/* NOTIFIKASI TOAST / FEEDBACK */}
      {actionFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 p-3 sm:p-3.5 rounded-2xl bg-primary text-white font-label-sm text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 border border-secondary/40 animate-fadeIn"
        >
          <span className="material-symbols-outlined text-secondary-container text-base sm:text-lg">info</span>
          <span>{actionFeedback}</span>
        </div>
      )}



      {/* DETAIL RINTANGAN PANEL SAMPING (Sesuai Mockup UI 2: Desktop Left Panel / Mobile Bottom Drawer) */}
      {selectedObstacle && drawerOpen && (
        <aside
          role="dialog"
          aria-label="Detail rintangan trotoar"
          className="fixed lg:absolute inset-x-0 bottom-0 max-h-[85vh] lg:max-h-full lg:w-[460px] lg:top-0 lg:left-0 lg:bottom-0 rounded-t-3xl lg:rounded-none bg-surface-container-lowest shadow-2xl z-40 flex flex-col overflow-y-auto transition-transform duration-300 border-r border-outline-variant/30 pb-safe"
        >
          {/* Header Panel Detail */}
          <div className="p-3 sm:p-4 border-b border-outline-variant/20 flex items-center justify-between sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md z-10">
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:text-secondary transition-colors"
              aria-label="Kembali ke peta navigasi"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Kembali ke Peta</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-secondary text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>Terverifikasi Komunitas</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  setActionFeedback('Tautan rintangan disalin ke clipboard!');
                  setTimeout(() => setActionFeedback(''), 3000);
                }}
                className="w-8 h-8 rounded-lg hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors"
                aria-label="Bagikan rintangan ini"
              >
                <span className="material-symbols-outlined text-base">share</span>
              </button>
            </div>
          </div>

          {/* Isi Konten Detail (Mockup UI 2) */}
          <div className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4 flex-1">
            {/* Judul & Lokasi (Dipindah ke Bagian Atas) */}
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-primary tracking-tight">
                {selectedObstacle.title || selectedObstacle.name || 'Bollard di trotoar'}
              </h2>
              <div className="flex items-center gap-1.5 text-on-surface-variant text-xs flex-wrap">
                <span className="material-symbols-outlined text-secondary text-sm">pin_drop</span>
                <span>
                  {selectedObstacle.location || selectedObstacle.location_text || (
                    selectedObstacle.lat != null ? `Titik GPS (${Number(selectedObstacle.lat).toFixed(6)}, ${Number(selectedObstacle.lng).toFixed(6)})` : 'Lokasi Terlapor'
                  )}
                </span>
                <span>•</span>
                <span className="font-semibold text-primary">
                  {formatReportTimeWIB(selectedObstacle.reported_at || selectedObstacle.created_at || selectedObstacle.reportedTime)}
                </span>
              </div>
            </div>

            {/* Badges Status & Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedObstacle.severity === 'impassable' ? (
                <span className="px-3 py-1 rounded-full bg-error text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                  <span className="material-symbols-outlined text-sm">block</span>
                  <span>Tidak bisa dilewati (TERBLOKIR)</span>
                </span>
              ) : selectedObstacle.severity === 'difficult' ? (
                <span className="px-3 py-1 rounded-full bg-warning text-on-warning font-bold text-xs flex items-center gap-1 shadow-xs">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>Sulit (Ubin Rusak)</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-secondary text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Bisa dilewati</span>
                </span>
              )}

              <span className="px-3 py-1 rounded-full border border-secondary text-secondary font-bold text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">groups</span>
                <span>Terverifikasi {selectedObstacle.confirmedCount || 12} Warga</span>
              </span>

              {selectedObstacle.clearanceLabel && (
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-bold text-xs flex items-center gap-1 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-sm">straighten</span>
                  <span>{selectedObstacle.clearanceLabel}</span>
                </span>
              )}
            </div>

            {/* Catatan / Rincian Laporan (jika ada) */}
            {(selectedObstacle.notes || selectedObstacle.description) && (
              <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant text-xs leading-relaxed border border-outline-variant/20">
                <span className="font-bold text-primary block mb-0.5">Catatan Laporan:</span>
                {selectedObstacle.notes || selectedObstacle.description}
              </div>
            )}

            {/* Foto Rintangan Lapangan (Dipindah ke Bagian Bawah Teks agar Ruang Bawah Terisi Proporsional) */}
            {(selectedObstacle.photo_url || selectedObstacle.image_url) && (
              <div className="w-full h-52 sm:h-56 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-xs relative bg-surface-container shrink-0">
                <img
                  src={selectedObstacle.photo_url || selectedObstacle.image_url}
                  alt={selectedObstacle.title || selectedObstacle.name || 'Foto Rintangan Lapangan'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span>Foto Terverifikasi Lapangan</span>
                </div>
              </div>
            )}

            {/* Aksi Verifikasi Warga & DPUPR */}
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20 mt-auto">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpvote(selectedObstacle.id)}
                  className="min-h-[40px] px-2 rounded-xl bg-secondary-container text-secondary font-bold text-xs flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">thumb_up</span>
                  <span>Masih Ada ({selectedObstacle.upvotes || 9})</span>
                </button>
                <button
                  onClick={() => handleResolve(selectedObstacle.id)}
                  className="min-h-[40px] px-2 rounded-xl bg-surface-container-low text-on-surface font-semibold text-xs flex items-center justify-center gap-1 hover:bg-surface-container border border-outline-variant/40 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base text-secondary">task_alt</span>
                  <span>Sudah Bersih</span>
                </button>
              </div>

              <button
                onClick={() => handleDispatch(selectedObstacle)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                type="button"
                title="Kirim laporan ini langsung ke WhatsApp Pengaduan Pemkot Surabaya"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Kirim Aduan ke Pemkot (WhatsApp)</span>
              </button>

              <button
                onClick={() => setEditingObstacle(selectedObstacle)}
                className="w-full min-h-[38px] rounded-xl bg-surface-container text-primary hover:bg-surface-container-high text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/40"
                type="button"
                title="Ubah titik lokasi di peta atau edit rincian laporan ini"
              >
                <span className="material-symbols-outlined text-base text-secondary">edit_location_alt</span>
                <span>Edit Titik / Laporan</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal Edit Laporan Rintangan (Interaktif Peta & Fitur Hapus) */}
      <EditObstacleModal
        isOpen={Boolean(editingObstacle)}
        obstacle={editingObstacle}
        onClose={() => setEditingObstacle(null)}
        onSaved={handleObstacleSaved}
        onDeleted={handleObstacleDeleted}
      />
    </div>
  );
}
