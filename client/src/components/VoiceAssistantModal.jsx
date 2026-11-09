import React, { useState, useEffect, useRef } from 'react';

export default function VoiceAssistantModal({ isOpen, onClose, onNavigateTab }) {
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(
    'Halo Dian! Asisten Suara Leluasa siap membantu. Mau saya pandu ke mana perjalanan Anda di Surabaya hari ini?'
  );
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

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
          setMicError('Izin mikrofon ditolak. Anda dapat menggunakan input teks di bawah.');
        } else {
          setMicError('Tidak dapat menangkap suara. Silakan coba lagi atau ketik di bawah.');
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

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
      setMicError('Pengenalan suara tidak didukung browser ini. Silakan gunakan ketik teks.');
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

    if (lower.includes('route') || lower.includes('rute') || lower.includes('rsud') || lower.includes('soetomo') || lower.includes('jalan')) {
      reply = 'Menghitung rute kursi roda terbaik menuju RSUD Dr. Soetomo menghindari galian Jl. Pemuda. Koridor aman siap di halaman Rute.';
      targetTab = 'plan-route';
    } else if (lower.includes('report') || lower.includes('obstacle') || lower.includes('lapor') || lower.includes('bahaya') || lower.includes('rintangan')) {
      reply = 'Membuka formulir Lapor Rintangan dengan deteksi computer vision dan koordinat GPS aktif.';
      targetTab = 'report-obstacle';
    } else if (lower.includes('map') || lower.includes('peta') || lower.includes('explore') || lower.includes('sekeliling')) {
      reply = 'Menampilkan peta aksesibilitas trotoar interaktif Surabaya dan lokasi rintangan terkini.';
      targetTab = 'explore-map';
    } else if (lower.includes('weather') || lower.includes('hujan') || lower.includes('rain') || lower.includes('cuaca')) {
      reply = 'Hujan diperkirakan turun dalam 35 menit di Surabaya Pusat. Ubin trotoar Jl. Basuki Rahmat berpotensi licin. Dianjurkan lewat koridor berkanopi.';
      targetTab = 'weather-intelligence';
    } else {
      reply = `Perintah didengar: "${cmdText}". Menavigasi rute dengan rampa landai dan bebas hambatan.`;
    }

    setAiResponse(reply);
    handleSpeak(reply);

    if (targetTab && onNavigateTab) {
      setTimeout(() => {
        onNavigateTab(targetTab);
      }, 1800);
    }
  };

  const quickPrompts = [
    'Rute aman ke RSUD Dr. Soetomo',
    'Lapor rintangan trotoar',
    'Cek cuaca & ubin licin',
    'Lihat peta trotoar Surabaya'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-primary/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-2xl p-4 sm:p-space-lg flex flex-col items-center gap-space-sm sm:gap-space-md text-center border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            handleStopSpeaking();
            stopListening();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          aria-label="Tutup asisten suara"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Pulsing Mic Button */}
        <div className="relative mt-2">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`w-20 sm:w-24 h-20 sm:h-24 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-error text-on-error animate-pulse shadow-[0_0_35px_rgba(186,26,26,0.5)] scale-105'
                : 'bg-secondary-container text-secondary hover:bg-secondary hover:text-on-secondary shadow-md'
            }`}
            aria-label={isListening ? 'Hentikan rekaman suara' : 'Mulai input mikrofon'}
          >
            <span className="material-symbols-outlined text-3xl sm:text-4xl">
              {isListening ? 'mic' : 'mic_none'}
            </span>
          </button>
          {isListening && (
            <div className="absolute inset-0 rounded-full border-4 border-error animate-ping pointer-events-none opacity-40"></div>
          )}
        </div>

        {/* Status text */}
        <div className="flex flex-col gap-0.5 max-w-sm">
          <span className="font-label-sm text-[10px] sm:text-xs uppercase tracking-wider text-secondary font-bold">
            {isListening ? 'Mendengarkan suara...' : isSpeaking ? 'Membacakan instruksi...' : 'Navigasi Suara Leluasa'}
          </span>
          <h3 className="font-headline-sm text-sm sm:text-base font-bold text-primary truncate max-w-xs mx-auto">
            {transcript ? `"${transcript}"` : 'Ketuk mikrofon atau sebutkan tujuan'}
          </h3>
          <p className="font-body-sm text-[11px] sm:text-xs text-on-surface-variant mt-0.5 leading-relaxed bg-surface-container-low p-2.5 rounded-xl">
            {aiResponse}
          </p>
        </div>

        {/* Audio Speech Controls (Repeat / Mute) */}
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <button
              onClick={handleStopSpeaking}
              className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-[11px] font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">volume_off</span>
              <span>Hentikan Suara</span>
            </button>
          ) : (
            <button
              onClick={() => handleSpeak(aiResponse)}
              className="px-2.5 py-1 rounded-full bg-surface-container text-secondary text-[11px] font-semibold flex items-center gap-1 hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-xs">volume_up</span>
              <span>Bacakan Bersuara</span>
            </button>
          )}
        </div>

        {/* Microphone Error Note */}
        {micError && (
          <div className="p-2 rounded-lg bg-error-container text-on-error-container text-[10px] font-medium max-w-xs">
            {micError}
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="w-full flex flex-col gap-1.5 pt-1 border-t border-outline-variant/20">
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold text-left">
            Coba katakan:
          </span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => executeCommand(q)}
                className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-secondary-container hover:text-on-secondary-container text-on-surface font-label-sm text-[11px] transition-colors flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-xs text-secondary">mic</span>
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accessible Text Alternative Input */}
        <div className="w-full flex items-center gap-1.5 mt-1">
          <input
            type="text"
            placeholder="Ketik perintah suara di sini..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeCommand(transcript)}
            className="flex-1 h-10 px-3 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button
            onClick={() => executeCommand(transcript || 'Rute aman ke RSUD Soetomo')}
            className="h-10 px-3.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition-colors shadow-xs"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
