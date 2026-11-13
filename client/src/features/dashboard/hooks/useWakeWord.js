import { useState, useEffect, useRef, useCallback } from 'react';

// Suara Chime Elegan (Web Audio API) saat "Hai LUMI" terdeteksi
export function playWakeChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Nada 1: D5 (587 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.20, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Nada 2: A5 (880 Hz) yang ceria & ramah
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Abaikan jika audio context diblokir browser
  }
}

/**
 * Normalisasi dan pencocokan fonetik untuk Wake Word ("Hai LUMI")
 * Menangani variasi dialek dan hasil transkripsi Google Speech API bahasa Indonesia.
 */
export function matchWakeWord(rawText) {
  if (!rawText) return false;

  // Bersihkan tanda baca dan rapikan spasi
  const clean = rawText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalisasi variasi kata yang terpisah: 'lu mi' -> 'lumi', 'lo mi' -> 'lomi'
  const normalized = clean
    .replace(/\blu\s+mi\b/g, 'lumi')
    .replace(/\blo\s+mi\b/g, 'lomi')
    .replace(/\blu\s+mye\b/g, 'lumi');

  // Daftar pola kata kunci lengkap dengan variasi fonetik
  const wakePatterns = [
    'hai lumi', 'halo lumi', 'hey lumi', 'hei lumi', 'oke lumi', 'ok lumi', 'hi lumi', 'buka lumi', 'panggil lumi',
    'hai lomi', 'halo lomi', 'hey lomi', 'hei lomi', 'oke lomi', 'ok lomi', 'hi lomi', 'buka lomi',
    'hai loomi', 'halo loomi', 'hey loomi',
    'hai umi', 'halo umi', 'hey umi', // Toleransi Google Speech yang sering melewatkan huruf 'L' di awal kata
    'hai romi', 'halo romi',
    'hai roumi', 'halo roumi',
    'asisten lumi', 'bantu lumi'
  ];

  if (wakePatterns.some((pattern) => normalized.includes(pattern))) {
    return true;
  }

  // Jika pengguna hanya menyebut satu kata 'lumi' atau 'lomi'
  if (normalized === 'lumi' || normalized === 'lomi') {
    return true;
  }

  // Jika ucapan diakhiri kata 'lumi' atau 'lomi'
  if (normalized.endsWith(' lumi') || normalized.endsWith(' lomi')) {
    return true;
  }

  return false;
}

/**
 * Hook Pendeteksi Kata Pemicu (Wake Word: "Hai LUMI" / "Halo LUMI")
 * Dilengkapi pengecekan izin mikrofon (permission status) & auto-restart anti-crash di Chrome.
 */
export default function useWakeWord({
  onWakeWordDetected,
  isModalOpen = false
}) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('leluasa_wake_word_enabled') !== 'false';
    } catch (_) {
      return true;
    }
  });

  const [isListening, setIsListening] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [wakeWordSupported, setWakeWordSupported] = useState(true);
  const [lastDetectedPhrase, setLastDetectedPhrase] = useState('');

  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const isStoppingIntentionallyRef = useRef(false);

  // Gunakan ref untuk state agar terhindar dari stale closure saat callback browser berjalan
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  onWakeWordDetectedRef.current = onWakeWordDetected;

  // Ref untuk fungsi startListening agar bisa dipanggil rekursif oleh onend tanpa dependensi sirkular
  const startListeningRef = useRef(null);

  // 1. Cek status izin mikrofon saat awal mount menggunakan Permissions API jika tersedia
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setWakeWordSupported(false);
      setPermissionStatus('unsupported');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' })
        .then((perm) => {
          setPermissionStatus(perm.state);
          perm.onchange = () => {
            setPermissionStatus(perm.state);
            if (perm.state === 'granted') {
              startListeningRef.current?.();
            } else if (perm.state === 'denied') {
              setIsListening(false);
            }
          };
        })
        .catch(() => {
          // Beberapa browser tidak mendukung query 'microphone'
        });
    }
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('leluasa_wake_word_enabled', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // 2. Fungsi inisiasi dan pendengaran suara yang kuat
  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setWakeWordSupported(false);
      return;
    }

    if (!enabledRef.current || isModalOpenRef.current) {
      return;
    }

    try {
      // Hentikan instance sebelumnya jika ada
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }

      // Selalu buat instance BARU agar terhindar dari bug 'recognition has already started' di Chrome
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'id-ID';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setPermissionStatus('granted');
      };

      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (matchWakeWord(transcript)) {
            setLastDetectedPhrase(transcript);

            // 1. Hentikan recognizer wake word agar mic langsung bebas digunakan oleh modal AI
            isStoppingIntentionallyRef.current = true;
            try {
              rec.abort();
            } catch (_) {}
            setIsListening(false);

            // 2. Bunyikan nada lonceng aktivasi "Ting!"
            playWakeChime();

            // 3. Getaran taktil pada ponsel/perangkat
            if ('vibrate' in navigator) {
              navigator.vibrate([120, 60, 120]);
            }

            // 4. Buka modal asisten suara secara otomatis
            if (onWakeWordDetectedRef.current) {
              onWakeWordDetectedRef.current(transcript);
            }
            return;
          }
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
          setPermissionStatus('denied');
          return;
        }
        if (event.error === 'no-speech') {
          // Event wajar saat ruangan hening, onend akan menangani restart
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Otomatis restart jika Chrome memutus koneksi karena hening (silence timeout)
        if (
          enabledRef.current &&
          !isModalOpenRef.current &&
          !isStoppingIntentionallyRef.current
        ) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (enabledRef.current && !isModalOpenRef.current) {
              // Panggil instance baru lewat ref
              startListeningRef.current?.();
            }
          }, 350);
        }
      };

      recognitionRef.current = rec;
      isStoppingIntentionallyRef.current = false;
      rec.start();
    } catch (err) {
      console.warn('[useWakeWord] Gagal memulai pengenalan suara wake word:', err);
      setIsListening(false);
    }
  }, []);

  startListeningRef.current = startListening;

  // 3. Fungsi mematikan pendengar suara
  const stopListening = useCallback(() => {
    isStoppingIntentionallyRef.current = true;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // 4. Fungsi eksplisit untuk meminta izin mic (User Gesture trigger)
  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      // Membuka dialog izin mikrofon resmi browser
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus('granted');
      // Segera aktifkan pendengar suara
      startListening();
      return true;
    } catch (err) {
      console.warn('[useWakeWord] Permintaan izin mikrofon ditolak:', err);
      setPermissionStatus('denied');
      return false;
    }
  }, [startListening]);

  // Efek pengaktifan berdasarkan state enabled dan status modal
  useEffect(() => {
    isStoppingIntentionallyRef.current = false;
    if (enabled && !isModalOpen) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, isModalOpen, startListening, stopListening]);

  return {
    enabled,
    toggleEnabled,
    isListening,
    permissionStatus,
    requestPermission,
    wakeWordSupported,
    lastDetectedPhrase
  };
}
