import { config } from '../../config/env.js';

/**
 * Membuat polygon bounding box di sekitar titik rintangan
 * @param {number} lat - Latitude rintangan
 * @param {number} lng - Longitude rintangan
 * @param {number} bufferMeters - Radius zona hindaran (default 25 meter)
 * @returns {Array} Polygon coordinates [ [ [lng, lat], ... ] ]
 */
export function createObstacleAvoidPolygon(lat, lng, bufferMeters = 25) {
  const earthRadius = 6378137; // meter
  const dLat = (bufferMeters / earthRadius) * (180 / Math.PI);
  const dLng = (bufferMeters / (earthRadius * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);

  const minLng = parseFloat((lng - dLng).toFixed(6));
  const maxLng = parseFloat((lng + dLng).toFixed(6));
  const minLat = parseFloat((lat - dLat).toFixed(6));
  const maxLat = parseFloat((lat + dLat).toFixed(6));

  return [
    [
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]
  ];
}

/**
 * Menghitung jarak Haversine antar dua titik (dalam meter)
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meter
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Memanggil OpenRouteService API v2
 * @param {Array} coordinates - [[lng, lat], [lng, lat]]
 * @param {string} profile - 'foot-walking' | 'wheelchair'
 * @param {object} options - Parameter tambahan seperti avoid_polygons
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function queryOpenRouteService(coordinates, profile = 'wheelchair', options = null) {
  const apiKey = config.orsApiKey;
  const endpoint = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  const requestBody = { coordinates };
  if (options && Object.keys(options).length > 0) {
    requestBody.options = options;
  }

  if (!apiKey) {
    throw Object.assign(new Error('ORS_API_KEY belum dikonfigurasi di backend.'), { status: 503 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/geo+json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw Object.assign(new Error(`OpenRouteService mengembalikan status ${response.status}: ${errText}`), { status: 502 });
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`[Routing] Gagal mendapatkan rute OpenRouteService: ${error.message}`);
    throw error;
  }
}

/**
 * Konversi Feature GeoJSON ORS menjadi format data yang siap dipakai Leaflet & Antarmuka Leluasa
 */
export function formatRouteForLeluasa(geoJson, meta = {}) {
  if (!geoJson || !geoJson.features || !geoJson.features[0]) {
    return null;
  }

  const feature = geoJson.features[0];
  const rawCoords = feature.geometry?.coordinates || [];

  // Konversi GeoJSON [lng, lat] ke Leaflet [lat, lng]
  const leafletCoords = rawCoords.map(([lng, lat]) => [lat, lng]);

  const summary = feature.properties?.summary || {};
  const distanceMeters = Math.round(summary.distance || 0);
  const durationSeconds = Math.round(summary.duration || 0);

  const distanceKm = (distanceMeters / 1000).toFixed(2);
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

  const steps = feature.properties?.segments?.[0]?.steps || [];

  return {
    id: meta.id || 'route-id',
    title: meta.title || 'Rute Navigasi',
    distance: `${distanceKm} km`,
    distanceMeters,
    duration: `${durationMinutes} menit`,
    durationSeconds,
    safetyScore: meta.safetyScore || 85,
    safetyLabel: meta.safetyLabel || 'Aman',
    severity: meta.severity || 'passable',
    isRecommended: meta.isRecommended || false,
    coordinates: leafletCoords,
    notice: meta.notice || null,
    impediments: meta.impediments || [],
    guarantees: meta.guarantees || [],
    steps: steps.map(s => ({
      instruction: s.instruction,
      distanceMeters: s.distance,
      durationSeconds: s.duration,
      name: s.name
    }))
  };
}

