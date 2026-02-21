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
}

const ChatScreen: React.FC<ChatScreenProps> = ({ persona, onBack, onStartCall, isDarkMode, onOpenShop }) => {
  const { profile, user, spendHearts } = useAuth();
  const { showNotification } = useNotification();
  const { isMessageLimitReached, isNightTimeLocked } = useGating();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ... (useEffect for history loading same as before)
  useEffect(() => {
    const saved = storage.getMessages(persona.id);
    const msgs = saved.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    setMessages(msgs);
  }, [persona.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (resendText?: string, isVoice?: boolean) => {
    const text = resendText || inputText;
    if (!text.trim() || isTyping) return;

    // CHECK GATING
    if (isMessageLimitReached()) {
      showNotification("Daily message limit reached! Unlock unlimited chat to continue.", 'info');
      return;
    }

    if (isNightTimeLocked()) {
      showNotification("Night session locked! Starter Pass required to talk now.", 'info');
      return;
    }

    // SPEND HEART LOGIC
    const heartCost = isVoice ? 3 : 1;
    if (profile.subscription === 'free') {
      const success = spendHearts(heartCost);
      if (!success) {
        showNotification(`Not enough Hearts! Voice notes cost ${heartCost} hearts. ❤️`, 'hearts');
        onOpenShop();
        return;
      }
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    storage.saveMessage(persona.id, { ...newUserMsg, timestamp: newUserMsg.timestamp.toISOString() });
    if (!resendText) setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          chatId: persona.id,
          isVoiceNote: isVoice
        })
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      const aiMsgData = data.aiMessage;

      if (!aiMsgData) throw new Error("Invalid response");

      // Handle TTS Error Display
      if (aiMsgData.error) {
        showNotification(aiMsgData.error, 'error');
      }

      const modelMsg: Message = {
        id: aiMsgData.id || Date.now().toString(),
        sender: 'model',
        text: aiMsgData.body,
        timestamp: new Date(),
        audioUrl: aiMsgData.audioUrl
      };

      setMessages(prev => [...prev, modelMsg]);
      storage.saveMessage(persona.id, { ...modelMsg, timestamp: modelMsg.timestamp.toISOString() });

      // Error logged silently for stability
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-[#FDF2F8] text-[#4A2040]'}`}>

      {/* Header */}
      <header className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#0B0E14] border-white/10' : 'bg-white border-pink-100'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-pink-200 overflow-hidden border-2 border-white">
              <img src={persona.avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-sm">{persona.name}</h2>
              <span className="text-[10px] opacity-60 italic">Online</span>
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
              {msg.text}
              {msg.audioUrl && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <audio controls src={msg.audioUrl} className="h-8 w-full max-w-[200px]" />
                </div>
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
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Write something to ${persona.name}...`}
              className="flex-1 bg-transparent text-[15px] font-medium placeholder:opacity-40 p-0"
              style={{
                color: isDarkMode ? 'white' : '#4A2040',
                outline: 'none',
                border: 'none',
                boxShadow: 'none',
                WebkitAppearance: 'none'
              }}
            />
          </div>

          {/* Action Button: Voice Note */}
          <button
            onClick={() => handleSend(inputText, true)}
            disabled={!inputText.trim() || isTyping}
            className={`relative p-3 rounded-2xl transition-all duration-300 active:scale-90 ${isDarkMode
              ? 'bg-white/5 text-purple-400 border border-white/10'
              : 'bg-white text-purple-500 border border-purple-100'
              } ${(!inputText.trim() || isTyping) ? 'opacity-50' : 'hover:scale-110'}`}
          >
            <Mic size={22} strokeWidth={2.5} />
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse whitespace-nowrap">
              3 ❤️ (70% OFF)
            </div>
          </button>

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
      </footer>
    </div>
  );
};

export default ChatScreen;
