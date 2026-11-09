/**
 * Leluasa Accessibility Cost Engine
 * Berdasarkan Pedoman Teknis Fasilitas dan Aksesibilitas Pejalan Kaki
 * (Permen PUPR No. 14/PRT/M/2017)
 */

export const ACCESSIBILITY_STANDARDS = {
  MIN_CLEARANCE_CM: 80, // Standar minimum mutlak kursi roda manual
  IDEAL_CLEARANCE_CM: 120, // Standar ideal papasan kursi roda
  MAX_RAMP_SLOPE_PERCENT: 8.0, // Kemiringan rampa maksimal yang diizinkan (1:12)
  PREFERRED_RAMP_SLOPE_PERCENT: 6.0, // Kemiringan ideal mandiri
  OBSTACLE_BUFFER_METERS: 25 // Buffer radius keamanan
};

/**
 * Menghitung Safety Score (0 - 100) dari rute
 * @param {Object} routeData
 * @param {Array} obstacles - Daftar rintangan pada rute
 * @param {Object} userPreferences
 */
export function calculateSafetyScore(routeData, obstacles = [], userPreferences = {}) {
  let score = 100;

  // 1. Penalti Rintangan Terblokir Total (Impassable)
  const impassableCount = obstacles.filter(o => o.severity === 'impassable').length;
  score -= impassableCount * 50;

  // 2. Penalti Rintangan Sempit / Sulit (Difficult)
  const difficultCount = obstacles.filter(o => o.severity === 'difficult').length;
  score -= difficultCount * 15;

  // 3. Penalti Jarak Tambahan yang Terlalu Jauh (> 2 km)
  if (routeData?.distanceMeters > 2000) {
    score -= 10;
  }

  // 4. Penyesuaian profil kursi roda elektrik vs manual
  if (userPreferences.profile === 'manual') {
    // Kursi roda manual lebih sensitif terhadap kelelahan dan rintangan kecil
    score = Math.max(0, score - 5);
  }

  return Math.min(100, Math.max(10, score));
}

/**
 * Menentukan label keselamatan dari skor
 */
export function getSafetyBadge(score) {
  if (score >= 85) {
    return {
      label: 'Sangat Aksesibel',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: 'verified'
    };
  }
  if (score >= 60) {
    return {
      label: 'Cukup Aksesibel (Hati-hati)',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: 'warning'
    };
  }
  return {
    label: 'Tinggi Risiko (Terblokir)',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: 'cancel'
  };
}

