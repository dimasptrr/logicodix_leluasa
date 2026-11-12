import React, { useState, useEffect, useRef } from 'react';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';
import { geocodeSearch } from '../features/dashboard/services/safeApi.js';

// Ikon LUMI: orb bercahaya dengan bintang di tengah
function LumiIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lumiGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F7BFF" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#lumiGrad)" />
      <circle cx="24" cy="24" r="22" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Bintang utama */}
      <path
        d="M24 9 L27.2 20.8 L39 24 L27.2 27.2 L24 39 L20.8 27.2 L9 24 L20.8 20.8 Z"
        fill="#ffffff"
      />
      {/* Bintang kecil */}
      <path
        d="M36 8 L37.1 11.9 L41 13 L37.1 14.1 L36 18 L34.9 14.1 L31 13 L34.9 11.9 Z"
        fill="#FFE083"
      />
    </svg>
  );
}

// Ekstraksi tujuan rute dari kalimat percakapan bahasa Indonesia
function extractDestinationQuery(rawText) {
  if (!rawText) return null;
  const text = rawText.trim();

  // Pola 1: "dari ... ke <tujuan> (rutenya|rute)?"
  const fromToMatch = text.match(/dari\s+.*?\s+ke\s+([^,.\n?]+?)(?:\s+(?:rutenya|rute|jalurnya|dong|ya|sekarang|tolong))?[\s.?!]*$/i);
  if (fromToMatch && fromToMatch[1]) {
    return cleanDestString(fromToMatch[1]);
  }

  // Pola 2: "ke / menuju / arah <tujuan> (rutenya|rute)?"
  const toMatch = text.match(/(?:ke|menuju|arah)\s+([^,.\n?]+?)(?:\s+(?:rutenya|rute|jalurnya|dong|ya|sekarang|tolong))?[\s.?!]*$/i);
  if (toMatch && toMatch[1]) {
    return cleanDestString(toMatch[1]);
  }

  // Pola 3: "rute / jalan / jalur <tujuan>"
  const routePrefixMatch = text.match(/^(?:rute|jalur|jalan|navigasi|cari rute|tampilkan rute)\s+(?:ke\s+|menuju\s+)?([^,.\n?]+?)(?:\s+(?:rutenya|rute|jalurnya|dong|ya|sekarang|tolong))?[\s.?!]*$/i);
  if (routePrefixMatch && routePrefixMatch[1]) {
    return cleanDestString(routePrefixMatch[1]);
  }

  return null;
}

function cleanDestString(str) {
  if (!str) return '';
  let s = str.trim();
  // Hilangkan sisa frase "lokasi saya..." jika ada
  s = s.replace(/^(?:lokasi\s+saya\s+(?:saat\s+ini\s+)?ke\s+)/i, '');
  // Ubah variasi alun2 menjadi alun-alun
  s = s.replace(/\balun\s*2\b/gi, 'alun-alun');
  s = s.replace(/\brs\b/gi, 'RSUD');
  return s.trim();
}

export default function VoiceAssistantModal({ isOpen, onClose, onNavigateTab }) {
  const { coords } = useGeolocation();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [micError, setMicError] = useState('');
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const messagesEndRef = useRef(null);

  // Mode Navigasi: 'voice' (Tunjukkan Rute & Putar Suara / Ramah Tuna Netra) vs 'silent' (Hanya Tunjukkan Rute)
  const [navVoiceMode, setNavVoiceMode] = useState(() => {
    try {
      return localStorage.getItem('leluasa_voice_nav_mode') || 'voice';
    } catch (e) {
      return 'voice';
    }
  });

  const handleSelectNavMode = (mode) => {
    setNavVoiceMode(mode);
    try {
      localStorage.setItem('leluasa_voice_nav_mode', mode);
    } catch (e) {
      // ignore
    }
  };

  // Riwayat percakapan Chatbot LUMI
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Halo! Saya LUMI, asisten AI Leluasa. Anda bisa bertanya lewat suara atau teks tentang rute trotoar ramah disabilitas, ubin pemandu (guiding block), rampa kursi roda, atau kondisi cuaca di Surabaya.',
      card: null
    },
    {
      sender: 'user',
      text: 'Cari jalan teraman ke Balai Pemuda yang ada ubin pemandunya.',
      card: null
    },
    {
      sender: 'ai',
      text: 'Ditemukan rute via Jl. Pemuda: trotoar rata, 100% ubin pemandu kuning bertekstur utuh, dan tersedia elevator aksesibel langsung ke halte integrasi.',
      card: {
        title: 'Jalur Ubin Pemandu Pemuda',
        badge: '100% Ramah Roda',
        subtitle: 'Jl. Pemuda ke Halte Balai Pemuda • 8 mnt (420m)',
        tags: ['Trotoar Rata', 'Ubin Kuning Teratur', 'Elevator Aksesibel'],
        targetTab: 'plan-route',
        targetRouteKey: 'balai-pemuda'
      }
    }
  ]);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  // Ref ke handler terbaru agar callback mic tidak memakai state lama (stale closure)
  const handleSendMessageRef = useRef(null);
  const micErrorTimerRef = useRef(null);

  const showMicError = (msg, duration = 5000) => {
    setMicError(msg);
    if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
    if (duration) {
      micErrorTimerRef.current = setTimeout(() => setMicError(''), duration);
    }
  };

  const setListening = (val) => {
    isListeningRef.current = val;
    setIsListening(val);
  };

  // Inisialisasi Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicSupported(false);
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true; // tampilkan teks live saat user bicara
    rec.lang = 'id-ID';
    rec.maxAlternatives = 1;

    let finalTranscript = '';

    rec.onstart = () => {
      finalTranscript = '';
      setListening(true);
    };

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interim += t;
        }
      }
      // Tampilkan teks sementara di kolom input
      setInputText((finalTranscript + interim).trim());
    };

    rec.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setListening(false);
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          showMicError('Izin mikrofon ditolak. Klik ikon gembok di address bar, izinkan Mikrofon, lalu coba lagi.', 7000);
          break;
        case 'audio-capture':
          showMicError('Mikrofon tidak ditemukan. Pastikan perangkat mikrofon terpasang dan tidak dipakai aplikasi lain.', 7000);
          break;
        case 'no-speech':
          showMicError('Suara tidak terdengar. Coba bicara lebih dekat ke mikrofon.');
          break;
        case 'network':
          showMicError('Pengenalan suara butuh koneksi internet. Periksa koneksi Anda.');
          break;
        case 'aborted':
          break; // dihentikan manual, bukan error
        default:
          showMicError('Suara tidak terdengar jelas. Silakan coba tekan mikrofon lagi.');
      }
    };

    rec.onend = () => {
      setListening(false);
      // Kirim otomatis hasil ucapan final
      const spoken = finalTranscript.trim();
      finalTranscript = '';
      if (spoken && handleSendMessageRef.current) {
        handleSendMessageRef.current(spoken);
      }
    };

    recognitionRef.current = rec;

    return () => {
      // Cleanup: matikan mic saat komponen di-unmount
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      try {
        rec.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  // Matikan mic & suara saat modal ditutup
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      setListening(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    }
  }, [isOpen]);

  // Keyboard shortcut Escape untuk menutup modal dan mematikan audio
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        stopSpeaking();
        stopListening();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll otomatis ke pesan terbaru
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Toggle Microphone
  const toggleListening = () => {
    setMicError('');
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Minta izin mikrofon secara eksplisit, lalu mulai merekam
  const startListening = async () => {
    if (!recognitionRef.current) {
      showMicError('Browser Anda belum mendukung input suara. Gunakan Chrome atau Edge, atau ketik pertanyaan Anda.', 6000);
      return;
    }

    // Mic hanya bisa diakses lewat HTTPS atau localhost
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      showMicError('Mikrofon butuh koneksi aman (HTTPS atau localhost).', 6000);
      return;
    }

    stopSpeaking();

    // Langkah 1: minta izin mikrofon (memunculkan popup izin browser)
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Izin didapat, tutup stream karena SpeechRecognition membuka mic sendiri
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Izin mikrofon gagal:', err);
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          showMicError('Izin mikrofon ditolak. Klik ikon gembok di address bar, izinkan Mikrofon, lalu coba lagi.', 7000);
        } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
          showMicError('Mikrofon tidak ditemukan di perangkat ini.', 6000);
        } else if (err.name === 'NotReadableError') {
          showMicError('Mikrofon sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.', 6000);
        } else {
          showMicError('Tidak bisa mengakses mikrofon. Coba lagi.');
        }
        return;
      }
    }

    // Langkah 2: mulai pengenalan suara
    try {
      setInputText('');
      recognitionRef.current.start();
    } catch (err) {
      // InvalidStateError jika sudah berjalan
      console.warn('Gagal memulai pengenalan suara:', err);
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop(); // onend akan mengirim hasil ucapan
      } catch (e) {
        // ignore
      }
    }
  };

  // Logika Pemutaran Suara: Klik untuk Bicara, Klik lagi untuk Stop, Klik lagi untuk Ulangi dari Awal
  const handleToggleVoicePlayback = (textToSpeak, msgIndex) => {
    if (!('speechSynthesis' in window)) {
      showMicError('Browser tidak mendukung output sintesis suara.', 3000);
      return;
    }

    // Jika pesan ini SEDANG diputar -> HENTIKAN (Stop)
    if (speakingIndex === msgIndex) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    // Jika sedang berhenti atau pesan lain -> Hentikan dulu yang lama, lalu PUTAR ULANG dari awal
    window.speechSynthesis.cancel();
    setSpeakingIndex(msgIndex);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    }
  };

  // Eksekusi Pertanyaan Pengguna
  const handleSendMessage = async (userQuery) => {
    const query = (userQuery || inputText).trim();
    if (!query) return;

    setInputText('');
    stopListening();

    const lower = query.toLowerCase();
    let reply = '';
    let targetTab = null;
    let cardData = null;
    let routeIntent = null;

    // 1. Ekstraksi tujuan otomatis menggunakan regex bahasa Indonesia
    const extractedDest = extractDestinationQuery(query);

    // 2. Deteksi apakah rute menuju preset Surabaya atau lokasi kustom di luar Surabaya
    if (lower.includes('soetomo') || lower.includes('rsud')) {
      targetTab = 'plan-route';
      routeIntent = {
        destination: { id: 'rsud-soetomo', name: 'RSUD Dr. Soetomo Surabaya', lat: -7.2678, lng: 112.7582 },
        autoPlayVoice: navVoiceMode === 'voice'
      };
      reply = `Menyiapkan rute aksesibel ke RSUD Dr. Soetomo: trotoar ubin pemandu via Jl. Kusuma Bangsa bebas dari rintangan proyek galian.${navVoiceMode === 'voice' ? ' Panduan suara turn-by-turn akan langsung aktif.' : ' Membuka peta rute navigasi visual...'}`;
      cardData = {
        title: 'Jalur Akses RSUD Dr. Soetomo',
        badge: navVoiceMode === 'voice' ? '🔊 Panduan Suara Aktif' : 'Rampa Landai 4.5°',
        subtitle: 'Jl. Kusuma Bangsa • 10 mnt (650m)',
        tags: ['Ubin Pemandu Utuh', 'Bebas Hambatan', 'Lift Aksesibel'],
        targetTab: 'plan-route',
        targetRouteKey: 'rsud-soetomo',
        routeIntent
      };
    } else if (lower.includes('pemuda') || lower.includes('halte') || (lower.includes('balai') && !lower.includes('kota'))) {
      targetTab = 'plan-route';
      routeIntent = {
        destination: { id: 'balai-pemuda', name: 'Halte Integrasi Balai Pemuda', lat: -7.2655, lng: 112.7515 },
        autoPlayVoice: navVoiceMode === 'voice'
      };
      reply = `Menyiapkan rute Halte Balai Pemuda: belok kanan 45m dari Jl. Pemuda dengan ubin pemandu teratur.${navVoiceMode === 'voice' ? ' Panduan suara turn-by-turn akan langsung aktif.' : ' Membuka peta rute navigasi visual...'}`;
      cardData = {
        title: 'Rute Halte Balai Pemuda',
        badge: navVoiceMode === 'voice' ? '🔊 Panduan Suara Aktif' : '100% Ramah Roda',
        subtitle: 'Jl. Pemuda Surabaya • 8 mnt (420m)',
        tags: ['Jalur Kuning', 'Elevator 10m', 'Trotoar Rata'],
        targetTab: 'plan-route',
        targetRouteKey: 'balai-pemuda',
        routeIntent
      };
    } else if (lower.includes('kuliner') || lower.includes('makan') || lower.includes('sentra')) {
      reply = 'Menyiapkan rute Sentra Kuliner Pemuda pada Dashboard: trotoar lebar 2.4m bebas parkir liar dengan akses rampa landai.';
      targetTab = 'home';
      if (typeof window !== 'undefined') window.__leluasaDashboardDestination = 'sentra-kuliner';
      cardData = {
        title: 'Sentra Kuliner Pemuda',
        badge: 'Trotoar Lebar Bebas Parkir',
        subtitle: 'Jl. Pemuda Sisi Selatan • 6 mnt (380m)',
        tags: ['Trotoar Lebar', 'Rampa Halus', 'Akses Kursi Roda'],
        targetTab: 'home',
        targetRouteKey: 'sentra-kuliner'
      };
    } else if (lower.includes('bollard') || lower.includes('halangan')) {
      targetTab = 'plan-route';
      routeIntent = {
        destination: { id: 'detour-bollard', name: 'Pengalihan Halangan Bollard Sempit', lat: -7.2628, lng: 112.7530 },
        autoPlayVoice: navVoiceMode === 'voice'
      };
      reply = `Mengaktifkan rute pengalihan menghindari bollard rapat di Jl. Pemuda via rampa halus gedung drop-off.${navVoiceMode === 'voice' ? ' Memulai panduan suara turn-by-turn...' : ' Membuka peta navigasi...'}`;
      cardData = {
        title: 'Pengalihan Rute Bollard Sempit',
        badge: 'Bypass Aman',
        subtitle: 'Jl. Pemuda No. 34 ke Balai Kota • 6 mnt (380m)',
        tags: ['Rampa Halus 120cm', 'Bypass Tiang', 'Kursi Roda Aman'],
        targetTab: 'plan-route',
        targetRouteKey: 'detour-bollard',
        routeIntent
      };
    } else if (extractedDest) {
      // 3. PENCARIAN RUTE KE LOKASI DINAMIS (Misal: "alun2 probolinggo", "kopi kenangan probolinggo", dll)
      setIsSearchingRoute(true);
      let resolvedPlace = null;

      try {
        const geoRes = await geocodeSearch(extractedDest, coords?.lat, coords?.lng);
        if (geoRes && Array.isArray(geoRes.data) && geoRes.data.length > 0) {
          resolvedPlace = geoRes.data[0];
        }
      } catch (err) {
        console.warn('Geocoding gagal:', err);
      } finally {
        setIsSearchingRoute(false);
      }

      const destLat = resolvedPlace ? resolvedPlace.lat : (coords?.lat ? coords.lat + 0.005 : -7.7545);
      const destLng = resolvedPlace ? resolvedPlace.lng : (coords?.lng ? coords.lng + 0.005 : 113.2159);
      const destDisplayName = resolvedPlace?.name || extractedDest;

      routeIntent = {
        origin: coords ? {
          lat: coords.lat,
          lng: coords.lng,
          name: 'Lokasi GPS Saya',
          source: 'gps'
        } : null,
        destination: {
          lat: destLat,
          lng: destLng,
          name: destDisplayName,
          id: `custom-${Date.now()}`
        },
        autoPlayVoice: navVoiceMode === 'voice'
      };

      targetTab = 'plan-route';
      reply = `Menyiapkan rute aksesibel menuju ${destDisplayName}.${navVoiceMode === 'voice' ? ' Mengarahkan ke peta dan memutar panduan suara langkah demi langkah...' : ' Mengarahkan langsung ke peta rute navigasi...'}`;

      cardData = {
        title: `Rute ke ${destDisplayName}`,
        badge: navVoiceMode === 'voice' ? '🔊 Panduan Suara Aktif' : '🗺️ Peta Visual',
        subtitle: `${coords ? 'Dari Lokasi GPS Anda' : 'Dari Titik Awal'} menuju ${destDisplayName}`,
        tags: [
          'Rute Ramah Disabilitas',
          'Deteksi Cerdas AI',
          navVoiceMode === 'voice' ? 'Turn-by-turn Suara' : 'Peta Interaktif'
        ],
        targetTab: 'plan-route',
        routeIntent
      };
    } else if (lower.includes('lapor') || lower.includes('rusak') || lower.includes('hambatan') || lower.includes('kabel') || lower.includes('foto')) {
      reply = 'Membuka formulir pelaporan rintangan. Silakan unggah foto hambatan agar dapat diverifikasi oleh komunitas dan DPUPR Surabaya.';
      targetTab = 'report-obstacle';
    } else if (lower.includes('cuaca') || lower.includes('hujan') || lower.includes('licin') || lower.includes('panas')) {
      reply = 'Cuaca saat ini terpantau 31 derajat Celsius, berawan. Permukaan trotoar kering dan memiliki daya cengkeram aman untuk kursi roda dan tongkat netra.';
      targetTab = 'weather-intelligence';
    } else if (lower.includes('peta') || lower.includes('surabaya') || lower.includes('eksplorasi')) {
      reply = 'Membuka Peta Navigasi Surabaya dengan visualisasi seluruh jaringan trotoar, halte Trans Semanggi, dan titik rintangan aktif.';
      targetTab = 'explore-map';
    } else {
      reply = `Informasi navigasi untuk "${query}": ubin pemandu terdekat dalam kondisi aktif dan aman dilintasi pejalan kaki maupun pengguna kursi roda.`;
      targetTab = 'home';
      if (typeof window !== 'undefined') window.__leluasaDashboardDestination = 'halte-pemuda';
    }

    // Pasang target route intent secara global untuk ditangkap oleh halaman tujuan
    if (routeIntent && typeof window !== 'undefined') {
      window.__leluasaRouteIntent = routeIntent;
    }

    // Pakai functional update agar tidak bergantung pada state lama
    let newAiIndex = 0;
    setMessages((prev) => {
      const next = [
        ...prev,
        { sender: 'user', text: query, card: null },
        { sender: 'ai', text: reply, card: cardData }
      ];
      newAiIndex = next.length - 1;
      return next;
    });

    // Otomatis bunyikan jawaban AI dan tandai tombol suara aktif
    // (hitung indeks langsung dari panjang pesan saat ini + 2 pesan baru)
    handleToggleVoicePlayback(reply, messages.length + 1);

    // Jika perintah mengarahkan ke tab tertentu, buka otomatis setelah 3 detik
    if (targetTab && onNavigateTab) {
      setTimeout(() => {
        if (cardData?.routeIntent && typeof window !== 'undefined') {
          window.__leluasaRouteIntent = cardData.routeIntent;
        } else if (cardData?.targetRouteKey && typeof window !== 'undefined') {
          window.__leluasaDashboardDestination = cardData.targetRouteKey;
          window.dispatchEvent(new CustomEvent('leluasa:dashboard-route', { detail: { destId: cardData.targetRouteKey } }));
        }
        onNavigateTab(targetTab);
        onClose();
      }, 3000);
    }
  };

  // Selalu arahkan ref ke handler terbaru
  handleSendMessageRef.current = handleSendMessage;

  const quickPrompts = [
    'Rute Halte Balai Pemuda',
    'Jalur RSUD Dr. Soetomo',
    'Sentra Kuliner Pemuda',
    'Kondisi Cuaca Hari Ini'
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chatbot-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-primary/60 backdrop-blur-md animate-fadeIn"
    >
      {/* DESAIN MODAL LEBAR ELEGAN UNTUK WEB LAPTOP */}
      <div className="relative w-full max-w-2xl lg:max-w-4xl h-[82vh] max-h-[720px] bg-surface-container-lowest rounded-[32px] shadow-2xl flex flex-col border-2 border-outline-variant/30 overflow-hidden">

        {/* HEADER CHATBOT (LAPTOP WEB) */}
        <div className="px-6 py-4 bg-surface-container-lowest border-b border-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center shadow-sm">
              <LumiIcon size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="chatbot-heading" className="text-base sm:text-lg font-extrabold text-on-surface tracking-tight">
                  LUMI
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary inline-block animate-pulse"></span>
                  <span>Online</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">
                Asisten AI Leluasa · Panduan Suara &amp; Rute Aksesibel Surabaya
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              stopListening();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
            aria-label="Tutup LUMI"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        {/* NOTIFIKASI ERROR MIKROFON (BILA ADA) */}
        {micError && (
          <div role="alert" className="px-6 py-2.5 bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-base" aria-hidden="true">mic_off</span>
            <span className="flex-1">{micError}</span>
            <button
              type="button"
              onClick={() => setMicError('')}
              className="cursor-pointer"
              aria-label="Tutup pesan"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
            </button>
          </div>
        )}

        {/* DAFTAR PERCAKAPAN CHAT (LAPTOP SIZING: LUAS & LEGA) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-surface-container-low/30">
          {messages.map((m, idx) => {
            const isAi = m.sender === 'ai';
            const isThisSpeaking = speakingIndex === idx;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {isAi && (
                  <div className="shrink-0 mt-0.5 shadow-xs rounded-full">
                    <LumiIcon size={36} />
                  </div>
                )}

                <div className={`max-w-[80%] sm:max-w-[72%] flex flex-col gap-1.5 ${isAi ? 'items-start' : 'items-end'}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isAi
                        ? 'bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-tl-xs'
                        : 'bg-primary text-on-primary font-bold rounded-tr-xs shadow-md'
                    }`}
                  >
                    <p>{m.text}</p>

                    {/* Interactive Route Action Card in Chat (MENGARAH KE DASHBOARD) */}
                    {m.card && (
                      <div className="mt-3.5 bg-surface-container-lowest border-2 border-secondary rounded-2xl p-4 shadow-xs space-y-2.5 text-on-surface">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center font-bold shrink-0">
                              <span className="material-symbols-outlined text-xl" aria-hidden="true">alt_route</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs sm:text-sm font-extrabold text-on-surface">{m.card.title}</p>
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-secondary/15 text-secondary">
                                  {m.card.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant font-medium">{m.card.subtitle}</p>
                            </div>
                          </div>

                          {/* Tombol Buka Rute: Mengarahkan ke Rute / Dashboard dengan navigasi langkah */}
                          <button
                            type="button"
                            onClick={() => {
                              stopSpeaking();
                              if (m.card.routeIntent && typeof window !== 'undefined') {
                                window.__leluasaRouteIntent = m.card.routeIntent;
                              } else if (m.card.targetRouteKey && typeof window !== 'undefined') {
                                window.__leluasaDashboardDestination = m.card.targetRouteKey;
                                window.dispatchEvent(new CustomEvent('leluasa:dashboard-route', { detail: { destId: m.card.targetRouteKey } }));
                              }
                              if (onNavigateTab) onNavigateTab(m.card.targetTab || 'plan-route');
                              onClose();
                            }}
                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                          >
                            <span>{m.card.routeIntent?.autoPlayVoice ? 'Mulai Panduan Suara' : 'Buka Peta Rute'}</span>
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-outline-variant/20 text-[11px] font-bold">
                          {m.card.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-secondary" aria-hidden="true">check</span>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tombol Kontrol Suara untuk Pesan AI (Play / Stop / Replay) */}
                  {isAi && (
                    <button
                      type="button"
                      onClick={() => handleToggleVoicePlayback(m.text, idx)}
                      aria-label={isThisSpeaking ? 'Hentikan suara penjelasan' : 'Putar suara penjelasan'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isThisSpeaking
                          ? 'bg-error text-white shadow-sm ring-2 ring-error/30 animate-pulse'
                          : 'bg-surface-container hover:bg-surface-container-high text-primary'
                      }`}
                      title={isThisSpeaking ? 'Klik: Hentikan Suara' : 'Klik: Dengarkan Penjelasan Ulang'}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        {isThisSpeaking ? 'stop' : 'volume_up'}
                      </span>
                      <span>{isThisSpeaking ? 'Hentikan Suara' : 'Dengarkan Penjelasan'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Indikator LUMI sedang mencari lokasi */}
          {isSearchingRoute && (
            <div className="flex items-center gap-3">
              <LumiIcon size={36} className="animate-pulse" />
              <div className="px-4 py-2.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-semibold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-base animate-spin" aria-hidden="true">progress_activity</span>
                <span>LUMI sedang mencari lokasi...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK SUGGESTION CHIPS (LAPTOP BAR) */}
        <div className="px-6 py-2.5 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-xs font-bold text-on-surface-variant shrink-0 mr-1">Rekomendasi Pertanyaan:</span>
          {quickPrompts.map((prompt, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-3.5 py-1.5 rounded-full bg-surface-container text-primary hover:bg-primary hover:text-white transition-all whitespace-nowrap text-xs font-bold border border-outline-variant/30 active:scale-95 shrink-0 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* PILIHAN MODE AKSI NAVIGASI DI ATAS KOLOM INPUT (RAMAH TUNA NETRA & VISUAL) */}
        <div className="px-5 py-2.5 bg-surface-container-low/70 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
            <span className="material-symbols-outlined text-base text-primary">assistant_navigation</span>
            <span>Opsi Saat Rute Ditemukan:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container rounded-full p-1 border border-outline-variant/40" role="group" aria-label="Mode navigasi rute">
            <button
              type="button"
              onClick={() => handleSelectNavMode('silent')}
              aria-pressed={navVoiceMode === 'silent'}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                navVoiceMode === 'silent'
                  ? 'bg-primary text-white shadow-sm ring-1 ring-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Hanya menampilkan peta rute secara visual tanpa memutar suara panduan"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              <span>Hanya Tunjukkan Rute</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectNavMode('voice')}
              aria-pressed={navVoiceMode === 'voice'}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                navVoiceMode === 'voice'
                  ? 'bg-secondary text-white shadow-sm ring-1 ring-secondary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Tunjukkan rute dan otomatis bunyikan panduan suara turn-by-turn langkah demi langkah (sangat ramah tuna netra)"
            >
              <span className="material-symbols-outlined text-sm">record_voice_over</span>
              <span>Tunjukkan Rute &amp; Putar Suara</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${navVoiceMode === 'voice' ? 'bg-white/25 text-white' : 'bg-secondary/15 text-secondary'}`}>
                Tuna Netra
              </span>
            </button>
          </div>
        </div>

        {/* INPUT BAR (TEKS + MIKROFON + KIRIM) */}
        <div className="p-4 sm:p-5 bg-surface-container-lowest border-t border-surface-container flex items-center gap-3 shrink-0">
          {/* Microphone button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={!micSupported}
            aria-label={isListening ? 'Sedang merekam suara, klik untuk berhenti' : 'Bicara menggunakan mikrofon'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              isListening
                ? 'bg-error text-white ring-4 ring-error/30 animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-high text-primary'
            }`}
            title={
              !micSupported
                ? 'Browser ini tidak mendukung input suara (gunakan Chrome atau Edge)'
                : isListening
                ? 'Sedang Mendengarkan... Klik untuk Selesai'
                : 'Klik untuk Bicara via Mikrofon'
            }
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              {isListening ? 'mic' : 'mic_none'}
            </span>
          </button>

          {/* Kolom ketik teks */}
          <input
            type="text"
            placeholder={isListening ? 'LUMI sedang mendengarkan Anda...' : 'Tanya LUMI: rute aksesibel, ubin pemandu, atau kondisi trotoar Surabaya...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 h-12 px-5 rounded-full bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/40"
          />

          {/* Tombol Kirim Teks */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            aria-label="Kirim pesan"
            className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}