import { fetchRouteComparison, planRoute } from '../../../services/api.js';

export async function getComparisonRoute({
  profile = 'electric',
  originLat = -7.2655,
  originLng = 112.7456,
  destLat = -7.2625,
  destLng = 112.7390
} = {}) {
  const response = await fetchRouteComparison({
    profile,
    originLat,
    originLng,
    destLat,
    destLng
  });
  return response.data;
}

export async function requestCustomPlan(origin, destination, profile = 'wheelchair') {
  const response = await planRoute({
    origin,
    destination,
    profile,
    avoidObstacles: true
  });
  return response.data;
}

