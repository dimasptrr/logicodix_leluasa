import React, { useState, useEffect } from 'react';
import { fetchStats, fetchObstacles, deleteObstacle } from '../features/dashboard/services/safeApi.js';
import EditObstacleModal from '../components/EditObstacleModal.jsx';
import { mockDpuprResolvedReports } from '../features/dashboard/mocks/dpuprResolvedData.js';

export default function ReportsImpact({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'dpupr' | 'active'
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingObstacle, setEditingObstacle] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [statsRes, obsRes] = await Promise.all([
        fetchStats(),
        fetchObstacles()
      ]);
      setStats(statsRes.data);
      setRecentReports(obsRes.data);
    } catch (err) {
      setErrorMessage('Gagal memuat statistik dan laporan terkini. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyReport = (report) => {
    const text = `[LAPORAN RINTANGAN LELUASA]
ID: #${report.id}
Lokasi: ${report.location}
Tingkat Keparahan: ${report.severity.toUpperCase()}
Kategori: ${report.category}
Lebar Bersih: ${report.clearanceLabel || `${report.clearance}cm`}
Diverifikasi oleh: ${report.confirmedCount || report.upvotes} pengguna
Status DPUPR: Diteruskan ke Tim Pemeliharaan Kota Surabaya`;

    navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setToastMsg(`Laporan #${report.id} berhasil disalin ke papan klip!`);
    setTimeout(() => {
      setCopiedId(null);
      setToastMsg('');
    }, 3000);
  };

  const handleShareReport = (report) => {
    if (navigator.share) {
      navigator.share({
        title: `Peringatan Trotoar Leluasa: ${report.title}`,
        text: `Rintangan di ${report.location} (${report.severity.toUpperCase()}). Cek peta live Leluasa:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyReport(report);
    }
  };

  const handleDeleteReport = async (report) => {
    const confirmDelete = window.confirm(
      `Yakin ingin menghapus laporan "${report.title || 'Rintangan'}" (ID #${report.id})?\n\nLaporan ini dan foto terkait akan dihapus secara permanen dari database Supabase.`
    );
    if (!confirmDelete) return;

    setDeletingId(report.id);
    try {
      await deleteObstacle(report.id);
      setRecentReports((prev) => prev.filter((r) => String(r.id) !== String(report.id)));
      setToastMsg(`Laporan #${report.id} berhasil dihapus dari database!`);
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      alert(err.message || 'Gagal menghapus laporan.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReportSaved = (updated) => {
    setRecentReports((prev) =>
      prev.map((r) => (String(r.id) === String(updated.id) ? { ...r, ...updated } : r))
    );
    setToastMsg(`Laporan #${updated.id} berhasil diperbarui di database!`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleReportDeleted = (deletedId) => {
    setRecentReports((prev) => prev.filter((r) => String(r.id) !== String(deletedId)));
    setToastMsg(`Laporan #${deletedId} berhasil dihapus dari database!`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  return (
    <div className="p-3 sm:p-space-md lg:p-space-xl flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl max-w-7xl mx-auto w-full animate-fadeIn pb-8 lg:pb-0">
      {/* Notifikasi Toast */}
      {toastMsg && (
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold shadow-xl flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-secondary-container text-secondary text-xs font-bold inline-block">
              Transparansi Publik · Pemkot Surabaya
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>Terintegrasi DPUPR &amp; SP4N-LAPOR</span>
            </span>
          </div>
          <h1 className="font-headline-lg text-xl sm:text-2xl lg:text-3xl text-primary font-bold tracking-tight mt-1">
            Laporan &amp; Dampak Komunitas
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Dashboard transparansi publik real-time rintangan trotoar Surabaya, verifikasi warga, dan tindak lanjut perbaikan resmi DPUPR.
          </p>
        </div>

        {/* Tombol Poin & Reward Warga */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="px-4 py-2.5 rounded-2xl bg-amber-400 text-slate-900 font-extrabold text-xs shadow-md hover:bg-amber-300 active:scale-95 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <span className="material-symbols-outlined text-base text-amber-900">stars</span>
          <span>Tukar Poin ke Tiket WiraWiri / Suroboyo Bus</span>
        </button>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-warning-container text-on-warning-container border border-warning/40 text-xs flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold">Coba Lagi</button>
        </div>
      )}

      {/* 4 Kartu Statistik Riil Lapangan & Tindak Lanjut DPUPR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-space-md">
        <div className="p-3 sm:p-space-md rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg sm:text-2xl">route</span>
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-3xl font-bold text-primary">
              {stats?.sidewalkKmMapped && stats.sidewalkKmMapped < 100 ? `${stats.sidewalkKmMapped} km` : '4.8 km'}
            </span>
            <p className="font-label-md text-[11px] sm:text-xs font-semibold text-on-surface mt-0.5">Km Trotoar Terpetakan</p>
            <span className="text-[10px] text-on-surface-variant">Koridor Surabaya Pusat</span>
          </div>
        </div>

        <div className="p-3 sm:p-space-md rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg sm:text-2xl">fmd_bad</span>
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-3xl font-bold text-primary">
              {recentReports.length > 0 ? recentReports.length : (stats?.obstaclesReported || 3)}
            </span>
            <p className="font-label-md text-[11px] sm:text-xs font-semibold text-on-surface mt-0.5">Rintangan Dilaporkan</p>
            <span className="text-[10px] text-on-surface-variant">Laporan warga riil</span>
          </div>
        </div>

        <div className="p-3 sm:p-space-md rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg sm:text-2xl">verified_user</span>
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-3xl font-bold text-secondary">
              {recentReports.length > 0
                ? recentReports.reduce((acc, r) => acc + (Number(r.confirmedCount || r.upvotes) || 1), 0)
                : (stats?.communityVerified || 3)}
            </span>
            <p className="font-label-md text-[11px] sm:text-xs font-semibold text-on-surface mt-0.5">Diverifikasi Warga</p>
            <span className="text-[10px] text-on-surface-variant">Validasi sesama pengguna</span>
          </div>
        </div>

        {/* Kartu Ke-4: Selesai Diperbaiki DPUPR Kota Surabaya */}
        <div
          onClick={() => setFilterType('dpupr')}
          className="p-3 sm:p-space-md rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-emerald-500/15 transition-all"
        >
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-xs">
            <span className="material-symbols-outlined text-lg sm:text-2xl">task_alt</span>
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {mockDpuprResolvedReports.length} Lokasi
            </span>
            <p className="font-label-md text-[11px] sm:text-xs font-bold text-on-surface mt-0.5">Selesai Diperbaiki DPUPR</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <span>Klik untuk lihat detail</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </span>
          </div>
        </div>
      </div>

      {/* Arus Laporan Pemeliharaan Komunitas Terkini & Pelaporan DPUPR */}
      <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-space-lg shadow-xs flex flex-col gap-space-md border border-outline-variant/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">feed</span>
            <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">
              {filterType === 'dpupr' ? 'Hasil Tindak Lanjut Perbaikan DPUPR Surabaya' : 'Arus Pemeliharaan Trotoar Terkini'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <div className="flex items-center bg-surface-container p-1 rounded-full border border-outline-variant/30 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Semua ({recentReports.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('dpupr')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'dpupr' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xs">task_alt</span>
                <span>Diperbaiki DPUPR ({mockDpuprResolvedReports.length})</span>
              </button>
            </div>

            <button
              onClick={() => setActiveTab('report-obstacle')}
              className="px-3.5 py-1.5 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold shadow-xs flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Lapor</span>
            </button>
          </div>
        </div>

        {/* TAMPILAN KHUSUS: LAPORAN YANG SELESAI DIPERBAIKI DPUPR (FOTO SEBELUM VS SESUDAH) */}
        {filterType === 'dpupr' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                <span>
                  Menampilkan <strong>{mockDpuprResolvedReports.length} titik trotoar</strong> yang telah diverifikasi dan selesai dikerjakan tuntas oleh Tim Cepat Tanggap DPUPR / DSDABM Kota Surabaya.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="font-bold underline text-primary cursor-pointer shrink-0"
              >
                Tukar Poin Reward Warga
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {mockDpuprResolvedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border-2 border-emerald-500/30 shadow-xs flex flex-col gap-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-outline-variant/20">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">{report.sp4nTicket}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px]">
                          ✅ 100% Selesai Diperbaiki DPUPR
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          Pelapor: {report.reportedBy}
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface mt-1">
                        {report.title}
                      </h3>
                      <p className="text-xs text-on-surface-variant">{report.location}</p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[11px] text-on-surface-variant font-medium block">Waktu Penanganan:</span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">{report.durationHours}</span>
                      <span className="text-[10px] text-on-surface-variant">Selesai: {report.completedDate}</span>
                    </div>
                  </div>

                  {/* Foto Before & After */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl overflow-hidden border border-error/30 bg-surface-container-lowest flex flex-col">
                      <div className="h-44 w-full bg-surface-container">
                        <img src={report.beforeImage} alt={report.beforeCaption} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-error text-white font-bold text-[10px] inline-block mb-1">
                          Sebelum Perbaikan
                        </span>
                        <p className="text-[11px] text-on-surface-variant">{report.beforeCaption}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-emerald-500/40 bg-surface-container-lowest flex flex-col">
                      <div className="h-44 w-full bg-surface-container">
                        <img src={report.afterImage} alt={report.afterCaption} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] inline-block mb-1">
                          Sesudah Diperbaiki DPUPR
                        </span>
                        <p className="text-[11px] text-on-surface-variant">{report.afterCaption}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detail Teknis */}
                  <div className="p-3 rounded-2xl bg-surface-container-lowest text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-outline-variant/20">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-secondary">engineering</span>
                        <span>{report.agency} · {report.teamLeader}</span>
                      </span>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        {report.workSummary}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        {report.accessibilityImpact}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.__leluasaTargetObstacle = {
                            id: report.id,
                            lat: report.coordinates.lat,
                            lng: report.coordinates.lng,
                            title: report.title,
                            photo_url: report.afterImage
                          };
                        }
                        setActiveTab('explore-map');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-secondary text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs hover:bg-secondary/90 transition-all self-end sm:self-center"
                    >
                      <span className="material-symbols-outlined text-sm">map</span>
                      <span>Buka di Peta</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAMPILAN DAFTAR LAPORAN WARGA (SEMUA ATAU AKTIF) */}
        {filterType === 'all' && (
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Banner Sorotan Perbaikan DPUPR */}
            <div
              onClick={() => setFilterType('dpupr')}
              className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between cursor-pointer hover:bg-emerald-500/15 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-lg">construction</span>
                </span>
                <div>
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-200 block">
                    Lihat {mockDpuprResolvedReports.length} Laporan yang Telah Selesai Diperbaiki DPUPR Surabaya
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Lengkap dengan foto Sebelum vs Sesudah pengerjaan satgas &amp; tiket dinas.
                  </span>
                </div>
              </div>
              <span className="text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-0.5 shrink-0">
                <span>Lihat Detail</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>

            {recentReports.map((report) => (
              <div
                key={report.id}
                className="p-3 sm:p-4 rounded-xl bg-surface-container-low hover:bg-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
              >
              <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                {/* Thumbnail Foto Laporan Lapangan */}
                {(report.photo_url || report.image_url) ? (
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-outline-variant/30 shadow-xs bg-surface-container">
                    <img
                      src={report.photo_url || report.image_url}
                      alt={report.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className={`absolute bottom-0 inset-x-0 h-1.5 ${
                      report.severity === 'impassable' ? 'bg-error' : report.severity === 'difficult' ? 'bg-warning' : 'bg-secondary'
                    }`} />
                  </div>
                ) : (
                  <div className={`w-9 sm:w-10 h-9 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    report.severity === 'impassable' ? 'bg-error text-on-error' : report.severity === 'difficult' ? 'bg-warning text-on-warning' : 'bg-secondary text-on-secondary'
                  }`}>
                    <span className="material-symbols-outlined text-lg sm:text-xl">
                      {report.severity === 'impassable' ? 'block' : report.severity === 'difficult' ? 'warning' : 'check_circle'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-label-md text-xs sm:text-sm font-bold text-primary truncate max-w-xs">{report.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                      report.severity === 'impassable' ? 'bg-error-container text-on-error-container' : report.severity === 'difficult' ? 'bg-warning-container text-on-warning-container' : 'bg-secondary-container text-on-secondary-container'
                    }`}>
                      {report.severity === 'impassable' ? 'Tidak bisa dilewati' : report.severity === 'difficult' ? 'Sulit' : 'Bisa dilewati'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">ID #{report.id}</span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant mt-0.5 truncate">{report.location}</span>
                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                    <span>Oleh: {report.reporter}</span>
                    <span>• {report.confirmedCount || report.upvotes} konfirmasi warga</span>
                  </div>
                </div>
              </div>

              {/* Tombol aksi (Salin teks, Bagikan, Lihat Peta) */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  onClick={() => handleCopyReport(report)}
                  className="min-h-[36px] px-2.5 rounded-lg bg-surface-container-lowest text-primary text-xs font-medium hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1"
                  title="Salin Teks Laporan"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedId === report.id ? 'done' : 'content_copy'}
                  </span>
                  <span className="hidden md:inline">{copiedId === report.id ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={() => handleShareReport(report)}
                  className="min-h-[36px] px-2.5 rounded-lg bg-surface-container-lowest text-primary text-xs font-medium hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1"
                  title="Bagikan Laporan"
                >
                  <span className="material-symbols-outlined text-sm">share</span>
                  <span className="hidden md:inline">Bagikan</span>
                </button>
                <button
                  onClick={() => {
                    const lat = Number(report.lat ?? report.latitude ?? report.coordinates?.lat);
                    const lng = Number(report.lng ?? report.longitude ?? report.coordinates?.lng);
                    if (typeof window !== 'undefined') {
                      window.__leluasaTargetObstacle = {
                        ...report,
                        id: String(report.id),
                        lat,
                        lng,
                        latitude: lat,
                        longitude: lng,
                        title: report.title || report.name,
                        photo_url: report.photo_url || report.image_url,
                        image_url: report.photo_url || report.image_url
                      };
                    }
                    setActiveTab('explore-map');
                  }}
                  className="min-h-[36px] px-2.5 rounded-lg bg-secondary text-on-secondary text-xs font-semibold hover:bg-secondary/90 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Lihat titik rintangan ini di Peta"
                >
                  <span className="material-symbols-outlined text-sm">map</span>
                  <span>Peta</span>
                </button>
                <button
                  onClick={() => setEditingObstacle(report)}
                  className="min-h-[36px] px-2.5 rounded-lg bg-surface-container-lowest text-primary text-xs font-semibold hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1 cursor-pointer border border-outline-variant/30"
                  title="Edit rincian atau ubah titik lokasi laporan ini"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span className="hidden md:inline">Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Modal Edit Laporan Rintangan (Interaktif Peta & Fitur Hapus) */}
      <EditObstacleModal
        isOpen={Boolean(editingObstacle)}
        obstacle={editingObstacle}
        onClose={() => setEditingObstacle(null)}
        onSaved={handleReportSaved}
        onDeleted={handleReportDeleted}
      />
    </div>
  );
}
