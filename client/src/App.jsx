import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExploreMap from './pages/ExploreMap.jsx';
import PlanRoute from './pages/PlanRoute.jsx';
import ReportObstacle from './pages/ReportObstacle.jsx';
import ReportsImpact from './pages/ReportsImpact.jsx';
import WeatherIntelligence from './pages/WeatherIntelligence.jsx';
import Profile from './pages/Profile.jsx';
import AccessibilityModal from './components/AccessibilityModal.jsx';
import VoiceAssistantModal from './components/VoiceAssistantModal.jsx';
import useWakeWord from './features/dashboard/hooks/useWakeWord.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [historyStack, setHistoryStack] = useState(['home']);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [autoStartListening, setAutoStartListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState('');

  // Voice Wake Word ("Hai LUMI" / "Halo LUMI") di latar belakang
  const {
    enabled: wakeWordEnabled,
    toggleEnabled: toggleWakeWord,
    isListening: isWakeWordListening,
    permissionStatus: wakeWordPermissionStatus,
    requestPermission: requestWakeWordPermission
  } = useWakeWord({
    isModalOpen: voiceOpen,
    onWakeWordDetected: () => {
      setAutoStartListening(true);
      setVoiceOpen(true);
    }
  });

  const handleMicPermissionDenied = () => {
    setNotificationToast(
      'Izin mikrofon belum aktif atau terblokir di browser. Klik ikon gembok di sebelah kiri alamat web (URL), ubah Mikrofon menjadi "Izinkan", lalu refresh halaman.'
    );
    setTimeout(() => setNotificationToast(''), 9000);
  };

  const [preferences, setPreferences] = useState({
    profile: 'electric',
    highContrast: false,
    audioWayfinding: true,
    largeTouchTargets: false
  });

  // Navigasi dengan pencatatan riwayat (history stack)
  const handleSetActiveTab = (tab) => {
    if (tab === 'voice-assistant') {
      setVoiceOpen(true);
      return;
    }
    if (tab === activeTab) return;

    setHistoryStack((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setActiveTab(tab);

    try {
      window.history.pushState({ tab }, '', window.location.pathname);
    } catch (e) {
      // ignore
    }
  };

  // Logika Tombol Back (Kembali ke halaman sebelumnya yang sudah dipencet)
  const handleGoBack = () => {
    if (historyStack.length > 1) {
      setHistoryStack((prev) => {
        const next = [...prev];
        next.pop(); // buang halaman aktif saat ini
        const prevTab = next[next.length - 1];
        setActiveTab(prevTab);
        return next;
      });
    } else if (activeTab !== 'home') {
      setActiveTab('home');
      setHistoryStack(['home']);
    }
  };

  const canGoBack = historyStack.length > 1 || activeTab !== 'home';
  const previousTab = historyStack.length > 1
    ? historyStack[historyStack.length - 2]
    : (activeTab !== 'home' ? 'home' : null);

  // Dengarkan custom event navigasi global
  useEffect(() => {
    const handleNavEvent = (e) => {
      if (e.detail?.tab) {
        handleSetActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('leluasa:navigate', handleNavEvent);
    return () => window.removeEventListener('leluasa:navigate', handleNavEvent);
  }, [activeTab]);

  // Dukungan tombol Back browser (popstate)
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state?.tab) {
        const targetTab = e.state.tab;
        setActiveTab(targetTab);
        setHistoryStack((prev) => {
          const idx = prev.lastIndexOf(targetTab);
          if (idx !== -1) {
            return prev.slice(0, idx + 1);
          }
          return [...prev, targetTab];
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global 'V' shortcut for voice command modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v' || e.key === 'V') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
        e.preventDefault();
        setVoiceOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (query) => {
    if (query) {
      handleSetActiveTab('plan-route');
    }
  };

  const handleOpenNotifications = () => {
    setNotificationToast('2 Pemberitahuan: Potensi hujan 35 menit lagi di Jl. Basuki Rahmat; DPUPR selesai memperbaiki rampa trotoar di Balai Kota.');
    setTimeout(() => setNotificationToast(''), 5000);
  };

  return (
    <div className={`min-h-screen bg-surface overflow-x-hidden ${preferences.highContrast ? 'contrast-125 saturate-110' : ''} ${preferences.largeTouchTargets ? 'text-[1.05rem]' : ''}`}>
      {/* Desktop & Mobile Drawer Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onToggleAccessibility={() => setAccessibilityOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Layout Area (pl-0 on mobile, pl-80 on desktop jika bukan plan-route) */}
      <div className={`pl-0 ${activeTab === 'plan-route' ? '' : 'lg:pl-80'} pb-20 lg:pb-0 min-h-screen flex flex-col w-full`}>
        {/* Top Responsive Header (Dihilangkan saat di halaman rute & perbandingan agar fokus ke navigasi) */}
        {activeTab !== 'plan-route' && (
          <Header
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            onOpenVoice={() => setVoiceOpen(true)}
            onOpenAccessibility={() => setAccessibilityOpen(true)}
            onOpenNotifications={handleOpenNotifications}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onNavigateHome={() => handleSetActiveTab('home')}
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            canGoBack={canGoBack}
            onGoBack={handleGoBack}
            previousTab={previousTab}
            wakeWordEnabled={wakeWordEnabled}
            toggleWakeWord={toggleWakeWord}
            isWakeWordListening={isWakeWordListening}
            wakeWordPermissionStatus={wakeWordPermissionStatus}
            requestWakeWordPermission={requestWakeWordPermission}
            onMicPermissionDenied={handleMicPermissionDenied}
          />
        )}

        {/* Global Notification Banner */}
        {notificationToast && (
          <div className="fixed top-18 sm:top-24 right-3 sm:right-8 z-50 max-w-sm sm:max-w-md p-3.5 sm:p-4 rounded-2xl bg-primary text-on-primary shadow-2xl border border-secondary/30 flex items-start gap-2.5 sm:gap-3 animate-fadeIn">
            <span className="material-symbols-outlined text-secondary-container text-lg sm:text-xl mt-0.5">info</span>
            <div className="flex flex-col text-xs">
              <span className="font-bold text-secondary-container">Pemberitahuan Sistem</span>
              <p className="mt-0.5 text-on-primary/90">{notificationToast}</p>
            </div>
            <button
              onClick={() => setNotificationToast('')}
              className="ml-auto text-on-primary/70 hover:text-on-primary"
              aria-label="Tutup pemberitahuan"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Content Workspace (pt-0 pada plan-route, pt-16/pt-20 pada halaman lain dengan Header) */}
        <main className={`relative ${activeTab === 'plan-route' ? 'pt-0 min-h-screen' : 'pt-16 sm:pt-20 min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)]'} bg-surface w-full flex-1`}>
          {activeTab === 'home' && (
            <Dashboard
              setActiveTab={handleSetActiveTab}
              onOpenVoice={() => setVoiceOpen(true)}
            />
          )}

          {activeTab === 'explore-map' && (
            <ExploreMap
              setActiveTab={handleSetActiveTab}
            />
          )}

          {activeTab === 'plan-route' && (
            <PlanRoute
              setActiveTab={handleSetActiveTab}
            />
          )}

          {activeTab === 'report-obstacle' && (
            <ReportObstacle
              setActiveTab={handleSetActiveTab}
            />
          )}

          {activeTab === 'reports-impact' && (
            <ReportsImpact
              setActiveTab={handleSetActiveTab}
            />
          )}

          {activeTab === 'weather-intelligence' && (
            <WeatherIntelligence
              setActiveTab={handleSetActiveTab}
            />
          )}

          {activeTab === 'profile' && (
            <Profile
              setActiveTab={handleSetActiveTab}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Visible on screens < lg) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
      />

      {/* Modals */}
      <AccessibilityModal
        isOpen={accessibilityOpen}
        onClose={() => setAccessibilityOpen(false)}
        preferences={preferences}
        setPreferences={setPreferences}
      />

      <VoiceAssistantModal
        isOpen={voiceOpen}
        autoStartListening={autoStartListening}
        onClose={() => {
          setVoiceOpen(false);
          setAutoStartListening(false);
        }}
        onNavigateTab={(tab) => {
          handleSetActiveTab(tab);
          setVoiceOpen(false);
          setAutoStartListening(false);
        }}
      />
    </div>
  );
}
