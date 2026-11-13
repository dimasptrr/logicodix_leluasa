import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { updateObstacle, deleteObstacle, reverseGeocode } from '../features/dashboard/services/safeApi.js';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';

const CATEGORY_OPTIONS = [
  'Bollard / Pembatas',
  'Paving Rusak',
  'Galian / Proyek',
  'Trotoar Sempit (< 80cm)',
  'Rampa Curam (> 10%)',
  'Pohon / Rintangan Alami',
  'Parkir Liar di Trotoar',
  'Lainnya'
];

export default function EditObstacleModal({ isOpen, onClose, obstacle, onSaved, onDeleted }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const { coords, refreshLocation } = useGeolocation();

  // Form states
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('difficult');
  const [gapWidth, setGapWidth] = useState('less_80');
  const [notes, setNotes] = useState('');
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sinkronkan state form dengan data obstacle yang sedang diedit
  useEffect(() => {
    if (!obstacle) return;
    setCategory(obstacle.category || obstacle.title || obstacle.name || 'Bollard / Pembatas');
    setSeverity(obstacle.severity === 'caution' ? 'difficult' : (obstacle.severity || 'difficult'));
    setGapWidth(obstacle.gap_width || (obstacle.clearance_cm < 80 ? 'less_80' : obstacle.clearance_cm <= 120 ? '80_120' : 'more_120'));
    setNotes(obstacle.notes || obstacle.weather_condition || '');

    const lat = Number(obstacle.lat ?? obstacle.latitude ?? obstacle.coordinates?.lat ?? -7.2616);
    const lng = Number(obstacle.lng ?? obstacle.longitude ?? obstacle.coordinates?.lng ?? 112.7492);
    setSelectedLat(lat);
    setSelectedLng(lng);
    setLocationLabel(obstacle.location || obstacle.location_text || `Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    setErrorMessage('');
  }, [obstacle, isOpen]);

  // Inisialisasi Peta Leaflet di dalam Modal
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialLat = selectedLat ?? -7.2616;
    const initialLng = selectedLng ?? 112.7492;

    // Bersihkan instance peta lama jika ada
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap kontributor',
      maxZoom: 19
    }).addTo(map);

    // Marker pin merah yang dapat digeser
    const markerIcon = L.divIcon({
      className: 'edit-pin-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing">
          <div class="w-9 h-9 rounded-full bg-error text-white flex items-center justify-center shadow-xl ring-2 ring-white">
            <span class="material-symbols-outlined text-lg font-bold">pin_drop</span>
          </div>
          <div class="w-2.5 h-2.5 bg-error -mt-1 [clip-path:polygon(50%_100%,0_0,100%_0)]"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: markerIcon,
      draggable: true
    }).addTo(map);

    const updateLocation = async (lat, lng) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
      setLocationLabel(`Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`);

      // Coba reverse geocode untuk nama jalan yang ramah dibaca
      try {
        const rev = await reverseGeocode(lat, lng);
        if (rev?.data?.name) {
          setLocationLabel(`${rev.data.name} (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }
      } catch (_) {}
    };

    // Saat pin digeser
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      updateLocation(pos.lat, pos.lng);
    });

    // Saat area peta diklik
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      updateLocation(lat, lng);
    });

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Pastikan ukuran peta disesuaikan setelah modal selesai tampil
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  const handleCenterGps = () => {
    refreshLocation();
    if (coords && mapInstanceRef.current && markerRef.current) {
      const { lat, lng } = coords;
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
      markerRef.current.setLatLng([lat, lng]);
      setSelectedLat(lat);
      setSelectedLng(lng);
      setLocationLabel(`Titik GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!obstacle) return;

    if (!selectedLat || !selectedLng) {
      setErrorMessage('Koordinat lokasi rintangan tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const payload = {
      title: category,
      category,
      severity,
      gap_width: gapWidth,
      clearance_cm: gapWidth === 'less_80' ? 65 : gapWidth === '80_120' ? 95 : 120,
      notes,
      lat: selectedLat,
      lng: selectedLng,
      latitude: selectedLat,
      longitude: selectedLng,
      location_text: locationLabel
    };

    try {
      const res = await updateObstacle(obstacle.id, payload);
      const updated = res.data || { ...obstacle, ...payload };
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!obstacle) return;
    const confirmDelete = window.confirm(
      `Yakin ingin menghapus laporan "${obstacle.title || 'Rintangan'}" (ID #${obstacle.id})?\n\nLaporan dan foto terkait akan dihapus permanen dari database Supabase.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteObstacle(obstacle.id);
      if (onDeleted) onDeleted(obstacle.id);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menghapus laporan dari database.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !obstacle) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">edit_location_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary">Edit Laporan Rintangan</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-secondary">ID #{obstacle.id}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Ubah titik posisi di peta atau sesuaikan informasi rintangan yang tercatat di database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup jendela edit"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Konten Edit (Scrollable) */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Kolom Kiri: Peta Interaktif & Foto */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-base">pin_drop</span>
                  <span>Tentukan Titik Posisi di Peta</span>
                </label>
                <button
                  type="button"
                  onClick={handleCenterGps}
                  className="text-[11px] text-secondary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">my_location</span>
                  <span>Posisi GPS Saya</span>
                </button>
              </div>

              {/* Kontainer Peta Leaflet */}
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-outline-variant/40 shadow-xs">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] pointer-events-none">
                  <div className="px-3 py-1.5 rounded-xl bg-surface/90 backdrop-blur-xs shadow-md border border-outline-variant/30 text-[11px] text-primary font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-base">touch_app</span>
                    <span>Klik pada peta atau geser pin merah untuk menggeser lokasi</span>
                  </div>
                </div>
              </div>

              {/* Info Titik Koordinat Terpilih */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0">location_on</span>
                  <span className="text-[11px] text-primary font-semibold truncate">{locationLabel}</span>
                </div>
                <div className="text-[10px] text-on-surface-variant shrink-0 font-mono pl-2">
                  {selectedLat?.toFixed(6)}, {selectedLng?.toFixed(6)}
                </div>
              </div>

              {/* Foto Rintangan Lapangan */}
              {(obstacle.photo_url || obstacle.image_url) && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                  <img
                    src={obstacle.photo_url || obstacle.image_url}
                    alt={obstacle.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-outline-variant/40"
                  />
                  <div className="flex flex-col min-w-0 text-xs">
                    <span className="font-bold text-primary">Foto Lapangan Terverifikasi</span>
                    <span className="text-[10px] text-on-surface-variant truncate mt-0.5">Tersimpan di Supabase Storage</span>
                    <a
                      href={obstacle.photo_url || obstacle.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-secondary font-bold hover:underline mt-1 flex items-center gap-0.5"
                    >
                      <span>Lihat Foto Penuh</span>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Formulir Detail Rintangan */}
            <div className="flex flex-col gap-4">
              {/* Kategori Rintangan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-primary">Jenis Rintangan</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Tingkat Keparahan / Hambatan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-primary">Tingkat Hambatan Bagi Kursi Roda</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeverity('impassable')}
                    className={`min-h-[42px] p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      severity === 'impassable'
                        ? 'bg-error text-white border-error shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    <span>Tidak Bisa</span>
                    <span className="text-[9px] opacity-80">Terblokir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverity('difficult')}
                    className={`min-h-[42px] p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      severity === 'difficult'
                        ? 'bg-warning text-on-warning border-warning shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    <span>Sulit</span>
                    <span className="text-[9px] opacity-80">Butuh Bantuan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeverity('passable')}
                    className={`min-h-[42px] p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      severity === 'passable'
                        ? 'bg-secondary text-white border-secondary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    <span>Bisa Dilalui</span>
                    <span className="text-[9px] opacity-80">Rampa Halus</span>
                  </button>
                </div>
              </div>

              {/* Lebar Celah Bersih */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-primary">Lebar Celah Bersih Trotoar</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGapWidth('less_80')}
                    className={`min-h-[40px] px-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border ${
                      gapWidth === 'less_80'
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    &lt; 80 cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setGapWidth('80_120')}
                    className={`min-h-[40px] px-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border ${
                      gapWidth === '80_120'
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    80 - 120 cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setGapWidth('more_120')}
                    className={`min-h-[40px] px-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer border ${
                      gapWidth === 'more_120'
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    &gt; 120 cm
                  </button>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-primary">Catatan Kondisi Lapangan</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Bollard terlalu rapat berjarak 60cm di depan rampa halte..."
                  className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant/40 text-xs text-primary placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Aksi */}
          <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
            {/* Tombol Hapus (Fitur Hapus terintegrasi di dalam modal edit) */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="w-full sm:w-auto min-h-[42px] px-4 rounded-xl text-error hover:bg-error/10 text-xs font-bold transition-colors cursor-pointer border border-error/30 flex items-center justify-center gap-1.5"
              title="Hapus laporan ini secara permanen dari database"
            >
              <span className="material-symbols-outlined text-base">
                {isDeleting ? 'hourglass_empty' : 'delete'}
              </span>
              <span>{isDeleting ? 'Menghapus...' : 'Hapus Laporan Ini'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="flex-1 sm:flex-none min-h-[42px] px-4 rounded-xl bg-surface-container text-on-surface-variant hover:text-primary text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="flex-1 sm:flex-none min-h-[42px] px-5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  {isSaving ? 'hourglass_empty' : 'save'}
                </span>
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

