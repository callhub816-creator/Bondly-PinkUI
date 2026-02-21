
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check } from 'lucide-react';

const AgeGate: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [checks, setChecks] = useState({ age: false, ai: false });

    useEffect(() => {
        const hasAgreed = localStorage.getItem('callhub_age_gate_agreed');
        if (!hasAgreed) {
            setIsVisible(true);
        }
    }, []);

    const handleAgree = () => {
        if (!checks.age || !checks.ai) return;
        localStorage.setItem('callhub_age_gate_agreed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 select-none animate-in fade-in duration-1000 overflow-hidden">
            {/* Premium Pink Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFF0F5] via-[#FFDEE9] to-[#F3E8FF]" />

            {/* Dynamic Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF9ACB]/[0.1] blur-[150px] rounded-full pointer-events-none" />

            {/* Premium Pink Glass Card */}
            <div className="bg-[#FFFDFE] max-w-md w-full md:rounded-[40px] rounded-[32px] p-8 md:p-12 border border-[#FF9ACB]/20 shadow-[0_50px_100px_-20px_rgba(255,154,203,0.25)] text-center space-y-9 relative backdrop-blur-3xl overflow-hidden transform animate-in zoom-in-95 duration-700">

                {/* Header Section */}
                <div className="relative space-y-6">
                    <div className="w-14 h-14 bg-white border border-[#4A2040]/10 md:rounded-[18px] rounded-[16px] flex items-center justify-center mx-auto shadow-sm relative overflow-hidden">
                        <ShieldCheck size={28} className="text-[#4A2040] relative z-10" strokeWidth={1.5} />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl md:text-4xl font-serif-display font-bold tracking-tight text-[#4A2040]">
                            Age Confirmation
                        </h2>
                        <div className="space-y-1">
                            <p className="text-[#5e3a58]/80 text-[14px] font-bold leading-relaxed">
                                This platform is intended only for users aged 18 years or older.
                            </p>
                            <p className="text-[#5e3a58]/60 text-[13px] font-semibold leading-relaxed px-4">
                                By continuing, you confirm your age and the AI-only nature of this experience.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Confirmations Section - Precisely matching user screenshot */}
                <div className="space-y-4">
                    {[
                        { key: 'age', label: 'I confirm that I am at least 18 years of age.' },
                        { key: 'ai', label: 'I understand that all encounters are AI-generated and fictional.' }
                    ].map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setChecks(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof checks] }))}
                            className={`w-full flex items-center gap-4 px-6 py-5 rounded-[24px] border-2 transition-all duration-300 text-left cursor-pointer group
                                ${checks[item.key as keyof typeof checks]
                                    ? 'bg-[#FF9ACB]/10 border-black shadow-sm'
                                    : 'bg-white border-black hover:bg-white/90'}`}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center shrink-0
                                ${checks[item.key as keyof typeof checks]
                                    ? 'bg-black border-black'
                                    : 'bg-white border-black/10'}`}>
                                <div className={`w-2 h-2 rounded-full bg-white transition-all duration-500 scale-150
                                    ${checks[item.key as keyof typeof checks] ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                            </div>
                            <p className={`transition-colors duration-300 text-[13px] leading-snug font-bold ${checks[item.key as keyof typeof checks] ? 'text-black' : 'text-[#5e3a58]/70'}`}>
                                {item.label}
                            </p>
                        </button>
                    ))}
                </div>

                {/* CTA Section */}
                <div className="space-y-6 pt-2">
                    <button
                        onClick={handleAgree}
                        disabled={!checks.age || !checks.ai}
                        className={`group relative w-full h-16 rounded-[24px] font-black uppercase tracking-[0.15em] transition-all duration-500 active:scale-[0.98]
                            ${checks.age && checks.ai
                                ? 'bg-black text-white shadow-xl hover:-translate-y-1'
                                : 'bg-black/5 text-black/20 cursor-not-allowed'}`}
                    >
                        <span className="relative z-10 text-[15px]">Confirm & Continue</span>
                    </button>

                    {/* Branding Bar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-0.5 w-12 bg-black/5 rounded-full" />
                        <p className="text-[10px] text-black/30 uppercase tracking-[0.5em] font-black">
                            CallHub AI
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgeGate;
