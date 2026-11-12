import React from 'react';

/**
 * Menghitung sudut kompas (bearing / heading) dalam derajat dari titik A ke titik B.
 * 0° = Ke Atas / Utara (North)
 * 90° = Ke Kanan / Timur (East)
 * 180° = Ke Bawah / Selatan (South)
 * 270° = Ke Kiri / Barat (West)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  if (Number(lat1) === Number(lat2) && Number(lon1) === Number(lon2)) return 0;

  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;

  const phi1 = toRad(Number(lat1));
  const phi2 = toRad(Number(lat2));
  const deltaLambda = toRad(Number(lon2) - Number(lon1));

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (toDeg(theta) + 360) % 360;
  return Math.round(bearing);
}

/**
 * Label deskriptif Bahasa Indonesia untuk sudut arah
 */
export function getBearingDescription(bearing = 0) {
  const norm = ((Math.round(bearing) % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) {
    return { label: 'Ke Atas / Utara', shortLabel: 'Lurus ke Atas', direction: 'up', angle: norm };
  }
  if (norm >= 22.5 && norm < 67.5) {
    return { label: 'Ke Kanan Atas / Timur Laut', shortLabel: 'Serong Kanan Atas', direction: 'up-right', angle: norm };
  }
  if (norm >= 67.5 && norm < 112.5) {
    return { label: 'Ke Kanan / Timur', shortLabel: 'Arah Kanan', direction: 'right', angle: norm };
  }
  if (norm >= 112.5 && norm < 157.5) {
    return { label: 'Ke Kanan Bawah / Tenggara', shortLabel: 'Serong Kanan Bawah', direction: 'down-right', angle: norm };
  }
  if (norm >= 157.5 && norm < 202.5) {
    return { label: 'Ke Bawah / Selatan', shortLabel: 'Arah Bawah', direction: 'down', angle: norm };
  }
  if (norm >= 202.5 && norm < 247.5) {
    return { label: 'Ke Kiri Bawah / Barat Daya', shortLabel: 'Serong Kiri Bawah', direction: 'down-left', angle: norm };
  }
  if (norm >= 247.5 && norm < 292.5) {
    return { label: 'Ke Kiri / Barat', shortLabel: 'Arah Kiri', direction: 'left', angle: norm };
  }
  return { label: 'Ke Kiri Atas / Barat Laut', shortLabel: 'Serong Kiri Atas', direction: 'up-left', angle: norm };
}

/**
 * Fallback bearing jika koordinat belum terdefinisi, membaca teks instruksi manuver
 */
export function getFallbackBearingFromInstruction(instruction = '', defaultBearing = 90) {
  if (!instruction) return defaultBearing;
  const lower = instruction.toLowerCase();
  if (lower.includes('putar balik') || lower.includes('u-turn')) return 180;
  if (lower.includes('tajam kanan') || lower.includes('sharp right')) return 135;
  if (lower.includes('tajam kiri') || lower.includes('sharp left')) return 225;
  if (lower.includes('serong kanan') || lower.includes('slight right') || lower.includes('keep right')) return 45;
  if (lower.includes('serong kiri') || lower.includes('slight left') || lower.includes('keep left')) return 315;
  if (lower.includes('belok kanan') || lower.includes('ke kanan') || lower.includes('turn right')) return 90;
  if (lower.includes('belok kiri') || lower.includes('ke kiri') || lower.includes('turn left')) return 270;
  if (lower.includes('selatan') || lower.includes('south') || lower.includes('bawah')) return 180;
  if (lower.includes('timur') || lower.includes('east') || lower.includes('kanan')) return 90;
  if (lower.includes('barat') || lower.includes('west') || lower.includes('kiri')) return 270;
  if (lower.includes('utara') || lower.includes('north') || lower.includes('lurus') || lower.includes('atas') || lower.includes('straight')) return 0;
  return defaultBearing;
}

/**
 * Menghasilkan string HTML SVG panah lurus untuk disisipkan ke Leaflet DivIcon
 */
export function getStraightArrowSvgHtml(bearing = 0, size = 26, strokeWidth = 3.2, color = 'currentColor') {
  return `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${bearing}deg); transform-origin: 50% 50%; transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1); display: inline-block; vertical-align: middle;">
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <polyline points="5 11 12 4 19 11"></polyline>
    </svg>
  `;
}

/**
 * Komponen Panah Lurus Pengarah Arah Navigasi Rute (React)
 * Panah lurus murni yang berputar presisi sesuai arah tujuan rute.
 */
export default function StraightDirectionArrow({
  bearing = 0,
  size = 32,
  strokeWidth = 3,
  className = '',
  style = {}
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        transform: `rotate(${bearing}deg)`,
        transformOrigin: '50% 50%',
        transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'inline-block',
        flexShrink: 0,
        ...style
      }}
      aria-hidden="true"
    >
      {/* Garis Batang Panah Lurus */}
      <line x1="12" y1="20" x2="12" y2="4" />
      {/* Ujung Kepala Panah Lancip */}
      <polyline points="5 11 12 4 19 11" />
    </svg>
  );
}

