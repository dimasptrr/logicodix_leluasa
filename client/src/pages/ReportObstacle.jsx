import React, { useState, useRef } from 'react';
import { createObstacle } from '../services/api.js';

const MAX_SOURCE_SIZE = 8 * 1024 * 1024;
const MAX_COMPRESSED_SIZE = 1.5 * 1024 * 1024;

async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Pilih file gambar yang valid.');
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('Ukuran foto maksimal 8 MB.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Foto tidak dapat dibuka. Coba gunakan file gambar lain.');
  }

  try {
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.82;
    let blob;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browser tidak dapat memproses foto.');

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          result => result ? resolve(result) : reject(new Error('Kompresi foto gagal.')),
          'image/jpeg',
          quality,
        );
      });

      if (blob.size <= MAX_COMPRESSED_SIZE) return blob;
      if (quality > 0.5) quality -= 0.1;
      else scale *= 0.8;
    }

    throw new Error('Foto masih terlalu besar setelah dikompresi. Pilih foto lain.');
  } finally {
    bitmap.close();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Foto tidak dapat disiapkan untuk diunggah.'));
    reader.readAsDataURL(blob);
  });
}

export default function ReportObstacle({ setActiveTab }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [category, setCategory] = useState('Bollard / Pembatas');
  const [clearanceOption, setClearanceOption] = useState('less_80');
  const [severity, setSeverity] = useState('impassable');
  const [notes, setNotes] = useState('');
  const [forwardDpupr, setForwardDpupr] = useState(true);
  const [shareCommunity, setShareCommunity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [formError, setFormError] = useState('');
  const [reportId, setReportId] = useState('');

  const fileInputRef = useRef(null);

  const categories = [
    { id: 'Bollard / Pembatas', icon: 'front_hand' },
    { id: 'Galian / Proyek', icon: 'construction' },
    { id: 'Rampa Rusak', icon: 'ramp_right' },
    { id: 'Paving Rusak', icon: 'broken_image' },
    { id: 'Tangga Tanpa Rampa', icon: 'stairs' },
    { id: 'PKL / Parkir Liar', icon: 'local_parking' }
  ];

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFormError('');
    setUploadedImage(null);
    setSubmitSuccess(false);
    setReportId('');
    try {
      const compressed = await compressImage(file);
      const dataUrl = await blobToDataUrl(compressed);
      setUploadedImage(dataUrl);
      setCurrentStep(2);
      setSubmitSuccess(false);
    } catch (error) {
      setFormError(error.message || 'Foto gagal diproses.');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Browser ini tidak mendukung pengambilan lokasi GPS.');
      return;
    }

    setFormError('');
    setLocation(null);
    setIsLocating(true);
    try {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setIsLocating(false);
        },
        error => {
          const messages = {
            1: 'Izin lokasi ditolak. Aktifkan izin lokasi browser untuk melanjutkan.',
            2: 'Lokasi tidak tersedia. Coba lagi di area dengan sinyal GPS yang lebih baik.',
            3: 'Pengambilan lokasi terlalu lama. Silakan coba lagi.',
          };
          setFormError(messages[error.code] || 'Lokasi GPS gagal diambil.');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    } catch {
      setFormError('Browser tidak dapat mengakses GPS. Pastikan aplikasi dibuka melalui HTTPS.');
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!uploadedImage) {
      setFormError('Ambil atau pilih foto rintangan terlebih dahulu.');
      return;
    }
    if (!location) {
      setFormError('Ambil lokasi GPS sebelum mengirim laporan.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      const clearanceVal = clearanceOption === 'less_80' ? 65 : clearanceOption === '80_120' ? 95 : 130;
      const response = await createObstacle({
        title: `${category} dilaporkan di ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        locationText: `GPS ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
        coordinates: { lat: location.lat, lng: location.lng },
        locationAccuracyM: location.accuracy,
        category,
        clearance: clearanceVal,
        clearanceOption,
        severity,
        notes,
        forwardDpupr,
        shareCommunity,
        uploadedImage,
      });

      setSubmitSuccess(true);
      setCurrentStep(3);
      setReportId(response?.data?.id || response?.id || '');
    } catch (error) {
      setFormError(error.message || 'Laporan gagal dikirim. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-margin md:px-gutter-desktop py-space-md sm:py-space-lg flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl animate-fadeIn pb-8 lg:pb-0">
      {/* Input Kamera Tersembunyi */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Indikator Langkah (Stepper Header) */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-3 sm:p-space-md shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-space-sm sm:gap-space-md">
          {/* Langkah 1 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-space-xs sm:gap-space-sm w-full md:w-auto cursor-pointer group"
          >
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                photo_camera
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] sm:text-xs text-secondary font-bold uppercase tracking-wider">Langkah 1 · Foto</span>
              <span className="font-label-lg text-xs sm:text-sm text-primary font-semibold group-hover:text-secondary">Ambil atau Unggah Foto</span>
            </div>
          </div>

          <div className="hidden md:block flex-1 h-1 mx-space-md bg-secondary-container rounded-full"></div>

          {/* Langkah 2 */}
          <div className="flex items-center gap-space-xs sm:gap-space-sm w-full md:w-auto">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="font-label-md text-xs sm:text-sm font-bold">2</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] sm:text-xs text-secondary font-bold uppercase tracking-wider">Langkah 2 · Detail</span>
              <span className="font-headline-sm text-xs sm:text-sm text-primary font-bold">Lokasi & Keterangan</span>
            </div>
          </div>

          <div className="hidden md:block flex-1 h-1 mx-space-md bg-surface-container rounded-full"></div>

          {/* Langkah 3 */}
          <div className={`flex items-center gap-space-xs sm:gap-space-sm w-full md:w-auto ${currentStep === 3 ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
              currentStep === 3 ? 'bg-secondary text-on-secondary font-bold' : 'bg-surface-container text-on-surface-variant'
            }`}>
              {currentStep === 3 ? (
                <span className="material-symbols-outlined text-base sm:text-xl">check</span>
              ) : (
                <span className="font-label-md text-xs sm:text-sm">3</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] sm:text-xs uppercase tracking-wider text-on-surface-variant">
                {currentStep === 3 ? 'Langkah 3 · Terkirim' : 'Langkah 3 · Menunggu'}
              </span>
              <span className="font-label-lg text-xs sm:text-sm text-on-surface font-semibold">Kirim ke Komunitas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Notifikasi Berhasil */}
      {submitSuccess && (
        <div className="p-3 sm:p-4 rounded-2xl bg-secondary text-on-secondary shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl sm:text-3xl">verified</span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-xs sm:text-sm font-bold">Laporan berhasil dikirim</span>
              <span className="text-[11px] opacity-90">
                {reportId ? `ID laporan: ${reportId}. ` : ''}
                Laporan menunggu pemrosesan dan verifikasi komunitas.
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('explore-map')}
            className="self-end sm:self-auto px-3.5 py-1.5 rounded-xl bg-surface-container-lowest text-secondary font-bold text-xs hover:bg-surface-container transition-colors shadow-xs"
          >
            Lihat di Peta Live
          </button>
        </div>
      )}

      {/* Ruang Kerja 2 Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md sm:gap-space-lg lg:gap-space-xl items-start">
        {/* Kolom Kiri: Kanvas Deteksi Computer Vision & Telemetri Lokasi */}
        <section className="lg:col-span-6 flex flex-col gap-space-md sm:gap-space-lg">
          {/* Pratinjau foto yang sudah dikompresi di perangkat */}
          <div className="relative w-full rounded-xl overflow-hidden bg-primary shadow-md">
            <div className="relative w-full aspect-[4/3] bg-surface-dim flex items-center justify-center">
              {uploadedImage ? (
                <img
                  alt="Pratinjau foto rintangan"
                  className="w-full h-full object-contain"
                  src={uploadedImage}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl text-secondary">add_a_photo</span>
                  <span className="font-label-md text-sm">Pilih foto rintangan untuk melihat pratinjau</span>
                </div>
              )}

              <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-xs">
                <span className={`w-2 h-2 rounded-full ${uploadedImage ? 'bg-secondary' : 'bg-outline'}`}></span>
                <span className="font-label-sm text-[10px] sm:text-xs text-primary font-bold">
                  {uploadedImage ? 'Foto siap dikirim' : 'Belum ada foto'}
                </span>
              </div>

              {uploadedImage && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest/95 text-primary shadow-xs">
                  <span className="material-symbols-outlined text-secondary text-sm">privacy_tip</span>
                  <span className="font-label-sm text-[10px] sm:text-xs font-semibold">Foto dikompresi dan metadata EXIF dihapus di perangkat</span>
                </div>
              )}
            </div>

            <div className="bg-surface-container-low p-3 text-center">
              <span className="font-body-sm text-xs text-on-surface-variant">
                Kategori dan tingkat keparahan dapat Anda tinjau sebelum laporan dikirim.
              </span>
            </div>
          </div>

          {/* Banner Jaminan Privasi */}
          <div className="flex items-start gap-2.5 p-3 sm:p-space-md rounded-xl bg-surface-container-low text-on-surface shadow-xs">
            <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5">verified_user</span>
            <div className="flex flex-col">
              <span className="font-label-md text-xs font-bold text-primary">Privasi Foto</span>
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                Foto diubah menjadi JPEG di perangkat dan metadata EXIF dihapus sebelum diunggah. Wajah dan pelat nomor tidak otomatis diburamkan.
              </p>
            </div>
          </div>

          {/* Telemetri Lokasi GPS */}
          <div className="flex flex-col gap-2 p-3 sm:p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Telemetri Lokasi</span>
              <span className={`inline-flex items-center gap-1 font-label-sm text-[11px] font-semibold ${location ? (location.accuracy > 50 ? 'text-amber-700' : 'text-secondary') : 'text-on-surface-variant'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${location ? (location.accuracy > 50 ? 'bg-amber-600' : 'bg-secondary') : 'bg-outline'}`}></span>
                {location ? `Akurasi ±${Math.round(location.accuracy)}m` : 'Lokasi belum diambil'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg bg-surface-container shrink-0 flex items-center justify-center relative overflow-hidden">
                <span className="material-symbols-outlined text-error text-2xl z-10 drop-shadow-md">fmd_bad</span>
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                {location ? (
                  <>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-secondary text-base">near_me</span>
                      <span className="font-headline-sm text-xs sm:text-sm font-bold">Lokasi GPS berhasil diambil</span>
                    </div>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </span>
                    {location.accuracy > 50 && (
                      <span className="font-body-sm text-[10px] text-amber-700 mt-0.5">
                        Akurasi GPS rendah. Coba ambil ulang di area terbuka.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-secondary text-base">near_me</span>
                      <span className="font-headline-sm text-xs sm:text-sm font-bold">Lokasi diperlukan</span>
                    </div>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      Izinkan akses lokasi untuk menandai rintangan.
                    </span>
                  </>
                )}

                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="min-h-[32px] px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-[11px] flex items-center gap-1 transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xs text-secondary">{isLocating ? 'progress_activity' : 'my_location'}</span>
                    <span>{isLocating ? 'Mengambil GPS...' : location ? 'Ambil Ulang GPS' : 'Ambil Lokasi GPS'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Form Peninjauan & Klasifikasi Rintangan */}
        <section className="lg:col-span-6 flex flex-col gap-space-md sm:gap-space-lg">
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 sm:p-space-lg lg:p-space-xl shadow-sm flex flex-col gap-space-md sm:gap-space-lg">
            <div className="flex flex-col gap-1 pb-2 border-b border-outline-variant/30">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-md text-base sm:text-xl font-bold text-primary">Detail Rintangan</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] sm:text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">edit_note</span>
                  Tinjau Manual
                </span>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant">
                Pilih kategori dan kondisi yang paling sesuai. Analisis AI belum dijalankan pada formulir ini.
              </p>
            </div>

            {/* Bidang 1: Kategori Rintangan */}
            <div className="flex flex-col gap-1">
              <label className="font-label-lg text-xs font-bold text-primary flex items-center justify-between">
                <span>Kategori Rintangan</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant font-semibold">Pilih satu kategori</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {categories.map((c) => {
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`min-h-[44px] px-2.5 py-1.5 rounded-xl font-label-sm text-[11px] font-bold flex items-center gap-1.5 transition-all text-left ${
                        isSelected
                          ? 'bg-secondary-container text-on-secondary-container shadow-xs ring-1 ring-secondary'
                          : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                      }`}
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-base ${isSelected ? 'text-on-secondary-container' : 'text-secondary'}`}>
                        {c.icon}
                      </span>
                      <span className="truncate">{c.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bidang 2: Lebar Bersih Jalur Trotoar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-label-lg text-xs font-bold text-primary">Lebar Bersih Jalur Trotoar</label>
                <span className="font-label-sm text-[11px] text-error font-bold">Standar Min: 90 cm</span>
              </div>

              <div className="flex flex-col gap-1.5 pt-1" role="radiogroup">
                <label className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all ${
                  clearanceOption === 'less_80' ? 'bg-error/10 ring-2 ring-error' : 'bg-surface-container-low hover:bg-surface-container'
                }`}>
                  <input
                    type="radio"
                    name="clearance"
                    value="less_80"
                    checked={clearanceOption === 'less_80'}
                    onChange={() => setClearanceOption('less_80')}
                    className="w-4 sm:w-5 h-4 sm:h-5 text-error accent-error cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs text-error font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-error"></span>
                      Kurang dari 80 cm
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface">Tidak bisa dilewati kursi roda standar manual maupun listrik</span>
                  </div>
                </label>

                <label className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all ${
                  clearanceOption === '80_120' ? 'bg-secondary-container/40 ring-2 ring-secondary' : 'bg-surface-container-low hover:bg-surface-container'
                }`}>
                  <input
                    type="radio"
                    name="clearance"
                    value="80_120"
                    checked={clearanceOption === '80_120'}
                    onChange={() => setClearanceOption('80_120')}
                    className="w-4 sm:w-5 h-4 sm:h-5 text-secondary accent-secondary cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs text-primary font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      80 cm – 120 cm
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">Sangat sempit; butuh keahlian mengemudi atau melipat pijakan kaki</span>
                  </div>
                </label>

                <label className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all ${
                  clearanceOption === 'more_120' ? 'bg-secondary-container/40 ring-2 ring-secondary' : 'bg-surface-container-low hover:bg-surface-container'
                }`}>
                  <input
                    type="radio"
                    name="clearance"
                    value="more_120"
                    checked={clearanceOption === 'more_120'}
                    onChange={() => setClearanceOption('more_120')}
                    className="w-4 sm:w-5 h-4 sm:h-5 text-secondary accent-secondary cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs text-primary font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      Lebih dari 120 cm
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">Bisa dilewati dengan leluasa</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Bidang 3: Klasifikasi Tingkat Keparahan */}
            <div className="flex flex-col gap-1">
              <label className="font-label-lg text-xs font-bold text-primary">Klasifikasi Tingkat Keparahan</label>
              <div className="grid grid-cols-3 gap-1.5 pt-1" role="radiogroup">
                {/* Terblokir */}
                <label className={`flex flex-col p-2.5 rounded-xl cursor-pointer shadow-xs transition-all ${
                  severity === 'impassable' ? 'bg-error text-on-error ring-2 ring-error' : 'bg-surface-container-low text-on-surface'
                }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <input
                      type="radio"
                      name="severity"
                      value="impassable"
                      checked={severity === 'impassable'}
                      onChange={() => setSeverity('impassable')}
                      className="w-3.5 h-3.5 accent-surface-container-lowest"
                    />
                    <span className="material-symbols-outlined text-base">block</span>
                  </div>
                  <span className="font-label-md text-[11px] font-bold">TERBLOKIR</span>
                  <span className="font-label-sm text-[9px] opacity-90 mt-0.5">Turun ke jalan</span>
                </label>

                {/* Sulit */}
                <label className={`flex flex-col p-2.5 rounded-xl cursor-pointer transition-all ${
                  severity === 'difficult' ? 'bg-amber-600 text-white ring-2 ring-amber-600' : 'bg-surface-container-low text-on-surface'
                }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <input
                      type="radio"
                      name="severity"
                      value="difficult"
                      checked={severity === 'difficult'}
                      onChange={() => setSeverity('difficult')}
                      className="w-3.5 h-3.5 accent-secondary"
                    />
                    <span className="material-symbols-outlined text-base">report_problem</span>
                  </div>
                  <span className="font-label-md text-[11px] font-bold">SULIT</span>
                  <span className="font-label-sm text-[9px] opacity-90 mt-0.5">Perlu bantuan</span>
                </label>

                {/* Waspada */}
                <label className={`flex flex-col p-2.5 rounded-xl cursor-pointer transition-all ${
                  severity === 'caution' ? 'bg-secondary text-on-secondary ring-2 ring-secondary' : 'bg-surface-container-low text-on-surface'
                }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <input
                      type="radio"
                      name="severity"
                      value="caution"
                      checked={severity === 'caution'}
                      onChange={() => setSeverity('caution')}
                      className="w-3.5 h-3.5 accent-surface-container-lowest"
                    />
                    <span className="material-symbols-outlined text-base">warning</span>
                  </div>
                  <span className="font-label-md text-[11px] font-bold">WASPADA</span>
                  <span className="font-label-sm text-[9px] opacity-90 mt-0.5">Bisa dilewati</span>
                </label>
              </div>
            </div>

            {/* Bidang 4: Catatan Kontekstual */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-label-lg text-xs font-bold text-primary" htmlFor="obstacle-notes">
                  Catatan Tambahan Kontekstual
                </label>
                <span className="font-label-sm text-[10px] text-on-surface-variant">
                  {notes.length} / 300
                </span>
              </div>
              <textarea
                id="obstacle-notes"
                className="w-full p-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-xs placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all resize-none shadow-inner"
                placeholder="Berikan catatan spesifik mengenai kondisi tekstur permukaan atau jalur alternatif aman..."
                rows="2"
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            {/* Opsi Teruskan */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-outline-variant/30">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={forwardDpupr}
                  onChange={(e) => setForwardDpupr(e.target.checked)}
                  className="w-4 sm:w-5 h-4 sm:h-5 mt-0.5 rounded text-secondary accent-secondary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-xs text-primary font-bold">Teruskan ke DPUPR Kota Surabaya</span>
                  <span className="font-body-sm text-[10px] text-on-surface-variant">Otomatis menerbitkan tiket laporan perbaikan resmi.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={shareCommunity}
                  onChange={(e) => setShareCommunity(e.target.checked)}
                  className="w-4 sm:w-5 h-4 sm:h-5 mt-0.5 rounded text-secondary accent-secondary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-label-md text-xs text-primary font-bold">Bagikan ke Peta Live Leluasa</span>
                  <span className="font-body-sm text-[10px] text-on-surface-variant">Laporan dapat dilihat komunitas untuk membantu verifikasi dan perencanaan rute.</span>
                </div>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Aksi Form */}
      <footer className="w-full bg-surface-container-lowest rounded-xl p-3 sm:p-space-md shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[48px] px-4 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            <span>Ambil / Unggah Foto</span>
          </button>
        </div>

        {formError && (
          <div className="w-full rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error" role="alert">
            {formError}
          </div>
        )}

        <button
          id="submit-report-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || submitSuccess}
          className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] px-6 sm:px-8 rounded-xl bg-secondary text-on-secondary hover:bg-on-secondary-container disabled:opacity-60 font-label-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          type="button"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              <span>Mengirim laporan...</span>
            </>
          ) : submitSuccess ? (
            <>
              <span className="material-symbols-outlined text-xl">check</span>
              <span>Laporan Terkirim</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">send</span>
              <span>Kirim Laporan Rintangan</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
