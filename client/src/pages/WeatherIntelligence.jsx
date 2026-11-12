import React, { useState, useEffect, useCallback } from 'react';
import { fetchWeather, reverseGeocode } from '../features/dashboard/services/safeApi.js';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';
import MockDataBadge from '../components/MockDataBadge.jsx';

export default function WeatherIntelligence({ setActiveTab }) {
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [locationName, setLocationName] = useState('Surabaya Pusat');
  const { coords, status: gpsStatus, refreshLocation } = useGeolocation();

  const loadWeather = useCallback(async (lat = null, lng = null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchWeather(lat, lng);
      setWeather(res.data);
    } catch (err) {
      setErrorMessage('Gagal memuat telemetri sensor cuaca. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ambil cuaca sesuai koordinat GPS pengguna jika tersedia
  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      loadWeather(coords.lat, coords.lng);
      reverseGeocode(coords.lat, coords.lng)
        .then((res) => {
          if (res?.data?.name) {
            setLocationName(res.data.name);
          } else if (res?.data?.address) {
            setLocationName(res.data.address.split(',')[0]);
          } else {
            setLocationName(`GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          }
        })
        .catch(() => {
          setLocationName(`GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        });
    } else {
      loadWeather();
      setLocationName('Surabaya Pusat');
    }
  }, [coords?.lat, coords?.lng, loadWeather]);

  return (
    <div className="p-3 sm:p-space-md lg:p-space-xl flex flex-col gap-space-md sm:gap-space-lg lg:gap-space-xl max-w-7xl mx-auto w-full animate-fadeIn pb-8 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs font-bold w-fit">
            <span className="material-symbols-outlined text-sm">thunderstorm</span>
            <span>CUACA REAL-TIME · {locationName.toUpperCase()}</span>
          </div>
          {coords && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-secondary text-xs font-bold">
              <span className="material-symbols-outlined text-sm">my_location</span>
              <span>Sesuai GPS Lokasi Anda</span>
            </span>
          )}
          <MockDataBadge />
        </div>
        {errorMessage && (
          <div className="p-3 sm:p-4 rounded-xl bg-warning-container text-on-warning-container border border-warning/40 text-xs flex items-center justify-between shadow-xs my-2">
            <span>{errorMessage}</span>
            <button onClick={() => coords ? loadWeather(coords.lat, coords.lng) : loadWeather()} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold">Coba Lagi</button>
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-headline-lg text-xl sm:text-2xl lg:text-3xl text-primary font-bold tracking-tight">
              Intelijen Cuaca Mikro & Traksi Trotoar
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-3xl">
              Memantau presipitasi curah hujan dan kelembapan permukaan jalan di lokasi Anda secara langsung untuk melindungi pengguna kursi roda dari risiko ubin licin dan kubangan air berbahaya.
            </p>
          </div>
          <button
            onClick={() => refreshLocation()}
            className="px-3 py-1.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container-high text-xs font-bold text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Perbarui koordinat lokasi GPS"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            <span>Segarkan Lokasi GPS</span>
          </button>
        </div>
      </div>

      {/* Kartu Cuaca Utama */}
      <div className="w-full">
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 sm:p-space-lg lg:p-space-xl shadow-xs flex flex-col justify-between relative overflow-hidden border border-outline-variant/20">
          <div className="flex flex-col gap-space-sm sm:gap-space-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs uppercase font-bold text-on-surface-variant tracking-wider">
                  Radar Sensor Terkini · {locationName}
                </span>
                {weather?.isLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    RADAR LIVE
                  </span>
                )}
              </div>
              <span className={`px-2.5 py-0.5 sm:py-1 rounded-full font-label-sm text-[10px] sm:text-xs font-bold ${
                (weather?.precipitationProb ?? weather?.rainProbability ?? 20) > 40 ? 'bg-warning-container text-on-warning-container' : 'bg-secondary-container text-on-secondary-container'
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

            {/* Bilah Peluang Presipitasi Hujan & Telemetri Traksi Dinamis */}
            {(() => {
              const rainProb = weather?.precipitationProb ?? weather?.rainProbability ?? 20;
              const isHighRain = rainProb >= 50;
              const isMediumRain = rainProb >= 30;
              const rainLabel = isHighRain ? 'Tinggi' : isMediumRain ? 'Sedang' : 'Rendah';
              const rainStatusText = isHighRain
                ? 'Potensi presipitasi tinggi. Waspadai genangan air dan kurangi laju kecepatan kursi roda.'
                : isMediumRain
                ? 'Potensi gerimis lokal ringan di beberapa koridor Surabaya.'
                : 'Kondisi kering dan optimal untuk mobilitas mandiri pejalan kaki & kursi roda.';

              const advisory = weather?.advisoryText || (isHighRain
                ? 'Presipitasi basah dapat menyebabkan ubin trotoar keramik dekoratif menjadi licin. Kursi roda listrik disarankan melaju di bawah 4 km/jam.'
                : 'Permukaan trotoar kering dan memiliki daya cengkeram optimal untuk mobilitas kursi roda mandiri.');

              return (
                <>
                  <div className="flex flex-col gap-1 pt-1 sm:pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Peluang Presipitasi (Curah Hujan)</span>
                      <span className="text-secondary">{rainProb}% ({rainLabel})</span>
                    </div>
                    <div className="w-full h-2.5 sm:h-3 rounded-full bg-surface-container overflow-hidden">
                      <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${rainProb}%` }}></div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-on-surface-variant mt-0.5">
                      {rainStatusText}
                    </span>
                  </div>

                  {/* Peringatan Bahaya Traksi Trotoar Basah */}
                  <div className="p-3 sm:p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/30 mt-1 sm:mt-2">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg sm:text-xl shrink-0 mt-0.5">
                        {isHighRain ? 'warning' : 'verified_user'}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-xs font-bold text-primary">
                          {isHighRain ? 'Peringatan Bahaya Trotoar Licin' : 'Status Traksi Permukaan Trotoar'}
                        </span>
                        <p className="font-body-sm text-[11px] sm:text-xs text-on-surface mt-0.5">
                          {advisory}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pl-6 pt-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>{isHighRain ? 'Pilih jalur rampa bertekstur kasar anti-slip' : 'Daya cengkeram ban optimal di seluruh koridor pedestrian'}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isHighRain ? 'text-error' : 'text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-sm">{isHighRain ? 'cancel' : 'info'}</span>
                        <span>{isHighRain ? 'Waspadai permukaan ubin keramik dekoratif saat basah' : 'Gunakan kecepatan aman standar (maksimal 6 km/jam)'}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="pt-4 sm:pt-space-lg flex gap-space-sm">
            <button
              onClick={() => setActiveTab('plan-route')}
              className="w-full min-h-[48px] rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg text-secondary-container">umbrella</span>
              <span>Hitung Rute Aman Bebas Hujan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
