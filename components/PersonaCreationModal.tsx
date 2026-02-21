import React, { useState, useEffect } from 'react';
import { saveUserPersona } from "../src/utils/storage";
// Removed GoogleGenAI import to comply with security requirements
import { ModeCardData, Persona } from '../types';
import { MODE_CONFIGS } from '../constants';
import { X, Upload, Sparkles, Wand2, Loader2, AlertTriangle, ArrowRight, Lock, Shield } from 'lucide-react';

interface PersonaCreationModalProps {
  mode: ModeCardData;
  onClose: () => void;
  onCreated: (persona: Persona, avatarUrl?: string) => void;
}

const PersonaCreationModal: React.FC<PersonaCreationModalProps> = ({ mode, onClose, onCreated }) => {
  const [step, setStep] = useState<'form' | 'creating'>('form');

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'female' as 'female' | 'male',
    photoStyle: 'Realistic Indian',
    looksDescription: '', // For AI generation
    voiceTone: 'Warm'
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const PHOTO_STYLES = [
    "Realistic Indian", "Cute & Soft", "Minimal Anime"
  ];

  const VOICE_TONES = ["Soft", "Warm", "Playful", "Deep"];

  const generateSystemImage = async (personaName: string, gender: string, style: string, vibe: string) => {
    const prompt = `Portrait of a ${gender} named ${personaName}. Style: ${style}. Vibe: ${vibe}. High quality, 1:1 aspect ratio, soft lighting, warm and soft aesthetic. No text.`;

    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        model: 'gemini-2.0-flash-exp'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Image generation failed");
    }

    const data = await res.json();
    if (data.inlineData) {
      return `data:image/png;base64,${data.inlineData.data}`;
    }

    throw new Error("No image generated");
  };

  const isRateLimit = (e: any) => {
    if (!e) return false;
    if (e.status === 429 || e.code === 429 || e.error?.code === 429) return true;
    const msg = (e.message || e.toString() || '').toLowerCase();
    const body = JSON.stringify(e).toLowerCase();
    return msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted') || body.includes('resource_exhausted') || body.includes('429');
  };

  async function handleCreate() {
    if (!formData.name) return;

    setStep('creating');
    setError(null);

    try {
      let finalAvatar = previewUrl || '/personas/placeholder.png';

      if (!previewUrl) {
        setIsGeneratingPhoto(true);
        try {
          const aiImage = await generateSystemImage(
            formData.name,
            formData.gender,
            formData.photoStyle,
            mode.title
          );
          finalAvatar = aiImage;
        } catch (err) {
          console.error("AI Photo Gen failed, falling back to demo:", err);
          const demoImages = {
            female: [
              "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80"
            ],
            male: [
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80"
            ]
          };
          const list = demoImages[formData.gender];
          finalAvatar = list[Math.floor(Math.random() * list.length)];
        }
      }

      const newPersona = {
        id: `custom-${Date.now()}`,
        name: formData.name,
        description: formData.looksDescription || `Your AI companion.`,
        gender: formData.gender,
        mode: mode.title.toLowerCase().includes('flirty') ? 'flirty' : mode.title.toLowerCase().includes('romantic') ? 'romantic' : mode.title.toLowerCase().includes('jealous') ? 'jealous' : mode.title.toLowerCase().includes('bold') ? 'bold' : 'sweet',
        avatarUrl: finalAvatar,
        tags: [formData.photoStyle, formData.voiceTone],
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        isUserCreated: true,
        defaultLanguage: 'hinglish',
      } as any;

      saveUserPersona(newPersona);
      onCreated?.(newPersona, newPersona.avatarUrl);
      onClose();
    } catch (e: any) {
      setError(e.message || "An error occurred");
      setStep('form');
    } finally {
      setIsGeneratingPhoto(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4 sm:p-6 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="
        w-full max-w-sm bg-[#FFF0F5] sm:rounded-[32px] rounded-t-[32px] 
        shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300
        max-h-[85vh] flex flex-col
      ">

        {/* Header - Fixed at Top */}
        <div className={`relative p-5 bg-gradient-to-r ${mode.gradientConfig} text-[#4A2040] flex-shrink-0`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 p-2.5 bg-white/20 hover:bg-white/40 rounded-full transition-all active:scale-90 z-50 shadow-sm"
          >
            <X size={20} className="text-[#4A2040]" />
          </button>
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest font-bold opacity-70 flex items-center gap-1 text-[#4A2040]">
              <Sparkles size={10} className="text-[#4A2040]" /> PREMIUM ACTIVE
            </span>
            <h2 className="text-xl font-serif-display font-medium text-[#4A2040] leading-tight">{mode.title}</h2>
            <p className="text-[#4A2040]/70 text-xs font-light line-clamp-1">{mode.subtitle}</p>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {step === 'creating' ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 bg-[#FF9ACB]/30 rounded-full blur-2xl animate-pulse" />
                <div className="absolute inset-0 border-4 border-t-[#B28DFF] border-r-transparent border-b-[#FF9ACB] border-l-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={32} className="text-[#B28DFF] animate-bounce" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif-display text-[#4A2040]">Creating your AI Companion</h3>
                <p className="text-[#5e3a58] text-sm font-medium animate-pulse">
                  {isGeneratingPhoto ? "Creating high-quality AI Portrait..." : "Finalizing personality traits..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Error Banner */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                    <AlertTriangle size={16} />
                    <span>{error === 'High Traffic (429)' ? 'System Busy' : 'Creation Failed'}</span>
                  </div>
                  <p className="text-xs text-red-600/80">
                    {error === 'High Traffic (429)'
                      ? 'We are experiencing high traffic. Please try creating again.'
                      : 'Could not create portrait. Please try again.'}
                  </p>
                </div>
              )}

              {/* Privacy Notice - Secure Processing */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3 items-start">
                <Shield size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-0.5">Secure Processing</p>
                  <p className="opacity-80 leading-relaxed">
                    Conversations are processed securely. Limited data may be stored to improve experience.
                  </p>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-[#5e3a58] uppercase tracking-wider mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aara, Vihaan..."
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#B28DFF]/20 focus:border-[#B28DFF] focus:ring-2 focus:ring-[#B28DFF]/20 outline-none text-[#4A2040] placeholder-[#5e3a58]/50 shadow-sm"
                />
              </div>

              {/* AI Portrait Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-xs font-bold text-[#5e3a58] uppercase tracking-wider">AI Portrait</label>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-white border border-[#B28DFF]/30 rounded-lg text-[10px] font-bold text-[#B28DFF] cursor-default">
                      AI-Only Rendering
                    </span>
                  </div>
                </div>

                {previewUrl && (
                  <div className="mb-4 relative w-20 h-20 mx-auto group">
                    <img src={previewUrl} className="w-full h-full object-cover rounded-2xl shadow-md border-2 border-white" alt="Portrait Preview" />
                    <button onClick={() => setPreviewUrl(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={10} /></button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#5e3a58] uppercase mb-2 ml-1">Choose Portrait Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PHOTO_STYLES.map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setFormData({ ...formData, photoStyle: style })}
                          className={`
                                py-2.5 px-3 rounded-xl border text-[11px] text-left transition-all
                                ${formData.photoStyle === style ? 'border-[#B28DFF] bg-white text-[#B28DFF] font-bold shadow-sm' : 'border-[#B28DFF]/10 bg-white shadow-sm text-[#5e3a58]'}
                              `}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#5e3a58] uppercase mb-2 ml-1">Appearance Description (Opt.)</label>
                    <textarea
                      value={formData.looksDescription}
                      onChange={(e) => setFormData({ ...formData, looksDescription: e.target.value })}
                      placeholder="e.g. Long hair, glasses, warm smile, simple and elegant style..."
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#B28DFF]/20 focus:border-[#B28DFF] outline-none text-xs text-[#4A2040] placeholder-[#5e3a58]/40 resize-none h-20 shadow-inner mb-2"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Realistic", "Formal", "Traditional", "Modern"].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const current = formData.looksDescription;
                            setFormData({ ...formData, looksDescription: current ? `${current}, ${chip}` : chip });
                          }}
                          className="px-2 py-1.5 rounded-lg bg-white border border-[#B28DFF]/20 text-[10px] font-medium text-[#5e3a58] hover:bg-white/80 transition-colors shadow-sm"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation Tone */}
              <div>
                <label className="block text-xs font-bold text-[#5e3a58] uppercase tracking-wider mb-3">Conversation Tone</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {VOICE_TONES.map(tone => (
                    <button
                      key={tone}
                      onClick={() => setFormData({ ...formData, voiceTone: tone })}
                      className={`
                        flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-all
                        ${formData.voiceTone === tone ? 'bg-[#4A2040] text-white border-[#4A2040]' : 'bg-white border-[#B28DFF]/20 text-[#5e3a58]'}
                      `}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create CTA */}
              <div className="pt-4 flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-[#B28DFF]/30 text-[#8e6a58] font-bold text-sm hover:bg-white/50">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.name}
                  className="
                   flex-[2] py-3.5 rounded-xl 
                   bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] 
                   text-white font-bold text-sm shadow-lg shadow-[#B28DFF]/20 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2
                 "
                >
                  <Sparkles size={16} fill="currentColor" />
                  Create AI Companion
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonaCreationModal;
