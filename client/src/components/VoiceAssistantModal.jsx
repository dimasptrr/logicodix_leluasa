import React, { useState, useEffect, useRef } from 'react';

export default function VoiceAssistantModal({ isOpen, onClose, onNavigateTab }) {
  const [activeMode, setActiveMode] = useState('sensory'); // 'sensory' (Panduan Suara & Haptik) atau 'chat' (Tanya AI Rute)
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(
    'Lurus 30 meter di atas ubin pemandu. Trotoar terverifikasi bebas rintangan menuju Balai Pemuda.'
  );
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 3 Toggles Sensorik Cepat
  const [toggles, setToggles] = useState({
    detailedVoice: true,
    hapticGuidance: true,
    obstacleRadar: true
  });

  // Chatbot Messages History
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Halo! Saya asisten Leluasa. Mau cari rute bebas hambatan atau cek trotoar dengan ubin pemandu hari ini?',
      card: null
    },
    {
      sender: 'user',
      text: '“Cari jalan teraman ke RSUD Dr. Soetomo yang ada ubin pemandunya.”',
      card: null
    },
    {
      sender: 'ai',
      text: 'Ditemukan rute via Jl. Kusuma Bangsa: trotoar lebar 2.2m, 100% ubin pemandu utuh, tanpa tangga penyeberangan.',
      card: {
        title: 'Jalur Ubin Pemandu',
        badge: 'Kuning Utuh',
        subtitle: 'Jl. Kusuma Bangsa • 7 mnt (420m)',
        tags: ['Bebas Halangan', 'Trotoar Rata 2.2m'],
        targetTab: 'plan-route'
      }
    }
  ]);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      setMicSupported(true);
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'id-ID';

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        executeCommand(text);
      };

      rec.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError('Izin mikrofon ditolak. Anda dapat mengetik di bawah.');
        } else {
          setMicError('Suara tidak terdengar jelas. Silakan ulangi.');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleStopSpeaking();
        stopListening();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = () => {
    setMicError('');
    if (recognitionRef.current) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (err) {
        setIsListening(false);
      }
    } else {
      setMicError('Pengenalan suara tidak didukung browser ini. Gunakan ketik teks.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const executeCommand = (cmdText) => {
    if (!cmdText.trim()) return;
    setTranscript(cmdText);

    const lower = cmdText.toLowerCase();
    let reply = '';
    let targetTab = null;
    let cardData = null;

    if (lower.includes('route') || lower.includes('rute') || lower.includes('soetomo') || lower.includes('jalan')) {
      reply = 'Menghitung rute ubin pemandu terbaik ke RSUD Dr. Soetomo bebas galian. Rute telah disiapkan.';
      targetTab = 'plan-route';
      cardData = {
        title: 'Jalur Ubin Pemandu (Guiding Block)',
        badge: '100% Utuh',
        subtitle: 'Jl. Kusuma Bangsa • 7 mnt (420m)',
        tags: ['Bebas Halangan', 'Trotoar Rata 2.2m'],
        targetTab: 'plan-route'
      };
    } else if (lower.includes('lapor') || lower.includes('hambatan') || lower.includes('rusak') || lower.includes('foto')) {
      reply = 'Membuka formulir pelaporan rintangan trotoar terverifikasi AI.';
      targetTab = 'report-obstacle';
    } else if (lower.includes('cuaca') || lower.includes('hujan') || lower.includes('licin')) {
      reply = 'Cuaca Surabaya cerah berawan 31 derajat Celsius. Ubin kering dan aman dilintasi.';
      targetTab = 'weather-intelligence';
    } else {
      reply = `Mencari titik ramah akses untuk "${cmdText}" di jaringan trotoar Surabaya.`;
      targetTab = 'explore-map';
    }

    setAiResponse(reply);
    handleSpeak(reply);

    // Tambahkan ke riwayat chat
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: `“${cmdText}”`, card: null },
      { sender: 'ai', text: reply, card: cardData }
    ]);

    if (targetTab && onNavigateTab) {
      setTimeout(() => {
        onNavigateTab(targetTab);
      }, 2500);
    }
  };

  const quickPrompts = [
    'Jalur Pelikan Suara?',
    'Cek Titik Rusak',
    'Cek Ubin Kuning'
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-assistant-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-primary/60 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-[420px] max-h-[92vh] bg-surface-container-lowest rounded-[32px] shadow-2xl p-4 sm:p-6 flex flex-col justify-between border-2 border-outline-variant/30 overflow-y-auto">
        
        {/* TOP BAR & MODE TOGGLE */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-xl">accessible_forward</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary">Asisten Aksesibilitas</span>
              <h2 id="voice-assistant-heading" className="text-base font-extrabold tracking-tight text-on-surface">Leluasa Voice</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Switcher */}
            <div className="flex items-center bg-surface-container p-1 rounded-full text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveMode('sensory')}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeMode === 'sensory' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                }`}
              >
                Sensorik
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('chat')}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeMode === 'chat' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                }`}
              >
                Tanya AI
              </button>
            </div>

            <button
              onClick={() => {
                handleStopSpeaking();
                stopListening();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors ml-1"
              aria-label="Tutup asisten suara"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAMPILAN 1: PANDUAN SUARA SENSORIK (stitch_leluasa)           */}
        {/* ============================================================== */}
        {activeMode === 'sensory' && (
          <div className="flex-1 flex flex-col items-center justify-between py-3 gap-3">
            {/* Subtle Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container-high text-primary border border-primary/20 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-label-md font-bold text-xs">Sensor Spasial Terhubung</span>
            </div>

            {/* Radial Sonar & Sensory Sphere Visualizer */}
            <div className="relative w-full aspect-square max-w-[220px] sm:max-w-[240px] my-2 flex items-center justify-center">
              {/* Outer Soundwave Pulse Rings */}
              <div className="wave-ring-1 absolute inset-0 rounded-full border-2 border-primary/40 pointer-events-none"></div>
              <div className="wave-ring-2 absolute inset-0 rounded-full border-2 border-primary/30 pointer-events-none"></div>
              <div className="wave-ring-3 absolute inset-0 rounded-full border-2 border-primary-container/20 pointer-events-none"></div>

              {/* Central Sensory Tactile Sphere */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? 'Hentikan rekaman' : 'Mulai bicara'}
                className={`sensory-sphere w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center text-on-primary cursor-pointer active:scale-95 transition-transform duration-200 shadow-xl relative z-10 ${
                  isListening ? 'ring-4 ring-primary animate-pulse' : ''
                }`}
              >
                <span className="material-symbols-outlined text-4xl text-white drop-shadow-md">
                  {isListening ? 'mic' : 'graphic_eq'}
                </span>
                <span className="text-[11px] mt-0.5 tracking-wide text-white/90 font-bold">120 Hz</span>
              </button>
            </div>

            {/* Real-time Voice Readout */}
            <div className="w-full text-center px-2" role="status" aria-live="polite">
              <p className="font-headline-sm text-sm sm:text-base text-on-surface font-extrabold tracking-tight leading-snug">
                “{aiResponse}”
              </p>
              <div className="inline-flex items-center gap-1.5 text-on-surface-variant text-[11px] font-semibold mt-1">
                <span className="material-symbols-outlined text-base text-secondary">check_circle</span>
                <span>Jalur trotoar terverifikasi bebas rintangan</span>
              </div>
            </div>

            {/* 3 Large High-Contrast Tactile Toggles (stitch_leluasa) */}
            <div className="w-full space-y-2 pt-1" role="region" aria-label="Pengaturan Sensorik Cepat">
              {/* 1. Suara Detail */}
              <button
                type="button"
                onClick={() => setToggles(p => ({ ...p, detailedVoice: !p.detailedVoice }))}
                className="w-full min-h-[48px] bg-surface-container-low rounded-full px-4 py-2 flex items-center justify-between border-2 border-outline-variant/30 hover:border-primary active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-primary">record_voice_over</span>
                  <span className="text-xs font-bold text-on-surface">Suara Detail</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${toggles.detailedVoice ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                  {toggles.detailedVoice ? 'Aktif' : 'Nonaktif'}
                </span>
              </button>

              {/* 2. Getaran Taktil */}
              <button
                type="button"
                onClick={() => setToggles(p => ({ ...p, hapticGuidance: !p.hapticGuidance }))}
                className="w-full min-h-[48px] bg-surface-container-low rounded-full px-4 py-2 flex items-center justify-between border-2 border-outline-variant/30 hover:border-primary active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-primary">vibration</span>
                  <span className="text-xs font-bold text-on-surface">Getaran Taktil</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${toggles.hapticGuidance ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                  {toggles.hapticGuidance ? 'Aktif' : 'Nonaktif'}
                </span>
              </button>

              {/* 3. Deteksi Halangan AI */}
              <button
                type="button"
                onClick={() => setToggles(p => ({ ...p, obstacleRadar: !p.obstacleRadar }))}
                className="w-full min-h-[48px] bg-surface-container-low rounded-full px-4 py-2 flex items-center justify-between border-2 border-outline-variant/30 hover:border-primary active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-primary">radar</span>
                  <span className="text-xs font-bold text-on-surface">Deteksi Halangan AI</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${toggles.obstacleRadar ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                  {toggles.obstacleRadar ? 'Aktif' : 'Nonaktif'}
                </span>
              </button>
            </div>

            {/* Massive Action Button: Bicara Sekarang */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className="w-full min-h-[52px] bg-primary text-on-primary rounded-full px-6 py-3 flex items-center justify-center gap-2.5 font-bold text-sm shadow-lg hover:bg-primary-container active:scale-95 transition-all mt-1"
            >
              <span className="material-symbols-outlined text-2xl">mic</span>
              <span>{isListening ? 'Mendengarkan...' : 'Bicara Sekarang'}</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAMPILAN 2: TANYA AI RUTE CHATBOT (stitch_leluasa)             */}
        {/* ============================================================== */}
        {activeMode === 'chat' && (
          <div className="flex-1 flex flex-col justify-between py-2 gap-3 min-h-[380px]">
            {/* Chat Messages Flow */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[320px] no-scrollbar">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}`}>
                  {m.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-primary text-tertiary-fixed flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-xs shadow-md font-bold'
                      : 'bg-surface-container-low text-on-surface border border-outline-variant/30 shadow-xs'
                  }`}>
                    <p>{m.text}</p>

                    {/* Interactive Route Card in Chat */}
                    {m.card && (
                      <div className="mt-2.5 bg-surface-container-lowest border-2 border-warning rounded-xl p-3 shadow-xs space-y-2 text-on-surface">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-warning text-on-warning flex items-center justify-center font-bold">
                              <span className="material-symbols-outlined text-base">texture</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-[11px] font-extrabold text-on-surface">{m.card.title}</p>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-warning-container text-on-warning-container">
                                  {m.card.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-on-surface-variant font-medium">{m.card.subtitle}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateTab(m.card.targetTab);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-extrabold shadow-xs active:scale-95"
                          >
                            Buka
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-outline-variant/20 text-[10px] font-bold">
                          {m.card.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 rounded-md bg-secondary-container text-secondary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">verified</span>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-[11px] font-bold">
              {quickPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => executeCommand(prompt)}
                  className="px-3 py-1.5 rounded-full bg-surface-container text-primary hover:bg-primary hover:text-white transition-all whitespace-nowrap border border-outline-variant/30 active:scale-95 shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-outline-variant/20">
              <input
                type="text"
                placeholder="Ketik pertanyaan rute trotoar..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeCommand(transcript)}
                className="flex-1 h-11 px-3.5 rounded-full bg-surface-container-low text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30"
              />
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  isListening ? 'bg-error text-white animate-pulse' : 'bg-primary text-white hover:bg-primary-container'
                }`}
                aria-label="Input suara"
              >
                <span className="material-symbols-outlined text-xl">
                  {isListening ? 'mic' : 'mic_none'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
