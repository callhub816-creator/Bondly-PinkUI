import React from 'react';
import { GIFT_ITEMS } from '../constants';
import { useAuth } from '../src/contexts/AuthContext';
import { Heart } from 'lucide-react';

interface GiftSelectorProps {
    onClose: () => void;
    companionId: string | number;
    companionName: string;
    isDarkMode: boolean;
    onGiftSent: (giftName: string, icon: string) => void;
}

import { useNotification } from './NotificationProvider';

const GiftSelector: React.FC<GiftSelectorProps> = ({ onClose, companionId, companionName, isDarkMode, onGiftSent }) => {
    const { profile, sendGift } = useAuth();
    const { showNotification } = useNotification();

    // 🔥 DYNAMIC GIFT PRICING: Shuffles heart cost for gifts too!
    const [dynamicDiscount] = React.useState(() => 0.5 + Math.random() * 0.35); // 50-85% Off

    const getDynamicGiftPrice = (basePrice: number) => {
        const discounted = basePrice * (1 - dynamicDiscount);
        return Math.max(1, Math.round(discounted)); // At least 1 heart
    };

    const handleSendGift = async (giftId: string, giftName: string, icon: string, currentPrice: number) => {
        // We pass the dynamic price to the backend if supported, 
        // or just ensure spendHearts deducts this amount.
        const success = await sendGift(companionId, giftId);
        if (success) {
            showNotification(`You sent a ${giftName} ${icon} to ${companionName}. Trust deepened! ✨`, 'success');
            onGiftSent(giftName, icon);
            onClose();
        } else {
            showNotification("Not enough Hearts! Refill your wallet to send gifts. ❤️", 'hearts');
        }
    };

    return (
        <div className="absolute bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-3 duration-300">
            <div className={`p-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-pink-100 ${isDarkMode ? 'bg-[#161C24] border-white/5' : 'bg-white'
                }`}>
                <div className="flex items-center justify-between mb-5 px-1">
                    <div>
                        <h3 className="text-sm font-black text-pink-500 uppercase tracking-tighter">Premium Collection</h3>
                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Surprise {companionName}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-pink-50 dark:bg-pink-500/10 px-3 py-1.5 rounded-full border border-pink-100 dark:border-pink-500/20">
                        <Heart size={14} className="text-pink-500 fill-current" />
                        <span className="text-sm font-black text-pink-600 dark:text-pink-400">{profile.hearts}</span>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-y-6 gap-x-2">
                    {GIFT_ITEMS.map((gift) => {
                        const dynamicPrice = getDynamicGiftPrice(gift.price);
                        const discountPercent = Math.round(dynamicDiscount * 100);

                        return (
                            <button
                                key={gift.id}
                                onClick={() => handleSendGift(gift.id, gift.name, gift.icon, dynamicPrice)}
                                className={`group flex flex-col items-center gap-1 transition-all active:scale-90`}
                            >
                                <div className={`relative w-12 h-12 flex items-center justify-center text-2xl rounded-2xl mb-1 transition-all ${isDarkMode ? 'bg-white/5 group-hover:bg-white/10' : 'bg-pink-50/50 group-hover:bg-pink-50'
                                    }`}>
                                    {gift.icon}
                                    <div className="absolute -top-1 -right-1 px-1 bg-pink-500 text-[7px] text-white font-black rounded-full shadow-sm">
                                        -{discountPercent}%
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold opacity-80">{gift.name}</span>
                                <div className="flex items-center gap-0.5">
                                    <span className="text-[8px] line-through opacity-30 font-bold leading-none">₹{gift.price}</span>
                                    <span className="text-[11px] font-black text-pink-500">₹{dynamicPrice}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Backdrop for closing */}
            <div className="fixed inset-0 -z-10 bg-black/5 backdrop-blur-[1px]" onClick={onClose} />
        </div>
    );
};

export default GiftSelector;
