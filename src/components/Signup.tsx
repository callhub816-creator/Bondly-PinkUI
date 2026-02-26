
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';
import { User, Lock, Heart, Sparkles, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react';

const Signup: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const { signInWithProvider, signUpWithEmail } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await signInWithProvider('google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      <div className="relative z-10 bg-white/50 backdrop-blur-2xl border border-white p-6 rounded-[40px] shadow-[0_20px_60px_rgba(255,154,203,0.2)]">

        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-2xl flex items-center justify-center shadow-lg mb-3 rotate-6">
            <Sparkles size={24} className="text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-serif-display font-bold text-[#4A2040]">Sign Up</h2>
          <p className="text-[#8E6A88] text-xs">Join the Bondly experience</p>
        </div>

        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
          }
          if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
          }
          setLoading(true);
          try {
            await signUpWithEmail(email, password);
          } finally {
            setLoading(false);
          }
        }}>
          <div>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-white border border-[#FDF2F8] px-4 py-3.5 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/50 transition-all font-medium text-[#4A2040]"
                required
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="password-input w-full bg-white border border-[#FDF2F8] px-4 py-3.5 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/50 transition-all font-medium text-[#4A2040]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E6A88] hover:text-[#4A2040] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(255,154,203,0.3)] hover:shadow-[0_12px_25px_rgba(255,154,203,0.4)] hover:scale-[1.02] active:scale-95 transition-all text-[15px] flex items-center justify-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create Account"}
          </button>

          <div className="relative flex items-center gap-4 my-2">
            <div className="h-px bg-black flex-1 opacity-[0.05]" />
            <span className="text-[11px] font-bold tracking-widest text-[#8E6A88] uppercase">OR</span>
            <div className="h-px bg-black flex-1 opacity-[0.05]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-3.5 bg-white border border-gray-200 text-[#4A2040] font-bold rounded-2xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 text-[15px]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path fill="none" d="M1 1h22v22H1z" /></svg>
            <span>Sign up with Google</span>
          </button>
        </form>

        <p className="text-center text-[12px] text-[#8E6A88] mt-4">
          Already a member?{' '}
          <button type="button" onClick={onSwitchToLogin} className="text-[#D53F8C] font-bold hover:underline">
            Login here
          </button>
        </p>

        <div className="mt-6 pt-4 border-t border-[#B28DFF]/10 flex flex-col items-center gap-2 opacity-50">
          <div className="flex items-center gap-1.5 text-center">
            <Shield size={10} />
            <span className="text-[9px] font-bold uppercase tracking-widest leading-tight">
              Strictly 18+ Only | Private AI support
            </span>
          </div>
        </div>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Signup;
