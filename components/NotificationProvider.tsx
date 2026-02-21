
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, Heart } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'hearts';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const playSound = useCallback(() => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
            audio.volume = 0.4;
            audio.play().catch(e => console.debug("Audio play blocked by browser policy"));
        } catch (e) {
            console.debug("Audio init failed");
        }
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType = 'info', duration: number = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, type, message, duration }]);
        playSound();

        setTimeout(() => {
            removeNotification(id);
        }, duration);
    }, [removeNotification, playSound]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-20 right-4 z-[10000] flex flex-col gap-3 pointer-events-none max-w-[90vw] sm:max-w-md">
                {notifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} onRemove={removeNotification} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({
    notification,
    onRemove,
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onRemove(notification.id), 300);
    };

    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
        hearts: <Heart className="text-pink-500 fill-pink-500" size={20} />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-100',
        error: 'bg-red-50 border-red-100',
        info: 'bg-blue-50 border-blue-100',
        hearts: 'bg-pink-50 border-pink-100',
    };

    return (
        <div
            className={`
        pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md
        transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${bgColors[notification.type]}
      `}
        >
            <div className="shrink-0">{icons[notification.type]}</div>
            <p className="text-sm font-bold text-[#4A2040] pr-6">{notification.message}</p>
            <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-[#4A2040]/40 hover:text-[#4A2040] transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};
