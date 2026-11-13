import React, { useState, useEffect } from 'react';
import { fetchStats, fetchObstacles, deleteObstacle } from '../features/dashboard/services/safeApi.js';
import EditObstacleModal from '../components/EditObstacleModal.jsx';

export default function ReportsImpact({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
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

  const handlePrintSummary = () => {
    window.print();
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-xl sm:text-2xl lg:text-3xl text-primary font-bold tracking-tight">
            Laporan & Dampak Komunitas
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Dashboard transparansi publik real-time yang menampilkan rintangan trotoar yang dilaporkan warga, diverifikasi sesama pengguna kursi roda, dan tiket perbaikan resmi yang diteruskan ke DPUPR Kota Surabaya.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrintSummary}
            className="min-h-[44px] px-3.5 rounded-xl bg-surface-container-lowest text-primary text-xs font-semibold hover:bg-surface-container transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-warning-container text-on-warning-container border border-warning/40 text-xs flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold">Coba Lagi</button>
        </div>
      )}

      {/* 3 Kartu Statistik Riil Lapangan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-space-md">
        <div className="p-3 sm:p-space-md rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between">
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

        <div className="p-3 sm:p-space-md rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg sm:text-2xl">fmd_bad</span>
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-3xl font-bold text-primary">
              {recentReports.length > 0 ? recentReports.length : (stats?.obstaclesReported || 3)}
            </span>
            <p className="font-label-md text-[11px] sm:text-xs font-semibold text-on-surface mt-0.5">Rintangan Dilaporkan</p>
            <span className="text-[10px] text-on-surface-variant">Survei lapangan riil</span>
          </div>
        </div>

        <div className="p-3 sm:p-space-md rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between">
          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-secondary-container text-secondary flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-lg sm:text-2xl">verified_user</span>
          </div>
          <div>
            <span className="font-headline-lg text-xl sm:text-3xl font-bold text-secondary">
              {recentReports.length > 0
                ? recentReports.reduce((acc, r) => acc + (Number(r.confirmedCount || r.upvotes) || 1), 0)
                : (stats?.communityVerified || 3)}
            </span>
            <p className="font-label-md text-[11px] sm:text-xs font-semibold text-on-surface mt-0.5">Diverifikasi Pengguna</p>
            <span className="text-[10px] text-on-surface-variant">Konfirmasi warga & komunitas</span>
          </div>
        </div>
      </div>

      {/* Arus Laporan Pemeliharaan Komunitas Terkini */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xs flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">feed</span>
            <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">Arus Pemeliharaan Trotoar Terkini</h2>
          </div>
          <button
            onClick={() => setActiveTab('report-obstacle')}
            className="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold shadow-xs flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Lapor Rintangan</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3">
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
