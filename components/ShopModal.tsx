import React from 'react';
import { X, Sparkles, Zap, Heart, Mic, Moon, ShieldCheck, Check } from 'lucide-react';
import { GATING_CONFIG, HEARTS_PACKS } from '../constants';
import { useAuth } from '../src/contexts/AuthContext';
import { useNotification } from './NotificationProvider';

interface ShopModalProps {
    onClose: () => void;
    isDarkMode: boolean;
}

const ShopModal: React.FC<ShopModalProps> = ({ onClose, isDarkMode }) => {
    const { upgradeSubscription, purchaseHearts, buyStarterPass, profile } = useAuth();
    const { showNotification } = useNotification();

    const plans = GATING_CONFIG.plans;
    const addons = GATING_CONFIG.addons;
    const isNewUser = (profile.earningsHistory || []).filter(e => e.type === 'purchase').length === 0;

    // Prices are now strict as per RBI compliance. No heavy discount spam.

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 shadow-2xl animate-in fade-in duration-300 backdrop-blur-md bg-black/40">
            <div className={`relative w-full max-w-lg overflow-hidden rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-white text-[#4A2040]'}`}>

                {/* Header */}
                <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-pink-500/10 rounded-xl">
                            <Sparkles size={20} className="text-pink-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold font-serif-display">Bondly Upgrade Center</h2>
                            <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Improve your communication experience</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">

                    {/* NEW USER WELCOME / ENGAGEMENT HOOK */}
                    {isNewUser && (
                        <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-[24px] text-white shadow-xl animate-bounce-subtle">
                            <h4 className="font-black text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Sparkles size={16} /> Welcome Bonus
                            </h4>
                            <p className="text-[11px] font-medium opacity-90 leading-snug">Get 50 Message Credits + 24-Hour Access for just ₹49. Limited time first-recharge offer!</p>
                        </div>
                    )}

                    {/* IMPULSE PLAN (DAY 3) */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                            <Zap size={12} className="text-yellow-500 fill-yellow-500" />
                            24-Hour Pro Access
                        </h3>
                        <div
                            onClick={() => buyStarterPass()}
                            className="group relative p-4 rounded-2xl border-2 border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-transparent cursor-pointer hover:border-yellow-400 transition-all active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-lg">{plans.starter.name}</h4>
                                    <p className="text-xs opacity-70">Extended access for 24 hours.</p>
                                </div>
                                <div className="text-right">
                                    <div className="px-3 py-1 bg-yellow-400 text-black text-[13px] font-black rounded-lg shadow-lg">
                                        ₹{plans.starter.price}
                                    </div>
                                    <div className="text-[9px] text-yellow-600 font-black uppercase mt-0.5">Introductory Price</div>
                                </div>
                            </div>
                            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                                {plans.starter.features.map(f => (
                                    <li key={f} className="text-[11px] font-medium flex items-center gap-1.5 opacity-80">
                                        <Check size={12} className="text-yellow-500" /> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {/* HIGH-VALUE PLANS - SHOW ONLY TO ADDICTED USERS (>= 1 Purchase) */}
                    {!isNewUser && (
                        <>
                            {/* CORE PLAN (DAY 4) */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                                    <Heart size={12} className="text-pink-500 fill-pink-500" />
                                    Message Capacity Upgrade
                                </h3>
                                <div
                                    onClick={() => upgradeSubscription('core')}
                                    className="relative p-5 rounded-2xl border-2 border-pink-500 bg-pink-500/5 cursor-pointer shadow-[0_10px_30px_-5px_rgba(236,72,153,0.2)] hover:shadow-[0_15px_40px_-5px_rgba(236,72,153,0.3)] transition-all active:scale-[0.98]"
                                >
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-pink-500 text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-md">
                                        Recommended
                                    </div>
                                    <div className="flex justify-between items-start mb-2 pt-1">
                                        <div>
                                            <h4 className="font-bold text-xl">{plans.core.name}</h4>
                                            <p className="text-xs opacity-70">Long-term connection bond (30 Days).</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-pink-500">₹{plans.core.price}</div>
                                            <div className="text-[10px] text-pink-500 font-black uppercase">Standard Price</div>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 mt-4">
                                        {plans.core.features.map(f => (
                                            <li key={f} className="text-[12px] font-semibold flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center">
                                                    <Check size={10} className="text-pink-500" />
                                                </div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>

                            {/* ULTRA PLAN (CHARACTER UNLOCK) */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                                    <Sparkles size={12} className="text-purple-500" />
                                    Premium Access
                                </h3>
                                <div
                                    onClick={() => upgradeSubscription('plus')}
                                    className="relative p-5 rounded-2xl border-2 border-purple-500 bg-gradient-to-br from-purple-500/10 to-transparent cursor-pointer shadow-[0_10px_30px_-5px_rgba(168,85,247,0.2)] hover:shadow-[0_15px_40px_-5px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98]"
                                >
                                    <div className="absolute -top-3 right-6 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-md">
                                        Ultimate Pass
                                    </div>
                                    <div className="flex justify-between items-start mb-2 pt-1">
                                        <div>
                                            <h4 className="font-bold text-xl text-purple-600 dark:text-purple-400">{plans.plus.name}</h4>
                                            <p className="text-xs opacity-70">Unlock everything, forever.</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-purple-600">₹{plans.plus.price}</div>
                                        </div>
                                    </div>
                                    <ul className="grid grid-cols-1 gap-2 mt-4">
                                        {plans.plus.features.map(f => (
                                            <li key={f} className="text-[12px] font-bold flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                    <Check size={10} className="text-purple-500" />
                                                </div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>
                        </>
                    )}

                    {/* ADD-ONS (DAY 5) */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                            <ShieldCheck size={12} className="text-blue-500" />
                            Advanced Tools
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {addons.map((addon, i) => (
                                <button
                                    key={addon.id}
                                    onClick={() => showNotification(`Purchasing ${addon.name}... Process same as Hearts/Plans.`, 'info')}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.97] ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className={`p-2 rounded-lg ${i % 3 === 0 ? 'bg-blue-100 text-blue-500' : i % 3 === 1 ? 'bg-purple-100 text-purple-500' : 'bg-green-100 text-green-500'}`}>
                                            {i % 3 === 0 ? <Mic size={16} /> : i % 3 === 1 ? <Moon size={16} /> : <Zap size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{addon.name}</p>
                                            <p className="text-[10px] opacity-60">One-time unlock</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black opacity-80">₹{addon.price}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* HEARTS PACKS */}
                    <section className="pb-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">Message Credits</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {HEARTS_PACKS.map(pack => (
                                <button
                                    key={pack.id}
                                    onClick={() => purchaseHearts(pack.hearts)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-pink-50/50 border-pink-100 hover:bg-pink-50'
                                        }`}
                                >
                                    <Heart size={14} className="text-pink-500 fill-current mb-0.5" />
                                    <span className="text-xs font-black">{pack.hearts}</span>
                                    <span className="text-[11px] text-pink-600 font-black mt-1">₹{pack.price}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <div className={`p-4 border-t ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[10px] text-center opacity-60 font-medium">
                        Payments are RBI compliant. Billed as "Digital Experience Credits".<br />
                        Owned by: Rajesh Madhukar Navsagar (Lohegaon, Pune)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShopModal;
