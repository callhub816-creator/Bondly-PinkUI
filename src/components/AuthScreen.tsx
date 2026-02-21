
import React, { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';

const AuthScreen: React.FC = () => {
    const [view, setView] = useState<'login' | 'signup'>('login');

    // Sync with URL and listen for changes
    useEffect(() => {
        const handleLocationChange = () => {
            const path = window.location.pathname;
            if (path === '/signup') setView('signup');
            else setView('login');
        };

        handleLocationChange();
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    const toggleView = (newView: 'login' | 'signup') => {
        setView(newView);
        window.history.pushState({}, '', newView === 'login' ? '/login' : '/signup');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FDF2F8] p-4 relative overflow-hidden font-sans">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[5%] left-[5%] w-64 h-64 bg-[#FF9ACB]/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[5%] right-[5%] w-80 h-80 bg-[#B28DFF]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Main Auth Container - Direct Card */}
            <div className="relative z-10 w-full flex justify-center py-2 animate-in fade-in zoom-in duration-700">
                {view === 'login' ? (
                    <Login onSwitchToSignup={() => toggleView('signup')} />
                ) : (
                    <Signup onSwitchToLogin={() => toggleView('login')} />
                )}
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0) rotate(6deg); }
                    50% { transform: translateY(-10px) rotate(8deg); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default AuthScreen;
