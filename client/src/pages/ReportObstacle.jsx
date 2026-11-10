import React, { useState, useRef } from 'react';
import { createObstacle } from '../features/dashboard/services/safeApi.js';
import MockDataBadge from '../components/MockDataBadge.jsx';

export default function ReportObstacle({ setActiveTab }) {
  // Data formulir pelaporan (1 langkah sederhana)
  const [category, setCategory] = useState('Bollard / Pembatas');
  const [clearanceOption, setClearanceOption] = useState('less_80');
  const [severity, setSeverity] = useState('impassable');
  const [notes, setNotes] = useState('');
  const [locationText, setLocationText] = useState('Jl. Pemuda No. 45, Genteng, Kota Surabaya');
  const [coordinates, setCoordinates] = useState({ lat: -7.265412, lng: 112.748231 });
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Status proses
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [reportTicketId, setReportTicketId] = useState('');

  const fileInputRef = useRef(null);

  const defaultPhoto = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80";

  const categories = [
    { id: 'Bollard / Pembatas', label: 'Bollard / Pembatas', icon: 'front_hand' },
    { id: 'Paving Rusak', label: 'Ubin Rusak / Berlubang', icon: 'broken_image' },
    { id: 'Galian / Proyek', label: 'Galian Proyek', icon: 'construction' },
    { id: 'Rampa Rusak', label: 'Rampa Rusak / Curam', icon: 'ramp_right' },
    { id: 'Tangga Tanpa Rampa', label: 'Tangga Tanpa Rampa', icon: 'stairs' },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Auto-deteksi lokasi GPS pengguna saat form pelaporan dibuka
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setLocationText(`Titik GPS Saya: Surabaya (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        },
        () => {
          // Bila izin GPS belum diberikan, tetap sediakan fallback default lokasi Surabaya
        },
        { timeout: 6000 }
      );
    }
  }, []);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setSubmitError('Browser tidak mendukung geolokasi.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        setLocationText(`Surabaya (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setSubmitError('Gagal mendeteksi lokasi GPS. Anda dapat mengisi alamat secara manual.');
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!locationText.trim()) {
      setSubmitError('Harap isi alamat atau lokasi rintangan.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const clearanceVal = clearanceOption === 'less_80' ? 65 : clearanceOption === '80_120' ? 95 : 130;

      // Payload kontrak createObstacle tetap terjaga 100%
      await createObstacle({
        title: `${category} dilaporkan di ${locationText.split(',')[0]}`,
        location: locationText,
        coordinates: coordinates,
        category,
        clearance: clearanceVal,
        clearanceOption,
        severity,
        notes: notes.trim() || 'Rintangan trotoar dilaporkan oleh warga.',
        forwardDpupr: true,
        shareCommunity: true,
        uploadedImage: uploadedImage || defaultPhoto,
      });

      const newTicketId = `LEL-2025-SBY-${Math.floor(1000 + Math.random() * 9000)}`;
      setReportTicketId(newTicketId);
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError('Gagal mengirimkan laporan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setSubmitError(null);
    setUploadedImage(null);
    setNotes('');
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
              Laporan Terbit &amp; Terverifikasi
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
              <span className="text-on-surface-variant font-medium">Lokasi</span>
              <span className="font-semibold text-on-surface truncate max-w-[200px]">{locationText}</span>
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
              onClick={() => setActiveTab('explore-map')}
              className="flex-1 min-h-[46px] rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:bg-primary-container transition-all"
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

  // FORMULIR 1 LANGKAH SIMPEL & RINGKAS
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 animate-fadeIn pb-16 lg:pb-8">
      {/* Input File Kamera / Galeri */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
      />

      {/* Header Halaman Simpel */}
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
            Lapor Rintangan Trotoar
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Bantu sesama pengguna kursi roda dan pejalan kaki menjelajahi kota Surabaya dengan aman.
          </p>
        </div>
        <MockDataBadge />
      </div>

      {/* Alert Galat (jika ada) */}
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

      {/* Kontainer Form 1 Langkah (Grid 2 Kolom) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Kolom Kiri (md:col-span-5): Foto & Lokasi */}
        <div className="md:col-span-5 flex flex-col gap-3">
          
          {/* Box Foto */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-secondary" aria-hidden="true">photo_camera</span>
                <span>Foto Rintangan</span>
              </span>
              {uploadedImage && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-secondary font-bold hover:underline text-[11px]"
                >
                  Ganti
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
                    <span className="material-symbols-outlined text-xl" aria-hidden="true">add_a_photo</span>
                  </div>
                  <span className="font-bold text-xs text-primary mt-1">Klik untuk Ambil / Unggah Foto</span>
                  <span className="text-[10px]">Kamera atau galeri file</span>
                </div>
              )}
            </div>
          </div>

          {/* Lokasi Trotoar */}
          <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-secondary" aria-hidden="true">location_on</span>
                <span>Lokasi Trotoar</span>
              </span>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="text-secondary font-bold hover:underline text-[11px] flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-xs" aria-hidden="true">my_location</span>
                <span>{isLocating ? 'Mencari...' : 'GPS Saya'}</span>
              </button>
            </div>

            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Nama jalan atau trotoar..."
              className="w-full p-2.5 rounded-xl bg-surface-container text-xs text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30"
              required
            />
            <span className="text-[10px] text-on-surface-variant font-mono">
              Koordinat: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </span>
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
                  className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
                className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
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
                className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
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
                className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
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
                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
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
                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
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
                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
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
              className="px-4 py-2.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[46px] px-6 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-all active:scale-98 disabled:opacity-70"
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
