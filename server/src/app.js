import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import routingRoutes from './modules/routing/routingRoutes.js';
import obstacleRoutes from './modules/obstacles/obstacleRoutes.js';
import { inMemoryReports } from './modules/obstacles/obstacleController.js';
import aiRoutes from './modules/integrations/aiRoutes.js';

const app = express();

// Middleware dasar
app.use(cors({
  origin: '*', // Memungkinkan akses dari frontend local Vite (:3000 & :5173)
  credentials: true
}));
app.use(express.json({ limit: '2.2mb' }));

// Logging sederhana request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'leluasa-backend',
    version: '1.0.0',
    orsKeyConfigured: Boolean(config.orsApiKey)
  });
});

// Modul Routing (Kaka) & AI Integration (Dimas)
app.use('/api/routes', routingRoutes);
app.use('/api/obstacles', obstacleRoutes);
app.use('/api/ai', aiRoutes);

// Endpoint Obstacles (Membaca langsung dari tabel Supabase 'laporan_leluasa' + in-memory + mock)
app.get('/api/obstacles', async (req, res) => {
  let supabaseReports = [];
  try {
    if (config.supabaseUrl && config.supabaseServiceRoleKey) {
      const resp = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/laporan_leluasa?select=*&order=created_at.desc`, {
        headers: {
          apikey: config.supabaseServiceRoleKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`
        }
      });
      if (resp.ok) {
        const rows = await resp.json();
        supabaseReports = rows.map(r => ({
          id: String(r.id),
          title: r.obstacle_type || 'Rintangan Trotoar',
          name: r.obstacle_type || 'Rintangan Trotoar',
          location: `Titik GPS (${r.latitude?.toFixed(6)}, ${r.longitude?.toFixed(6)})`,
          location_text: `Titik GPS (${r.latitude?.toFixed(6)}, ${r.longitude?.toFixed(6)})`,
          category: r.obstacle_type,
          severity: r.severity || 'difficult',
          status: r.verification_status || 'active',
          lat: r.latitude,
          lng: r.longitude,
          latitude: r.latitude,
          longitude: r.longitude,
          coordinates: { lat: r.latitude, lng: r.longitude },
          clearance: r.gap_width === 'less_80' ? 65 : r.gap_width === '80_120' ? 95 : 120,
          clearance_cm: r.gap_width === 'less_80' ? 65 : r.gap_width === '80_120' ? 95 : 120,
          upvotes: 1,
          confirmedCount: 1,
          reported_at: r.created_at,
          created_at: r.created_at,
          reportedTime: r.created_at,
          image_url: r.photo_url || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600',
          photo_url: r.photo_url
        }));
      }
    }
  } catch (err) {
    console.warn('[Server] Supabase fetch laporan_leluasa warning:', err.message);
  }

  const existingIds = new Set(supabaseReports.map(r => r.id));
  const dynamicReports = inMemoryReports
    .filter(r => !existingIds.has(String(r.id)))
    .map(r => ({
      id: String(r.id),
      title: r.title,
      name: r.title,
      location: r.location_text,
      location_text: r.location_text,
      category: r.category,
      severity: r.severity,
      status: r.status,
      lat: r.coordinates?.lat || -7.264741,
      lng: r.coordinates?.lng || 112.743022,
      latitude: r.coordinates?.lat || -7.264741,
      longitude: r.coordinates?.lng || 112.743022,
      coordinates: r.coordinates || { lat: -7.264741, lng: 112.743022 },
      clearance_cm: r.clearance_cm,
      upvotes: 1,
      confirmedCount: 1,
      reported_at: r.created_at,
      created_at: r.created_at,
      reportedTime: r.created_at,
      image_url: r.photo_url || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600',
      photo_url: r.photo_url
    }));

  res.json({
    status: 'success',
    data: [
      ...supabaseReports,
      ...dynamicReports,
      {
        id: 'obs-01',
        title: 'Galian Pipa Utilitas Jl. Pemuda',
        name: 'Galian Pipa Utilitas Jl. Pemuda',
        location: 'Jl. Pemuda No. 34, Embong Kaliasin',
        location_text: 'Jl. Pemuda No. 34, Embong Kaliasin',
        category: 'construction',
        severity: 'impassable',
        status: 'active',
        lat: -7.264741,
        lng: 112.743022,
        latitude: -7.264741,
        longitude: 112.743022,
        coordinates: { lat: -7.264741, lng: 112.743022 },
        clearance_cm: 0,
        upvotes: 18,
        reported_at: '2026-11-09T08:30:00Z',
        created_at: '2026-11-09T08:30:00Z',
        image_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600'
      },
      {
        id: 'obs-02',
        title: 'Bollard Terlalu Sempit (Lebar 55 cm)',
        name: 'Bollard Terlalu Sempit (Lebar 55 cm)',
        location: 'Trotoar Depan Taman Apsari',
        location_text: 'Trotoar Depan Taman Apsari',
        category: 'narrow_bollard',
        severity: 'difficult',
        status: 'active',
        lat: -7.264599,
        lng: 112.742813,
        latitude: -7.264599,
        longitude: 112.742813,
        coordinates: { lat: -7.264599, lng: 112.742813 },
        clearance_cm: 55,
        upvotes: 7,
        reported_at: '2026-11-08T14:15:00Z',
        created_at: '2026-11-08T14:15:00Z',
        image_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'
      }
    ]
  });
});

app.get('/api/weather', (req, res) => {
  res.json({
    status: 'success',
    data: {
      condition: 'Cerah Berawan',
      temperature: 31,
      humidity: 68,
      rainProbability: 15,
      tractionIndex: 88,
      tractionStatus: 'safe',
      tractionLabel: 'Traksi Sangat Baik (Ubin Kering)'
    }
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    status: 'success',
    data: {
      totalSafeRoutes: 124,
      activeObstacles: 8,
      resolvedObstacles: 42,
      accessibleSidewalkCoverageKm: 34.6
    }
  });
});

app.get('/api/places', (req, res) => {
  res.json({
    status: 'success',
    data: [
      { id: 'p1', name: 'Balai Pemuda Surabaya', lat: -7.2642, lng: 112.7449, type: 'public_facility' },
      { id: 'p2', name: 'RSUD Dr. Soetomo', lat: -7.2678, lng: 112.7582, type: 'hospital' },
      { id: 'p3', name: 'Stasiun Gubeng', lat: -7.2653, lng: 112.7521, type: 'transit' }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({ status: 'error', message: err.message });
});

// Jalankan Server jika dipanggil langsung
const PORT = config.port || 5000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 LELUASA Backend Server running on port ${PORT}`);
  console.log(`📍 Routing Engine ORS Endpoint: http://localhost:${PORT}/api/routes/compare`);
  console.log(`🔑 ORS API Key Status: ${config.orsApiKey ? 'LOADED (Active)' : 'NOT CONFIGURED'}`);
  console.log(`====================================================`);
});

export default app;

