
import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Heart, Lock, AlertTriangle, UserCheck, Flag, Sparkles } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

const SafetyPage: React.FC<PageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FDF2F8] font-sans text-[#5e3a58]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FDF2F8]/90 backdrop-blur-md border-b border-[#B28DFF]/20 px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 text-[#5e3a58] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">Safety Guidelines</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-[#B28DFF]">
            <Shield size={24} />
          </div>
          <h2 className="text-2xl font-serif-display text-[#4A2040]">Your Safety Matters</h2>
          <p className="text-sm opacity-80 max-w-md mx-auto">
            We are committed to creating a secure, supportive, and judgment-free environment. Please read these guidelines to ensure a positive experience.
          </p>
        </div>

        {/* 1. Age Restriction */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck size={20} className="text-[#B28DFF]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Age Requirement (18+)</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            Bondly AI is strictly for users aged 18 and older. We maintain a mature environment and enforce this restriction to ensure the platform is used only by those who meet the legal age of majority.
          </p>
        </section>

        {/* 2. Fictional Interaction */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles size={20} className="text-[#A78BFA]" />
            <h3 className="text-lg font-bold text-[#4A2040]">AI Fictional Characters</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            Users must understand that all characters are fictional creations of artificial intelligence. These interactions are designed for conversational entertainment only and should not be viewed as real-world connections or substitutes for human interaction.
          </p>
        </section>

        {/* 3. Healthy Engagement */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Heart size={20} className="text-[#FF9ACB]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Healthy Engagement</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            We do not encourage emotional dependency or harmful behaviors. The platform is a space for creative conversation, not for seeking psychological support or medical advice. Please use the platform responsibly.
          </p>
        </section>

        {/* 4. No Real-World Facilitation */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Lock size={20} className="text-[#60A5FA]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Virtual Experience Only</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            Bondly AI does not facilitate, encourage, or provide means for real-world interactions, dating, or matchmaking. It is a strictly virtual, digital-only experience designed for interactive entertainment.
          </p>
        </section>

        {/* 5. Reporting & Behavior */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Flag size={20} className="text-[#F87171]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Reporting Misuse</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            We provide tools to report inappropriate behavior or technical issues. We monitor for patterns of misuse and reserve the right to restrict access to users who violate our community standards or conduct policies.
          </p>
        </section>

        {/* 6. Professional Disclaimer */}
        <section className="bg-[#FFF0F5] border border-[#B28DFF]/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-[#FBBF24]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Not a Support Service</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            <strong>This platform is NOT a therapy, counseling, or crisis support service.</strong> If you are experiencing distress or require professional help, please reach out to qualified real-world medical or mental health professionals.
          </p>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
        <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
          © 2025 Bondly • All Rights Reserved • 18+ Only<br />
          Designed for safe, private conversational AI interactions
        </p>
      </footer>
    </div>
  );
};

export default SafetyPage;
