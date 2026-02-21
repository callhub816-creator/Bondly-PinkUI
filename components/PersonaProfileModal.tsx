
import React, { useEffect } from 'react';
import { Persona } from '../types';
import { X, MessageCircle, Phone, Heart, Share2, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';

interface PersonaProfileModalProps {
  persona: Persona;
  avatarUrl?: string | null;
  onClose: () => void;
  onStartChat: () => void;
  onStartCall: () => void;
  onClearHistory: () => void;
}

const PersonaProfileModal: React.FC<PersonaProfileModalProps> = ({
  persona,
  avatarUrl,
  onClose,
  onStartChat,
  onStartCall,
  onClearHistory
}) => {
  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="
        relative w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] 
        bg-[#FFF0F5] sm:rounded-[32px] rounded-t-[32px] 
        overflow-y-auto overflow-x-hidden 
        shadow-2xl animate-in slide-in-from-bottom duration-300
        flex flex-col
      ">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-md"
        >
          <X size={24} />
        </button>

        {/* Image Section (Full width top) */}
        <div className="relative w-full h-[50vh] min-h-[400px]">
          {
            // prefer persona.avatarUrl, fall back to passed avatarUrl, then placeholder
          }
          <img
            src={persona.avatarUrl ?? avatarUrl ?? '/personas/placeholder.png'}
            alt={persona.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.src && !img.src.includes('/personas/placeholder.png')) img.src = '/personas/placeholder.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FFF0F5] via-transparent to-black/30 pointer-events-none" />

          <div className="absolute bottom-0 left-0 w-full p-6 pt-12 bg-gradient-to-t from-[#FFF0F5] to-transparent">
            <h2 className="text-4xl font-serif-display text-[#4A2040] mb-1">{persona.name}</h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#B28DFF] text-white text-[10px] font-bold uppercase tracking-widest">
                AI Companion
              </span>
              <span className="flex items-center gap-1 text-[#5e3a58] text-xs font-medium">
                <ShieldCheck size={12} className="text-green-500" /> AI Verified
              </span>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="flex-1 px-6 pb-8 space-y-6">

          {/* Actions Bar */}
          <div className="flex gap-4 -mt-2 relative z-10">
            <button
              onClick={onStartChat}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold text-lg shadow-lg shadow-purple-200/50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <MessageCircle size={20} fill="currentColor" /> Start Chat
            </button>
            <button
              onClick={onStartCall}
              className="w-14 h-14 rounded-2xl bg-white border border-purple-100 text-[#B28DFF] shadow-sm flex items-center justify-center hover:bg-purple-50 hover:scale-105 active:scale-95 transition-all"
            >
              <Phone size={24} fill="currentColor" />
            </button>
            <button
              className="w-14 h-14 rounded-2xl bg-white border border-purple-100 text-[#FF5D8F] shadow-sm flex items-center justify-center hover:bg-pink-50 hover:scale-105 active:scale-95 transition-all"
            >
              <Heart size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-[#4A2040] font-bold text-lg mb-2">About Me</h3>
              <p className="text-[#6D4C63] text-sm leading-relaxed">
                {persona.description} {persona.basePrompt.includes("Warm") ? "I value deep conversation and connecting on an emotional level." : "I'm here to bring some excitement and positive energy into your day."}
              </p>
            </div>

            <div>
              <h3 className="text-[#4A2040] font-bold text-lg mb-3">Personality</h3>
              <div className="flex flex-wrap gap-2">
                {persona.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-white border border-purple-100 text-[#5e3a58] text-xs font-medium shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Fake 'Interests' for visual fullness */}
            <div>
              <h3 className="text-[#4A2040] font-bold text-lg mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {['Late Night Talks', 'Meaningful Music', 'Great Vibes', 'Travel'].map((intr, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-[#FDF2F8] text-[#8E6A88] text-xs">
                    {intr}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#8E6A88]/10 flex flex-col gap-4 items-center">
            <button
              onClick={() => {
                if (window.confirm('Clear all chat history with ' + persona.name + '?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-2 text-red-400 hover:text-red-500 text-sm font-medium transition-colors"
              title="Clear all chat history"
            >
              <Trash2 size={16} /> Clear Chat History
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PersonaProfileModal;