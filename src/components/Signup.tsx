
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Heart, Sparkles, CheckCircle, Shield, Eye, EyeOff } from 'lucide-react';

const Signup: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const { signUp } = useAuth();
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
