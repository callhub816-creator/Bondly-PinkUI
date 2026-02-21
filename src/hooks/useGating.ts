import { useAuth } from '../contexts/AuthContext';
import { GATING_CONFIG } from '../../constants';
import { ConnectionLevel } from '../../types';

export const useGating = () => {
    const { profile } = useAuth();

    const getConnectionTier = (companionId: string | number): ConnectionLevel => {
        const points = profile.connectionPoints[companionId] || 0;
        const thresholds = {
            friend: 100,
            close: 500,
            trusted: 1000
        };

        if (points >= thresholds.trusted) return 'trusted';
        if (points >= thresholds.close) return 'close';
        if (points >= thresholds.friend) return 'friend';
        return 'stranger';
    };

    const isMessageLimitReached = () => {
        // STARTER and CORE plans give unlimited chat
        if (profile.subscription === 'starter' || profile.subscription === 'core' || profile.subscription === 'plus') return false;

        const limit = GATING_CONFIG.plans.free.dailyLimit;
        return (profile.messageCountToday || 0) >= limit;
    };

    const isNightTimeLocked = () => {
        const hour = new Date().getHours();
        // 11 PM (23) to 4 AM (4)
        const isNight = hour >= 23 || hour < 4;

        if (!isNight) return false;

        // Paid plans are never locked
        if (profile.subscription !== 'free') return false;

        return true;
    };

    const getResponseDelay = () => {
        if (profile.subscription !== 'free') return 800; // Snappy for paid
        return 3500; // Natural delay for free
    };

    const isPersonaLocked = (personaId: string | number) => {
        // Personas are unlocked for CORE and PLUS
        if (profile.subscription === 'core' || profile.subscription === 'plus') return false;

        // Personas with ID > 2 are Locked for FREE and STARTER
        const id = typeof personaId === 'string' ? parseInt(personaId) : personaId;
        return id > 2;
    };

    const canAccessMode = (modeTitle: string) => {
        if (profile.subscription !== 'free') return true;

        // Only 'Interactive Chat' is free by default
        return modeTitle === 'Interactive Chat';
    };

    const canCall = () => {
        // Only CORE and PLUS can call
        return profile.subscription === 'core' || profile.subscription === 'plus';
    };

    return {
        getConnectionTier,
        isMessageLimitReached,
        isNightTimeLocked,
        getResponseDelay,
        isPersonaLocked,
        canAccessMode,
        canCall,
        subscription: profile.subscription,
        messageCount: profile.messageCountToday
    };
};
