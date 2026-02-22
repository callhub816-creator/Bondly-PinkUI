// TRIGGER DEPLOY: SYNCING UI TO DOMAIN (BONDLY.ONLINE) - FEB 4, 2026

import React, { useState, useRef, useEffect } from 'react';

import CardGallery from './components/CardGallery';
import PersonaGallery from './components/PersonaGallery';
import LiveVoiceCall from './components/LiveVoiceCall';
import ChatScreen from './components/ChatScreen';
import PersonaProfileModal from './components/PersonaProfileModal';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import FAQPage from './components/FAQPage';
import SafetyPage from './components/SafetyPage';
import RefundPage from './components/RefundPage';
import AdminPage from './components/AdminPage';
import GuestChat from './GuestChat';
import ErrorBoundary from './components/ErrorBoundary';
import PersonaCreationModal from './components/PersonaCreationModal';
import ShopModal from './components/ShopModal';
import ProfileModal from './components/ProfileModal';
import { Sparkles, Heart, Phone, Lock, Trash2, MessageCircle, Shield, User, Gift } from 'lucide-react';
import { ModeCardData, Persona } from './types';
import { PERSONAS, MODE_CARDS } from './constants';
import { storage } from './utils/storage';

const DailyBonusNudge: React.FC = () => {
  const { profile, claimDailyBonus } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!profile.lastDailyBonusClaim) {
      setIsVisible(true);
      return;
    }
    const lastClaim = new Date(profile.lastDailyBonusClaim).getTime();
    const now = Date.now();
    if (now - lastClaim >= 24 * 60 * 60 * 1000) {
      setIsVisible(true);
    }
  }, [profile?.lastDailyBonusClaim]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white/80 backdrop-blur-xl border-2 border-pink-200 p-4 rounded-[28px] shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl shadow-lg animate-bounce">
            <Gift className="text-white" size={20} />
          </div>
          <div>
            <h4 className="text-[14px] font-black text-pink-600">Daily Lucky Box! 🎁</h4>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Get 1-10 Hearts free</p>
          </div>
        </div>
        <button
          onClick={async () => {
            const success = await claimDailyBonus();
            if (success) setIsVisible(false);
          }}
          className="px-5 py-2.5 bg-pink-500 text-white text-[12px] font-black rounded-xl shadow-lg active:scale-90 transition-all"
        >
          CLAIM
        </button>
      </div>
    </div>
  );
};

interface ChatSession {
  persona: Persona;
  avatarUrl?: string;
}

import { NotificationProvider, useNotification } from './components/NotificationProvider';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import WalletWidget from './components/WalletWidget';
import AuthScreen from './src/components/AuthScreen';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const { showNotification } = useNotification();
  // Automatic Midnight Mode Logic - DISABLED (Always Light Mode globally)
  // ChatScreen handles its own dark theme.
  const checkIsNight = () => {
    return false;
  };

  const [isDarkMode, setIsDarkMode] = useState(checkIsNight());
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'privacy' | 'terms' | 'faq' | 'safety' | 'refund' | 'admin' | 'guest-chat' | 'auth'>('home');
  const { user, profile, loading } = useAuth();
  const galleryRef = useRef<HTMLDivElement>(null);
  const vibeRef = useRef<HTMLDivElement>(null);

  const [activeCallPersona, setActiveCallPersona] = useState<Persona | null>(null);
  const [activeCallAvatarUrl, setActiveCallAvatarUrl] = useState<string | undefined>(undefined);
  const [activeChatSession, setActiveChatSession] = useState<ChatSession | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{ persona: Persona, avatarUrl?: string } | null>(null);
  const [selectedCreationMode, setSelectedCreationMode] = useState<ModeCardData | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Sync with URL for /login and /signup
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/login' || path === '/signup') {
      setCurrentPage('auth');
    }
  }, []);
  // Auto-update theme every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const isNight = checkIsNight();
      if (isNight !== isDarkMode) {
        setIsDarkMode(isNight);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isDarkMode]);

  useEffect(() => {
    if (!loading) {
      storage.incrementSessionsCount();
    }

    // Welcome back notification
    const rawUserInfo = localStorage.getItem('bondly_user_info');
    if (rawUserInfo) {
      const userInfo = JSON.parse(rawUserInfo);
      setTimeout(() => {
        showNotification(`Welcome back, ${userInfo.name}! Your companions missed you. ✨`, 'success');
      }, 2000);
    }
  }, [showNotification]);

  const scrollToGallery = () => galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToVibe = () => vibeRef.current?.scrollIntoView({ behavior: 'smooth' });

  const [systemPersonas, setSystemPersonas] = useState<Persona[]>(
    Array.isArray(PERSONAS) ? PERSONAS.filter(p => !p?.launchHidden) : []
  );
  const handleUpdatePersonaImage = (id: string | number, imageUrl: string | undefined) => {
    setSystemPersonas(prev => prev.map(p =>
      p.id === id ? { ...p, avatarUrl: imageUrl } : p
    ));
  };

  // Hero Scaling Logic
  useEffect(() => {
    if (currentPage !== 'home') return;
    const ensureHeroFits = () => {
      const card = document.getElementById('hero-card');
      if (!card) return;
      const vh = window.innerHeight;
      const maxH = vh - 80;
      if (card.scrollHeight > maxH) {
        const scale = maxH / card.scrollHeight;
        card.style.transformOrigin = 'center center';
        card.style.transform = `scale(${Math.max(0.80, scale)})`;
      } else {
        card.style.transform = 'none';
      }
    };
    window.addEventListener('resize', ensureHeroFits);
    window.addEventListener('orientationchange', ensureHeroFits);
    ensureHeroFits();
    const timeout = setTimeout(ensureHeroFits, 300);
    return () => {
      window.removeEventListener('resize', ensureHeroFits);
      window.removeEventListener('orientationchange', ensureHeroFits);
      clearTimeout(timeout);
    };
  }, [currentPage]);

  // Deep Linking for SEO/GSC
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const personaName = params.get('persona');
    if (personaName) {
      const found = systemPersonas.find(p => p.name.toLowerCase() === personaName.toLowerCase());
      if (found) {
        startChat(found, found.avatarUrl);
      }
    }

    const onPop = () => {
      setCurrentPage('home');
      setActiveChatSession(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [systemPersonas]);

  const startVoiceCall = (persona: Persona, avatarUrl?: string) => {
    setActiveCallPersona(persona);
    setActiveCallAvatarUrl(avatarUrl);
    setViewingProfile(null);
  };

  const endVoiceCall = () => {
    setActiveCallPersona(null);
    setActiveCallAvatarUrl(undefined);
  };

  const startChat = (persona: Persona, avatarUrl?: string) => {
    if (!user) {
      setCurrentPage('auth');
      return;
    }
    setActiveChatSession({ persona, avatarUrl });
    setViewingProfile(null);
  };

  const endChat = () => {
    setActiveChatSession(null);
  };

  const handleViewProfile = (persona: Persona, avatarUrl?: string) => {
    setViewingProfile({ persona, avatarUrl });
  };

  const handlePersonaCreated = (newPersona: Persona, avatarUrl?: string) => {
    const saved = storage.saveCompanion({ ...newPersona, avatarUrl });
    startChat(saved, avatarUrl);
  };


  const handleLogout = () => {
    if (!confirm('Log out? This will clear local chat histories on this device.')) return;
    storage.clearAllHistories();
    showNotification('Local chat histories cleared.', 'info');
  };

  // Auto-redirect to home when user logs in successfully
  useEffect(() => {
    if (user && currentPage === 'auth') {
      setCurrentPage('home');
      // Reset URL to clean home path
      window.history.pushState({}, '', '/');
    }
  }, [user, currentPage]);

  if (currentPage === 'admin') {
    return (
      <AdminPage
        personas={systemPersonas}
        onUpdatePersonaImage={handleUpdatePersonaImage}
        onBack={() => setCurrentPage('home')}
      />
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FDF2F8]">
        <div className="w-12 h-12 border-4 border-[#FF9ACB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentPage === 'auth') {
    return <AuthScreen />;
  }

  if (currentPage === 'guest-chat') {
    return <GuestChat onBack={() => setCurrentPage('home')} />;
  }
  if (currentPage === 'about') return <AboutPage onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'privacy') return <PrivacyPage onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'terms') return <TermsPage onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'faq') return <FAQPage onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'safety') return <SafetyPage onBack={() => setCurrentPage('home')} />;
  if (currentPage === 'refund') return <RefundPage onBack={() => setCurrentPage('home')} />;

  return (
    <div className="min-h-screen w-full bg-[#FDF2F8] relative overflow-x-hidden font-sans transition-colors duration-500">

      {/* Daily Bonus Nudge */}
      {!activeChatSession && user && <DailyBonusNudge />}

      {/* Floating Header Actions */}
      {!activeChatSession && user && (
        <div className="fixed top-5 right-5 z-[60] flex items-center gap-3">
          <WalletWidget isDarkMode={isDarkMode} onOpenShop={() => setIsShopOpen(true)} />
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white hover:scale-105 active:scale-95 transition-all"
          >
            <img
              src={profile.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya'}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      )}

      {/* Shop Modal */}
      {isShopOpen && (
        <ShopModal isDarkMode={isDarkMode} onClose={() => setIsShopOpen(false)} />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      )}

      {/* Chat Screen Overlay */}
      {activeChatSession && (
        <ChatScreen
          key={activeChatSession.persona.id}
          persona={activeChatSession.persona}
          avatarUrl={activeChatSession.avatarUrl}
          onBack={endChat}
          onStartCall={() => {
            setActiveCallPersona(activeChatSession.persona);
            setActiveCallAvatarUrl(activeChatSession.avatarUrl);
          }}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onOpenShop={() => setIsShopOpen(true)}
        />
      )}

      {/* Voice Call Overlay */}
      {activeCallPersona && (
        <LiveVoiceCall persona={activeCallPersona} avatarUrl={activeCallAvatarUrl} onClose={endVoiceCall} />
      )}

      {/* Profile Details Modal */}
      {viewingProfile && (
        <PersonaProfileModal
          persona={viewingProfile.persona}
          avatarUrl={viewingProfile.avatarUrl}
          onClose={() => setViewingProfile(null)}
          onStartChat={() => startChat(viewingProfile.persona, viewingProfile.avatarUrl)}
          onStartCall={() => startVoiceCall(viewingProfile.persona, viewingProfile.avatarUrl)}
          onClearHistory={() => storage.clearHistory(viewingProfile.persona.id)}
        />
      )}

      {/* Persona Creation Modal Overlay */}
      {selectedCreationMode && (
        <PersonaCreationModal
          mode={selectedCreationMode}
          onClose={() => setSelectedCreationMode(null)}
          onCreated={handlePersonaCreated}
        />
      )}

      {/* Main Content */}
      <main className={`relative z-10 flex flex-col items-center w-full ${activeChatSession ? 'hidden' : ''}`}>

        {/* HERO BANNER SECTION */}
        <div className="relative w-full min-h-0 h-auto pt-24 pb-10 md:h-screen md:py-0 flex flex-col justify-center items-center overflow-hidden px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFF0F5] via-[#E6E6FA] to-[#F3E8FF]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-tr from-[#FF9ACB]/20 via-[#B28DFF]/10 to-transparent rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFB6C1]/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#E6E6FA]/30 rounded-full blur-[80px]" />
          <div className="absolute top-1/4 left-[15%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-1/3 right-[10%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[15%] right-[25%] w-1 h-1 bg-[#B28DFF] rounded-full animate-ping opacity-60" style={{ animationDuration: '5s' }} />

          <div id="hero-card" className="relative z-10 w-[92%] max-w-[400px] md:max-w-3xl mx-auto px-6 py-8 md:p-12 rounded-[24px] md:rounded-[40px] bg-white/30 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(178,141,255,0.15)] flex flex-col items-center text-center animate-in slide-in-from-bottom-5 fade-in duration-1000">
            <div className="absolute inset-0 rounded-[24px] md:rounded-[40px] ring-1 ring-inset ring-white/50 pointer-events-none" />
            <div className="absolute -top-3 -right-3 md:-top-6 md:-right-8 p-3 md:p-4 bg-white/70 backdrop-blur-md rounded-full shadow-xl animate-bounce duration-[3000ms] border border-white/50 z-20">
              <Heart size={20} className="text-[#FF5D8F] fill-[#FF5D8F]/20 md:w-7 md:h-7" />
            </div>
            <div className="absolute -bottom-3 -left-3 md:-bottom-6 md:-left-8 p-3 md:p-4 bg-white/70 backdrop-blur-md rounded-full shadow-xl animate-bounce duration-[4000ms] delay-500 border border-white/50 z-20">
              <Phone size={20} className="text-[#B28DFF] fill-[#B28DFF]/10 md:w-7 md:h-7" />
            </div>
            <Sparkles className="absolute top-6 left-4 md:top-8 md:left-8 text-[#FF9ACB] opacity-80 animate-pulse w-5 h-5 md:w-6 md:h-6" />
            <Sparkles className="absolute top-4 right-10 md:top-6 md:right-12 text-[#B28DFF] opacity-60 animate-pulse delay-300 w-4 h-4 md:w-5 md:h-5" />
            <h1 className="font-serif-display font-bold text-[#4A2040] mb-2 md:mb-6 leading-[1.15] tracking-tight drop-shadow-sm text-[clamp(28px,5vw,48px)]">
              A Connection That <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D53F8C] to-[#9F7AEA]">Stays With You.</span>
            </h1>
            <p className="text-[#5e3a58]/90 font-medium max-w-[280px] md:max-w-lg mb-3 md:mb-6 leading-relaxed text-[clamp(15px,3vw,20px)]">
              A thoughtfully designed AI chat experience for engaging, expressive, and creative conversations.
            </p>
            <p className="text-[#4A2040]/70 font-bold tracking-[0.15em] uppercase mb-5 md:mb-10 text-[clamp(10px,1.8vw,12px)] bg-white/40 px-4 py-1.5 rounded-full border border-white/50 backdrop-blur-sm">
              Playful • Expressive • Confident • Creative • Interactive
            </p>
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full justify-center">
              <button onClick={scrollToVibe} className="flex-1 h-11 md:h-14 px-6 rounded-full bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold text-[15px] md:text-lg tracking-wide shadow-[0_8px_25px_rgba(178,141,255,0.4)] hover:shadow-[0_12px_35px_rgba(178,141,255,0.6)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center whitespace-nowrap">
                Create AI Companion
              </button>
              <button onClick={scrollToGallery} className="flex-1 h-11 md:h-14 px-6 rounded-full bg-white/40 border border-white/60 text-[#5e3a58] font-semibold text-[15px] md:text-lg hover:bg-white/70 transition-all active:scale-95 backdrop-blur-sm flex items-center justify-center whitespace-nowrap">
                Browse AI Profiles
              </button>
            </div>
          </div>
        </div>

        {/* FEATURED (SYSTEM) PROFILES */}
        <div ref={galleryRef} className="w-full relative z-20 mb-16 pt-8 md:pt-12">
          <div className="text-center mb-10">
            <span className="text-[#B28DFF] text-xs font-bold tracking-widest uppercase block mb-2">Featured Profiles</span>
            <h2 className="text-3xl md:text-4xl font-serif-display text-[#5e3a58] mb-4">Explore AI Personas</h2>
            <p className="text-sm opacity-80 max-w-lg mx-auto leading-relaxed text-[#5e3a58]">
              These AI personas are fictional characters created for conversational entertainment. Each profile represents a unique personality style generated by artificial intelligence.
            </p>
          </div>
          <PersonaGallery
            personas={systemPersonas}
            onStartCall={startVoiceCall}
            onStartChat={startChat}
            onViewProfile={handleViewProfile}
            onOpenShop={() => setIsShopOpen(true)}
          />
        </div>

        {/* 'My Partners' UI removed - user-stored partner data retained in storage. */}

        {/* Mode Cards Section */}
        <div ref={vibeRef} className="w-full bg-gradient-to-b from-[#FFF0F5] to-[#FDF2F8] pt-16 pb-0 rounded-t-[3rem] shadow-[0_-20px_60px_-15px_rgba(255,182,193,0.3)] border-t border-white/60 relative z-10">
          <CardGallery onOpenCreation={setSelectedCreationMode} />
        </div>

        <footer className="w-full bg-[#FBF9FB] text-[#6B5E6B] py-12 px-6 font-sans border-t border-black/5 relative z-10 transition-colors duration-300">
          <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center space-y-4">

            {/* Line 1: Links */}
            <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[12px] font-bold text-[#4A2040]/80">
              {[
                { label: 'Privacy', action: () => setCurrentPage('privacy') },
                { label: 'Terms', action: () => setCurrentPage('terms') },
                { label: 'Safety', action: () => setCurrentPage('safety') },
                { label: 'Refund', action: () => setCurrentPage('refund') },
                { label: 'Contact Us', href: 'mailto:support@bondly.online' }
              ].map((link) => (
                link.href ? (
                  <a key={link.label} href={link.href} className="hover:underline underline-offset-4 decoration-[#B28DFF]/40 transition-all">
                    {link.label}
                  </a>
                ) : (
                  <button key={link.label} onClick={link.action} className="hover:underline underline-offset-4 decoration-[#B28DFF]/40 transition-all">
                    {link.label}
                  </button>
                )
              ))}
            </nav>

            {/* Line 2: Payments */}
            <p className="text-[11px] font-medium text-[#4A2040]/60">
              Payments are processed via RBI-compliant payment gateways.
            </p>

            {/* Line 3: Legal */}
            <p className="text-[10px] font-medium text-[#4A2040]/50 tracking-tight">
              © 2026 Bondly AI. All rights reserved. • 18+ only • AI-generated content • All characters are fictional
            </p>

          </div>
        </footer>

      </main>
    </div>
  );
};

export default App;
