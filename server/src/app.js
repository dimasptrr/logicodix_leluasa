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
  origin: true, // Izinkan akses dari localhost maupun domain Vercel production
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
      ...dynamicReports
    ]
  });
});

app.get('/api/weather', async (req, res) => {
  const lat = req.query.lat || -7.2575;
  const lng = req.query.lng || 112.7521;
  let condition = 'Cerah Berawan';
  let temperature = 30;
  let humidity = 70;
  let rainProbability = 20;
  let conditionIcon = 'partly_cloudy_day';
  let isLive = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const omRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Asia%2FJakarta`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (omRes.ok) {
      const omData = await omRes.json();
      const cur = omData.current;
      temperature = Math.round(cur.temperature_2m);
      humidity = Math.round(cur.relative_humidity_2m);
      const precip = cur.precipitation || 0;
      const code = cur.weather_code || 0;
      isLive = true;

      if (code >= 80 || precip > 5) {
        condition = 'Hujan Deras';
        rainProbability = 90;
        conditionIcon = 'thunderstorm';
      } else if (code >= 61 || precip > 1) {
        condition = 'Hujan';
        rainProbability = 80;
        conditionIcon = 'rainy';
      } else if (code >= 51 || precip > 0) {
        condition = 'Gerimis Ringan';
        rainProbability = 60;
        conditionIcon = 'grain';
      } else if (code >= 1 && code <= 3) {
        condition = 'Cerah Berawan';
        rainProbability = 20;
        conditionIcon = 'partly_cloudy_day';
      } else {
        condition = 'Cerah';
        rainProbability = 10;
        conditionIcon = 'wb_sunny';
      }
    }
  } catch (err) {
    // Fallback baseline jika koneksi luar timeout
  }

  const isRainy = rainProbability >= 50;
  const tractionIndex = isRainy ? 45 : 88;
  const tractionStatus = isRainy ? 'caution' : 'safe';
  const tractionLabel = isRainy ? 'Traksi Berkurang (Ubin Basah Licin)' : 'Traksi Sangat Baik (Ubin Kering)';
  const alertMessage = isRainy ? 'Waspada Permukaan Trotoar Basah' : 'Waktu Bepergian Optimal';
  const advisoryText = isRainy
    ? `Kelembapan ${humidity}% dan potensi hujan dapat membuat ubin trotoar keramik dekoratif menjadi licin. Kursi roda disarankan melaju di bawah 4 km/jam.`
    : `Kondisi cuaca ${condition.toLowerCase()} dengan suhu ${temperature}°C. Permukaan trotoar kering dan memiliki daya cengkeram optimal untuk mobilitas mandiri kursi roda.`;

  res.json({
    status: 'success',
    data: {
      condition,
      conditionIcon,
      temperature,
      humidity,
      rainProbability,
      precipitationProb: rainProbability,
      tractionIndex,
      tractionStatus,
      tractionLabel,
      alertMessage,
      advisoryText,
      isLive,
      latitude: Number(lat),
      longitude: Number(lng)
    }
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    status: 'success',
    data: {
      sidewalkKmMapped: 4.8,
      obstaclesReported: 3,
      communityVerified: 3,
      totalSafeRoutes: 3,
      accessibleSidewalkCoverageKm: 4.8
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

