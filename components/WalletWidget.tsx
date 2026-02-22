import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { useAuth } from '../src/contexts/AuthContext';

interface WalletWidgetProps {
    isDarkMode: boolean;
    showAdd?: boolean;
    onOpenShop: () => void;
}

const WalletWidget: React.FC<WalletWidgetProps> = ({ isDarkMode, onOpenShop, showAdd = true }) => {
    const { profile } = useAuth();

    return (
        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all duration-300 ${isDarkMode
            ? 'bg-white/5 border-white/10 hover:bg-white/10'
            : 'bg-white border-pink-100 hover:border-pink-200 shadow-sm'
            }`}>
            {/* Streak Indicator */}
            {(profile.streakCount || 0) > 0 && (
                <div className="flex items-center gap-1 border-r border-gray-100 dark:border-white/10 pr-2">
                    <span className="text-[14px]">🔥</span>
                    <span className={`text-[11px] font-black ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        {profile.streakCount}
                    </span>
                </div>
            )}

            <div className="flex items-center gap-1.5">
                <Heart
                    size={16}
                    className={`${isDarkMode ? 'text-pink-400' : 'text-pink-500'} fill-current animate-pulse`}
                />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#4A2040]'}`}>
                    {profile.hearts || 0}
                </span>
            </div>

            {showAdd && (
                <button
                    onClick={onOpenShop}
                    className={`p-1 rounded-full transition-colors ${isDarkMode ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30' : 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                        }`}
                    title="Open Shop"
                >
                    <Plus size={14} strokeWidth={3} />
                </button>
            )}
        </div>
    );
};

export default WalletWidget;
