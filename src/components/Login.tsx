
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';
import { User, Lock, Heart, Shield, Eye, EyeOff } from 'lucide-react';

const Login: React.FC<{ onSwitchToSignup: () => void }> = ({ onSwitchToSignup }) => {
  const { signIn } = useAuth();
  const { showNotification } = useNotification();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setPasswordError(null);

    if (!username) { setUsernameError('Please enter your username'); return; }
    if (!password) { setPasswordError('Please enter your password'); return; }

    setLoading(true);
    try {
      const result = await signIn(username, password);

      if (result && result.error) {
        const { message, field } = result.error;
        if (field === 'username') {
          setUsernameError(message);
        } else if (field === 'password') {
          setPasswordError(message);
        } else {
          // Generic fallback — show on password field
          setPasswordError(message || 'Login failed. Try again.');
        }
        return;
      }

      // Success
      window.location.href = '/';
    } catch (err: any) {
      setPasswordError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      <div className="relative z-10 bg-white/50 backdrop-blur-2xl border border-white p-6 rounded-[40px] shadow-[0_20px_60px_rgba(255,154,203,0.2)]">

        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-2xl flex items-center justify-center shadow-lg mb-3 rotate-6">
            <Heart size={24} className="text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-serif-display font-bold text-[#4A2040]">Login</h2>
          <p className="text-[#8E6A88] text-xs">Chat with your AI companion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* USERNAME FIELD */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-[#4A2040] ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                value={username}
                placeholder="Enter Username"
                onChange={(e) => { setUsername(e.target.value); setUsernameError(null); }}
                className={`w-full pl-11 pr-4 py-3.5 bg-white border rounded-[18px] focus:outline-none focus:ring-2 transition-all text-[#4A2040] placeholder-gray-400 text-[15px] ${usernameError
                    ? 'border-red-400 ring-1 ring-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-[#FF9ACB]/20 focus:border-[#FF9ACB]'
                  }`}
              />
            </div>
            {usernameError && (
              <p className="text-[12px] text-red-500 mt-1 ml-1 font-semibold animate-in fade-in slide-in-from-top-1 flex items-center gap-1">
                ✗ {usernameError}
              </p>
            )}
          </div>

          {/* PASSWORD FIELD */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-[#4A2040] ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                placeholder="Enter Password"
                onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                className={`w-full pl-11 pr-12 py-3.5 bg-white border rounded-[18px] focus:outline-none focus:ring-2 transition-all text-[#4A2040] placeholder-gray-400 text-[15px] password-input ${passwordError
                    ? 'border-red-400 ring-1 ring-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-[#FF9ACB]/20 focus:border-[#FF9ACB]'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#FF9ACB] hover:text-[#D53F8C] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[12px] text-red-500 mt-1 ml-1 font-semibold animate-in fade-in slide-in-from-top-1 flex items-center gap-1">
                ✗ {passwordError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-1 pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-[#FF9ACB] focus:ring-[#FF9ACB]/30 cursor-pointer"
                defaultChecked
              />
              <span className="text-[14px] text-[#8E6A88] font-medium group-hover:text-[#4A2040] transition-colors">Stay Logged in</span>
            </label>
            <button type="button" className="text-[14px] text-[#FF9ACB] hover:text-[#D53F8C] font-semibold transition-colors">
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 text-[16px]"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Login</span>}
          </button>
        </form>

        <style>{`
          .password-input::-ms-reveal, .password-input::-ms-clear { display: none; }
          input[type="password"]::-webkit-contacts-auto-fill-button,
          input[type="password"]::-webkit-credentials-auto-fill-button {
            visibility: hidden; display: none !important;
            pointer-events: none; position: absolute; right: 0;
          }
        `}</style>

        <p className="text-center text-xs text-[#8E6A88] mt-4">
          No account?{' '}
          <button type="button" onClick={onSwitchToSignup} className="text-[#D53F8C] font-bold hover:underline">
            Create one free
          </button>
        </p>

        <div className="mt-6 pt-4 border-t border-[#B28DFF]/10 flex flex-col items-center gap-2 opacity-50">
          <div className="flex items-center gap-1.5">
            <Shield size={10} />
            <span className="text-[9px] font-bold uppercase tracking-widest text-center">
              Strictly 18+ Only | Private v2.1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
