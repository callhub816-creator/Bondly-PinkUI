
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Heart, Sparkles, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react';

const Signup: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const { signUp, signInWithProvider } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !displayName || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signUp(username, displayName, password);

      if (result && result.error) {
        setError(result.error.message);
        return;
      }

      window.location.href = '/';
    } catch (err: any) {
      setError('Connection failed. Please try again.');
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#4A2040]/60 uppercase tracking-wider ml-1">Username (Login ID)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                placeholder="Unique Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/20 focus:border-[#FF9ACB] transition-all text-[#4A2040] placeholder-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#4A2040]/60 uppercase tracking-wider ml-1">Nickname (Public Name)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
                <Sparkles size={16} />
              </div>
              <input
                type="text"
                required
                placeholder="How AI should call you"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/20 focus:border-[#FF9ACB] transition-all text-[#4A2040] placeholder-gray-300 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#4A2040]/60 uppercase tracking-wider ml-1">Security Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white/80 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/20 focus:border-[#FF9ACB] transition-all text-[#4A2040] placeholder-gray-300 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#FF9ACB]/50 hover:text-[#FF9ACB]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-lg hover:shadow-pink-200/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 text-sm"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Create Account</span>}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-semibold text-gray-400 uppercase">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            type="button"
            onClick={() => signInWithProvider('google')}
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
