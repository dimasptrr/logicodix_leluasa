// Service Pengelolaan Poin Reward & Profil Warga Leluasa (Surabaya)
// Disimpan di localStorage agar interaktif dan tersinkronisasi secara real-time

const STORAGE_KEY_PROFILE = 'leluasa_user_profile_v1';
const STORAGE_KEY_VOUCHERS = 'leluasa_redeemed_vouchers_v1';
const STORAGE_KEY_HISTORY = 'leluasa_points_history_v1';
const STORAGE_KEY_REPORTS = 'leluasa_user_reports_v2';

const DEFAULT_PROFILE = {
  id: 'USR-SBY-2026-088',
  name: 'Dian Kartika Putri',
  nikMasked: '357801******0004',
  city: 'Surabaya, Jawa Timur',
  district: 'Kec. Genteng, Surabaya Pusat',
  role: 'Warga Peduli Aksesibilitas Surabaya',
  badge: 'Pahlawan Trotoar Surabaya',
  level: 'Level 4 · Kontributor Emas',
  levelProgress: 83, // 1250 / 1500 poin menuju Level 5
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  points: 1250,
  totalReports: 5,
  verifiedReports: 4,
  fixedByDPUPR: 3,
  joinedDate: 'Januari 2026'
};

export const REWARD_CATALOG = [
  {
    id: 'wirawiri-single',
    title: 'Tiket WiraWiri Suroboyo',
    category: 'transport',
    partner: 'Feeder WiraWiri · Dishub Kota Surabaya',
    pointsCost: 100,
    badge: 'Paling Populer',
    badgeColor: 'bg-primary text-white',
    icon: 'directions_bus',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=400&q=80',
    description: '1 Tiket Feeder WiraWiri rute manapun di Surabaya. Armada low-floor dengan rampa aksesibel kursi roda.',
    terms: 'Berlaku 30 hari sejak penukaran. Tunjukkan QR Code tiket kepada helper/kondektur bus.',
    quota: 'Tersedia'
  },
  {
    id: 'suroboyobus-pass',
    title: 'Tiket Suroboyo Bus (1 Hari All-Day Pass)',
    category: 'transport',
    partner: 'Suroboyo Bus · Dishub Kota Surabaya',
    pointsCost: 150,
    badge: 'Ramah Kursi Roda',
    badgeColor: 'bg-secondary text-white',
    icon: 'airport_shuttle',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80',
    description: 'Akses bebas naik Suroboyo Bus koridor manapun seharian penuh tanpa bayar botol plastik.',
    terms: 'Berlaku untuk 1 hari perjalanan dari jam 05:30 - 21:00 WIB di seluruh koridor aktif.',
    quota: 'Tersedia'
  }
];

const INITIAL_VOUCHERS = [
  {
    id: 'VCR-WIRAWIRI-2026-991',
    rewardId: 'wirawiri-single',
    title: 'Tiket WiraWiri Suroboyo',
    partner: 'Feeder WiraWiri · Dishub Surabaya',
    code: 'WW-SBY-8839-4412',
    redeemedAt: '10 November 2026, 14:20 WIB',
    expiresAt: '10 Desember 2026',
    status: 'active', // 'active' | 'used'
    pointsUsed: 100,
    icon: 'directions_bus',
    qrValue: 'LELUASA-TICKET-WW-8839-DIAN-KARTIKA'
  }
];

const INITIAL_HISTORY = [
  {
    id: 'PTS-01',
    date: '12 Nov 2026, 09:15 WIB',
    description: 'Laporan perbaikan paving di Jl. Pemuda diselesaikan oleh DPUPR Surabaya',
    type: 'earned',
    points: 100,
    badge: 'Perbaikan DPUPR Selesai'
  },
  {
    id: 'PTS-02',
    date: '11 Nov 2026, 16:30 WIB',
    description: 'Laporan baru: Undakan rampa curam di Jl. Yos Sudarso diverifikasi 6 warga',
    type: 'earned',
    points: 75,
    badge: 'Verifikasi Komunitas'
  },
  {
    id: 'PTS-03',
    date: '10 Nov 2026, 14:20 WIB',
    description: 'Penukaran 1 Tiket WiraWiri Suroboyo (Feeder)',
    type: 'spent',
    points: -100,
    badge: 'Tukar Reward'
  },
  {
    id: 'PTS-04',
    date: '08 Nov 2026, 11:00 WIB',
    description: 'Laporan baru: Bollard rapat di Jl. Basuki Rahmat selesai dipindahkan oleh DPUPR',
    type: 'earned',
    points: 150,
    badge: 'Perbaikan DPUPR Selesai'
  }
];

// Data Riil Awal Laporan Warga & Tindak Lanjut DPUPR Surabaya (Real-time Pipeline)
export const INITIAL_USER_REPORTS = [
  {
    id: 'REP-SBY-0842',
    sp4nTicket: 'SP4N-LAPOR #DSDABM-2026-0842',
    title: 'Perataan Paving Amblas & Guiding Block Baru Jl. Pemuda',
    location: 'Jl. Pemuda No. 12 (Sisi Depan Balai Pemuda), Surabaya Pusat',
    coordinates: { lat: -7.2642, lng: 112.7449 },
    category: 'Paving Rusak & Amblas',
    severity: 'impassable',
    status: 'resolved',
    reportedBy: 'Dian Kartika Putri',
    reportedDate: '8 Nov 2026',
    completedDate: '11 Nov 2026',
    durationHours: '36 Jam Pengerjaan',
    agency: 'DSDABM (Dinas Sumber Daya Air & Bina Marga) Surabaya',
    teamLeader: 'Satgas UPTD Pemeliharaan Jalan Wilayah Pusat',
    pointsAwarded: 100,
    communityConfirmations: 38,
    workSummary: 'Peninggian dan perataan paving amblas sepanjang 24 meter, pelapisan base course anti-amblas, serta pemasangan kembali ubin pemandu kuning bertekstur utuh.',
    accessibilityImpact: 'Jalur kini 100% mulus dan bebas genangan, aman bagi pengguna kursi roda mandiri dan tongkat tunanetra.',
    beforeImage: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    beforeCaption: 'Sebelum: Paving amblas sedalam 14 cm, ubin pecah dan licin berair.',
    afterImage: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
    afterCaption: 'Sesudah: Trotoar rata sempurna dengan ubin pemandu kuning anti-selip.'
  },
  {
    id: 'REP-SBY-0819',
    sp4nTicket: 'SP4N-LAPOR #DSDABM-2026-0819',
    title: 'Pelebaran Jarak Bollard Pembatas di Halte Basuki Rahmat',
    location: 'Jl. Basuki Rahmat No. 12 (Depan Halte Busway), Surabaya Pusat',
    coordinates: { lat: -7.2635, lng: 112.7432 },
    category: 'Bollard Terlalu Rapat',
    severity: 'impassable',
    status: 'resolved',
    reportedBy: 'Dian Kartika Putri',
    reportedDate: '6 Nov 2026',
    completedDate: '9 Nov 2026',
    durationHours: '48 Jam Pengerjaan',
    agency: 'DSDABM & Dinas Perhubungan Kota Surabaya',
    teamLeader: 'Tim Cepat Tanggap Fasilitas Pejalan Kaki',
    pointsAwarded: 150,
    communityConfirmations: 29,
    workSummary: 'Pencabutan 1 tiang bollard tengah yang berjarak terlalu rapat (hanya 65 cm). Lebar bersih kini distandarkan menjadi 120 cm sesuai Permen PUPR No. 14/2017.',
    accessibilityImpact: 'Kursi roda elektrik lebar 70-75 cm dan sepeda gandeng kini dapat melintas mulus tanpa tersangkut.',
    beforeImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80',
    beforeCaption: 'Sebelum: Jarak antar-tiang sempit 65 cm, kursi roda terpaksa turun ke jalan raya.',
    afterImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    afterCaption: 'Sesudah: Lebar bersih 120 cm, dilengkapi rampa landai masuk ke halte.'
  },
  {
    id: 'REP-SBY-0795',
    sp4nTicket: 'SP4N-LAPOR #DSDABM-2026-0795',
    title: 'Pembuatan Rampa Landai 1:12 di Tikungan Jl. Yos Sudarso',
    location: 'Jl. Yos Sudarso No. 4 (Arah Balai Kota), Genteng, Surabaya',
    coordinates: { lat: -7.2625, lng: 112.7460 },
    category: 'Undakan Curam / Tanpa Rampa',
    severity: 'difficult',
    status: 'resolved',
    reportedBy: 'Dian Kartika Putri',
    reportedDate: '3 Nov 2026',
    completedDate: '7 Nov 2026',
    durationHours: '72 Jam Pengerjaan',
    agency: 'DSDABM Surabaya Bagian Kebinamargaan',
    teamLeader: 'Satgas Wilayah I Surabaya Pusat',
    pointsAwarded: 100,
    communityConfirmations: 45,
    workSummary: 'Pembongkaran undakan tajam 18 cm, pembuatan rampa cor beton kelandaian 7% (1:12) dengan tekstur garis anti-licin dan pegangan pengaman (handrail).',
    accessibilityImpact: 'Lansia, pengguna kruk, dan kursi roda manual dapat naik ke trotoar tanpa bantuan dorongan ekstra.',
    beforeImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    beforeCaption: 'Sebelum: Undakan tinggi 18 cm tanpa jalur landai sama sekali.',
    afterImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    afterCaption: 'Sesudah: Rampa beton landai dengan tekstur anti-selip dan warna penanda kuning.'
  },
  {
    id: 'REP-SBY-0881',
    sp4nTicket: 'SP4N-LAPOR #DSDABM-2026-0881',
    title: 'Ubin Guiding Block Lepas & Lubang Utilitas Terbuka',
    location: 'Jl. Gubernur Suryo No. 7 (Depan Grahadi), Surabaya',
    coordinates: { lat: -7.2605, lng: 112.7455 },
    category: 'Paving Rusak / Utilitas',
    severity: 'difficult',
    status: 'in_progress',
    reportedBy: 'Dian Kartika Putri',
    reportedDate: 'Kemarin, 14:10 WIB',
    agency: 'DSDABM Kota Surabaya · Tim Reaksi Cepat',
    teamLeader: 'Satgas Pemeliharaan Trotoar Pusat',
    workSummary: 'Bahan material ubin pemandu baru telah dimobilisasi ke lokasi. Penutupan grill utilitas sedang dalam proses pengerjaan.',
    accessibilityImpact: 'Sedang dikerjakan agar aman bagi tongkat tunanetra dan pejalan kaki lansia.',
    photo_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    beforeImage: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    beforeCaption: 'Ubin pemandu kuning lepas dan ada celah lubang sedalam 8 cm.'
  },
  {
    id: 'REP-SBY-0895',
    sp4nTicket: 'SP4N-LAPOR #DSDABM-2026-0895',
    title: 'Galian Pipa Menutup Rampa Kursi Roda',
    location: 'Jl. Kusuma Bangsa No. 18, Genteng, Surabaya',
    coordinates: { lat: -7.2588, lng: 112.7512 },
    category: 'Galian / Proyek',
    severity: 'impassable',
    status: 'in_progress',
    reportedBy: 'Dian Kartika Putri',
    reportedDate: 'Hari ini, 09:30 WIB',
    agency: 'DSDABM & PDAM Surya Sembada Kota Surabaya',
    teamLeader: 'Satgas Pengawasan Proyek Kota',
    workSummary: 'Laporan warga diteruskan ke pihak dinas untuk pemasangan jembatan rampa sementara.',
    accessibilityImpact: 'Menunggu pemasangan pelat rampa sementara berstandar safety.',
    photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80',
    beforeImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80',
    beforeCaption: 'Timbunan tanah galian menutupi akses masuk rampa trotoar.'
  }
];

// Ambil daftar laporan riil warga (tersinkronisasi real-time)
export function getUserReports() {
  if (typeof window === 'undefined') return INITIAL_USER_REPORTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(INITIAL_USER_REPORTS));
      return INITIAL_USER_REPORTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_USER_REPORTS;
  }
}

// Tambahkan laporan baru yang dibuat oleh warga secara real-time
export function addUserReport(newReport) {
  const current = getUserReports();
  const reportObj = {
    id: newReport.id || `REP-SBY-${Date.now().toString().slice(-4)}`,
    sp4nTicket: newReport.sp4nTicket || `SP4N-LAPOR #DSDABM-2026-${newReport.id || Date.now().toString().slice(-4)}`,
    title: newReport.title || 'Laporan Rintangan Trotoar',
    location: newReport.location || newReport.locationText || 'Surabaya',
    coordinates: newReport.coordinates || { lat: -7.2575, lng: 112.7521 },
    category: newReport.category || 'Rintangan Trotoar',
    severity: newReport.severity || 'difficult',
    status: 'in_progress', // langsung masuk antrean satgas DPUPR
    reportedBy: 'Dian Kartika Putri',
    reportedDate: 'Hari ini, Baru saja',
    agency: 'DSDABM Kota Surabaya · Tim Reaksi Cepat',
    teamLeader: 'Satgas Pemeliharaan Jalan & Trotoar',
    workSummary: 'Laporan warga telah masuk ke sistem SP4N-LAPOR dan didisposisikan ke Satgas Pemeliharaan Jalan & Trotoar untuk tindakan lapangan.',
    accessibilityImpact: 'Akan dinormalisasi sesuai standar rampa 1:12 dan lebar bersih trotoar minimal 120 cm.',
    photo_url: newReport.photo_url || newReport.uploadedImage || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    beforeImage: newReport.beforeImage || newReport.uploadedImage || newReport.photo_url || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    beforeCaption: `Kondisi Dilaporkan: ${newReport.category || 'Rintangan'} (${newReport.severity === 'impassable' ? 'Tidak bisa dilewati' : 'Sulit dilewati'})`
  };

  const updatedReports = [reportObj, ...current];
  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));
  } catch (e) {
    console.warn('Gagal menyimpan laporan:', e);
  }

  // Update profil secara real-time
  const profile = getUserProfile();
  const updatedProfile = {
    ...profile,
    totalReports: updatedReports.length,
    fixedByDPUPR: updatedReports.filter(r => r.status === 'resolved').length
  };
  saveUserProfile(updatedProfile);

  window.dispatchEvent(new CustomEvent('leluasa:reports-updated', { detail: { reports: updatedReports } }));
  return reportObj;
}

// Tandai laporan selesai diperbaiki oleh DPUPR secara real-time (+100 Poin)
export function resolveDpuprReport(reportId, options = {}) {
  const current = getUserReports();
  let updatedTarget = null;

  const updatedReports = current.map((r) => {
    if (String(r.id) === String(reportId)) {
      updatedTarget = {
        ...r,
        status: 'resolved',
        completedDate: 'Hari ini, Baru saja',
        durationHours: options.durationHours || '24 Jam Pengerjaan Tuntas',
        agency: options.agency || 'DSDABM Kota Surabaya · Satgas UPTD Pemeliharaan Trotoar',
        teamLeader: options.teamLeader || 'Tim Reaksi Cepat Surabaya',
        pointsAwarded: 100,
        workSummary: options.workSummary || 'Perbaikan fisik trotoar telah diselesaikan tuntas oleh satgas DPUPR / DSDABM di lokasi, aksesibilitas telah dipulihkan.',
        accessibilityImpact: options.accessibilityImpact || 'Jalur trotoar kini 100% mulus, aman, dan dapat dilintasi kursi roda maupun tongkat tunanetra.',
        afterImage: options.afterImage || 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
        afterCaption: 'Kondisi Sesudah: Selesai diperbaiki tuntas oleh satgas DPUPR Surabaya.'
      };
      return updatedTarget;
    }
    return r;
  });

  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));
  } catch (e) {
    console.warn('Gagal update laporan DPUPR:', e);
  }

  // Tambahkan bonus +100 poin reward warga
  const profile = getUserProfile();
  const newPoints = profile.points + 100;
  const resolvedCount = updatedReports.filter(r => r.status === 'resolved').length;
  
  const updatedProfile = {
    ...profile,
    points: newPoints,
    fixedByDPUPR: resolvedCount,
    totalReports: updatedReports.length,
    levelProgress: Math.min(100, Math.round((newPoints / 1500) * 100))
  };
  saveUserProfile(updatedProfile);

  // Catat ke riwayat mutasi poin
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  const historyItem = {
    id: `PTS-${Date.now()}`,
    date: `${dateStr}, ${timeStr}`,
    description: `Bonus perbaikan DPUPR selesai: ${updatedTarget?.title || 'Trotoar Kota'}`,
    type: 'earned',
    points: 100,
    badge: 'Perbaikan DPUPR Selesai'
  };
  const currentHistory = getPointsHistory();
  const updatedHistory = [historyItem, ...currentHistory];
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('leluasa:reports-updated', { detail: { reports: updatedReports } }));
  window.dispatchEvent(new CustomEvent('leluasa:rewards-updated', { detail: { profile: updatedProfile } }));

  return { report: updatedTarget, profile: updatedProfile };
}

// Ambil data profil (angka statistik disinkronkan real-time dari data laporan)
export function getUserProfile() {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    const profile = raw ? JSON.parse(raw) : { ...DEFAULT_PROFILE };

    // Hitung statistik riil secara dinamis dari laporan yang ada
    const reports = getUserReports();
    profile.totalReports = reports.length;
    profile.fixedByDPUPR = reports.filter(r => r.status === 'resolved').length;
    profile.verifiedReports = reports.filter(r => r.status === 'resolved' || r.status === 'verified').length;

    return profile;
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}

// Simpan data profil
export function saveUserProfile(profile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('leluasa:rewards-updated', { detail: { profile } }));
  } catch (e) {
    console.warn('Gagal menyimpan profil:', e);
  }
}

// Ambil daftar voucher yang dimiliki (sanitize nama tiket)
export function getRedeemedVouchers() {
  if (typeof window === 'undefined') return INITIAL_VOUCHERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOUCHERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(INITIAL_VOUCHERS));
      return INITIAL_VOUCHERS;
    }
    const list = JSON.parse(raw);
    return list.map(v => ({
      ...v,
      title: v.title ? v.title.replace(/Tiket\s+Terusan\s+WiraWiri/gi, 'Tiket WiraWiri') : v.title
    }));
  } catch (e) {
    return INITIAL_VOUCHERS;
  }
}

// Ambil riwayat mutasi poin
export function getPointsHistory() {
  if (typeof window === 'undefined') return INITIAL_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(INITIAL_HISTORY));
      return INITIAL_HISTORY;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_HISTORY;
  }
}

// Eksekusi penukaran poin ke tiket reward
export function redeemRewardItem(rewardItem) {
  const profile = getUserProfile();
  if (profile.points < rewardItem.pointsCost) {
    throw new Error(`Poin Anda tidak mencukupi (${profile.points} Poin). Dibutuhkan ${rewardItem.pointsCost} Poin.`);
  }

  // Kurangi poin
  const newPoints = profile.points - rewardItem.pointsCost;
  const updatedProfile = {
    ...profile,
    points: newPoints,
    levelProgress: Math.min(100, Math.round((newPoints / 1500) * 100))
  };
  saveUserProfile(updatedProfile);

  // Buat voucher baru
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  // Masa berlaku 30 hari ke depan
  const expireDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expireStr = expireDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const cleanTitle = rewardItem.title ? rewardItem.title.replace(/Tiket\s+Terusan\s+WiraWiri/gi, 'Tiket WiraWiri') : rewardItem.title;

  const newVoucher = {
    id: `VCR-${rewardItem.category.toUpperCase()}-${now.getFullYear()}-${randomSuffix}`,
    rewardId: rewardItem.id,
    title: cleanTitle,
    partner: rewardItem.partner,
    code: `SBY-${rewardItem.category.toUpperCase().slice(0, 3)}-${randomSuffix}-${Math.floor(10 + Math.random() * 90)}`,
    redeemedAt: `${dateStr}, ${timeStr}`,
    expiresAt: expireStr,
    status: 'active',
    pointsUsed: rewardItem.pointsCost,
    icon: rewardItem.icon,
    qrValue: `LELUASA-VERIFIED-${rewardItem.id.toUpperCase()}-${profile.name.replace(/\s+/g, '-')}-${randomSuffix}`
  };

  const currentVouchers = getRedeemedVouchers();
  const updatedVouchers = [newVoucher, ...currentVouchers];
  localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(updatedVouchers));

  // Catat riwayat
  const historyItem = {
    id: `PTS-${Date.now()}`,
    date: `${dateStr}, ${timeStr}`,
    description: `Penukaran ${cleanTitle}`,
    type: 'spent',
    points: -rewardItem.pointsCost,
    badge: 'Tukar Reward'
  };
  const currentHistory = getPointsHistory();
  const updatedHistory = [historyItem, ...currentHistory];
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

  window.dispatchEvent(new CustomEvent('leluasa:rewards-updated', { detail: { profile: updatedProfile } }));

  return newVoucher;
}

// Tambah poin saat warga selesai melaporkan rintangan baru
export function addReportPoints(reportTitle, amount = 50) {
  const profile = getUserProfile();
  const newPoints = profile.points + amount;
  const updatedProfile = {
    ...profile,
    points: newPoints,
    totalReports: (profile.totalReports || 0) + 1,
    levelProgress: Math.min(100, Math.round((newPoints / 1500) * 100))
  };
  saveUserProfile(updatedProfile);

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  const historyItem = {
    id: `PTS-${Date.now()}`,
    date: `${dateStr}, ${timeStr}`,
    description: `Laporan baru: "${reportTitle || 'Rintangan Trotoar'}"`,
    type: 'earned',
    points: amount,
    badge: 'Laporan Baru Warga'
  };
  const currentHistory = getPointsHistory();
  const updatedHistory = [historyItem, ...currentHistory];
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

  window.dispatchEvent(new CustomEvent('leluasa:rewards-updated', { detail: { profile: updatedProfile } }));
  return updatedProfile;
}

