import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { X, User, Heart, Gift, LogOut, Check, Edit2, TrendingUp, Sparkles, Trash2 } from 'lucide-react';
import { PROFILE_AVATARS } from '../constants';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { profile, user, updateProfile, claimDailyBonus, signOut } = useAuth();
    const [isEditingName, setIsEditingName] = useState(false);
    const [nickname, setNickname] = useState(profile.nickname || user?.displayName || '');
    const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarUrl || PROFILE_AVATARS[0]);

    // Body Scroll Lock
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSaveName = async () => {
        await updateProfile({ nickname });
        setIsEditingName(false);
    };

    const handleSelectAvatar = async (url: string) => {
        setSelectedAvatar(url);
        await updateProfile({ avatarUrl: url });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card - Extra Compact Height */}
            <div className="relative w-full max-w-[95%] md:max-w-xl bg-white/95 backdrop-blur-2xl rounded-[24px] border border-white shadow-[0_32px_64px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row">

                {/* Close Button (Floating) */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/5 hover:bg-black/10 text-[#4A2040] transition-colors"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* LEFT SIDE: Avatar & Info */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-[#FDF2F8] to-[#FFF5F5] p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-pink-100 relative">
                    <div className="relative mb-3 group cursor-pointer" onClick={() => document.getElementById('avatar-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-[4px] border-white shadow-xl overflow-hidden bg-white hover:scale-105 transition-transform duration-300">
                            <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-0 right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                            <Sparkles size={12} className="text-[#FF9ACB]" />
                        </div>
                    </div>

                    <div className="text-center w-full">
                        {isEditingName ? (
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <input
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="bg-white border-2 border-pink-300 rounded-lg px-2 py-1 text-center text-sm font-bold text-[#4A2040] outline-none focus:ring-2 focus:ring-pink-100 w-full"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                />
                                <button onClick={handleSaveName} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md shadow-md hover:scale-110 transition-all">
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 group cursor-pointer py-0.5" onClick={() => setIsEditingName(true)}>
                                <h2 className="text-lg md:text-xl font-serif-display font-bold text-[#4A2040] leading-tight">
                                    {profile.nickname || user?.displayName || 'Traveler'}
                                </h2>
                                <div className="p-1 bg-pink-50 rounded-full text-pink-400 group-hover:bg-pink-100 group-hover:scale-110 transition-all">
                                    <Edit2 size={10} />
                                </div>
                            </div>
                        )}
                        <p className="text-[#8E6A88] font-medium text-[10px] mt-0.5">@{user?.username || 'user'}</p>
                    </div>

                    {/* Simple Logout for Mobile (Visible) */}
                    <div className="md:hidden w-full mt-3">
                        <button
                            onClick={() => { if (window.confirm('Log out?')) signOut(); }}
                            className="w-full py-2 bg-red-50 text-red-500 rounded-lg font-bold flex items-center justify-center gap-2 border border-red-100 active:scale-95 text-xs"
                        >
                            <LogOut size={14} />
                            Log Out
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE: Stats & Actions */}
                <div className="w-full md:w-7/12 p-4 max-h-[55vh] md:max-h-[420px] overflow-y-auto custom-scrollbar">

                    {/* Wallet Card */}
                    <div className="bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] rounded-[16px] p-3 text-white shadow-md shadow-pink-200 mb-4 relative overflow-hidden group">
                        <div className="absolute -right-3 -top-3 opacity-20 group-hover:scale-110 transition-transform duration-700">
                            <Heart size={80} fill="currentColor" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <span className="text-pink-100 text-[9px] font-bold uppercase tracking-widest">Balance</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Heart className="fill-white" size={20} />
                                    <span className="text-3xl font-black">{profile.hearts}</span>
                                </div>
                            </div>
                            <button
                                onClick={claimDailyBonus}
                                className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg font-bold transition-all border border-white/40 flex items-center gap-1.5 active:scale-95 text-[10px]"
                            >
                                <Gift size={12} />
                                Bonus
                            </button>
                        </div>
                    </div>

                    {/* Avatars Grid */}
                    <div id="avatar-grid" className="mb-4">
                        <h3 className="text-[#4A2040] font-bold mb-2 flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-purple-100 rounded-md text-purple-600"><User size={12} /></div>
                            Switch Avatar
                        </h3>
                        <div className="grid grid-cols-5 gap-1.5">
                            {PROFILE_AVATARS.map((url, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelectAvatar(url)}
                                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all hover:scale-110 cursor-pointer ${selectedAvatar === url ? 'border-[#FF9ACB] ring-2 ring-[#FF9ACB]/30 scale-105' : 'border-transparent bg-gray-50'}`}
                                >
                                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Earnings History */}
                    <div className="mb-4">
                        <h3 className="text-[#4A2040] font-bold mb-2 flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-green-100 rounded-md text-green-600"><TrendingUp size={12} /></div>
                            History
                        </h3>
                        <div className="space-y-1.5">
                            {(profile.earningsHistory && profile.earningsHistory.length > 0) ? (
                                profile.earningsHistory.slice(0, 3).map((record) => (
                                    <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-full ${record.type === 'bonus' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'}`}>
                                                {record.type === 'bonus' ? <Gift size={10} /> : <TrendingUp size={10} />}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-[#4A2040]">{record.label}</p>
                                                <p className="text-[8px] text-gray-400">{new Date(record.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded text-[10px]">+{record.amount}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-[10px] italic py-1">No history yet.</p>
                            )}
                        </div>
                        {/* Clear History Button (Only if history exists) */}
                        {profile.earningsHistory && profile.earningsHistory.length > 0 && (
                            <button
                                onClick={async () => {
                                    if (confirm('Clear entire earnings history?')) {
                                        await updateProfile({ earningsHistory: [] });
                                    }
                                }}
                                className="w-full mt-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Trash2 size={10} />
                                Clear History
                            </button>
                        )}
                    </div>

                    {/* Laptop Logout */}
                    <div className="hidden md:block">
                        <button
                            onClick={() => { if (window.confirm('Are you sure you want to log out?')) signOut(); }}
                            className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95 text-xs border border-red-100"
                        >
                            <LogOut size={14} />
                            Log Out
                        </button>
                    </div>

                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FF9ACB; border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default ProfileModal;
