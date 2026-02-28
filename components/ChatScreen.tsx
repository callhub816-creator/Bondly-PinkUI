import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Persona } from '../types';
import { ArrowLeft, Phone, Mic, Send, Heart, X, Sparkles, RefreshCw, Lock as LockIcon, Gift as GiftIcon } from 'lucide-react';
import { storage } from '../utils/storage';
import { useAuth } from '../src/contexts/AuthContext';
import { useGating } from '../src/hooks/useGating';
import { detectIntent } from '../utils/intentDetector';
import WalletWidget from './WalletWidget';
import GiftSelector from './GiftSelector';
import { PERSONA_PROMPTS, FALLBACK_REPLIES } from '../src/config/personaConfig';
import { NAME_AGNOSTIC_NOTE, LANGUAGE_CONTROL_SYSTEM_MESSAGE, QUALITY_BOOSTER, HEARTS_SYSTEM_MESSAGE } from '../constants';
import { useNotification } from './NotificationProvider';

interface ChatScreenProps {
  persona: Persona;
  avatarUrl?: string;
  onBack: () => void;
  onStartCall: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onOpenShop: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
  audioUrl?: string;
  isLocked?: boolean;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ persona, onBack, onStartCall, isDarkMode, onOpenShop }) => {
  const { profile, user, spendHearts } = useAuth();
  const { showNotification } = useNotification();
  const { isMessageLimitReached, isNightTimeLocked } = useGating();

  // 🔥 CORE STATES (Fixed missing variables)
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🔥 Auto-grow Height Logic for Input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // 🔥 PROGRESSION LOGIC
  const connectionPoints = profile?.connectionPoints?.[persona.id] || 0;

  const getLevel = (points: number) => {
    if (points >= 1000) return { label: 'Best Friend', color: 'bg-gradient-to-r from-purple-500 to-pink-500', min: 1000, max: 2000 };
    if (points >= 500) return { label: 'Trusted', color: 'bg-pink-500', min: 500, max: 1000 };
    if (points >= 200) return { label: 'Close Friend', color: 'bg-pink-400', min: 200, max: 500 };
    if (points >= 50) return { label: 'Friend', color: 'bg-blue-400', min: 50, max: 200 };
    return { label: 'Stranger', color: 'bg-gray-400', min: 0, max: 50 };
  };

  const level = getLevel(connectionPoints);
  const progressPercent = Math.min(100, ((connectionPoints - level.min) / (level.max - level.min)) * 100);

  // 🔥 MOOD LOGIC
  const [currentMood, setCurrentMood] = useState('Happy');
  const moods = ['Happy', 'Missing You', 'Teasing', 'Sassy', 'Thoughtful', 'Blushing'];

  useEffect(() => {
    const saved = storage.getMessages(persona.id);
    const msgs = saved.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    setMessages(msgs);
  }, [persona.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const shuffleMood = () => {
    const newMood = moods[Math.floor(Math.random() * moods.length)];
    setCurrentMood(newMood);
  };

  const handleSend = async (resendText?: string) => {
    const text = resendText || inputText;
    if (!text.trim() || isTyping) return;

    // CHECK GATING
    if (isMessageLimitReached()) {
      showNotification("Daily Limit Reached! Get a pass for unlimited chat. 🚀", "hearts");
      onOpenShop();
      return;
    }
    if (isNightTimeLocked()) {
      showNotification("Ayesha is resting! 😴 Unlock 24-Hour Access Pass to talk now.", "hearts");
      onOpenShop();
      return;
    }

    // SPEND HEART LOGIC (Free users only)
    if (profile.subscription === 'free') {
      const success = spendHearts(1);
      if (!success) {
        showNotification("Not enough Hearts! ❤️", 'hearts');
        onOpenShop();
        return;
      }
    }

    const newUserMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, newUserMsg]);
    storage.saveMessage(persona.id, { ...newUserMsg, timestamp: newUserMsg.timestamp.toISOString() });
    if (!resendText) setInputText('');
    setIsTyping(true);

    try {
      // Shuffles mood every few messages for realism
      if (messages.length % 5 === 0) shuffleMood();

      const res = await fetch('/api/chat/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chatId: persona.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const aiMsgData = data.aiMessage;

      // 🔥 SIMULATE HUMAN TYPING DELAY
      // Base delay (reading) + Character-based delay (typing)
      const readingTime = 800;
      const typingSpeed = 25; // ms per character
      const calculatedDelay = Math.min(readingTime + (aiMsgData.body.length * typingSpeed), 4000);

      await new Promise(resolve => setTimeout(resolve, calculatedDelay));

      setMessages(prev => {
        // Trigger Lock every 10 messages for free users
        const isLocked = prev.length > 0 && (prev.length + 1) % 10 === 0 && profile.subscription === 'free';

        const modelMsg: Message = {
          id: aiMsgData.id || Date.now().toString(),
          sender: 'model',
          text: aiMsgData.body,
          timestamp: new Date(),
          isLocked
        };
        const updated = [...prev, modelMsg];
        storage.saveMessage(persona.id, { ...modelMsg, timestamp: modelMsg.timestamp.toISOString() });
        return updated;
      });

    } catch (err: any) {
      setMessages(prev => [...prev, { id: 'err', sender: 'model', text: err.message, timestamp: new Date(), isError: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleUnlockMessage = (msgId: string) => {
    const cost = 3; // Lowered from 5 per user request
    if ((profile.hearts ?? 0) < cost) {
      showNotification(`Needs ${cost} Hearts to unlock this private thought! ❤️`, 'hearts');
      onOpenShop();
      return;
    }

    const success = spendHearts(cost);
    if (success) {
      setMessages(prev => {
        const updated = prev.map(m => m.id === msgId ? { ...m, isLocked: false } : m);
        // Resave the unlocked version
        const unlockedMsg = updated.find(m => m.id === msgId);
        if (unlockedMsg) storage.saveMessage(persona.id, { ...unlockedMsg, timestamp: unlockedMsg.timestamp.toISOString() });
        return updated;
      });
      showNotification("Letter Unlocked! ✨", 'success');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-[#FDF2F8] text-[#4A2040]'}`}>
      <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-[#FDF2F8] text-[#4A2040]'} sm:max-w-[640px] sm:mx-auto`}>
        {/* Header */}
        <header className={`px-4 py-3 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-pink-100 shadow-sm'} z-20`}>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={persona.avatarUrl} alt={persona.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/20" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#0B0E14] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[15px] leading-tight flex items-center gap-1.5">
                  {persona.name}
                  <span className="text-[10px] px-1.5 py-0.5 bg-pink-500/10 text-pink-500 rounded-md uppercase font-black tracking-tighter">
                    {currentMood}
                  </span>
                </span>
                {/* Relationship Bar */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-20 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${level.color}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{level.label}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WalletWidget isDarkMode={isDarkMode} onOpenShop={onOpenShop} />
            <button
              onClick={onStartCall}
              className={`p-2.5 rounded-full transition-all active:scale-95 border ${isDarkMode
                ? 'bg-white/10 text-pink-400 border-white/20 hover:bg-white/20'
                : 'bg-pink-50 text-pink-500 border-pink-200 hover:bg-pink-100 shadow-sm'
                }`}
            >
              <Phone size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${msg.sender === 'user'
                ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-br-none'
                : msg.isError
                  ? 'bg-red-50 border border-red-200 text-red-600 text-xs'
                  : isDarkMode ? 'bg-white/10 text-white rounded-bl-none' : 'bg-white text-[#4A2040] rounded-bl-none border border-pink-50'
                }`}>
                {msg.isLocked ? (
                  <div className="flex flex-col items-center gap-2 py-4 px-2">
                    <div className="p-3 bg-pink-500/20 rounded-full animate-pulse">
                      <LockIcon size={24} className="text-pink-500" />
                    </div>
                    <p className="text-[12px] font-bold text-center opacity-80 leading-snug">
                      "{persona.name} sent a private thought..."
                    </p>
                    <button
                      onClick={() => handleUnlockMessage(msg.id)}
                      className="mt-2 px-4 py-2 bg-pink-500 text-white rounded-xl text-[11px] font-black shadow-lg shadow-pink-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Heart size={12} fill="white" /> UNLOCK (5 HEARTS)
                    </button>
                  </div>
                ) : (
                  <>
                    {msg.text}
                    {msg.audioUrl && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <audio controls src={msg.audioUrl} className="h-8 w-full max-w-[200px]" />
                      </div>
                    )}
                  </>
                )}
              </div>
              <span className="text-[9px] opacity-40 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-1 p-2">
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* Input Section */}
        <footer className={`relative p-4 pb-8 border-t transition-colors ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-gray-100'
          }`}>

          {isGiftOpen && (
            <GiftSelector
              isDarkMode={isDarkMode}
              companionId={persona.id}
              companionName={persona.name}
              onClose={() => setIsGiftOpen(false)}
              onGiftSent={(name, icon) => {
                const giftText = `*Gifts ${name} ${icon}*`;
                handleSend(giftText);
              }}
            />
          )}

          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            {/* Action Button: Gift */}
            <button
              onClick={() => setIsGiftOpen(!isGiftOpen)}
              className={`p-3 rounded-2xl transition-all duration-300 active:scale-90 ${isGiftOpen
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                : isDarkMode
                  ? 'bg-white/5 text-pink-400 border border-white/10 hover:bg-white/10'
                  : 'bg-white text-pink-500 border border-pink-100 shadow-sm hover:border-pink-300'
                }`}
            >
              <GiftIcon size={22} strokeWidth={2.5} />
            </button>

            {/* Main Input Box (NUCLEAR FOCUS FIX) */}
            <div className={`flex-1 flex items-center px-5 py-3 rounded-[24px] border-2 transition-all duration-300 ${isDarkMode
              ? 'bg-white/5 border-white/10 focus-within:border-pink-500/50'
              : 'bg-white border-[#FF69B4] focus-within:border-[#FF1A8C] shadow-[0_0_15px_rgba(255,105,180,0.15)]'
              }`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Write to ${persona.name}...`}
                className="flex-1 bg-transparent text-[15px] font-medium placeholder:opacity-40 p-0 resize-none min-h-[22px] max-h-[120px] py-1"
                style={{
                  color: isDarkMode ? 'white' : '#4A2040',
                  outline: 'none',
                  border: 'none',
                  boxShadow: 'none',
                  overflowY: (textareaRef.current?.scrollHeight || 0) > 120 ? 'auto' : 'hidden'
                }}
              />
            </div>

            {/* Action Button: Send */}
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              className={`p-3.5 rounded-2xl transition-all duration-300 active:scale-90 shadow-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] text-white ${!inputText.trim() || isTyping
                ? 'opacity-50 cursor-not-allowed shadow-none grayscale-[0.3]'
                : 'shadow-pink-500/30 ring-2 ring-pink-200/50 hover:scale-105'
                }`}
            >
              <Send size={22} fill="currentColor" strokeWidth={2.5} />
            </button>
          </div>

          {/* 🔥 Impulse Buy (Low Hearts Hook) */}
          {(profile.hearts ?? 0) <= 2 && profile.subscription === 'free' && (
            <div className="mt-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-r from-yellow-100 to-pink-100 dark:from-yellow-900/40 dark:to-pink-900/40 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-700/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-400 rounded-xl shadow-sm">
                    <Sparkles size={18} className="text-black" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold">Low on Credits? 💔</h4>
                    <p className="text-[10px] opacity-70 font-semibold uppercase tracking-tight">Welcome Offer: 50 Credits for ₹49</p>
                  </div>
                </div>
                <button
                  onClick={onOpenShop}
                  className="px-4 py-2 bg-black text-white dark:bg-pink-500 text-[11px] font-black rounded-xl active:scale-95 transition-all shadow-lg"
                >
                  GET NOW
                </button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ChatScreen;
