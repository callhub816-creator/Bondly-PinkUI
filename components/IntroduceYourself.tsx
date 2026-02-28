
import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Heart, Sparkles } from 'lucide-react';

interface UserInfo {
    name: string;
    age: string;
    lookingFor: string;
}

interface IntroduceYourselfProps {
    onComplete: (info: UserInfo) => void;
}

const IntroduceYourself: React.FC<IntroduceYourselfProps> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [formData, setFormData] = useState<UserInfo>({
        name: '',
        age: '18',
        lookingFor: 'MENTORSHIP'
    });

    useEffect(() => {
        const hasIntroduced = localStorage.getItem('Bondly_user_introduced');
        if (!hasIntroduced) {
            setTimeout(() => setIsVisible(true), 1500);
        }
    }, []);

    const handleStart = () => {
        if (!formData.name.trim()) return;
        localStorage.setItem('Bondly_user_introduced', 'true');
        localStorage.setItem('Bondly_user_info', JSON.stringify(formData));
        setIsVisible(false);
        onComplete(formData);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/40">

                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-[#FFF0F5] to-[#F3E8FF] p-8 pb-6 relative">
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/40 text-[#4A2040]/60 hover:bg-white transition-all shadow-sm"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-2xl bg-white shadow-sm">
                            <Heart size={24} className="text-[#FF5D8F] fill-[#FF5D8F]/20" />
                        </div>
                        <h2 className="text-3xl font-serif-display font-bold text-[#4A2040]">Introduce Yourself</h2>
                    </div>
                </div>

                <div className="p-8 pt-6 space-y-8">
                    {/* Name Field */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[11px] font-black text-[#5e3a58]/50 uppercase tracking-[0.2em] ml-1">
                            <User size={14} /> Your Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="How should she call you?"
                            className="w-full px-6 py-5 rounded-[22px] bg-[#FFF0F5]/50 border-2 border-[#FF9ACB]/20 focus:border-[#FF9ACB] focus:bg-white outline-none text-lg font-bold text-[#4A2040] placeholder-[#4A2040]/30 transition-all shadow-inner"
                        />
                    </div>

                    {/* Age Field */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[11px] font-black text-[#5e3a58]/50 uppercase tracking-[0.2em] ml-1">
                            User Age
                        </label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            min="18"
                            max="99"
                            className="w-full px-6 py-5 rounded-[22px] bg-[#FFF0F5]/50 border-2 border-[#FF9ACB]/20 focus:border-[#FF9ACB] focus:bg-white outline-none text-lg font-bold text-[#4A2040] transition-all shadow-inner"
                        />
                    </div>

                    {/* Looking For Chips */}
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[11px] font-black text-[#5e3a58]/50 uppercase tracking-[0.2em] ml-1">
                            <Sparkles size={14} /> What are you looking for?
                        </label>
                        <div className="flex gap-3">
                            {['FRIENDSHIP', 'MENTORSHIP', 'CASUAL'].map((option) => (
                                <button
                                    key={option}
                                    onClick={() => setFormData({ ...formData, lookingFor: option })}
                                    className={`
                    flex-1 py-4 rounded-2xl font-black text-[11px] tracking-widest transition-all duration-300 shadow-sm
                    ${formData.lookingFor === option
                                            ? 'bg-gradient-to-r from-[#FF5D8F] to-[#D53F8C] text-white shadow-lg scale-105'
                                            : 'bg-white border-2 border-gray-50 text-[#5e3a58]/40 hover:bg-gray-50'}
                  `}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleStart}
                        disabled={!formData.name.trim()}
                        className={`
              w-full py-6 rounded-[24px] font-black text-xl text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-500
              ${formData.name.trim()
                                ? 'bg-gradient-to-r from-[#FF5D8F] via-[#9F7AEA] to-[#B28DFF] hover:shadow-purple-500/20 hover:-translate-y-1 active:scale-95'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}
            `}
                    >
                        Start Your Journey <Heart size={24} fill="currentColor" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntroduceYourself;
