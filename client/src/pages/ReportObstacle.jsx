import React, { useState, useRef } from 'react';
import { createObstacle } from '../features/dashboard/services/safeApi.js';
import MockDataBadge from '../components/MockDataBadge.jsx';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';

// Fungsi mock lokal untuk analisis AI Vision (tanpa membuat fungsi baru di api.js)
const mockDetectObstacleAI = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        category: 'Bollard / Pembatas',
        confidence: 82,
        clearanceOption: 'less_80',
        severity: 'impassable',
        clearanceCm: 55,
        reason: 'Dua bollard berjarak dekat di tengah trotoar menghalangi jalur utama kursi roda dan lansia.',
        notes: 'Bollard dipasang sangat rapat untuk menghalangi motor, namun kursi roda elektrik selebar 68cm pun tersangkut di kedua tiang tengah.'
      });
    }, 800);
  });
};

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
  // Alur 3 Langkah sesuai Design Mockup
  // 1 = Foto & Titik Peta, 2 = Detail & Verifikasi Rintangan, 3 = Penerbitan & Verifikasi
  const [currentStep, setCurrentStep] = useState(1);

  // Data Formulir (Kontrak createObstacle dijamin tetap persis sama)
  const [category, setCategory] = useState('Bollard / Pembatas');
  const [clearanceOption, setClearanceOption] = useState('less_80');
  const [severity, setSeverity] = useState('impassable');
  const [notes, setNotes] = useState('Bollard dipasang sangat rapat untuk menghalangi motor, namun kursi roda elektrik selebar 68cm pun tersangkut di kedua tiang tengah.');
  const [forwardDpupr, setForwardDpupr] = useState(true);
  const [shareCommunity, setShareCommunity] = useState(true);
  const [locationText, setLocationText] = useState('Jl. Pemuda No. 45, Genteng, Kota Surabaya');
  const [coordinates, setCoordinates] = useState({ lat: -7.265412, lng: 112.748231 });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Status proses
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  const [aiResult, setAiResult] = useState({
    confidence: 82,
    reason: 'Dua bollard berjarak dekat di tengah trotoar menghalangi jalur utama kursi roda dan lansia.'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [reportTicketId, setReportTicketId] = useState('LEL-2025-SBY-8841');

  const fileInputRef = useRef(null);

  const defaultPhoto = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80";

  const categories = [
    { id: 'Bollard / Pembatas', label: 'Bollard / Palang Pembatas', icon: 'front_hand' },
    { id: 'Galian / Proyek', label: 'Galian Saluran / Proyek', icon: 'construction' },
    { id: 'Rampa Rusak', label: 'Rampa Rusak / Curam', icon: 'ramp_right' },
    { id: 'Paving Rusak', label: 'Ubin Rusak / Berlubang', icon: 'broken_image' },
    { id: 'Tangga Tanpa Rampa', label: 'Tangga Tanpa Rampa', icon: 'stairs' },
    { id: 'PKL / Parkir Liar', label: 'PKL / Parkir Liar', icon: 'local_parking' }
  ];

const compressImage = (file, maxSize = 1280, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto tidak bisa dibaca'));
    };
    img.src = url;
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadedImage(await compressImage(file));
    } catch (err) {
      setSubmitError('Foto tidak bisa diproses. Coba foto lain.');
    }
  };

  const handleGoToStep2 = async () => {
    setIsAnalyzingAI(true);
    setAiAnalysisError(null);
    setCurrentStep(2);
    try {
      const detected = await mockDetectObstacleAI();
      setAiResult(detected);
      setCategory(detected.category);
      setClearanceOption(detected.clearanceOption);
      setSeverity(detected.severity);
      if (detected.notes) setNotes(detected.notes);
    } catch (err) {
      setAiAnalysisError('Gagal menjalankan analisis AI otomatis. Anda dapat memasukkan data rintangan secara manual.');
    } finally {
      setIsAnalyzingAI(false);
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
    setSubmitError(null);
    try {
      const clearanceVal = clearanceOption === 'less_80' ? 65 : clearanceOption === '80_120' ? 95 : 130;
      // KONTRAK TETAP: nama fungsi, parameter dan struktur payload persis sama
      await createObstacle({
        title: `${category} dilaporkan di ${locationText.split(',')[0]}`,
        location: locationText,
        coordinates: coordinates,
        category,
        clearance: clearanceVal,
        clearanceOption,
        severity,
        notes,
        forwardDpupr,
        shareCommunity,
        uploadedImage,
      });

      setReportTicketId(`LEL-2025-SBY-${Math.floor(1000 + Math.random() * 9000)}`);
      setSubmitSuccess(true);
      setCurrentStep(3);
    } catch (err) {
      setSubmitError('Gagal mengirimkan laporan rintangan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSubmitSuccess(false);
    setSubmitError(null);
    setAiAnalysisError(null);
    setUploadedImage(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-margin md:px-gutter-desktop py-space-md sm:py-space-lg flex flex-col gap-space-md sm:gap-space-lg animate-fadeIn pb-12 lg:pb-8">
      {/* Input File Tersembunyi */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
      />

      {/* Global Error Banner */}
      {submitError && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 sm:p-4 rounded-2xl bg-warning-container text-on-warning-container border border-warning/40 text-xs flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-base" aria-hidden="true">warning</span>
            <span>{submitError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="font-bold underline text-xs ml-2"
            aria-label="Tutup pesan peringatan"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* LANGKAH 1 DARI 3: FOTO & DETEKSI LOKASI                   */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-space-md sm:gap-space-lg animate-fadeIn">
          {/* Header Stepper Banner */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-primary text-on-primary font-label-md text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
                <span>Langkah 1 dari 3</span>
                <span className="font-normal opacity-90">Foto & Deteksi Lokasi</span>
              </span>
              <span className="font-label-md text-xs font-bold text-on-surface-variant">
                33% Selesai
              </span>
            </div>

            {/* Progress Bar 33% */}
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden" role="progressbar" aria-valuenow="33" aria-valuemin="0" aria-valuemax="100">
              <div className="h-full bg-primary rounded-full w-1/3 transition-all duration-300"></div>
            </div>

            {/* Stepper Titles */}
            <div className="flex justify-between text-[11px] text-on-surface-variant pt-0.5">
              <span className="font-bold text-primary">1. Foto & Titik Peta</span>
              <span>2. Detail Rintangan</span>
              <span>3. Konfirmasi Publik</span>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <h1 className="font-headline-lg text-xl sm:text-2xl lg:text-3xl font-bold text-primary tracking-tight">
                Laporkan Rintangan Trotoar
              </h1>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
                Bantu sesama pengguna kursi roda dan tunanetra menjelajahi kota dengan aman dan bebas hambatan.
              </p>
            </div>
          </div>

          {/* 2 Kolom: Bukti Visual & Deteksi Lokasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md sm:gap-space-lg items-stretch">
            {/* Kartu Kiri: Bukti Visual Rintangan */}
            <div className="flex flex-col justify-between p-4 sm:p-space-lg bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/20 gap-space-md">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">photo_camera</span>
                    <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">
                      Bukti Visual Rintangan
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold">
                    <span className="material-symbols-outlined text-xs" aria-hidden="true">check_circle</span>
                    Format Foto Bebas
                  </span>
                </div>

                {/* Box Upload Foto Interaktif */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  tabIndex="0"
                  role="button"
                  aria-label="Area unggah foto rintangan trotoar"
                  className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary bg-surface-container-low flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors group overflow-hidden"
                >
                  {uploadedImage ? (
                    <img src={uploadedImage} alt="Foto rintangan yang diunggah" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-surface-container-lowest text-primary shadow-xs flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl" aria-hidden="true">add_photo_alternate</span>
                      </div>
                      <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">
                        Tarik foto rintangan ke sini
                      </span>
                      <span className="text-[11px] text-on-surface-variant mt-0.5">
                        atau pilih opsi pengambilan foto langsung di bawah
                      </span>
                      <span className="text-[10px] text-on-surface-variant/70 mt-3">Rasio 16:9 disarankan</span>
                    </>
                  )}
                </div>

                {/* Tombol Aksi Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Unggah foto rintangan dari laptop atau galeri"
                    className="min-h-[44px] px-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">upload</span>
                    <span>Unggah Foto dari Laptop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Gunakan kamera web untuk mengambil foto rintangan langsung"
                    className="min-h-[44px] px-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-secondary" aria-hidden="true">videocam</span>
                    <span>Gunakan Kamera Web</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-on-surface-variant">
                  Mendukung file JPG, PNG, WEBP hingga maksimal 15MB.
                </span>
              </div>

              {/* Jaminan Privasi */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary-container/30 border border-secondary/30 text-on-surface">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">shield</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-xs font-bold text-primary">Privasi Warga Terlindungi Otomatis</span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Wajah orang dan nomor plat kendaraan otomatis dikaburkan oleh sistem AI Leluasa sebelum dipublikasikan demi menjaga kenyamanan bersama.
                  </p>
                </div>
              </div>
            </div>

            {/* Kartu Kanan: Deteksi Lokasi GPS */}
            <div className="flex flex-col justify-between p-4 sm:p-space-lg bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/20 gap-space-md">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">location_searching</span>
                    <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">
                      Deteksi Lokasi GPS
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" aria-hidden="true"></span>
                    Akurasi GPS ±3m
                  </span>
                </div>

                {/* Widget Peta Ilustratif dengan Pin Lokasi */}
                <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/30 flex items-center justify-center select-none">
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#2563EB_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {/* Marker Pin */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-lg bg-primary text-on-primary text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap animate-bounce">
                      📍 Geser untuk menyesuaikan
                    </div>
                    <div className="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center shadow-xl ring-4 ring-white">
                      <span className="material-symbols-outlined text-base font-bold" aria-hidden="true">pin_drop</span>
                    </div>
                  </div>

                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-label-sm text-[9px] font-bold text-primary shadow-xs">
                    Live Geolocation
                  </span>
                </div>

                {/* Kotak Alamat Terdeteksi Otomatis */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                    ALAMAT TERDETEKSI OTOMATIS
                  </span>
                  {isEditingLocation ? (
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                        className="flex-1 text-xs p-2 rounded-lg bg-surface-container-lowest border border-primary text-on-surface focus:outline-none"
                        aria-label="Alamat rintangan manual"
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingLocation(false)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">
                      {locationText}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                    Koordinat: {coordinates.lat}, {coordinates.lng}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingLocation(!isEditingLocation)}
                  aria-label="Koreksi alamat rintangan secara manual"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-primary/40 bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-secondary" aria-hidden="true">edit_location</span>
                  <span>{isEditingLocation ? 'Batal Koreksi' : 'Koreksi Titik di Peta'}</span>
                </button>
              </div>

              {/* Dampak Langsung Komunitas */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-container/40 border border-warning/30 text-on-surface">
                <div className="w-6 h-6 rounded-full bg-warning text-on-warning flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">groups</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-xs font-bold text-primary">Dampak Langsung Komunitas</span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Laporan Anda akan langsung masuk ke peta navigasi publik setelah diverifikasi warga sekitar, membantu ribuan pejalan kaki terhindar dari rute berbahaya.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Bar Langkah 1 */}
          <div className="w-full flex items-center justify-between pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => setActiveTab('explore-map')}
              aria-label="Batal dan kembali ke peta"
              className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">bookmark_border</span>
              <span>Batal / Simpan Draf</span>
            </button>

            <button
              type="button"
              onClick={handleGoToStep2}
              aria-label="Lanjutkan ke langkah 2 detail rintangan"
              className="min-h-[48px] px-6 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <span>Lanjut ke Langkah 2: Detail Rintangan</span>
              <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LANGKAH 2 DARI 3: DETAIL & VERIFIKASI RINTANGAN           */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-space-md sm:gap-space-lg animate-fadeIn">
          {/* Header Stepper Banner */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-bold">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">verified_user</span>
                Formulir Aksesibilitas Terstandar
              </span>
              <span className="font-label-md text-xs font-bold text-primary">
                Progres Verifikasi 66% Selesai
              </span>
            </div>

            <h1 className="font-headline-lg text-xl sm:text-2xl font-bold text-primary tracking-tight">
              Langkah 2 dari 3: Detail & Verifikasi Rintangan
            </h1>

            {/* Progress Bar 66% */}
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden" role="progressbar" aria-valuenow="66" aria-valuemin="0" aria-valuemax="100">
              <div className="h-full bg-primary rounded-full w-2/3 transition-all duration-300"></div>
            </div>

            {/* Stepper Titles */}
            <div className="flex justify-between text-[11px] text-on-surface-variant pt-0.5">
              <span className="font-bold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">check</span>
                1. Lokasi & Foto
              </span>
              <span className="font-bold text-primary">2. Analisis & Spesifikasi</span>
              <span>3. Tinjau & Terbitkan</span>
            </div>
          </div>

          {/* Konten 2 Kolom */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md sm:gap-space-lg items-start">
            {/* Kolom Kiri: Foto Terlampir & Saran AI */}
            <div className="lg:col-span-5 flex flex-col gap-space-sm sm:gap-space-md">
              {/* Card Foto Terlampir */}
              <div className="p-3 sm:p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-secondary text-base" aria-hidden="true">photo_camera</span>
                    Foto Terlampir
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    aria-label="Kembali untuk ganti foto"
                    className="text-secondary font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-xs" aria-hidden="true">replay</span>
                    <span>Ganti Foto</span>
                  </button>
                </div>

                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-high">
                  <img
                    src={uploadedImage || defaultPhoto}
                    alt="Foto rintangan yang dianalisis"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px]">
                    <div className="font-bold truncate">📍 {locationText}</div>
                    <span className="opacity-80">Koordinat: {coordinates.lat}, {coordinates.lng} • Difoto baru saja</span>
                  </div>
                </div>
              </div>

              {/* Card Saran AI • Bisa Anda Koreksi */}
              <div
                role="region"
                aria-label="Hasil Analisis AI Vision"
                className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-space-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <span className="material-symbols-outlined text-secondary text-base" aria-hidden="true">auto_awesome</span>
                      <span>Saran AI · Bisa Anda Koreksi</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant">Analisis otomatis Computer Vision</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingCategory(!isEditingCategory)}
                    aria-label="Ubah jenis rintangan manual"
                    className="px-2.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-primary hover:bg-surface-container transition-colors"
                  >
                    {isEditingCategory ? 'Simpan' : 'Ubah Jenis'}
                  </button>
                </div>

                {/* Jenis Rintangan Terdeteksi */}
                <div className="p-3 rounded-xl bg-primary-container/20 border border-primary/20 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">
                    JENIS RINTANGAN TERDETEKSI
                  </span>
                  <div className="flex items-center gap-2 text-primary font-headline-sm text-sm font-bold">
                    <span className="material-symbols-outlined text-secondary text-lg" aria-hidden="true">grid_view</span>
                    <span>{category}</span>
                  </div>
                </div>

                {/* Pilihan kategori manual bila tombol 'Ubah Jenis' diklik */}
                {isEditingCategory && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCategory(c.id); setIsEditingCategory(false); }}
                        className={`p-2 rounded-lg text-left text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          category === c.id ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">{c.icon}</span>
                        <span className="truncate">{c.id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Bar Tingkat Keyakinan Model */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-on-surface">Tingkat Keyakinan Model</span>
                    <span className="text-primary font-bold">{aiResult.confidence}% Tinggi</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${aiResult.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Catatan Deteksi AI */}
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11px] text-on-surface-variant flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5" aria-hidden="true">info</span>
                  <p>
                    <strong>Catatan Deteksi:</strong> {aiResult.reason}
                  </p>
                </div>
              </div>

              {/* Toggle Anonim */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-lg" aria-hidden="true">shield_person</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs font-bold text-primary">Pelaporan sebagai: Pelapor Anonim</span>
                    <span className="text-[10px] text-on-surface-variant">Privasi Anda terlindungi di portal publik</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonymous}
                  aria-label="Aktifkan pelaporan sebagai anonim"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    isAnonymous ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    isAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Kolom Kanan: Lebar Celah, Keparahan & Catatan */}
            <div className="lg:col-span-7 flex flex-col gap-space-sm sm:gap-space-md">
              {/* Card 1: Lebar Celah Trotoar */}
              <div className="p-4 sm:p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-sm text-sm font-bold text-primary">Lebar Celah Trotoar *</h2>
                    <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] font-bold">
                      WAJIB DIISI
                    </span>
                  </div>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  Penting untuk akses kursi roda standar (rekomendasi Kementerian PUPR min. 80–90 cm).
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2" role="radiogroup" aria-label="Pilihan estimasi lebar celah trotoar">
                  {/* Pilihan < 80cm */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={clearanceOption === 'less_80'}
                    aria-label="Lebar kurang dari 80 cm, tidak muat dan terlalu sempit"
                    onClick={() => setClearanceOption('less_80')}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-between text-center transition-all min-h-[96px] ${
                      clearanceOption === 'less_80'
                        ? 'bg-error/10 ring-2 ring-error text-error shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[9px] font-bold">
                      Tidak Muat
                    </span>
                    <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">&lt; 80 cm</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">Terlalu Sempit</span>
                  </button>

                  {/* Pilihan 80-120cm */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={clearanceOption === '80_120'}
                    aria-label="Lebar 80 sampai 120 cm, pas-pasan satu arah cukup"
                    onClick={() => setClearanceOption('80_120')}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-between text-center transition-all min-h-[96px] ${
                      clearanceOption === '80_120'
                        ? 'bg-warning-container ring-2 ring-warning text-on-warning-container shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-[9px] font-bold">
                      Pas-pasan
                    </span>
                    <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">80–120 cm</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">Satu Arah Cukup</span>
                  </button>

                  {/* Pilihan > 120cm */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={clearanceOption === 'more_120'}
                    aria-label="Lebar lebih dari 120 cm, leluasa dan bebas hambatan"
                    onClick={() => setClearanceOption('more_120')}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-between text-center transition-all min-h-[96px] ${
                      clearanceOption === 'more_120'
                        ? 'bg-secondary-container ring-2 ring-secondary text-on-secondary-container shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-[9px] font-bold">
                      Leluasa
                    </span>
                    <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">&gt; 120 cm</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">Bebas Hambatan</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Tingkat Keparahan Akses */}
              <div className="p-4 sm:p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm text-sm font-bold text-primary">Tingkat Keparahan Akses *</h2>
                  <span className="text-[10px] text-on-surface-variant">Skala Dampak Mobilitas</span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  Tentukan kondisi akses langsung bagi pejalan kaki dan pengguna kursi roda di titik ini.
                </p>

                <div className="flex flex-col gap-2 pt-2" role="radiogroup" aria-label="Tingkat keparahan akses">
                  {/* Bisa dilewati */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={severity === 'caution'}
                    aria-label="Bisa dilewati, aman"
                    onClick={() => setSeverity('caution')}
                    className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                      severity === 'caution'
                        ? 'bg-secondary-container/50 ring-2 ring-secondary shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">check</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">✓ Bisa dilewati</span>
                        <span className="text-[11px] text-on-surface-variant">
                          Trotoar masih dapat dilalui secara mandiri tanpa halangan yang membatasi.
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold shrink-0">
                      Aman
                    </span>
                  </button>

                  {/* Sulit */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={severity === 'difficult'}
                    aria-label="Sulit, perlu waspada"
                    onClick={() => setSeverity('difficult')}
                    className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                      severity === 'difficult'
                        ? 'bg-warning-container/60 ring-2 ring-warning shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-warning text-on-warning flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">warning</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">⚠ Sulit</span>
                        <span className="text-[11px] text-on-surface-variant">
                          Permukaan bergelombang atau sempit; perlu bantuan pendamping untuk melintas.
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-warning text-on-warning text-[10px] font-bold shrink-0">
                      Perlu Waspada
                    </span>
                  </button>

                  {/* Tidak bisa dilewati (TERBLOKIR) */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={severity === 'impassable'}
                    aria-label="Tidak bisa dilewati, terblokir, bahaya utama"
                    onClick={() => setSeverity('impassable')}
                    className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                      severity === 'impassable'
                        ? 'bg-error/10 ring-2 ring-error shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-error text-on-error flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">close</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-xs sm:text-sm font-bold text-error">✕ Tidak bisa dilewati (TERBLOKIR)</span>
                        <span className="text-[11px] text-on-surface-variant">
                          Tertutup total, kursi roda terpaksa turun ke jalan raya berbahaya berdampingan kendaraan bermotor.
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-error text-on-error text-[10px] font-bold shrink-0">
                      Bahaya Utama
                    </span>
                  </button>
                </div>
              </div>

              {/* Card 3: Catatan Tambahan Komunitas */}
              <div className="p-4 sm:p-space-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <label htmlFor="notes-textarea" className="font-headline-sm text-xs sm:text-sm font-bold text-primary">
                    Catatan Tambahan Komunitas <span className="text-on-surface-variant font-normal">(Opsional)</span>
                  </label>
                  <span className="text-[10px] text-on-surface-variant">{notes.length} / 300 karakter</span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  Sebutkan alternatif rute, kondisi ubin taktil tuna netra, atau panduan menghindar bagi sesama pengguna.
                </p>
                <textarea
                  id="notes-textarea"
                  rows="3"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary resize-none mt-1"
                  placeholder="Bollard dipasang sangat rapat..."
                ></textarea>
                <span className="text-[10px] text-on-surface-variant/70">
                  Mendukung teks deskripsi suara screen reader.
                </span>
              </div>

              {/* Footer Buttons Step 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  aria-label="Kembali ke langkah 1"
                  className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md text-xs font-bold transition-colors"
                >
                  ← Kembali
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('explore-map')}
                    aria-label="Simpan draf dan kembali ke peta"
                    className="flex-1 sm:flex-initial min-h-[48px] px-4 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant font-label-md text-xs font-semibold transition-colors"
                  >
                    Simpan sebagai Draf
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    aria-label="Kirim laporan publik"
                    className="flex-1 sm:flex-initial min-h-[48px] px-6 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                        <span>Menerbitkan...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Laporan Publik</span>
                        <span aria-hidden="true">🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LANGKAH 3 DARI 3: PENERBITAN & VERIFIKASI                 */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="w-full max-w-2xl mx-auto bg-surface-container-lowest rounded-3xl p-6 sm:p-space-xl shadow-xl border border-outline-variant/20 flex flex-col items-center text-center gap-space-md animate-fadeIn">
          {/* Header ID */}
          <div className="w-full flex items-center justify-between text-xs pb-3 border-b border-outline-variant/20">
            <span className="font-bold text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">check_circle</span>
              Langkah 3 dari 3: Penerbitan & Verifikasi
            </span>
            <span className="font-mono text-on-surface-variant font-semibold">
              ID: {reportTicketId}
            </span>
          </div>

          {/* Icon Sukses Besar */}
          <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-secondary-container text-secondary flex items-center justify-center shadow-lg my-1 animate-bounce">
            <span className="material-symbols-outlined text-4xl sm:text-5xl" aria-hidden="true">check</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold mx-auto">
              <span className="material-symbols-outlined text-xs" aria-hidden="true">verified</span>
              Terverifikasi Metadata Kamera & Lokasi GPS
            </span>
            <h1 className="font-headline-lg text-xl sm:text-2xl font-bold text-primary mt-1">
              Laporan Berhasil Terkirim & Terbit!
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
              Terima kasih atas kontribusi Anda. Laporan sedang dibuka untuk verifikasi komunitas warga sekitar sebelum diteruskan ke instansi terkait.
            </p>
          </div>

          {/* 2 Kartu Info: Hambatan Fisik & Titik Lokasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
            {/* Hambatan Fisik */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">warning</span>
                  HAMBATAN FISIK
                </span>
                <span className="px-2 py-0.2 rounded-full bg-error text-on-error font-label-sm text-[9px] font-bold">
                  Kritis
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">{category}</span>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  Lebar celah aktual &lt; {clearanceOption === 'less_80' ? '55' : '95'} cm (standar minimum 90 cm).
                </span>
              </div>
              <span className="text-[11px] font-bold text-error flex items-center gap-1 pt-1 border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-xs" aria-hidden="true">block</span>
                ✕ Tidak bisa dilewati kursi roda
              </span>
            </div>

            {/* Titik Lokasi */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">pin_drop</span>
                  TITIK LOKASI
                </span>
                <span className="px-2 py-0.2 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[9px] font-bold">
                  Akurasi 2.8m
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">{locationText.split(',')[0]}</span>
                <span className="text-[11px] text-on-surface-variant mt-0.5">{locationText}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-1 border-t border-outline-variant/20">
                <span>{coordinates.lat}, {coordinates.lng}</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('explore-map')}
                  className="text-secondary font-bold hover:underline flex items-center gap-0.5"
                  aria-label="Buka titik laporan di peta navigasi"
                >
                  <span>Buka Peta</span>
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">open_in_new</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gamifikasi Poin Kontributor */}
          <div className="w-full p-3.5 rounded-2xl bg-secondary-container/40 border border-secondary/30 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">military_tech</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-xs sm:text-sm font-bold text-primary">+25 Poin Kontributor Aksesibilitas</span>
                  <span className="px-2 py-0.2 rounded-full bg-secondary text-on-secondary text-[9px] font-bold">Ditambahkan</span>
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  Terima kasih telah membantu mobilitas pejalan kaki & teman difabel.
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary font-label-sm text-[11px] font-bold shadow-xs">
              🛡 Level 3: Penjaga Trotoar
            </span>
          </div>

          {/* Status Verifikasi Komunitas */}
          <div className="w-full p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-base" aria-hidden="true">how_to_reg</span>
                Status Verifikasi Komunitas
              </span>
              <span className="text-[11px] text-on-surface-variant font-semibold">
                0/3 Konfirmasi Warga Terdekat Dibutuhkan
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div className="w-0 h-full bg-secondary"></div>
            </div>
            <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-primary" aria-hidden="true">info</span>
              Notifikasi otomatis telah dipancarkan kepada 14 kontributor aktif dalam radius 400 meter untuk peninjauan silang.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('explore-map')}
              aria-label="Lihat titik laporan di peta navigasi live Surabaya"
              className="flex-1 w-full min-h-[48px] rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">map</span>
              <span>Lihat Titik di Peta Navigasi</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              aria-label="Buat laporan rintangan trotoar baru"
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md text-xs font-semibold transition-colors"
            >
              Buat Laporan Baru Lagi
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Unduh tanda terima laporan resmi dalam bentuk PDF"
            className="text-xs text-secondary hover:underline flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-xs" aria-hidden="true">download</span>
            <span>Unduh Tanda Terima Laporan (PDF)</span>
          </button>
        </div>
      )}
    </div>
  );
}
