import React, { useState, useEffect } from 'react';
import { fetchWeather } from '../services/api.js';

export default function WeatherIntelligence({ setActiveTab }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetchWeather().then(res => setWeather(res.data)).catch(console.error);
  }, []);

  return (
    <div className="p-3 sm:p-space-md lg:p-space-xl flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl max-w-7xl mx-auto w-full animate-fadeIn pb-8 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-xs font-bold w-fit">
          <span className="material-symbols-outlined text-sm">thunderstorm</span>
          <span>CUACA MOBILITAS REAL-TIME · SURABAYA</span>
        </div>
        <h1 className="font-headline-lg text-xl sm:text-2xl lg:text-3xl text-primary font-bold tracking-tight">
          Intelijen Cuaca Mikro & Traksi Trotoar
        </h1>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-3xl">
          Memantau presipitasi curah hujan dan kelembapan permukaan jalan di seluruh koridor Surabaya untuk melindungi pengguna kursi roda dari bahaya ubin keramik dekoratif yang licin, rampa trotoar tergenang, dan kubangan air berbahaya.
        </p>
      </div>

      {/* Kartu Cuaca Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md sm:gap-space-lg items-stretch">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg lg:p-space-xl shadow-xs flex flex-col justify-between relative overflow-hidden border border-outline-variant/20">
          <div className="flex flex-col gap-space-sm sm:gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs uppercase font-bold text-on-surface-variant tracking-wider">
                  Radar Sensor Terkini · Surabaya Pusat
                </span>
                {weather?.isLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    RADAR LIVE
                  </span>
                )}
              </div>
              <span className={`px-2.5 py-0.5 sm:py-1 rounded-full font-label-sm text-[10px] sm:text-xs font-bold ${
                weather?.precipitationProb > 40 ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
              }`}>
                {weather?.alertMessage || 'Waktu Bepergian Optimal'}
              </span>
            </div>

            <div className="flex items-baseline gap-3 sm:gap-4 mt-1">
              <span className="font-display-lg text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">{weather?.temperature || 31}°C</span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-sm sm:text-base font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-lg">{weather?.conditionIcon || 'wb_sunny'}</span>
                  <span>{weather?.condition || 'Cerah Berawan'}</span>
                </span>
                <span className="text-xs text-on-surface-variant">
                  Suhu Terasa: {weather?.apparentTemperature || weather?.temperature || 31}°C · Kelembapan: {weather?.humidity || '60%'}
                </span>
              </div>
            </div>

            {/* Bilah Peluang Presipitasi Hujan */}
            <div className="flex flex-col gap-1 pt-1 sm:pt-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Peluang Presipitasi (Curah Hujan)</span>
                <span className="text-secondary">{weather?.precipitationProb || 78}% (Tinggi)</span>
              </div>
              <div className="w-full h-2.5 sm:h-3 rounded-full bg-surface-container overflow-hidden">
                <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${weather?.precipitationProb || 78}%` }}></div>
              </div>
              <span className="text-[10px] sm:text-[11px] text-on-surface-variant mt-0.5">
                Perkiraan turun hujan dalam: <strong>35 menit</strong> di koridor Jl. Pemuda & Jl. Basuki Rahmat.
              </span>
            </div>

            {/* Peringatan Bahaya Traksi Trotoar Basah */}
            <div className="p-3 sm:p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/30 mt-1 sm:mt-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-lg sm:text-xl shrink-0 mt-0.5">warning</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-xs font-bold text-primary">Peringatan Bahaya Trotoar Licin</span>
                  <p className="font-body-sm text-[11px] sm:text-xs text-on-surface mt-0.5">
                    {weather?.advisoryText || 'Hujan ringan menyebabkan ubin trotoar keramik dekoratif di sepanjang Jl. Basuki Rahmat menjadi sangat licin. Kursi roda listrik rawan selip bila melaju di atas 4 km/jam.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 pl-6 pt-0.5">
                <div className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Gunakan koridor arkade Balai Kota (kering & anti-slip)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-error font-semibold">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  <span>Hindari rampa trotoar ubin keramik di Jl. Basuki Rahmat</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 sm:pt-space-lg flex gap-space-sm">
            <button
              onClick={() => setActiveTab('plan-route')}
              className="w-full min-h-[48px] rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg text-secondary-container">umbrella</span>
              <span>Hitung Rute Aman Beratap & Bebas Hujan</span>
            </button>
          </div>
        </div>

        {/* Koridor Beratap di Surabaya (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg shadow-xs flex flex-col justify-between gap-space-md border border-outline-variant/20">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">roofing</span>
              <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary">Koridor Pejalan Kaki Beratap di Surabaya</h2>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">Jalur pejalan kaki terlindung dari guyuran hujan atau terik panas</p>
          </div>

          <div className="flex flex-col gap-2 sm:gap-2.5">
            {[
              { name: 'Koridor Arkade Balai Kota', dist: '650m', status: '100% Kering', rating: 'Beton anti-slip' },
              { name: 'Kanopi Pedestrian Jl. Kusuma Bangsa', dist: '800m', status: 'Beratap Kontinu', rating: 'Ubin pemandu utuh' },
              { name: 'Koridor Interior Penghubung Mal Tunjungan', dist: '420m', status: 'Koridor Dalam Ruangan', rating: 'Bebas tanjakan curam' },
              { name: 'Underpass Rampa Pejalan Kaki Grand City', dist: '250m', status: 'Underpass Beratap', rating: 'Ubin taktil terpasang' }
            ].map((arcade, idx) => (
              <div key={idx} className="p-2.5 sm:p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-md text-xs font-bold text-primary">{arcade.name}</span>
                  <span className="text-[10px] sm:text-[11px] text-on-surface-variant">{arcade.status} • {arcade.rating}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold">
                  {arcade.dist}
                </span>
              </div>
            ))}
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-surface-container-high text-[11px] text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-base">cloud_sync</span>
            <span>Tersinkronisasi dengan Radar Doppler BMKG Surabaya Juanda.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
