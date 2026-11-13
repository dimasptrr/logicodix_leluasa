import React, { useState, useEffect } from 'react';
import {
  getUserProfile,
  REWARD_CATALOG,
  getRedeemedVouchers,
  getPointsHistory,
  redeemRewardItem,
  getUserReports,
  resolveDpuprReport
} from '../features/rewards/rewardService.js';
import { fetchObstacles } from '../features/dashboard/services/safeApi.js';

export default function Profile({ setActiveTab }) {
  const [profile, setProfile] = useState(getUserProfile());
  const [vouchers, setVouchers] = useState(getRedeemedVouchers());
  const [history, setHistory] = useState(getPointsHistory());
  const [reports, setReports] = useState(getUserReports());
  const [reportFilter, setReportFilter] = useState('all'); // 'all' | 'resolved' | 'in_progress'
  const [activeTab, setSubTab] = useState('catalog'); // 'catalog' | 'vouchers' | 'my-reports' | 'history'
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState(null);
  const [activeDigitalTicket, setActiveDigitalTicket] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // Perhitungan statistik riil dari data laporan warga secara real-time
  const resolvedDpuprCount = reports.filter(r => r.status === 'resolved').length;
  const inProgressCount = reports.filter(r => r.status !== 'resolved').length;
  const totalReportsCount = reports.length;
  const verifiedReportsCount = reports.filter(r => r.status === 'resolved' || r.status === 'verified').length;

  // Sinkronkan pembaruan poin & laporan secara real-time
  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getUserProfile());
      setVouchers(getRedeemedVouchers());
      setHistory(getPointsHistory());
      setReports(getUserReports());
    };
    window.addEventListener('leluasa:rewards-updated', handleUpdate);
    window.addEventListener('leluasa:reports-updated', handleUpdate);
    return () => {
      window.removeEventListener('leluasa:rewards-updated', handleUpdate);
      window.removeEventListener('leluasa:reports-updated', handleUpdate);
    };
  }, []);

  // Sinkronkan data riil rintangan dari database Supabase / Riwayat Komunitas
  useEffect(() => {
    async function syncCommunityReports() {
      try {
        const obsRes = await fetchObstacles();
        if (obsRes?.data && Array.isArray(obsRes.data) && obsRes.data.length > 0) {
          const mapped = obsRes.data.map((obs) => {
            const isResolved = obs.status === 'resolved';
            return {
              id: String(obs.id),
              sp4nTicket: `SP4N-LAPOR #DSDABM-2026-00${obs.id}`,
              title: obs.title || obs.name || 'Rintangan Trotoar',
              location: obs.location || obs.location_text || 'Surabaya',
              coordinates: { lat: Number(obs.lat ?? obs.latitude), lng: Number(obs.lng ?? obs.longitude) },
              category: obs.category || 'Rintangan Trotoar',
              severity: obs.severity || 'difficult',
              status: isResolved ? 'resolved' : 'in_progress',
              reportedBy: obs.reporter || 'Dian Kartika Putri',
              reportedDate: obs.reported_at ? new Date(obs.reported_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '11 Nov 2026',
              durationHours: isResolved ? 'Tuntas Diperbaiki' : 'Dalam Antrean Satgas',
              agency: 'DSDABM & Dishub Kota Surabaya',
              teamLeader: 'Satgas UPTD Pemeliharaan Wilayah Surabaya Pusat',
              pointsAwarded: isResolved ? 100 : 50,
              communityConfirmations: obs.confirmedCount || obs.upvotes || 1,
              workSummary: isResolved
                ? 'Perbaikan fisik trotoar telah diselesaikan tuntas oleh satgas DPUPR di lokasi.'
                : 'Laporan warga telah masuk antrean satgas DSDABM / DPUPR Surabaya untuk tindakan normalisasi lapangan.',
              accessibilityImpact: isResolved
                ? 'Jalur trotoar kini 100% mulus dan ramah disabilitas.'
                : 'Akan dinormalisasi sesuai standar rampa 1:12 dan lebar bersih trotoar minimal 120 cm.',
              photo_url: obs.photo_url || obs.image_url,
              beforeImage: obs.photo_url || obs.image_url,
              beforeCaption: `Kondisi Dilaporkan: ${obs.title || obs.category} (${obs.severity === 'impassable' ? 'Tidak bisa dilewati' : 'Sulit dilewati'})`
            };
          });
          setReports(mapped);
        }
      } catch (err) {
        // Fallback to local user reports
      }
    }
    syncCommunityReports();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleResolveReport = (reportId) => {
    try {
      resolveDpuprReport(reportId);
      setProfile(getUserProfile());
      setReports((prev) =>
        prev.map((r) =>
          String(r.id) === String(reportId)
            ? {
                ...r,
                status: 'resolved',
                completedDate: 'Hari ini, Baru saja',
                durationHours: '24 Jam Pengerjaan Tuntas',
                agency: 'DSDABM Kota Surabaya · Satgas UPTD Pemeliharaan Trotoar',
                teamLeader: 'Tim Reaksi Cepat Surabaya',
                pointsAwarded: 100,
                workSummary: 'Perbaikan fisik trotoar telah diselesaikan tuntas oleh satgas DPUPR / DSDABM di lokasi, aksesibilitas telah dipulihkan.',
                accessibilityImpact: 'Jalur trotoar kini 100% mulus, aman, dan dapat dilintasi kursi roda maupun tongkat tunanetra.',
                afterImage: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
                afterCaption: 'Kondisi Sesudah: Selesai diperbaiki tuntas oleh satgas DPUPR Surabaya.'
              }
            : r
        )
      );
      setHistory(getPointsHistory());
      showToast(`🎉 Satgas DPUPR telah menyelesaikan perbaikan laporan ini! Bonus +100 Poin Leluasa berhasil ditambahkan ke profil Anda!`);
    } catch (err) {
      alert(err.message || 'Gagal menandai laporan.');
    }
  };

  const handleOpenRedeemModal = (item) => {
    if (profile.points < item.pointsCost) {
      showToast(`Poin Anda belum cukup (${profile.points} Poin). Perlu ${item.pointsCost} Poin untuk ${item.title}.`);
      return;
    }
    setSelectedRewardToRedeem(item);
  };

  const handleConfirmRedeem = () => {
    if (!selectedRewardToRedeem) return;
    setRedeeming(true);
    try {
      const newVoucher = redeemRewardItem(selectedRewardToRedeem);
      setProfile(getUserProfile());
      setVouchers(getRedeemedVouchers());
      setHistory(getPointsHistory());
      setSelectedRewardToRedeem(null);
      setActiveDigitalTicket(newVoucher);
      showToast(`Sukses! Poin berhasil ditukar dengan ${newVoucher.title}!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="p-3 sm:p-space-md lg:p-space-xl flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl max-w-7xl mx-auto w-full animate-fadeIn pb-12 lg:pb-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3 px-5 rounded-2xl bg-secondary text-on-secondary font-label-sm text-xs font-bold shadow-2xl flex items-center gap-2 animate-fadeIn border border-white/20">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER SECTION: KARTU PROFIL & STATUS KONTRIBUTOR WARGA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-secondary p-5 sm:p-7 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-48 h-48 rounded-full bg-amber-400/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Sisi Kiri: Foto, Nama, Badge */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl border-3 border-white/40 overflow-hidden shadow-lg bg-surface-container">
                <img
                  src={profile.avatar}
                  alt={`Foto Profil ${profile.name}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] shadow" title="Akun Warga Terverifikasi">
                <span className="material-symbols-outlined text-xs text-white">verified</span>
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline-lg text-lg sm:text-2xl font-extrabold tracking-tight">
                  {profile.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-200 text-[11px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">military_tech</span>
                  <span>{profile.badge}</span>
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-xs">location_on</span>
                <span>{profile.district} · {profile.city}</span>
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] font-semibold text-white/90">
                <span className="px-2 py-0.5 rounded-md bg-white/15">ID #{profile.id}</span>
                <span className="px-2 py-0.5 rounded-md bg-white/15">Bergabung {profile.joinedDate}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{profile.level}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Saldo Poin & Tombol Aksi Cepat */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/20 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20 shrink-0">
            <div className="flex flex-col pr-0 sm:pr-4 sm:border-r border-white/20">
              <span className="text-[11px] uppercase tracking-wider text-white/70 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-amber-400">stars</span>
                <span>Saldo Poin Leluasa</span>
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
                  {profile.points.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-white/90">Poin</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${profile.levelProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-white/70 mt-1 font-medium">
                {profile.levelProgress}% menuju Level 5 (Jawara Trotoar)
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setSubTab('catalog')}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-xs shadow-md hover:bg-amber-300 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">redeem</span>
                <span>Tukar Tiket Bus</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report-obstacle')}
                className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Lapor &amp; Raih +50 Poin</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KARTU STATISTIK KONTRIBUSI WARGA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary-container text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">flag</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-primary block leading-tight">
              {totalReportsCount}
            </span>
            <span className="text-xs font-bold text-on-surface">Laporan Dibuat</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">+50 Poin / laporan</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-secondary block leading-tight">
              {verifiedReportsCount}
            </span>
            <span className="text-xs font-bold text-on-surface">Terverifikasi Warga</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Divalidasi komunitas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex items-center gap-3.5 ring-2 ring-emerald-500/20 bg-emerald-500/5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">construction</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 block leading-tight">
              {resolvedDpuprCount}
            </span>
            <span className="text-xs font-bold text-on-surface">Selesai Diperbaiki DPUPR</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
              +100 s.d +150 Poin Bonus!
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs border border-outline-variant/30 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">confirmation_number</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-300 block leading-tight">
              {vouchers.length}
            </span>
            <span className="text-xs font-bold text-on-surface">Tiket Aktif</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">WiraWiri / Suroboyo Bus</span>
          </div>
        </div>
      </div>

      {/* CARA KERJA POIN & REWARD (GAMIFIKASI EDUKATIF KOTA SURABAYA) */}
      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0">
            <span className="material-symbols-outlined text-lg">lightbulb</span>
          </div>
          <div>
            <span className="font-extrabold text-on-surface block text-xs sm:text-sm">
              Cara Mendapatkan Poin &amp; Naik Transportasi Gratis di Surabaya:
            </span>
            <p className="text-on-surface-variant text-[11px] mt-0.5">
              1 Laporan Baru = <strong>+50 Poin</strong> • Verifikasi Laporan Warga Lain = <strong>+25 Poin</strong> • Laporan Anda Selesai Diperbaiki DPUPR = <strong>Bonus +100 Poin</strong>!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('report-obstacle')}
          className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shrink-0 hover:bg-primary-container transition-all cursor-pointer flex items-center gap-1 self-end sm:self-center"
        >
          <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
          <span>Lapor Sekarang</span>
        </button>
      </div>

      {/* TAB PILIHAN MENU (KATALOG REWARD, TIKET AKTIF SAYA, LAPORAN SAYA & DPUPR, RIWAYAT POIN) */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-outline-variant/30 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSubTab('catalog')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">redeem</span>
          <span>Katalog Tukar Reward ({REWARD_CATALOG.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('vouchers')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'vouchers'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">confirmation_number</span>
          <span>Tiket Aktif</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('my-reports')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'my-reports'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">build_circle</span>
          <span>Laporan Saya &amp; Hasil DPUPR</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold">
            {resolvedDpuprCount} Diperbaiki
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          <span>Riwayat Poin</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: KATALOG TUKAR REWARD (WIRAWIRI SUROBOYO & SUROBOYO BUS)
          ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary">
                Katalog Reward Transportasi Surabaya
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Tukarkan poin laporan Anda dengan tiket transportasi umum ramah disabilitas (WiraWiri Suroboyo &amp; Suroboyo Bus).
              </p>
            </div>
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              Poin Tersedia: {profile.points} Poin
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {REWARD_CATALOG.map((item) => {
              const canAfford = profile.points >= item.pointsCost;
              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-surface-container">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Badge Kategori */}
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-sm ${item.badgeColor}`}>
                      {item.badge}
                    </span>

                    {/* Harga Poin di Pojok Kanan Atas */}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-amber-300 font-extrabold text-xs flex items-center gap-1 shadow-md">
                      <span className="material-symbols-outlined text-sm text-amber-400">stars</span>
                      <span>{item.pointsCost} Poin</span>
                    </div>

                    {/* Info Partner di Bawah Foto */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[11px] font-bold text-amber-300 block">{item.partner}</span>
                      <h3 className="font-headline-sm text-base sm:text-lg font-bold leading-tight mt-0.5">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1 justify-between">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {item.description}
                      </p>
                      <div className="p-2.5 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-secondary">info</span>
                        <span>{item.terms}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                      <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                        <span>{item.quota}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenRedeemModal(item)}
                        disabled={!canAfford}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-primary hover:bg-primary-container text-on-primary active:scale-95'
                            : 'bg-surface-container text-outline cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">redeem</span>
                        <span>{canAfford ? `Tukar ${item.pointsCost} Poin` : `Poin Kurang (${profile.points}/${item.pointsCost})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TIKET AKTIF SAYA (E-TICKET DIGITAL RESMI WIRAWIRI / SUROBOYO BUS)
          ========================================================================= */}
      {activeTab === 'vouchers' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary">
              Tiket Aktif Milik Anda
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Tunjukkan QR Code tiket ini ke kondektur armada WiraWiri Suroboyo atau Suroboyo Bus untuk naik gratis.
            </p>
          </div>

          {vouchers.length === 0 ? (
            <div className="p-8 rounded-3xl bg-surface-container-lowest text-center border border-outline-variant/30 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-outline">confirmation_number</span>
              <p className="text-sm font-bold text-on-surface">Belum ada tiket aktif</p>
              <p className="text-xs text-on-surface-variant max-w-sm">
                Kumpulkan poin dengan melapor rintangan trotoar dan tukarkan dengan tiket WiraWiri Suroboyo atau Suroboyo Bus!
              </p>
              <button
                type="button"
                onClick={() => setSubTab('catalog')}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs mt-2"
              >
                Buka Katalog Reward
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vouchers.map((vcr) => (
                <div
                  key={vcr.id}
                  className="rounded-3xl bg-surface-container-lowest border-2 border-primary/20 shadow-md p-5 flex flex-col justify-between gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-2xl">{vcr.icon || 'directions_bus'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">{vcr.partner}</span>
                        <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface mt-0.5">
                          {vcr.title}
                        </h3>
                        <span className="text-[11px] font-mono text-on-surface-variant font-bold">
                          Kode: {vcr.code}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Siap Dipakai</span>
                    </span>
                  </div>

                  {/* Garis Tiket Perforasi */}
                  <div className="relative flex items-center justify-between py-2 border-t-2 border-dashed border-outline-variant/30">
                    <div className="flex flex-col text-[11px]">
                      <span className="text-on-surface-variant font-medium">Ditukar Pada:</span>
                      <span className="font-bold text-on-surface">{vcr.redeemedAt}</span>
                    </div>
                    <div className="flex flex-col text-[11px] text-right">
                      <span className="text-on-surface-variant font-medium">Berlaku Sampai:</span>
                      <span className="font-bold text-error">{vcr.expiresAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      Poin Digunakan: <strong>{vcr.pointsUsed} Poin</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveDigitalTicket(vcr)}
                      className="px-4 py-2 rounded-xl bg-primary text-on-primary font-extrabold text-xs shadow-xs hover:bg-primary-container transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">qr_code_2</span>
                      <span>Buka QR Code Tiket</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: LAPORAN SAYA & HASIL TINDAK LANJUT DPUPR KOTA SURABAYA (REAL-TIME)
          ========================================================================= */}
      {activeTab === 'my-reports' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary">
                Laporan Anda &amp; Status Perbaikan DPUPR Kota Surabaya
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Pantau proses pengerjaan satgas dinas secara real-time. Setiap laporan selesai memberi Anda bonus +100 s.d +150 Poin!
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('report-obstacle')}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-primary-container cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Lapor Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports-impact')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Riwayat Komunitas</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Filter Sub-Tab Laporan Saya */}
          <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-2xl w-fit border border-outline-variant/30 text-xs font-bold">
            <button
              type="button"
              onClick={() => setReportFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                reportFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Semua Laporan ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => setReportFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                reportFilter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">task_alt</span>
              <span>Selesai Diperbaiki ({resolvedDpuprCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setReportFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                reportFilter === 'in_progress'
                  ? 'bg-amber-500 text-slate-900 shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">pending</span>
              <span>Sedang Diproses ({inProgressCount})</span>
            </button>
          </div>

          {/* Daftar Kartu Laporan Real-Time */}
          <div className="flex flex-col gap-3.5">
            {reports
              .filter((r) => {
                if (reportFilter === 'resolved') return r.status === 'resolved';
                if (reportFilter === 'in_progress') return r.status !== 'resolved';
                return true;
              })
              .map((report) => {
                const isResolved = report.status === 'resolved';

                return (
                  <div
                    key={report.id}
                    className={`p-4 sm:p-5 rounded-3xl bg-surface-container-lowest border-2 shadow-xs flex flex-col gap-4 transition-all ${
                      isResolved ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-amber-500/40'
                    }`}
                  >
                    {/* Header Kartu Laporan */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isResolved ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                        }`}>
                          <span className="material-symbols-outlined text-xl">
                            {isResolved ? 'task_alt' : 'construction'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary">{report.sp4nTicket}</span>
                            {isResolved ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[10px]">
                                ✅ 100% Selesai Diperbaiki DPUPR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 font-extrabold text-[10px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-ping" />
                                <span>🛠️ Sedang Dikerjakan Satgas DPUPR</span>
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px]">
                              {isResolved ? `+${report.pointsAwarded || 100} Poin Bonus Diterima` : '+50 Poin Laporan'}
                            </span>
                          </div>
                          <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface mt-1">
                            {report.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant">{report.location}</p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[11px] text-on-surface-variant font-medium block">Status Penanganan:</span>
                        <span className={`text-xs font-bold block ${isResolved ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                          {report.durationHours || 'Dalam Pengerjaan Satgas'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {isResolved ? `Selesai: ${report.completedDate}` : `Dilaporkan: ${report.reportedDate}`}
                        </span>
                      </div>
                    </div>

                    {/* Foto Komparasi: Sebelum vs Sesudah (atau Foto Laporan Aktif) */}
                    {isResolved ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative rounded-2xl overflow-hidden border border-error/30 bg-surface-container">
                          <div className="h-44 w-full">
                            <img src={report.beforeImage || report.photo_url} alt={report.beforeCaption || 'Foto Sebelum'} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-2.5 bg-surface-container-low text-xs">
                            <span className="px-2 py-0.5 rounded bg-error text-white font-bold text-[10px] inline-block mb-1">
                              Sebelum Perbaikan
                            </span>
                            <p className="text-[11px] text-on-surface-variant">{report.beforeCaption || 'Kondisi trotoar rusak sebelum diperbaiki'}</p>
                          </div>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-surface-container">
                          <div className="h-44 w-full">
                            <img src={report.afterImage} alt={report.afterCaption || 'Foto Sesudah'} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-2.5 bg-surface-container-low text-xs">
                            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] inline-block mb-1">
                              Sesudah Diperbaiki DPUPR
                            </span>
                            <p className="text-[11px] text-on-surface-variant">{report.afterCaption || 'Kondisi trotoar setelah rampung diperbaiki DPUPR'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-surface-container">
                          <div className="h-44 w-full">
                            <img src={report.beforeImage || report.photo_url} alt="Foto Kondisi Lapangan" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-2.5 bg-surface-container-low text-xs">
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-900 font-bold text-[10px] inline-block mb-1">
                              Kondisi Dilaporkan Warga
                            </span>
                            <p className="text-[11px] text-on-surface-variant">{report.beforeCaption || 'Foto rintangan yang dilaporkan ke dinas'}</p>
                          </div>
                        </div>

                        <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between text-xs">
                          <div className="flex flex-col gap-2">
                            <span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">engineering</span>
                              <span>Proses Satgas Lapangan</span>
                            </span>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">
                              {report.workSummary || 'Laporan telah divalidasi dan masuk ke antrean prioritas pengerjaan satgas DSDABM / DPUPR Kota Surabaya.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-amber-500/30 mt-3 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
                              Simulasi Real-Time Satgas:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResolveReport(report.id)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              title="Tandai laporan ini telah tuntas diperbaiki DPUPR (+100 Poin bonus real-time)"
                            >
                              <span className="material-symbols-outlined text-sm">task_alt</span>
                              <span>Tandai Selesai Diperbaiki (+100 Poin)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ringkasan Pengerjaan Teknis Dinas */}
                    <div className="p-3 rounded-2xl bg-surface-container-low text-xs flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-primary font-bold">
                        <span className="material-symbols-outlined text-base text-secondary">engineering</span>
                        <span>Pelaksana: {report.agency} ({report.teamLeader})</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        {report.workSummary}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[11px]">
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                          Dampak Akses: {report.accessibilityImpact}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.__leluasaTargetObstacle = {
                                id: report.id,
                                lat: report.coordinates?.lat,
                                lng: report.coordinates?.lng,
                                title: report.title,
                                photo_url: report.afterImage || report.photo_url || report.beforeImage
                              };
                            }
                            setActiveTab('explore-map');
                          }}
                          className="px-3 py-1 rounded-lg bg-secondary text-white font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-secondary/90 transition-all"
                        >
                          <span className="material-symbols-outlined text-xs">map</span>
                          <span>Buka di Peta</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: RIWAYAT MUTASI POIN
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary">
              Riwayat Perolehan &amp; Pemakaian Poin
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Transparansi seluruh mutasi poin reward kontribusi Anda untuk kota Surabaya.
            </p>
          </div>

          <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden shadow-xs">
            <div className="divide-y divide-outline-variant/20">
              {history.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      item.type === 'earned' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-xl">
                        {item.type === 'earned' ? 'add_circle' : 'redeem'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-on-surface block leading-tight">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-on-surface-variant">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-surface-container font-semibold">{item.badge}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-sm sm:text-base font-extrabold shrink-0 ${
                    item.type === 'earned' ? 'text-emerald-600' : 'text-primary'
                  }`}>
                    {item.points > 0 ? `+${item.points}` : item.points} Poin
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL KONFIRMASI PENUKARAN REWARD
          ========================================================================= */}
      {selectedRewardToRedeem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-xl text-amber-500">stars</span>
                <span>Konfirmasi Penukaran Poin</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRewardToRedeem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">{selectedRewardToRedeem.icon}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-primary block">{selectedRewardToRedeem.partner}</span>
                <h4 className="font-headline-sm text-sm font-bold text-on-surface mt-0.5">
                  {selectedRewardToRedeem.title}
                </h4>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
                  Biaya: {selectedRewardToRedeem.pointsCost} Poin
                </span>
              </div>
            </div>

            <div className="text-xs text-on-surface-variant flex flex-col gap-2">
              <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                <span>Saldo Poin Anda Saat Ini:</span>
                <span className="font-bold text-on-surface">{profile.points} Poin</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-1.5">
                <span>Poin yang Digunakan:</span>
                <span className="font-bold text-error">-{selectedRewardToRedeem.pointsCost} Poin</span>
              </div>
              <div className="flex justify-between font-bold text-on-surface">
                <span>Sisa Poin Setelah Penukaran:</span>
                <span className="text-primary">{profile.points - selectedRewardToRedeem.pointsCost} Poin</span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant bg-surface-container-low p-2.5 rounded-xl">
              Tiket digital QR Code resmi akan langsung diterbitkan dan dapat ditunjukkan saat menaiki armada bus.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRewardToRedeem(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-outline-variant bg-surface-container text-on-surface font-semibold text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 min-h-[44px] rounded-xl bg-primary hover:bg-primary-container text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{redeeming ? 'Memproses...' : 'Ya, Tukar Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL TIKET DIGITAL RESMI WIRAWIRI / SUROBOYO BUS (DENGAN QR CODE)
          ========================================================================= */}
      {activeDigitalTicket && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/70 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-2xl border-2 border-primary overflow-hidden flex flex-col">
            {/* Header Tiket Bus */}
            <div className="bg-primary p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">directions_bus</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm font-extrabold uppercase tracking-wide">
                    {activeDigitalTicket.title}
                  </h3>
                  <span className="text-[10px] text-white/80 block">{activeDigitalTicket.partner}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDigitalTicket(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Badan Tiket & QR Code */}
            <div className="p-6 flex flex-col items-center text-center gap-4 bg-surface-container-lowest">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>TIKET AKTIF · SIAP SCAN</span>
              </span>

              {/* QR Code Grafis Digital Interaktif */}
              <div className="p-4 rounded-2xl bg-white border-2 border-primary/30 shadow-md flex flex-col items-center">
                <svg className="w-48 h-48" viewBox="0 0 160 160" fill="none">
                  {/* Pola QR Code Dinamis Surabaya */}
                  <rect width="160" height="160" fill="white" />
                  {/* Sudut QR Kotak Kiri Atas */}
                  <rect x="10" y="10" width="40" height="40" fill="#0037B0" rx="6" />
                  <rect x="18" y="18" width="24" height="24" fill="white" rx="3" />
                  <rect x="24" y="24" width="12" height="12" fill="#0037B0" rx="2" />
                  {/* Sudut QR Kotak Kanan Atas */}
                  <rect x="110" y="10" width="40" height="40" fill="#0037B0" rx="6" />
                  <rect x="118" y="18" width="24" height="24" fill="white" rx="3" />
                  <rect x="124" y="24" width="12" height="12" fill="#0037B0" rx="2" />
                  {/* Sudut QR Kotak Kiri Bawah */}
                  <rect x="10" y="110" width="40" height="40" fill="#0037B0" rx="6" />
                  <rect x="18" y="118" width="24" height="24" fill="white" rx="3" />
                  <rect x="24" y="124" width="12" height="12" fill="#0037B0" rx="2" />
                  {/* Data Pixel Mock Barcode */}
                  <rect x="60" y="15" width="8" height="8" fill="#0037B0" />
                  <rect x="75" y="15" width="16" height="8" fill="#0037B0" />
                  <rect x="60" y="30" width="24" height="8" fill="#0037B0" />
                  <rect x="90" y="30" width="8" height="16" fill="#0037B0" />
                  <rect x="15" y="60" width="8" height="16" fill="#0037B0" />
                  <rect x="30" y="60" width="16" height="8" fill="#0037B0" />
                  <rect x="60" y="60" width="16" height="16" fill="#0037B0" />
                  <rect x="85" y="60" width="8" height="8" fill="#0037B0" />
                  <rect x="100" y="60" width="16" height="8" fill="#0037B0" />
                  <rect x="125" y="60" width="8" height="24" fill="#0037B0" />
                  <rect x="140" y="60" width="8" height="8" fill="#0037B0" />
                  <rect x="20" y="85" width="16" height="8" fill="#0037B0" />
                  <rect x="45" y="80" width="8" height="16" fill="#0037B0" />
                  <rect x="65" y="85" width="24" height="8" fill="#0037B0" />
                  <rect x="100" y="75" width="8" height="24" fill="#0037B0" />
                  <rect x="115" y="90" width="16" height="8" fill="#0037B0" />
                  <rect x="60" y="100" width="8" height="24" fill="#0037B0" />
                  <rect x="75" y="105" width="16" height="8" fill="#0037B0" />
                  <rect x="100" y="110" width="24" height="8" fill="#0037B0" />
                  <rect x="135" y="100" width="8" height="16" fill="#0037B0" />
                  <rect x="60" y="130" width="24" height="8" fill="#0037B0" />
                  <rect x="90" y="125" width="8" height="16" fill="#0037B0" />
                  <rect x="105" y="130" width="16" height="8" fill="#0037B0" />
                  <rect x="130" y="125" width="16" height="8" fill="#0037B0" />
                  {/* Ikon Bus di Tengah QR */}
                  <circle cx="80" cy="80" r="14" fill="#FFE083" stroke="#0037B0" strokeWidth="2" />
                  <text x="80" y="85" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0037B0">L</text>
                </svg>
                <span className="font-mono text-xs font-bold text-primary tracking-wider mt-2">
                  {activeDigitalTicket.code}
                </span>
              </div>

              {/* Detail Tiket */}
              <div className="w-full p-3 rounded-2xl bg-surface-container-low text-xs flex flex-col gap-1.5 text-left">
                <div className="flex justify-between border-b border-outline-variant/20 pb-1">
                  <span className="text-on-surface-variant font-medium">Penumpang:</span>
                  <span className="font-bold text-on-surface">{profile.name}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/20 pb-1">
                  <span className="text-on-surface-variant font-medium">Berlaku Sampai:</span>
                  <span className="font-bold text-error">{activeDigitalTicket.expiresAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Status:</span>
                  <span className="font-bold text-emerald-600">Gratis (Ditukar Poin)</span>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Arahkan QR Code ini ke kamera scanner di dekat pintu masuk armada WiraWiri / Suroboyo Bus, atau tunjukkan kepada kru bus.
              </p>

              <button
                type="button"
                onClick={() => {
                  setActiveDigitalTicket(null);
                  showToast('Tiket tersimpan di tab "Tiket & Voucher Aktif"!');
                }}
                className="w-full min-h-[44px] rounded-xl bg-primary text-white font-extrabold text-xs shadow-md hover:bg-primary-container transition-all cursor-pointer"
              >
                Selesai &amp; Simpan Tiket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

