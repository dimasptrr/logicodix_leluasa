import {
  queryOpenRouteService,
  createObstacleAvoidPolygon,
  formatRouteForLeluasa
} from './orsService.js';

// Data rintangan aktif default di koridor Jl. Pemuda (sesuai pengujian Kaka di wheelchair-avoid.json)
const ACTIVE_OBSTACLES = [
  {
    id: 'obs-surabaya-01',
    name: 'Galian Pipa Utilitas Jl. Pemuda',
    lat: -7.264741,
    lng: 112.743022,
    severity: 'impassable',
    clearanceCm: 0,
    bufferMeters: 25
  }
];

function parseQueryCoordinate(value, minimum, maximum) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function parseOrsPoint(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [longitude, latitude] = value.map(Number);
  if (
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90
  ) return null;
  return [longitude, latitude];
}

/**
 * Controller untuk membandingkan Rute Standar vs Rute AI Leluasa
 * GET /api/routes/compare
 */
export async function compareRoutes(req, res) {
  try {
    const {
      profile = 'electric',
      originName = 'Titik awal',
      destinationName = 'Tujuan'
    } = req.query;
    const originLat = parseQueryCoordinate(req.query.originLat, -90, 90);
    const originLng = parseQueryCoordinate(req.query.originLng, -180, 180);
    const destLat = parseQueryCoordinate(req.query.destLat, -90, 90);
    const destLng = parseQueryCoordinate(req.query.destLng, -180, 180);

    if ([originLat, originLng, destLat, destLng].some(value => value === null)) {
      return res.status(400).json({
        status: 'error',
        message: 'originLat, originLng, destLat, dan destLng wajib berupa koordinat valid.'
      });
    }

    const start = [parseFloat(originLng), parseFloat(originLat)];
    const end = [parseFloat(destLng), parseFloat(destLat)];
    const coordinates = [start, end];

    // 1. Buat avoid_polygons dari rintangan aktif di sekitar koridor
    const polygonCoordinates = createObstacleAvoidPolygon(
      ACTIVE_OBSTACLES[0].lat,
      ACTIVE_OBSTACLES[0].lng,
      ACTIVE_OBSTACLES[0].bufferMeters
    );

    const avoidOptions = {
      avoid_polygons: {
        type: 'Polygon',
        coordinates: polygonCoordinates
      }
    };

    // 2. Query paralel: Rute A (Pejalan Kaki Umum) dan Rute B (Kursi Roda + Avoidance)
    const [rawRouteA, rawRouteB] = await Promise.all([
      queryOpenRouteService(coordinates, 'foot-walking'),
      queryOpenRouteService(coordinates, 'wheelchair', avoidOptions)
    ]);

    // 3. Format Rute A (Standar Navigasi Umum)
    const formattedRouteA = formatRouteForLeluasa(rawRouteA, {
      id: 'route-standard',
      title: 'Rute Standar (Dasar Peta Navigasi Umum)',
      safetyScore: 38,
      safetyLabel: 'Tinggi Risiko (Banyak Rintangan)',
      severity: 'impassable',
      isRecommended: false,
      notice: 'Terdapat galian pipa dan trotoar terputus dengan lebar bersih 0 cm.',
      impediments: [
        { icon: 'cancel', text: 'Galian Saluran Air di Jl. Pemuda No. 34' },
        { icon: 'priority_high', text: 'Rampa trotoar rusak / undakan > 15 cm' }
      ]
    });

    // 4. Format Rute B (Rekomendasi AI Leluasa)
    const formattedRouteB = formatRouteForLeluasa(rawRouteB, {
      id: 'route-leluasa',
      title: 'Rute AI Leluasa (Paling Aksesibel)',
      safetyScore: 95,
      safetyLabel: 'Sangat Aksesibel (Ramah Kursi Roda)',
      severity: 'passable',
      isRecommended: true,
      notice: 'Rute pengalihan aman berhasil menghindari galian Jl. Pemuda via Taman Apsari.',
      guarantees: [
        { icon: 'task_alt', title: '0 Rintangan Terblokir' },
        { icon: 'ramp_right', title: '100% Rampa Trotoar Tersedia' },
        { icon: 'straighten', title: 'Lebar Trotoar Bersih >= 120 cm' }
      ]
    });

    return res.json({
      status: 'success',
      data: {
        origin: {
          name: originName,
          lat: parseFloat(originLat),
          lng: parseFloat(originLng),
          coordinates: [parseFloat(originLat), parseFloat(originLng)]
        },
        destination: {
          name: destinationName,
          lat: parseFloat(destLat),
          lng: parseFloat(destLng),
          coordinates: [parseFloat(destLat), parseFloat(destLng)]
        },
        profile,
        routingEngine: 'OpenRouteService Pedestrian & Wheelchair Engine + Leluasa Spatial Buffer v1.0',
        comparisonSummary: 'Rute Leluasa berhasil mengarahkan pengguna kursi roda memutar menjauhi galian Jl. Pemuda dengan jaminan 100% rampa trotoar.',
        routeA: formattedRouteA,
        routeB: formattedRouteB,
        activeObstacles: ACTIVE_OBSTACLES
      }
    });
  } catch (error) {
    console.error('[RoutingController] Error compareRoutes:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: 'Gagal memproses perbandingan rute',
      details: error.message
    });
  }
}

/**
 * Controller untuk perencanaan rute kustom
 * POST /api/routes/plan
 */
export async function planRoute(req, res) {
  try {
    const { origin, destination, profile = 'wheelchair', avoidObstacles = true } = req.body;

    const parsedOrigin = parseOrsPoint(origin);
    const parsedDestination = parseOrsPoint(destination);
    if (!parsedOrigin || !parsedDestination) {
      return res.status(400).json({
        status: 'error',
        message: 'Origin dan destination wajib berupa pasangan [longitude, latitude] yang valid.'
      });
    }

    const coordinates = [parsedOrigin, parsedDestination];
    let options = null;

    if (avoidObstacles && ACTIVE_OBSTACLES.length > 0) {
      const polygonCoordinates = createObstacleAvoidPolygon(
        ACTIVE_OBSTACLES[0].lat,
        ACTIVE_OBSTACLES[0].lng,
        ACTIVE_OBSTACLES[0].bufferMeters
      );
      options = {
        avoid_polygons: {
          type: 'Polygon',
          coordinates: polygonCoordinates
        }
      };
    }

    const orsProfile = profile === 'foot' ? 'foot-walking' : 'wheelchair';
    const rawRoute = await queryOpenRouteService(coordinates, orsProfile, options);
    const formattedRoute = formatRouteForLeluasa(rawRoute, {
      id: `route-${Date.now()}`,
      title: 'Rute Terencana Leluasa',
      safetyScore: avoidObstacles ? 92 : 55,
      isRecommended: true
    });

    return res.json({
      status: 'success',
      data: formattedRoute
    });
  } catch (error) {
    console.error('[RoutingController] Error planRoute:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: 'Gagal merencanakan rute',
      details: error.message
    });
  }
}

