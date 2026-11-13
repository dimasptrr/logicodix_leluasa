import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createObstacle, geocodeSearch, reverseGeocode } from '../features/dashboard/services/safeApi.js';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

async function compressPhoto(file) {
  const image = await createImageBitmap(file);
  let scale = Math.min(1, 1600 / Math.max(image.width, image.height));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses foto.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82 - attempt * 0.04));
    if (blob && blob.size <= MAX_PHOTO_BYTES) {
      image.close();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Foto gagal dibaca.'));
        reader.readAsDataURL(blob);
      });
    }
    scale *= 0.82;
  }

  image.close();
  throw new Error('Ukuran foto masih terlalu besar setelah dikompresi. Pilih foto lain.');
}

export default function ReportObstacle({ setActiveTab }) {
  // Mode Pelaporan: 'at_location' (di lokasi rintangan) vs 'remote' (tidak di lokasi / pelaporan jarak jauh)
  const [reportMode, setReportMode] = useState('at_location');

  // Data formulir pelaporan
  const [category, setCategory] = useState('Bollard / Pembatas');
  const [clearanceOption, setClearanceOption] = useState('less_80');
  const [severity, setSeverity] = useState('impassable');
  const [notes, setNotes] = useState('');
  const [locationText, setLocationText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Pencarian Lokasi Jarak Jauh (Remote Search)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Status proses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [reportTicketId, setReportTicketId] = useState('');

  const fileInputRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const reportMarkerRef = useRef(null);
  const isManualAdjustmentRef = useRef(false);
  const centerOnNextGpsFixRef = useRef(true);
  const searchDropdownRef = useRef(null);

  const {
    coords: gpsCoords,
    accuracy: gpsAccuracy,
    status: gpsStatus,
    error: gpsError,
    loading: gpsLoading,
    refreshLocation
  } = useGeolocation();

  const gpsStatusLabel = {
    idle: 'Belum mencari lokasi',
    loading: 'Sedang mencari lokasi GPS...',
    located: 'Lokasi GPS terdeteksi',
    denied: 'Izin lokasi GPS ditolak',
    unavailable: 'Lokasi GPS tidak tersedia',
    timeout: 'Pencarian GPS timeout',
    unsupported: 'Browser tidak mendukung GPS',
    'insecure-context': 'GPS memerlukan HTTPS atau localhost'
  }[gpsStatus];

  const categories = [
    { id: 'Bollard / Pembatas', label: 'Bollard / Pembatas', icon: 'front_hand' },
    { id: 'Paving Rusak', label: 'Ubin Rusak / Berlubang', icon: 'broken_image' },
    { id: 'Galian / Proyek', label: 'Galian Proyek', icon: 'construction' },
    { id: 'Rampa Rusak', label: 'Rampa Rusak / Curam', icon: 'ramp_right' },
    { id: 'Tangga Tanpa Rampa', label: 'Tangga Tanpa Rampa', icon: 'stairs' },
  ];

  // Menutup dropdown pencarian saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Geocoding Search saat user mengetik alamat di mode remote
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const centerLat = selectedLocation?.lat || gpsCoords?.lat || -7.2575;
        const centerLng = selectedLocation?.lng || gpsCoords?.lng || 112.7521;
        const res = await geocodeSearch(trimmed, centerLat, centerLng);
        setSearchResults(res.data || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.warn('Geocode search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation?.lat, selectedLocation?.lng, gpsCoords?.lat, gpsCoords?.lng]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitError(null);
    try {
      setUploadedImage(await compressPhoto(file));
    } catch (error) {
      setUploadedImage(null);
      setSubmitError(error.message || 'Foto gagal diproses. Silakan pilih foto lain.');
    }
  };

  // Handler pemilihan titik manual (klik peta atau geser pin)
  const handleMapPointSelect = async (lat, lng) => {
    isManualAdjustmentRef.current = true;
    centerOnNextGpsFixRef.current = false;
    setSelectedLocation({
      lat,
      lng,
      accuracy: null,
      source: reportMode === 'at_location' ? 'gps_adjusted' : 'manual'
    });
    setSubmitError(null);

    // Dapatkan nama jalan/tempat ramah pengguna via reverse-geocoding
    setIsGeocoding(true);
    try {
      const res = await reverseGeocode(lat, lng);
      if (res?.data?.name || res?.data?.address) {
        const full = [res.data.name, res.data.address].filter(Boolean).join(', ');
        setLocationText(full);
      } else {
        setLocationText(`Titik Peta (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      }
    } catch {
      setLocationText(`Titik Peta (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const selectManualLocationRef = useRef(handleMapPointSelect);
  selectManualLocationRef.current = handleMapPointSelect;

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (submitSuccess || !mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [-7.2575, 112.7521];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
      maxZoom: 19
    }).addTo(map);

    map.on('click', (event) => {
      selectManualLocationRef.current?.(event.latlng.lat, event.latlng.lng);
    });

    mapInstanceRef.current = map;
    map.invalidateSize();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      reportMarkerRef.current = null;
    };
  }, [submitSuccess]);

  // Sinkronisasi otomatis dengan GPS saat dalam mode "Saya di Lokasi"
  useEffect(() => {
    if (reportMode !== 'at_location') return;

    if (gpsCoords && !isManualAdjustmentRef.current) {
      setSelectedLocation({
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        accuracy: gpsCoords.accuracy,
        source: 'gps'
      });
      setSubmitError(null);

      // Ambil nama alamat otomatis untuk GPS
      reverseGeocode(gpsCoords.lat, gpsCoords.lng)
        .then((res) => {
          if (res?.data?.name || res?.data?.address) {
            setLocationText([res.data.name, res.data.address].filter(Boolean).join(', '));
          } else {
            setLocationText(`Titik GPS (${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})`);
          }
        })
        .catch(() => {
          setLocationText(`Titik GPS (${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})`);
        });

      return;
    }

    if (!gpsCoords && ['denied', 'unavailable', 'timeout', 'unsupported', 'insecure-context'].includes(gpsStatus)) {
      if (!selectedLocation) {
        setLocationText('');
      }
    }
  }, [gpsCoords, gpsStatus, reportMode]);

  // Marker & Map View Sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!selectedLocation) {
      if (reportMarkerRef.current) {
        map.removeLayer(reportMarkerRef.current);
        reportMarkerRef.current = null;
      }
      return;
    }

    if (!reportMarkerRef.current) {
      const reportIcon = L.divIcon({
        className: 'report-location-marker',
        html: '<div class="w-8 h-8 rounded-full bg-error text-white border-2 border-white shadow-xl flex items-center justify-center transform hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"><span class="material-symbols-outlined text-base">location_on</span></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: reportIcon,
        draggable: true,
        title: 'Pin lokasi rintangan (dapat digeser)'
      }).addTo(map);

      marker.on('dragend', (event) => {
        const point = event.target.getLatLng();
        selectManualLocationRef.current?.(point.lat, point.lng);
      });

      reportMarkerRef.current = marker;
    } else {
      reportMarkerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    }

    if (selectedLocation.source === 'gps' && centerOnNextGpsFixRef.current) {
      map.setView([selectedLocation.lat, selectedLocation.lng], 17, { animate: true });
      centerOnNextGpsFixRef.current = false;
    }
  }, [selectedLocation, submitSuccess]);

  // Ganti mode pelaporan (Di Lokasi vs Tidak di Lokasi)
  const handleModeChange = (newMode) => {
    setReportMode(newMode);
    setSubmitError(null);
    setShowSearchDropdown(false);

    if (newMode === 'at_location') {
      isManualAdjustmentRef.current = false;
      centerOnNextGpsFixRef.current = true;
      if (gpsCoords) {
        setSelectedLocation({
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
          accuracy: gpsCoords.accuracy,
          source: 'gps'
        });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([gpsCoords.lat, gpsCoords.lng], 17, { animate: true });
        }
        reverseGeocode(gpsCoords.lat, gpsCoords.lng)
          .then((res) => {
            if (res?.data?.name || res?.data?.address) {
              setLocationText([res.data.name, res.data.address].filter(Boolean).join(', '));
            } else {
              setLocationText(`Titik GPS (${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})`);
            }
          })
          .catch(() => {
            setLocationText(`Titik GPS (${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})`);
          });
      } else {
        refreshLocation();
      }
    } else {
      // Remote mode: jika sudah ada titik, jadikan manual
      if (selectedLocation) {
        setSelectedLocation((prev) => ({ ...prev, source: 'manual', accuracy: null }));
      }
    }
  };

  const handleDetectGPS = () => {
    isManualAdjustmentRef.current = false;
    centerOnNextGpsFixRef.current = true;
    setSubmitError(null);
    refreshLocation();
  };

  // Pilih hasil pencarian autocomplete
  const handleSelectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    isManualAdjustmentRef.current = true;
    setSelectedLocation({
      lat,
      lng,
      accuracy: null,
      source: 'manual'
    });

    const fullText = [result.name, result.address].filter(Boolean).join(', ');
    setLocationText(fullText);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setSubmitError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    }
  };

  // Quick jump lokasi populer di Surabaya untuk kemudahan pengguna jarak jauh
  const handleQuickJump = (lat, lng, label) => {
    isManualAdjustmentRef.current = true;
    setSelectedLocation({
      lat,
      lng,
      accuracy: null,
      source: 'manual'
    });
    setLocationText(label);
    setSubmitError(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    }
  };

  const handleLocationTextChange = (event) => {
    // Memperbarui deskripsi alamat tanpa menghapus koordinat pin yang sudah dipilih
    setLocationText(event.target.value);
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!selectedLocation) {
      setSubmitError(
        reportMode === 'at_location'
          ? 'Lokasi belum ditemukan via GPS. Nyalakan GPS perangkat atau pilih tab "Tidak di Lokasi" untuk menandai rintangan di peta.'
          : 'Titik rintangan belum ditentukan. Cari nama jalan atau klik langsung pada peta untuk menandai lokasi rintangan.'
      );
      return;
    }

    if (
      !Number.isFinite(selectedLocation.lat) ||
      !Number.isFinite(selectedLocation.lng) ||
      selectedLocation.lat < -90 || selectedLocation.lat > 90 ||
      selectedLocation.lng < -180 || selectedLocation.lng > 180
    ) {
      setSubmitError('Koordinat lokasi tidak valid. Pilih ulang lokasi melalui peta atau pencarian.');
      return;
    }

    if (!locationText.trim()) {
      setSubmitError('Keterangan lokasi belum diisi. Masukkan nama jalan atau patokan lokasi rintangan.');
      return;
    }
    if (!uploadedImage) {
      setSubmitError('Unggah foto rintangan sebelum mengirim laporan.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const clearanceVal = clearanceOption === 'less_80' ? 65 : clearanceOption === '80_120' ? 95 : 130;

      const reportNote = notes.trim()
        ? `${notes.trim()}${reportMode === 'remote' ? ' (Dilaporkan secara jarak jauh)' : ''}`
        : (reportMode === 'remote' ? 'Rintangan trotoar dilaporkan secara jarak jauh oleh warga.' : 'Rintangan trotoar dilaporkan langsung oleh warga di lokasi.');

      const result = await createObstacle({
        title: `${category} dilaporkan di ${locationText.split(',')[0]}`,
        locationText: locationText.trim(),
        location: locationText.trim(),
        coordinates: { lat: selectedLocation.lat, lng: selectedLocation.lng },
        locationAccuracyM: selectedLocation.source === 'gps' ? selectedLocation.accuracy : null,
        category,
        clearance: clearanceVal,
        clearanceOption,
        severity,
        notes: reportNote,
        forwardDpupr: true,
        shareCommunity: true,
        uploadedImage,
      });

      setReportTicketId(result.data.id);
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.message || 'Gagal mengirimkan laporan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setSubmitError(null);
    setUploadedImage(null);
    setNotes('');
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // TAMPILAN JIKA SUDAH BERHASIL TERKIRIM
  if (submitSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-fadeIn flex flex-col items-center text-center">
        <div className="w-full p-6 sm:p-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary-container text-secondary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-4xl" aria-hidden="true">check_circle</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="px-3 py-1 rounded-full bg-secondary-container text-secondary text-xs font-bold inline-block self-center">
              Laporan Terkirim · Menunggu Verifikasi
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-primary mt-2">
              Laporan Berhasil Terkirim
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
              Terima kasih atas kontribusi Anda membantu pejalan kaki dan pengguna kursi roda di Surabaya.
            </p>
          </div>

          <div className="w-full p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2 text-left text-xs">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="text-on-surface-variant font-medium">Nomor Tiket</span>
              <span className="font-mono font-bold text-primary">{reportTicketId}</span>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="text-on-surface-variant font-medium">Jenis Rintangan</span>
              <span className="font-bold text-on-surface">{category}</span>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="text-on-surface-variant font-medium">Metode Pelaporan</span>
              <span className="font-semibold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-secondary" aria-hidden="true">
                  {reportMode === 'at_location' ? 'my_location' : 'travel_explore'}
                </span>
                <span>{reportMode === 'at_location' ? 'Langsung di Lokasi (GPS)' : 'Pelaporan Jarak Jauh (Peta)'}</span>
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span className="text-on-surface-variant font-medium">Lokasi</span>
              <span className="font-semibold text-on-surface truncate max-w-[220px]" title={locationText}>
                {locationText}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-medium">Dampak Akses</span>
              <span className={`font-bold ${
                severity === 'impassable' ? 'text-error' : severity === 'difficult' ? 'text-warning' : 'text-secondary'
              }`}>
                {severity === 'impassable' ? 'Tidak bisa dilewati' : severity === 'difficult' ? 'Sulit' : 'Bisa dilewati'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.__leluasaTargetObstacle = {
                    id: reportTicketId,
                    lat: selectedLocation?.lat,
                    lng: selectedLocation?.lng
                  };
                }
                setActiveTab('explore-map');
              }}
              className="flex-1 min-h-[46px] rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:bg-primary-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">map</span>
              <span>Lihat di Peta Navigasi</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[46px] px-5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold text-xs sm:text-sm hover:bg-surface-container transition-colors"
            >
              Buat Laporan Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FORMULIR PELAPORAN
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 animate-fadeIn pb-16 lg:pb-8">
      {/* Input File Kamera / Galeri */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/jpeg,image/png,image/webp"
        capture={reportMode === 'at_location' ? 'environment' : undefined}
        className="hidden"
        aria-hidden="true"
      />

      {/* Header Halaman */}
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
            Lapor Rintangan Trotoar
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Bantu sesama pengguna kursi roda dan pejalan kaki menjelajahi kota Surabaya dengan aman.
          </p>
        </div>
      </div>

      {/* Alert Galat */}
      {submitError && (
        <div role="status" className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base" aria-hidden="true">warning</span>
            <span>{submitError}</span>
          </div>
          <button type="button" onClick={() => setSubmitError(null)} className="font-bold underline text-xs">
            Tutup
          </button>
        </div>
      )}

      {/* Form Grid 2 Kolom */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Kolom Kiri (md:col-span-5): Mode & Lokasi, Foto */}
        <div className="md:col-span-5 flex flex-col gap-3">
          
          {/* Card Lokasi Trotoar (Dengan Mode Switcher 2 Pilihan) */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2.5">
            
            {/* Judul & Tombol Deteksi Ulang */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <span className="material-symbols-outlined text-base text-secondary" aria-hidden="true">location_on</span>
                <span>Lokasi Rintangan *</span>
              </span>
              {reportMode === 'at_location' && (
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={gpsLoading}
                  className="text-secondary font-bold hover:underline text-[11px] flex items-center gap-0.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">my_location</span>
                  <span>{gpsLoading ? 'Mencari...' : 'Deteksi Ulang'}</span>
                </button>
              )}
            </div>

            {/* SEGMENTED TAB SWITCH: Sedang di Lokasi vs Tidak di Lokasi */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container rounded-xl border border-outline-variant/20">
              <button
                type="button"
                onClick={() => handleModeChange('at_location')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  reportMode === 'at_location'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-bold border border-outline-variant/30'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0 text-secondary" aria-hidden="true">
                  my_location
                </span>
                <div className="text-left leading-tight truncate">
                  <div className="font-bold truncate">Saya di Lokasi</div>
                  <div className="text-[10px] opacity-75 hidden sm:block truncate">GPS Otomatis</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('remote')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  reportMode === 'remote'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-bold border border-outline-variant/30'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base shrink-0 text-primary" aria-hidden="true">
                  travel_explore
                </span>
                <div className="text-left leading-tight truncate">
                  <div className="font-bold truncate">Tidak di Lokasi</div>
                  <div className="text-[10px] opacity-75 hidden sm:block truncate">Cari & Pilih di Peta</div>
                </div>
              </button>
            </div>

            {/* Info Mode: Di Lokasi (GPS) */}
            {reportMode === 'at_location' && (
              <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${gpsStatus === 'located' ? 'bg-secondary' : 'bg-warning animate-pulse'}`} />
                    <span>{gpsStatusLabel}</span>
                  </span>
                  {gpsCoords && (
                    <span className="text-secondary font-semibold text-[10px] bg-secondary/10 px-1.5 py-0.5 rounded-md">
                      ±{Math.round(gpsAccuracy)} m
                    </span>
                  )}
                </div>
                {gpsError && <span className="text-error">{gpsError.message}</span>}
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  Posisi otomatis diambil dari GPS Anda. Jika titik kurang pas, Anda dapat menggeser pin merah di peta.
                </p>
              </div>
            )}

            {/* Info Mode: Tidak di Lokasi (Remote & Autocomplete Search) */}
            {reportMode === 'remote' && (
              <div className="flex flex-col gap-2">
                <div className="p-2 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-on-surface flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0" aria-hidden="true">travel_explore</span>
                  <span>
                    <strong>Pelaporan Jarak Jauh:</strong> Cari alamat rintangan di bawah, atau ketuk langsung pada peta untuk menaruh pin.
                  </span>
                </div>

                {/* Input Pencarian Alamat / Tempat dengan Live Autocomplete */}
                <div className="relative" ref={searchDropdownRef}>
                  <div className="flex items-center bg-surface-container rounded-xl border border-outline-variant/30 px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
                    <span className="material-symbols-outlined text-on-surface-variant text-base mr-1.5 shrink-0" aria-hidden="true">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                      placeholder="Cari jalan / tempat (cth: Jl. Pemuda, Tunjungan...)"
                      className="w-full bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
                    />
                    {isSearching && (
                      <span className="material-symbols-outlined text-secondary text-base animate-spin shrink-0" aria-hidden="true">progress_activity</span>
                    )}
                    {searchQuery && !isSearching && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }}
                        className="text-on-surface-variant hover:text-on-surface p-0.5"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                      </button>
                    )}
                  </div>

                  {/* Dropdown Hasil Pencarian */}
                  {showSearchDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl z-[1000] p-1 flex flex-col gap-0.5">
                      {searchResults.length > 0 ? (
                        searchResults.map((item, idx) => (
                          <button
                            key={`${item.id || idx}-${item.lat}`}
                            type="button"
                            onClick={() => handleSelectSearchResult(item)}
                            className="w-full p-2 rounded-lg text-left hover:bg-surface-container flex items-start gap-2 transition-colors cursor-pointer group"
                          >
                            <span className="material-symbols-outlined text-secondary text-base mt-0.5 shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true">
                              location_on
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-primary truncate">{item.name}</span>
                              <span className="text-[10px] text-on-surface-variant line-clamp-1">{item.address}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-2.5 text-center text-xs text-on-surface-variant">
                          Tidak ada tempat ditemukan. Silakan klik langsung pada peta.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Jump Chips untuk Surabaya */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
                  <span className="text-on-surface-variant shrink-0 font-medium">Pintasan:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickJump(-7.2657, 112.7508, 'Balai Kota Surabaya, Jl. Walikota Mustajab')}
                    className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-medium shrink-0 border border-outline-variant/20 transition-colors"
                  >
                    Balai Kota
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickJump(-7.2618, 112.7388, 'Tunjungan Plaza, Jl. Basuki Rahmat')}
                    className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-medium shrink-0 border border-outline-variant/20 transition-colors"
                  >
                    Tunjungan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickJump(-7.2655, 112.7535, 'Stasiun Surabaya Gubeng, Jl. Stasiun Gubeng')}
                    className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-medium shrink-0 border border-outline-variant/20 transition-colors"
                  >
                    St. Gubeng
                  </button>
                </div>
              </div>
            )}

            {/* Peta Interaktif Leaflet */}
            <div className="relative z-0 isolate rounded-xl overflow-hidden">
              <div
                ref={mapContainerRef}
                aria-label="Peta penentuan titik rintangan"
                className="w-full h-52 sm:h-60 rounded-xl border border-outline-variant/40 overflow-hidden"
              />
              {isGeocoding && (
                <div className="absolute top-2 right-2 bg-surface-container-lowest/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-outline-variant/30 text-[10px] font-semibold text-primary flex items-center gap-1 shadow-xs z-10">
                  <span className="material-symbols-outlined text-xs animate-spin" aria-hidden="true">progress_activity</span>
                  <span>Mencari alamat...</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-secondary shrink-0" aria-hidden="true">touch_app</span>
              <span>Ketuk peta atau geser pin merah untuk menandai titik rintangan yang tepat.</span>
            </p>

            {/* Keterangan Alamat / Patokan (Bisa Diedit Manual) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                <span>Alamat / Patokan Lokasi:</span>
                {selectedLocation && (
                  <span className="font-mono text-[10px] text-on-surface-variant font-normal">
                    {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={locationText}
                onChange={handleLocationTextChange}
                placeholder="Contoh: Jl. Pemuda (depan Halte Busway), trotoar timur..."
                className="w-full p-2.5 rounded-xl bg-surface-container text-xs text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30"
              />
            </div>
          </div>

          {/* Box Foto */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-secondary" aria-hidden="true">photo_camera</span>
                <span>Foto Bukti Rintangan *</span>
              </span>
              {uploadedImage && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-secondary font-bold hover:underline text-[11px]"
                >
                  Ganti Foto
                </button>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full aspect-[4/3] rounded-xl border-2 border-dashed border-primary/30 hover:border-primary bg-surface-container-low flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors overflow-hidden group"
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Foto rintangan terlampir" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                  <div className="w-10 h-10 rounded-full bg-surface-container-lowest text-primary shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-xl" aria-hidden="true">
                      {reportMode === 'at_location' ? 'photo_camera' : 'add_photo_alternate'}
                    </span>
                  </div>
                  <span className="font-bold text-xs text-primary mt-1">
                    {reportMode === 'at_location' ? 'Ambil / Unggah Foto Rintangan' : 'Pilih Foto dari Galeri / Kamera'}
                  </span>
                  <span className="text-[10px]">
                    {reportMode === 'at_location' ? 'Kamera langsung atau galeri file' : 'Unggah foto rintangan trotoar'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Opsi Pelapor Anonim */}
          <label className="p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex items-center justify-between cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary">Lapor sebagai Anonim</span>
              <span className="text-[10px] text-on-surface-variant">Nama Anda tidak akan dipublikasikan</span>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
            />
          </label>
        </div>

        {/* Kolom Kanan (md:col-span-7): Detail Rintangan */}
        <div className="md:col-span-7 flex flex-col gap-3">
          
          {/* Jenis Rintangan */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Jenis Rintangan *</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    category === c.id
                      ? 'bg-primary text-on-primary shadow-xs font-bold'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm shrink-0" aria-hidden="true">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lebar Celah Trotoar */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Perkiraan Lebar Celah *</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setClearanceOption('less_80')}
                className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                  clearanceOption === 'less_80'
                    ? 'border-error bg-error/10 text-error'
                    : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <div className="text-xs">&lt; 80 cm</div>
                <div className="text-[10px] font-normal opacity-80">Sempit</div>
              </button>

              <button
                type="button"
                onClick={() => setClearanceOption('80_120')}
                className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                  clearanceOption === '80_120'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <div className="text-xs">80 - 120 cm</div>
                <div className="text-[10px] font-normal opacity-80">Cukup</div>
              </button>

              <button
                type="button"
                onClick={() => setClearanceOption('more_120')}
                className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                  clearanceOption === 'more_120'
                    ? 'border-secondary bg-secondary/10 text-secondary'
                    : 'border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <div className="text-xs">&gt; 120 cm</div>
                <div className="text-[10px] font-normal opacity-80">Leluasa</div>
              </button>
            </div>
          </div>

          {/* Kondisi Akses / Keparahan */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Kondisi Akses *</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSeverity('passable')}
                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  severity === 'passable'
                    ? 'border-secondary bg-secondary/10 text-secondary'
                    : 'border-outline-variant/40 bg-surface-container text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                <span>Bisa dilewati</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('difficult')}
                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  severity === 'difficult'
                    ? 'border-warning bg-warning/10 text-on-warning'
                    : 'border-outline-variant/40 bg-surface-container text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">warning</span>
                <span>Sulit</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('impassable')}
                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  severity === 'impassable'
                    ? 'border-error bg-error/10 text-error'
                    : 'border-outline-variant/40 bg-surface-container text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">block</span>
                <span>Terblokir</span>
              </button>
            </div>
          </div>

          {/* Catatan Singkat (Opsional) */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-1.5">
            <span className="text-xs font-bold text-primary">Catatan Tambahan (Opsional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: trotoar licin setelah hujan, ubin tactile lepas..."
              className="w-full p-2.5 rounded-xl bg-surface-container text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30"
            />
          </div>

          {/* Tombol Aksi Bawah */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('explore-map')}
              className="px-4 py-2.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[46px] px-6 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-all active:scale-98 disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">send</span>
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
