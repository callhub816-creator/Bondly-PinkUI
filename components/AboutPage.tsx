
import React, { useEffect } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

const AboutPage: React.FC<PageProps> = ({ onBack }) => {
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
        <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">About Us</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <section className="space-y-4">
          <h2 className="text-2xl font-serif-display text-[#4A2040]">About CallHub</h2>
          <p className="leading-relaxed opacity-90">
            Welcome to CallHub, an AI-powered conversational platform built for interactive and creative entertainment. We use advanced Artificial Intelligence to generate engaging chat experiences in a secure, virtual environment designed purely for digital interaction.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[#4A2040]">Our Mission</h3>
          <p className="leading-relaxed opacity-90">
            Our mission is to deliver high-quality AI-generated conversations that feel natural, expressive, and engaging, while remaining clearly fictional and entertainment-focused.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[#4A2040]">AI-Only Interaction</h3>
          <p className="leading-relaxed opacity-90">
            All interactions on CallHub are 100% AI-generated and fictional. There is no real human being involved in any chat, message, or response.
          </p>
          <p className="leading-relaxed opacity-90">
            This platform is intended strictly for conversational entertainment. It does not provide dating services, emotional counseling, relationship advice, or mental health support, and should not be considered a substitute for real-world human interaction or professional services.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[#4A2040]">Core Values</h3>
          <ul className="space-y-3 list-disc pl-5 opacity-90">
            <li><strong className="text-[#B28DFF]">Privacy:</strong> Your interactions are private and secure.</li>
            <li><strong className="text-[#B28DFF]">Innovation:</strong> Using advanced AI models to provide realistic conversational behavior.</li>
            <li><strong className="text-[#B28DFF]">Safety:</strong> Strict 18+ policy to ensure a mature and safe environment.</li>
          </ul>
        </section>

        <section className="space-y-4 bg-white/50 p-6 rounded-2xl border border-white/60">
          <h3 className="text-lg font-bold text-[#4A2040]">Get in Touch</h3>
          <p className="leading-relaxed opacity-90 mb-4">
            We are a team of AI enthusiasts committed to bettering virtual companionship. If you have any questions, reach out to our team.
          </p>
          <a href="mailto:support@bondly.online" className="inline-flex items-center gap-2 text-[#B28DFF] font-medium hover:underline">
            <Mail size={18} /> support@bondly.online
          </a>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
        <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
          © 2026 CallHub AI • All Rights Reserved • 18+ Only<br />
          Conversational Entertainment Platform
        </p>
      </footer>
    </div>
  );
};

export default AboutPage;