// Mock data realistis Surabaya untuk Leluasa (LOGICODIX 2026)
// Sesuai dengan spesifikasi docs/API_CONTRACT.md

export const mockObstacles = [
  {
    id: "SUB-2026-0889",
    title: "Galian Utilitas & Trotoar Amblas",
    location: "Jl. Pemuda No. 34, Embong Kaliasin, Surabaya",
    coordinates: { lat: -7.2655, lng: 112.7482 },
    category: "Galian / Proyek",
    severity: "impassable",
    status: "active",
    clearance: 0,
    clearanceLabel: "0 cm Terblokir",
    reporter: "Dian S. (Kursi Roda Elektrik)",
    reportedTime: "15 menit lalu",
    upvotes: 14,
    confirmedCount: 14,
    dpuprForwarded: true,
    notes: "Galian pipa sedalam 1 meter tanpa jembatan rampa darurat. Kursi roda terpaksa turun ke bahu jalan raya berdampingan dengan kendaraan cepat.",
    aiTelemetry: {
      confidence: 96,
      detectedBarrier: "Galian Saluran Terbuka"
    }
  },
  {
    id: "SUB-2026-0890",
    title: "Bollard Beton Rapat di Depan Halte",
    location: "Jl. Basuki Rahmat No. 12, Tegalsari, Surabaya",
    coordinates: { lat: -7.2635, lng: 112.7432 },
    category: "Bollard / Pembatas",
    severity: "difficult",
    status: "active",
    clearance: 65,
    clearanceLabel: "Sempit 65cm",
    reporter: "Komunitas Difabel Surabaya",
    reportedTime: "1 jam lalu",
    upvotes: 8,
    confirmedCount: 8,
    dpuprForwarded: true,
    notes: "Jarak bersih antar-tiang bollard hanya 65 cm. Kursi roda standar (lebar 70-75 cm) harus melipat pijakan kaki atau tersangkut.",
    aiTelemetry: {
      confidence: 93,
      detectedBarrier: "Bollard Terlalu Rapat"
    }
  },
  {
    id: "SUB-2026-0891",
    title: "Rampa Trotoar Standar DPUPR",
    location: "Jl. Gubernur Suryo No. 15 (Depan Balai Pemuda), Surabaya",
    coordinates: { lat: -7.2642, lng: 112.7449 },
    category: "Rampa Landai",
    severity: "passable",
    status: "active",
    clearance: 180,
    clearanceLabel: "180cm Bisa dilewati",
    reporter: "Tim DPUPR Surabaya",
    reportedTime: "3 jam lalu",
    upvotes: 27,
    confirmedCount: 27,
    dpuprForwarded: true,
    notes: "Rampa kelandaian 1:12 dengan ubin pemandu (guiding blocks) kuning timbul utuh dan tekstur anti-selip.",
    aiTelemetry: {
      confidence: 98,
      detectedBarrier: "Aksesibilitas Sempurna"
    }
  },
  {
    id: "SUB-2026-0892",
    title: "Undakan Rampa Curam (> 10%)",
    location: "Jl. Yos Sudarso No. 4, Embong Kaliasin, Surabaya",
    coordinates: { lat: -7.2625, lng: 112.7460 },
    category: "Rampa Curam",
    severity: "difficult",
    status: "active",
    clearance: 85,
    clearanceLabel: "Sempit 85cm",
    reporter: "Ahmad R. (Pengguna Kruk)",
    reportedTime: "5 jam lalu",
    upvotes: 6,
    confirmedCount: 6,
    dpuprForwarded: true,
    notes: "Sudut kemiringan rampa mencapai 14 derajat, rawan terjungkal untuk kursi roda manual tanpa pendamping.",
    aiTelemetry: {
      confidence: 89,
      detectedBarrier: "Kemiringan Melebihi Batas"
    }
  },
  {
    id: "SUB-2026-0893",
    title: "Koridor Arkade Ramah Difabel",
    location: "Jl. Panglima Sudirman No. 28, Surabaya",
    coordinates: { lat: -7.2670, lng: 112.7475 },
    category: "Jalur Ramah Difabel",
    severity: "passable",
    status: "active",
    clearance: 200,
    clearanceLabel: "200cm Bisa dilewati",
    reporter: "Relawan LOGICODIX",
    reportedTime: "1 hari lalu",
    upvotes: 42,
    confirmedCount: 42,
    dpuprForwarded: false,
    notes: "Trotoar berkanopi lebar 2 meter dengan ubin taktil pemandu tuna netra dan sambungan rampa rata.",
    aiTelemetry: {
      confidence: 99,
      detectedBarrier: "Bebas Hambatan"
    }
  },
  {
    id: "SUB-2026-0894",
    title: "Material Proyek Menutup Jalur",
    location: "Jl. Walikota Mustajab No. 9, Ketabang, Surabaya",
    coordinates: { lat: -7.2610, lng: 112.7485 },
    category: "Material Bangunan",
    severity: "impassable",
    status: "active",
    clearance: 0,
    clearanceLabel: "0 cm Terblokir",
    reporter: "Siti M. (Tuna Netra)",
    reportedTime: "2 hari lalu",
    upvotes: 19,
    confirmedCount: 19,
    dpuprForwarded: true,
    notes: "Tumpukan pasir dan paving block menutup total guiding blocks dan jalur pejalan kaki.",
    aiTelemetry: {
      confidence: 95,
      detectedBarrier: "Material Proyek Ilegal"
    }
  }
];

export const mockRouteComparison = {
  origin: {
    name: "Balai Pemuda Surabaya",
    lat: -7.2642,
    lng: 112.7449,
    coordinates: [-7.2642, 112.7449]
  },
  destination: {
    name: "RSUD Dr. Soetomo",
    lat: -7.2678,
    lng: 112.7582,
    coordinates: [-7.2678, 112.7582]
  },
  routingEngine: "OpenStreetMap Graph + Leluasa Spatial Cost Engine v4.2",
  routeA: {
    id: "route-standard",
    title: "Rute Standar (Dasar Peta Navigasi Umum)",
    distance: "1.45 km",
    distanceMeters: 1450,
    duration: "18 menit",
    safetyScore: 38,
    safetyLabel: "Tinggi Risiko (Banyak Rintangan)",
    severity: "impassable",
    isRecommended: false,
    coordinates: [
      [-7.2642, 112.7449],
      [-7.2650, 112.7460],
      [-7.2654, 112.7475],
      [-7.2657, 112.7486],
      [-7.2668, 112.7520],
      [-7.2678, 112.7582]
    ],
    notice: "Terdapat galian pipa dan trotoar terputus di Jl. Pemuda No. 34.",
    impediments: [
      { icon: "cancel", text: "Galian Saluran Air di Jl. Pemuda No. 34 (Terblokir Total)" },
      { icon: "warning", text: "Undakan trotoar 15 cm tanpa rampa di simpang Jl. Panglima Sudirman" },
      { icon: "report_problem", text: "Ubin keramik licin di depan deretan pertokoan Jl. Pemuda" }
    ]
  },
  routeB: {
    id: "route-leluasa",
    title: "Rute AI Leluasa (Paling Aksesibel)",
    distance: "1.68 km",
    distanceMeters: 1680,
    duration: "22 menit",
    safetyScore: 95,
    safetyLabel: "Sangat Aksesibel (Ramah Kursi Roda)",
    severity: "passable",
    isRecommended: true,
    coordinates: [
      [-7.2642, 112.7449],
      [-7.2638, 112.7456],
      [-7.2645, 112.7468],
      [-7.2652, 112.7471],
      [-7.2650, 112.7474],
      [-7.2652, 112.7486],
      [-7.2656, 112.7488],
      [-7.2665, 112.7525],
      [-7.2672, 112.7555],
      [-7.2678, 112.7582]
    ],
    guarantees: [
      { icon: "task_alt", title: "0 Rintangan Terblokir (100% Bebas Galian)" },
      { icon: "ramp_right", title: "100% Rampa Trotoar Tersedia (Kelandaian < 4%)" },
      { icon: "roofing", title: "75% Jalur Beratap / Arkade Lindung Cuaca" }
    ]
  }
};

export const mockWeather = {
  temperature: 29,
  condition: "Gerimis Ringan",
  district: "Surabaya Pusat",
  precipitationProb: 78,
  alertMessage: "Potensi Hujan dalam 35 Menit",
  isLive: true,
  surfaceFrictionIndex: 0.38,
  tractionRiskLevel: "high",
  slipProbabilityPercent: 68,
  advisoryText: "Hujan ringan menyebabkan ubin trotoar keramik dekoratif di sepanjang Jl. Basuki Rahmat menjadi sangat licin. Kursi roda listrik rawan selip bila melaju di atas 4 km/jam."
};

export const mockStats = {
  sidewalkKmMapped: 1420,
  obstaclesReported: 384,
  communityVerified: 291,
  dpuprRepaired: 148
};

export const mockPlaces = [
  { name: "Balai Pemuda Surabaya", address: "Jl. Gubernur Suryo No. 15", lat: -7.2642, lng: 112.7449 },
  { name: "RSUD Dr. Soetomo", address: "Jl. Mayjen Prof. Dr. Moestopo No. 6-8", lat: -7.2678, lng: 112.7582 },
  { name: "Alun-Alun Surabaya", address: "Jl. Gubernur Suryo, Embong Kaliasin", lat: -7.2638, lng: 112.7455 },
  { name: "Stasiun Surabaya Gubeng", address: "Jl. Gubeng Masjid No. 1", lat: -7.2653, lng: 112.7521 },
  { name: "Taman Apsari", address: "Jl. Taman Apsari No. 63", lat: -7.2633, lng: 112.7442 }
];

