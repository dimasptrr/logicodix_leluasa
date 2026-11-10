import React, { useState, useEffect, useRef } from 'react';

export default function VoiceAssistantModal({ isOpen, onClose, onNavigateTab }) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [micError, setMicError] = useState('');
  const messagesEndRef = useRef(null);

  // Riwayat percakapan Chatbot Asisten AI
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Halo! Saya Asisten AI Leluasa. Anda bisa bertanya lewat suara atau teks tentang rute trotoar ramah disabilitas, ubin pemandu (guiding block), rampa kursi roda, atau kondisi cuaca di Surabaya.',
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
        targetTab: 'home',
        targetRouteKey: 'halte-pemuda'
      }
    }
  ]);

  const recognitionRef = useRef(null);

  // Inisialisasi Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'id-ID';

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setIsListening(false);
        handleSendMessage(text);
      };

      rec.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError('Izin mikrofon belum diberikan. Silakan aktifkan di pengaturan browser Anda.');
        } else {
          setMicError('Suara tidak terdengar jelas. Silakan coba tekan mikrofon lagi.');
        }
        setTimeout(() => setMicError(''), 4500);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

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
  }, [isOpen]);

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
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        stopSpeaking();
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err) {
        setIsListening(false);
      }
    } else {
      setMicError('Browser Anda belum mendukung input suara mikrofon. Silakan gunakan ketik teks.');
      setTimeout(() => setMicError(''), 4500);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    }
  };

  // Logika Pemutaran Suara: Klik untuk Bicara, Klik lagi untuk Stop, Klik lagi untuk Ulangi dari Awal
  const handleToggleVoicePlayback = (textToSpeak, msgIndex) => {
    if (!('speechSynthesis' in window)) {
      setMicError('Browser tidak mendukung output sintesis suara.');
      setTimeout(() => setMicError(''), 3000);
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
  const handleSendMessage = (userQuery) => {
    const query = (userQuery || inputText).trim();
    if (!query) return;

    setInputText('');
    stopListening();

    const lower = query.toLowerCase();
    let reply = '';
    let targetTab = null;
    let cardData = null;

    if (lower.includes('soetomo') || lower.includes('rsud')) {
      reply = 'Menyiapkan rute aksesibel ke RSUD Dr. Soetomo pada Dashboard Navigasi: trotoar ubin pemandu via Jl. Kusuma Bangsa bebas dari rintangan proyek galian.';
      targetTab = 'home';
      if (typeof window !== 'undefined') window.__leluasaDashboardDestination = 'rsud-soetomo';
      cardData = {
        title: 'Jalur Akses RSUD Dr. Soetomo',
        badge: 'Rampa Landai 4.5°',
        subtitle: 'Jl. Kusuma Bangsa • 10 mnt (650m)',
        tags: ['Ubin Pemandu Utuh', 'Bebas Hambatan', 'Lift Aksesibel'],
        targetTab: 'home',
        targetRouteKey: 'rsud-soetomo'
      };
    } else if (lower.includes('pemuda') || lower.includes('halte') || lower.includes('balai')) {
      reply = 'Menyiapkan rute Halte Balai Pemuda pada Dashboard Navigasi: belok kanan 45m dari Jl. Pemuda. Ubin pemandu teratur tanpa lubang trotoar.';
      targetTab = 'home';
      if (typeof window !== 'undefined') window.__leluasaDashboardDestination = 'halte-pemuda';
      cardData = {
        title: 'Rute Halte Balai Pemuda',
        badge: '100% Ramah Roda',
        subtitle: 'Jl. Pemuda Surabaya • 8 mnt (420m)',
        tags: ['Jalur Kuning', 'Elevator 10m', 'Trotoar Rata'],
        targetTab: 'home',
        targetRouteKey: 'halte-pemuda'
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
      reply = 'Mengaktifkan rute pengalihan menghindari bollard rapat di Jl. Pemuda via rampa halus gedung drop-off.';
      targetTab = 'home';
      if (typeof window !== 'undefined') window.__leluasaDashboardDestination = 'balai-kota';
      cardData = {
        title: 'Pengalihan Rute Bollard Sempit',
        badge: 'Bypass Aman',
        subtitle: 'Jl. Pemuda No. 34 ke Balai Kota • 6 mnt (380m)',
        tags: ['Rampa Halus 120cm', 'Bypass Tiang', 'Kursi Roda Aman'],
        targetTab: 'home',
        targetRouteKey: 'balai-kota'
      };
    } else if (lower.includes('lapor') || lower.includes('rusak') || lower.includes('hambatan') || lower.includes('kabel') || lower.includes('foto')) {
      reply = 'Membuka formulir pelaporan rintangan. Silakan unggah foto hambatan agar dapat diverifikasi oleh komunitas dan DPUPR Surabaya.';
      targetTab = 'report-obstacle';
    } else if (lower.includes('cuaca') || lower.includes('hujan') || lower.includes('licin') || lower.includes('panas')) {
      reply = 'Cuaca Surabaya saat ini terpantau 31 derajat Celsius, berawan. Permukaan ubin trotoar kering dan memiliki daya cengkeram aman untuk kursi roda dan tongkat netra.';
      targetTab = 'weather-intelligence';
    } else if (lower.includes('peta') || lower.includes('surabaya') || lower.includes('eksplorasi')) {
      reply = 'Membuka Peta Navigasi Surabaya dengan visualisasi seluruh jaringan trotoar, halte Trans Semanggi, dan titik rintangan aktif.';
      targetTab = 'explore-map';
    } else {
      reply = `Informasi navigasi untuk "${query}": jalur trotoar terdekat dalam status aktif dan aman dilintasi pejalan kaki serta pengguna kursi roda.`;
      targetTab = 'home';
      if (typeof window !== 'undefined') window.__leluasaDashboardDestination = 'halte-pemuda';
    }

    const nextMessages = [
      ...messages,
      { sender: 'user', text: query, card: null },
      { sender: 'ai', text: reply, card: cardData }
    ];
    setMessages(nextMessages);

    // Otomatis bunyikan jawaban AI dan tandai tombol suara aktif
    const newAiIndex = nextMessages.length - 1;
    handleToggleVoicePlayback(reply, newAiIndex);

    // Jika perintah mengarahkan ke tab tertentu, buka setelah 3.5 detik
    if (targetTab && onNavigateTab) {
      setTimeout(() => {
        if (cardData?.targetRouteKey && typeof window !== 'undefined') {
          window.__leluasaDashboardDestination = cardData.targetRouteKey;
          window.dispatchEvent(new CustomEvent('leluasa:dashboard-route', { detail: { destId: cardData.targetRouteKey } }));
        }
        onNavigateTab(targetTab);
        onClose();
      }, 3500);
    }
  };

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
            <div className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">smart_toy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="chatbot-heading" className="text-base sm:text-lg font-extrabold text-on-surface tracking-tight">
                  Asisten AI Leluasa
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary inline-block animate-pulse"></span>
                  <span>Online</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">
                Panduan Suara, Rute Aksesibel, &amp; Info Trotoar Surabaya
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
            aria-label="Tutup asisten AI"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        {/* NOTIFIKASI ERROR MIKROFON (BILA ADA) */}
        {micError && (
          <div className="px-6 py-2.5 bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-base" aria-hidden="true">info</span>
            <span>{micError}</span>
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
                  <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <span className="material-symbols-outlined text-base" aria-hidden="true">auto_awesome</span>
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
                          
                          {/* Tombol Buka Rute: Mengarahkan ke Dashboard Utama dengan navigasi langkah */}
                          <button
                            type="button"
                            onClick={() => {
                              stopSpeaking();
                              if (m.card.targetRouteKey && typeof window !== 'undefined') {
                                window.__leluasaDashboardDestination = m.card.targetRouteKey;
                                window.dispatchEvent(new CustomEvent('leluasa:dashboard-route', { detail: { destId: m.card.targetRouteKey } }));
                              }
                              if (onNavigateTab) onNavigateTab('home');
                              onClose();
                            }}
                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                          >
                            <span>Buka di Dashboard</span>
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

        {/* INPUT BAR (TEKS + MIKROFON + KIRIM) */}
        <div className="p-4 sm:p-5 bg-surface-container-lowest border-t border-surface-container flex items-center gap-3 shrink-0">
          {/* Microphone button */}
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? 'Sedang merekam suara, klik untuk berhenti' : 'Bicara menggunakan mikrofon'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isListening
                ? 'bg-error text-white ring-4 ring-error/30 animate-pulse'
                : 'bg-surface-container hover:bg-surface-container-high text-primary'
            }`}
            title={isListening ? 'Sedang Mendengarkan... Klik untuk Selesai' : 'Klik untuk Bicara via Mikrofon'}
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              {isListening ? 'mic' : 'mic_none'}
            </span>
          </button>

          {/* Kolom ketik teks */}
          <input
            type="text"
            placeholder={isListening ? 'Sedang mendengarkan ucapan Anda...' : 'Tanya rute aksesibel, ubin pemandu, atau kondisi trotoar Surabaya...'}
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