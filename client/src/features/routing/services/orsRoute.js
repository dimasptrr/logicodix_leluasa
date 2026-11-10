/**
 * ORS (OpenRouteService) Route Fetcher
 * Mengambil rute pejalan kaki nyata di Surabaya via ORS API.
 * Gunakan via VITE_ORS_API_KEY yang terekspos ke browser.
 *
 * Fungsi ini TIDAK mengubah api.js / safeApi.js.
 * Hanya dipakai oleh PlanRoute.jsx dan ExploreMap.jsx.
 */

const ORS_KEY = import.meta.env.VITE_ORS_API_KEY;
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions/foot-walking';

/**
 * @param {[number, number]} originLngLat - [longitude, latitude] titik asal
 * @param {[number, number]} destLngLat   - [longitude, latitude] titik tujuan
 * @returns {{ coordinates: [number,number][], duration: number, distance: number }}
 *   coordinates dalam format Leaflet [lat, lng]
 */
export async function fetchORSRoute(originLngLat, destLngLat) {
  if (!ORS_KEY) {
    throw new Error('VITE_ORS_API_KEY tidak terkonfigurasi di .env');
  }

  const res = await fetch(`${ORS_BASE}/geojson`, {
    method: 'POST',
    headers: {
      Authorization: ORS_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify({
      coordinates: [originLngLat, destLngLat],
      preference: 'recommended',
      units: 'm',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ORS API gagal (${res.status}): ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('ORS: Tidak ada rute ditemukan');

  // Konversi dari [lng, lat] (GeoJSON) ke [lat, lng] (Leaflet)
  const coordinates = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const segment = feature.properties?.segments?.[0] ?? {};

  return {
    coordinates,
    duration: segment.duration ?? 0,   // detik
    distance: segment.distance ?? 0,   // meter
    steps: segment.steps ?? [],
  };
}

/**
 * Titik Surabaya yang tersedia sebagai preset rute
 */
export const SURABAYA_WAYPOINTS = {
  balaiPemuda:  { label: 'Balai Pemuda Surabaya',    lngLat: [112.7445, -7.2638] },
  rsudSoetomo:  { label: 'RSUD Dr. Soetomo',         lngLat: [112.7297, -7.2651] },
  stasiunGubeng:{ label: 'Stasiun Gubeng',            lngLat: [112.7524, -7.2650] },
  halteJlPemuda:{ label: 'Halte Jl. Pemuda',          lngLat: [112.7510, -7.2655] },
  tunjunganPlaza:{ label: 'Tunjungan Plaza',           lngLat: [112.7380, -7.2626] },
  balaiKota:    { label: 'Balai Kota Surabaya',       lngLat: [112.7414, -7.2640] },
};

