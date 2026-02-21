
import React, { useState } from 'react';
import { MODE_CARDS } from '../constants';
import { ModeCardData, Persona } from '../types';
import PersonaCreationModal from './PersonaCreationModal';

interface CardGalleryProps {
  onOpenCreation: (mode: ModeCardData) => void;
}

const CardGallery: React.FC<CardGalleryProps> = ({ onOpenCreation }) => {
  const defaultMode = MODE_CARDS.find(m => m.id === 2) || MODE_CARDS[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* ... Hero card section remains same ... */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 md:p-10 shadow-[0_20px_50px_-15px_rgba(178,141,255,0.15)] text-center space-y-6 relative overflow-hidden transition-all hover:shadow-[0_30px_60px_-15px_rgba(178,141,255,0.2)]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF9ACB]/20 to-transparent blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#B28DFF]/10 to-transparent blur-2xl" />

          <div className="space-y-3 relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif-display text-[#4A2040] tracking-tight">
              Create Your AI Companion
            </h2>
            <p className="text-[#5e3a58]/80 text-base md:text-lg font-light leading-relaxed max-w-xl mx-auto">
              Design a personalized AI companion for conversational entertainment.
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <button
              onClick={() => onOpenCreation(defaultMode)}
              className="px-8 py-4 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold text-base rounded-2xl shadow-xl shadow-[#B28DFF]/30 hover:shadow-[#B28DFF]/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center mx-auto gap-3"
            >
              Create AI Companion
            </button>
          </div>

          <div className="pt-4 relative z-10">
            <p className="text-[10px] text-[#5e3a58]/50 font-medium uppercase tracking-[0.2em]">
              Private • Secure • Personalized
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center px-6">
        <div className="max-w-xl w-full bg-white/30 backdrop-blur-sm border border-white/60 py-3 px-6 rounded-xl text-center">
          <p className="text-[10px] md:text-xs text-[#5e3a58]/70 font-medium leading-relaxed">
            <span className="text-[#FF9ACB] font-bold">Note:</span> This is a virtual AI companion designed for conversation and entertainment. Not a real person or relationship.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardGallery;
