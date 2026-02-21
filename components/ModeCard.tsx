import React from 'react';
import { ModeCardData } from '../types';
import AbstractBackground from './AbstractBackground';
import { Sparkles, Heart, Flame, Cloud, Zap, Lock } from 'lucide-react';
import { useGating } from '../src/hooks/useGating';

interface ModeCardProps {
  data: ModeCardData;
  onClick?: () => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ data, onClick }) => {
  const { canAccessMode } = useGating();
  const isLocked = !canAccessMode(data.title);

  const getIcon = () => {
    if (isLocked) return <Lock size={20} className="text-[#8e6a88]" />;
    switch (data.id) {
      case 1: return <Heart size={24} className="text-[#FF9ACB] fill-[#FF9ACB]/30" />;
      case 2: return <Heart size={24} className="text-[#B28DFF] fill-[#B28DFF]/30" />;
      case 3: return <Flame size={24} className="text-[#9F7AEA] fill-[#9F7AEA]/30" />;
      case 4: return <Cloud size={24} className="text-[#FFB6C1] fill-[#FFB6C1]/30" />;
      case 5: return <Zap size={24} className="text-[#FF5D8F] fill-[#FF5D8F]/30" />;
      default: return <Sparkles size={24} />;
    }
  };

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`group relative w-full aspect-[3/4] max-w-[320px] mx-auto perspective-1000 ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
      role="button"
      aria-label={`Select ${data.title} ${isLocked ? '(Locked)' : ''}`}
    >

      {/* Card Container */}
      <div
        className={`
          relative w-full h-full rounded-[32px] overflow-hidden 
          bg-white/30 backdrop-blur-2xl 
          border border-white/60 
          shadow-[0_20px_40px_-12px_rgba(255,154,203,0.3)]
          transition-all duration-700 ease-out
          ${!isLocked ? 'group-hover:scale-[1.03] group-hover:-translate-y-2 group-hover:shadow-[0_30px_60px_-12px_rgba(178,141,255,0.5)]' : 'grayscale opacity-60'}
        `}
      >

        {/* Inner Glow/Sheen */}
        <div className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/50 z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20 pointer-events-none" />

        {/* Abstract Art Background */}
        <AbstractBackground id={data.id} />

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full flex flex-col justify-end p-8">

          {/* Decorative Icon (Top Right) */}
          <div className="absolute top-6 right-6 p-2 rounded-full bg-white/20 backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110">
            {getIcon()}
          </div>

          {/* Text Container */}
          <div className="
            flex flex-col gap-2 
            p-6 rounded-2xl 
            bg-white/10 backdrop-blur-md 
            border border-white/20
            shadow-lg
            transform transition-all duration-500
            group-hover:bg-white/25
          ">
            <h2 className="text-3xl font-serif-display font-medium text-[#4A2040] tracking-wide leading-tight">
              {data.title}
            </h2>
            <div className="w-12 h-0.5 bg-[#4A2040]/30 rounded-full mb-1" />
            <p className="text-[#6D4C63] font-light text-sm leading-relaxed">
              {data.subtitle}
            </p>
          </div>

          {/* Call to Action or Lock Label */}
          <div className="absolute bottom-6 right-8">
            <div className="px-5 py-2 rounded-full bg-white text-[#5e3a58] text-[11px] font-bold uppercase tracking-widest shadow-lg transform group-hover:scale-110 transition-transform duration-300">
              Create
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModeCard;