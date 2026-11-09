import React, { useState, useEffect } from 'react';
import { subscribeMockStatus } from '../features/dashboard/services/safeApi.js';

export default function MockDataBadge({ showAlways = false, className = '' }) {
  const [isMock, setIsMock] = useState(showAlways);

  useEffect(() => {
    if (showAlways) {
      setIsMock(true);
      return;
    }
    const unsubscribe = subscribeMockStatus((active) => {
      setIsMock(active);
    });
    return unsubscribe;
  }, [showAlways]);

  if (!isMock) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-container text-on-warning-container font-label-sm text-[10px] sm:text-[11px] font-bold shadow-xs border border-warning/40 animate-fadeIn ${className}`}
      title="Backend belum terhubung. Menampilkan data contoh realistis Surabaya agar aplikasi dapat diuji secara penuh."
    >
      <span className="material-symbols-outlined text-[13px] text-on-warning-container">science</span>
      <span>Data contoh</span>
    </div>
  );
}

