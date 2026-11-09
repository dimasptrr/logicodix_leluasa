import React, { useState, useRef } from 'react';
import { createObstacle } from '../services/api.js';

export default function ReportObstacle({ setActiveTab }) {
  const [currentStep, setCurrentStep] = useState(2);
  const [category, setCategory] = useState('Bollard / Pembatas');
  const [clearanceOption, setClearanceOption] = useState('less_80');
  const [severity, setSeverity] = useState('impassable');
  const [notes, setNotes] = useState('Dua bollard beton dipasang terlalu rapat dekat tiang rambu. Kursi roda listrik tidak bisa lewat tanpa menggores roda.');
  const [forwardDpupr, setForwardDpupr] = useState(true);
  const [shareCommunity, setShareCommunity] = useState(true);
  const [tensorsVisible, setTensorsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [locationText, setLocationText] = useState('Jl. Tunjungan No. 88, Kelurahan Genteng, Kec. Genteng, Kota Surabaya');
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  const fileInputRef = useRef(null);

  const categories = [
    { id: 'Bollard / Pembatas', icon: 'front_hand' },
    { id: 'Galian / Proyek', icon: 'construction' },
    { id: 'Rampa Rusak', icon: 'ramp_right' },
    { id: 'Paving Rusak', icon: 'broken_image' },
    { id: 'Tangga Tanpa Rampa', icon: 'stairs' },
    { id: 'PKL / Parkir Liar', icon: 'local_parking' }
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setCurrentStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const clearanceVal = clearanceOption === 'less_80' ? 65 : clearanceOption === '80_120' ? 95 : 130;
      await createObstacle({
        title: `${category} dilaporkan di ${locationText.split(',')[0]}`,
        location: locationText,
        coordinates: { lat: -7.26042, lng: 112.73831 },
        category,
        clearance: clearanceVal,
        severity,
        notes,
        dpuprForward: forwardDpupr,
        shareCommunity: shareCommunity,
        photoUrl: uploadedImage || undefined
      });

      setSubmitSuccess(true);
      setCurrentStep(3);
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const defaultPhoto = "https://lh3.googleusercontent.com/aida-public/AB6AXuAWEa0Wus1u-hnXUBxKj2npTbprzDFLI7iZUFGMJxzWhScO4C84Fj083fnMd1HtiEYXpT5zqCNnstzhr0N2eDwK2XbcaQfHI-qo8MKOOIrvnaQaXPH9wOmFIXq9j1S6VK6oJ69ZMk-ymbXYwx393_UJjz2d6mrJ-vu7jq_XVm1tbtl0yQ5ARppRDZdkVz4RKU6qddw5SFKYPOukeeYzA53xPRB7TO-Gg3_jEwK3Z3HZ";

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
              <span className="font-label-sm text-[10px] sm:text-xs text-secondary font-bold uppercase tracking-wider">Langkah 2 · Ditinjau</span>
              <span className="font-headline-sm text-xs sm:text-sm text-primary font-bold">Analisis Rintangan AI</span>
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
                {currentStep === 3 ? 'Langkah 3 · Terverifikasi' : 'Langkah 3 · Menunggu'}
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
              <span className="font-headline-sm text-xs sm:text-sm font-bold">Laporan Rintangan Telah Disiarkan!</span>
              <span className="text-[11px] opacity-90">Telemetri rute langsung diperbarui untuk 1.240 pengguna Surabaya. Tiket perbaikan DPUPR telah dibuat.</span>
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
          {/* Kanvas Foto dengan HUD AI */}
          <div className="relative w-full rounded-xl overflow-hidden bg-primary shadow-md">
            <div className="relative w-full aspect-[4/3] bg-surface-dim">
              <img
                alt="Foto rintangan trotoar terdeteksi"
                className="w-full h-full object-cover"
                src={uploadedImage || defaultPhoto}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/30 pointer-events-none"></div>

              {/* Kotak Deteksi AI Bounding Box */}
              {tensorsVisible && (
                <>
                  <div
                    className="absolute top-[28%] left-[22%] w-[38%] h-[54%] rounded-lg pointer-events-none"
                    style={{
                      border: '2px dashed #83f6e7',
                      boxShadow: '0 0 0 1px rgba(0,21,42,0.4), inset 0 0 16px rgba(131,246,231,0.25)'
                    }}
                  >
                    <div className="absolute -top-6 sm:-top-7 left-0 flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded bg-primary text-secondary-container shadow-md">
                      <span className="material-symbols-outlined text-xs sm:text-sm">smart_toy</span>
                      <span className="font-label-sm text-[9px] sm:text-[11px] font-bold">[AI: Bollard Beton]</span>
                      <span className="bg-secondary text-on-secondary px-1 rounded text-[9px] font-bold">91%</span>
                    </div>
                  </div>

                  {/* Penggaris Dimensi Lebar */}
                  <div className="absolute top-[52%] left-[34%] w-[30%] flex flex-col items-center pointer-events-none">
                    <div className="w-full flex items-center justify-between">
                      <span className="w-2 h-2 rounded-full bg-error shadow-[0_0_6px_#ba1a1a]"></span>
                      <div className="flex-1 h-0.5 bg-error mx-1 relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-error text-on-error font-label-sm text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold shadow-md whitespace-nowrap">
                          65 cm
                        </span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-error shadow-[0_0_6px_#ba1a1a]"></span>
                    </div>
                    <div className="mt-3 px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      <span>Di bawah batas legal 90 cm</span>
                    </div>
                  </div>
                </>
              )}

              {/* HUD Header Atas */}
              <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-xs">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                <span className="font-label-sm text-[10px] sm:text-xs text-primary font-bold">Mesin Analisis CV v4.2</span>
              </div>

              <div className="absolute top-2.5 sm:top-4 right-2.5 sm:right-4 flex items-center gap-1">
                <button
                  aria-label="Alihkan tampilan AI"
                  onClick={() => setTensorsVisible(!tensorsVisible)}
                  className="h-8 sm:h-9 px-2 sm:px-3 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md text-on-surface hover:bg-surface-container font-label-sm text-[10px] sm:text-xs flex items-center gap-1 transition-colors shadow-xs"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base text-secondary">
                    {tensorsVisible ? 'visibility' : 'visibility_off'}
                  </span>
                  <span>{tensorsVisible ? 'Tensors Aktif' : 'Tensors Nonaktif'}</span>
                </button>
              </div>

              {/* Pita Informasi Privasi Bawah */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-lowest/95 backdrop-blur-xs text-primary shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-sm sm:text-base">sensor_occupied</span>
                  <span className="font-label-sm text-[10px] sm:text-xs font-semibold">2 Wajah Disamarkan</span>
                </div>
                <span className="font-label-sm text-[10px] sm:text-xs text-secondary font-bold">Sesuai UU PDP</span>
              </div>
            </div>

            {/* Metrik Ringkas AI */}
            <div className="grid grid-cols-3 divide-x divide-outline-variant/20 bg-surface-container-low p-2 sm:p-space-sm text-center">
              <div className="flex flex-col py-0.5">
                <span className="font-label-sm text-[10px] text-on-surface-variant">Lebar Terdeteksi</span>
                <span className="font-headline-sm text-sm sm:text-base text-error font-bold">65 cm</span>
              </div>
              <div className="flex flex-col py-0.5">
                <span className="font-label-sm text-[10px] text-on-surface-variant">Batas Legal Min</span>
                <span className="font-headline-sm text-sm sm:text-base text-primary font-bold">90 cm</span>
              </div>
              <div className="flex flex-col py-0.5">
                <span className="font-label-sm text-[10px] text-on-surface-variant">Dampak</span>
                <span className="font-headline-sm text-sm sm:text-base text-error font-bold">Terblokir</span>
              </div>
            </div>
          </div>

          {/* Banner Jaminan Privasi */}
          <div className="flex items-start gap-2.5 p-3 sm:p-space-md rounded-xl bg-surface-container-low text-on-surface shadow-xs">
            <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5">verified_user</span>
            <div className="flex flex-col">
              <span className="font-label-md text-xs font-bold text-primary">Perlindungan Privasi Aktif</span>
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                Wajah pejalan kaki dan nomor plat kendaraan bermotor diburamkan langsung di perangkat pengguna sebelum disimpan ke basis data publik.
              </p>
            </div>
          </div>

          {/* Telemetri Lokasi GPS */}
          <div className="flex flex-col gap-2 p-3 sm:p-space-md rounded-xl bg-surface-container-lowest shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Telemetri Lokasi</span>
              <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-secondary font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                GPS Akurat ±2m
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg bg-surface-container shrink-0 flex items-center justify-center relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=200&q=80')" }}>
                <span className="material-symbols-outlined text-error text-2xl z-10 drop-shadow-md">fmd_bad</span>
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                {isEditingLocation ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-secondary focus:outline-none"
                    />
                    <button
                      onClick={() => setIsEditingLocation(false)}
                      className="px-2 py-1 bg-secondary text-on-secondary rounded text-xs font-bold"
                    >
                      Selesai
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-secondary text-base">near_me</span>
                      <span className="font-headline-sm text-xs sm:text-sm font-bold truncate">{locationText.split(',')[0]}</span>
                    </div>
                    <span className="font-body-sm text-[11px] text-on-surface-variant truncate">{locationText}</span>
                  </>
                )}
                <span className="font-label-sm text-[10px] text-on-surface-variant/80 mt-0.5">Koordinat: -7.26042, 112.73831 · Jawa Timur</span>

                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingLocation(!isEditingLocation)}
                    className="min-h-[32px] px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-[11px] flex items-center gap-1 transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xs text-secondary">edit_location</span>
                    <span>{isEditingLocation ? 'Simpan' : 'Ubah Lokasi'}</span>
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
                <h2 className="font-headline-md text-base sm:text-xl font-bold text-primary">Peninjauan Deteksi AI</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] sm:text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">auto_awesome</span>
                  Terisi Otomatis
                </span>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant">
                Periksa dan koreksi saran AI sebelum mengirim laporan. Anda memiliki kendali manual penuh terhadap laporan ini.
              </p>
            </div>

            {/* Bidang 1: Kategori Rintangan */}
            <div className="flex flex-col gap-1">
              <label className="font-label-lg text-xs font-bold text-primary flex items-center justify-between">
                <span>Kategori Rintangan</span>
                <span className="font-label-sm text-[11px] text-secondary font-semibold">Tingkat Kecocokan 91%</span>
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
                  <span className="font-body-sm text-[10px] text-on-surface-variant">Memberi peringatan rute instan kepada 1.240 pengguna sekitar.</span>
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

        <button
          id="submit-report-btn"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] px-6 sm:px-8 rounded-xl bg-secondary text-on-secondary hover:bg-on-secondary-container font-label-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          type="button"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              <span>Memverifikasi Telemetri...</span>
            </>
          ) : submitSuccess ? (
            <>
              <span className="material-symbols-outlined text-xl">check</span>
              <span>Laporan Berhasil Disiarkan!</span>
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
