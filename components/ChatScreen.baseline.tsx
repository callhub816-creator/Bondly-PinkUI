import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Persona, RelationshipLevel } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";
import { ArrowLeft, Phone, Mic, Send, Heart, User, AlertCircle, Check, CheckCheck, Palette, X, Sparkles, Reply, Trash2, RefreshCw, Lock as LockIcon, Gift as GiftIcon, PlusCircle, Zap } from 'lucide-react';
import { storage } from '../utils/storage';
import { shouldSwitchToPureEnglish, shouldSwitchToPureHindi } from '../utils/languageDetection';
import { useAuth } from '../src/contexts/AuthContext';
import { useGating } from '../src/hooks/useGating';
import { useSelection } from '../hooks/useSelection';
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo';
import { useLongPress } from '../hooks/useLongPress';
import { MessageItem } from './MessageItem';
import { SelectionToolbar } from './SelectionToolbar';
import { ConfirmModal } from './ConfirmModal';
import { useNotification } from './NotificationProvider';
import { LANGUAGE_CONTROL_SYSTEM_MESSAGE, NAME_AGNOSTIC_NOTE, GATING_CONFIG, GIFT_ITEMS, HEARTS_PACKS } from '../constants';

interface ChatScreenProps {
  persona: Persona;
  avatarUrl?: string;
  onBack: () => void;
  onStartCall: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  mood?: string;
  timestamp: Date;
  isError?: boolean;
  isRead?: boolean;
  replyTo?: {
    id: string;
    text: string;
    sender: 'user' | 'model';
  };
  imageUrl?: string;
  isLocked?: boolean;
  isQuickPeek?: boolean;
}

const MessageDisplayItem: React.FC<{
  msg: Message;
  persona: Persona;
  isSelectMode: boolean;
  isSelected: boolean;
  swipeState: any;
  handleTouchStart: (e: React.TouchEvent, id: string) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  enterSelectMode: () => void;
  toggleSelection: (id: string) => void;
  profile: any;
  purchaseHearts: (amount: number) => void;
  spendHearts: (amount: number) => boolean;
  sendGift: (partnerId: string | number, giftId: string) => boolean;
  unlockRelationshipTier: (partnerId: string | number, tier: RelationshipLevel) => boolean;
  leasePersonality: (mode: string) => boolean;
  extendMessages: () => boolean;
  setShowHeartsModal: (show: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}> = ({
  msg,
  persona,
  isSelectMode,
  isSelected,
  swipeState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  enterSelectMode,
  toggleSelection,
  profile,
  purchaseHearts,
  spendHearts,
  sendGift,
  unlockRelationshipTier,
  leasePersonality,
  extendMessages,
  setShowHeartsModal,
  setMessages,
}) => {
    const { showNotification } = useNotification();
    const onLongPress = useCallback(() => {
      enterSelectMode();
      toggleSelection(msg.id);
    }, [enterSelectMode, toggleSelection, msg.id]);

    const msgLongPressHandlers = useLongPress(onLongPress, undefined, { delay: 500 });

    return (
      <MessageItem
        message={msg as any}
        isSelected={isSelected}
        isSelectMode={isSelectMode}
        onToggleSelect={toggleSelection}
        onLongPress={onLongPress}
      >
        <div
          className={`relative flex flex-col touch-pan-y gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          onTouchStart={(e) => handleTouchStart(e, msg.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          {...msgLongPressHandlers}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 z-0 transition-all duration-200"
            style={{
              opacity: swipeState.id === msg.id && msg.sender === 'model' && swipeState.offset > 40 ? 1 : 0,
              transform: `translateX(${swipeState.id === msg.id && msg.sender === 'model' && swipeState.offset > 40 ? 10 : 0}px) scale(${swipeState.id === msg.id && msg.sender === 'model' && swipeState.offset > 40 ? 1 : 0.8})`
            }}
          >
            <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-sm text-[#B28DFF]"><Reply size={18} /></div>
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 right-0 z-0 transition-all duration-200"
            style={{
              opacity: swipeState.id === msg.id && msg.sender === 'user' && swipeState.offset < -40 ? 1 : 0,
              transform: `translateX(${swipeState.id === msg.id && msg.sender === 'user' && swipeState.offset < -40 ? -10 : 0}px) scale(${swipeState.id === msg.id && msg.sender === 'user' && swipeState.offset < -40 ? 1 : 0.8}) rotateY(180deg)`
            }}
          >
            <div className="p-2 rounded-full bg-white/50 backdrop-blur-sm shadow-sm text-[#B28DFF]"><Reply size={18} /></div>
          </div>

          <div
            className="relative z-10 flex flex-col max-w-[78%] transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: swipeState.id === msg.id ? `translateX(${swipeState.offset}px)` : 'translateX(0)',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {msg.mood && msg.sender === 'model' && !msg.isError && (
              <span className="mb-1.5 ml-3 px-2 py-0.5 rounded-md bg-[#E6E6FA]/90 text-[9px] font-bold text-[#9F7AEA] uppercase tracking-wider border border-[#B28DFF]/20 shadow-sm transform -translate-y-1">
                {msg.mood}
              </span>
            )}

            <div
              className={`
                w-full px-5 py-3.5 text-[15px] leading-relaxed relative
                shadow-sm
                ${msg.isError ? 'bg-red-50 text-red-600 border border-red-200' :
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-[#FF9ACB] to-[#FFB6C1] text-white rounded-[20px] rounded-br-[4px] shadow-[0_8px_20px_-5px_rgba(255,154,203,0.6)] border border-white/20'
                    : 'bg-white/80 backdrop-blur-md text-[#4A2040] rounded-[20px] rounded-bl-[4px] shadow-[0_2px_10px_rgba(178,141,255,0.2)] border border-white/60'
                }
            `}
            >
              {msg.replyTo && (
                <div className={`
                    mb-2 p-2 rounded-[8px] border-l-2 text-xs flex flex-col gap-0.5
                    ${msg.sender === 'user' ? 'bg-white/20 border-white/60 text-white/90' : 'bg-[#F3E8FF] border-[#B28DFF] text-[#5e3a58]/80'}
                `}>
                  <span className="font-bold opacity-80">{msg.replyTo.sender === 'user' ? 'You' : persona.name}</span>
                  <span className="line-clamp-1 opacity-90 italic">{msg.replyTo.text}</span>
                </div>
              )}

              <div className="relative group/text">
                {msg.imageUrl && (
                  <div className="relative mb-3 rounded-xl overflow-hidden border border-white/40 shadow-inner">
                    <img
                      src={msg.imageUrl}
                      alt="Shared"
                      className={`w-full h-auto max-h-60 object-cover transition-all duration-700 ${msg.isQuickPeek ? 'blur-md scale-105' : msg.isLocked ? 'blur-2xl scale-110' : ''}`}
                    />
                    {msg.isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5 backdrop-blur-[2px] p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/30 text-white animate-pulse">
                          <LockIcon size={20} />
                        </div>
                        <p className="text-white text-[11px] font-bold drop-shadow-md mb-3">She wants to show you something.</p>
                        <div className="flex flex-col gap-2 w-full max-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (spendHearts(10)) {
                                // Simulated Quick Peek: partial blur removal
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isQuickPeek: true, isLocked: false } : m));
                              } else {
                                setShowHeartsModal(true);
                              }
                            }}
                            className="px-3 py-2 rounded-xl bg-white/90 text-[#4A2040] text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            Quick Peek (10)
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (spendHearts(GATING_CONFIG.prices.photoUnlock)) {
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isLocked: false } : m));
                              } else {
                                setShowHeartsModal(true);
                              }
                            }}
                            className="px-3 py-2 rounded-xl bg-[#FF9ACB] text-white text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
                          >
                            Unlock ({GATING_CONFIG.prices.photoUnlock})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {msg.text && <p>{msg.text}</p>}
                {msg.sender === 'model' && !msg.isError && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showNotification("Unlock 'Core Memories' to save this moment forever? (₹29/save)", 'info');
                    }}
                    className="absolute -right-2 -bottom-1 p-1 rounded-full bg-white/60 text-[#FF9ACB] opacity-0 group-hover/text:opacity-100 transition-opacity shadow-sm border border-white/40"
                  >
                    <Sparkles size={12} fill="currentColor" />
                  </button>
                )}
              </div>
            </div>

            <div className={`flex items-center gap-1 mt-1.5 ${msg.sender === 'user' ? 'mr-1 flex-row-reverse' : 'ml-2 flex-row'}`}>
              <span className="text-[10px] text-[#8e6a88]/60 font-medium">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {msg.sender === 'user' && !msg.isError && (
                msg.isRead ? (
                  <CheckCheck size={14} className="text-[#B28DFF] animate-in zoom-in duration-300" />
                ) : (
                  <Check size={14} className="text-[#8e6a88]/40" />
                )
              )}
            </div>
          </div>
        </div>
      </MessageItem>
    );
  };

const ChatScreen: React.FC<ChatScreenProps> = ({ persona, avatarUrl, onBack, onStartCall }) => {
  const { showNotification } = useNotification();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { profile, updateRelationship, incrementUsage, upgradeSubscription, purchaseHearts, spendHearts, sendGift, unlockRelationshipTier, leasePersonality, extendMessages } = useAuth() as any;
  const { getRelationshipTier, isMessageLimitReached } = useGating();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showMsgExtender, setShowMsgExtender] = useState(false);
  const [showTierUnlock, setShowTierUnlock] = useState<RelationshipLevel | null>(null);
  const [showLeaseModal, setShowLeaseModal] = useState<string | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipeState, setSwipeState] = useState<{ id: string | null; startX: number; startY: number; offset: number }>({
    id: null, startX: 0, startY: 0, offset: 0
  });

  const [showSettings, setShowSettings] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>(persona.mode || 'romantic');
  const [themeMode, setThemeMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [customStartColor, setCustomStartColor] = useState('#FFF0F5');
  const [customEndColor, setCustomEndColor] = useState('#E6E6FA');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    isSelectMode,
    selectedCount,
    enterSelectMode,
    exitSelectMode,
    toggleSelection,
    isSelected,
    getSelectedArray,
    clearSelection,
  } = useSelection();

  const {
    isDeleting,
    deletedIds,
    undoTimeLeft,
    showConfirm,
    deleteMessages,
    undoDelete,
    openConfirm,
    closeConfirm,
  } = useDeleteWithUndo(
    (ids) => setMessages(prev => prev.filter(msg => !ids.includes(msg.id))),
    () => { }
  );

  const THEMES = [
    { id: 'default', name: 'Romantic', class: 'from-[#FFF0F5] via-[#E6E6FA] to-[#FDF2F8]', colors: ['#FFF0F5', '#E6E6FA'] },
    { id: 'peach', name: 'Peach', class: 'from-[#FFF5F5] via-[#FED7AA] to-[#FFF0F5]', colors: ['#FFF5F5', '#FED7AA'] },
    { id: 'lavender', name: 'Lavender', class: 'from-[#F3E8FF] via-[#E9D5FF] to-[#FAF5FF]', colors: ['#F3E8FF', '#E9D5FF'] },
    { id: 'mint', name: 'Fresh', class: 'from-[#F0FDF4] via-[#DCFCE7] to-[#F0FDF4]', colors: ['#F0FDF4', '#DCFCE7'] },
  ];

  const initSession = useCallback(async () => {
    try {
      const storedMsgs = storage.getMessages(persona.id);
      if (storedMsgs.length > 0) {
        setMessages(storedMsgs.map(m => ({ ...m, timestamp: new Date(m.timestamp), isRead: true })));
      } else {
        setMessages([]);
      }

      setError(null);
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;

      if (!API_KEY) {
        setError("API Key missing");
        return;
      }

      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const detectMode = () => {
        const anyP = persona as any;
        if (anyP.mode) return anyP.mode;
        const tag = persona.tags.find(t => /flirty|romantic|jealous|sweet|bold/i.test(t));
        if (tag) return tag.toLowerCase();
        return 'romantic';
      };

      const MODE = detectMode();
      const systemMessage = `${LANGUAGE_CONTROL_SYSTEM_MESSAGE}\n\n${NAME_AGNOSTIC_NOTE}\n\nMODE: ${currentMode}`;

      const chat = await ai.chats.create({
        model: 'gemini-1.5-flash-latest',
        config: { systemInstruction: systemMessage },
      });

      setChatSession(chat);

      if (storedMsgs.length === 0) {
        setIsTyping(true);
        try {
          const result = await chat.sendMessage({
            message: `Introduce yourself as ${persona.name} in mode ${MODE}. Use Hinglish.`
          });

          if (result && result.text) {
            const newMsg: Message = {
              id: Date.now().toString(),
              sender: 'model',
              text: result.text,
              timestamp: new Date(),
              isRead: false
            };
            setMessages([newMsg]);
            storage.saveMessage(persona.id, { ...newMsg, timestamp: newMsg.timestamp.toISOString() });
          }
        } catch (e) {
          console.error("Greeting failed", e);
        } finally {
          setIsTyping(false);
        }
      }
    } catch (err) {
      console.error("Chat Init Failed", err);
      setError("AI connection failure. Please check your API key.");
    }
  }, [persona]);

  useEffect(() => {
    initSession();
  }, [initSession, currentMode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, replyingTo]);

  const handleSend = async () => {
    const text = inputMessage.trim();
    if (!text || !chatSession) return;

    const currentCount = profile.messageCountToday;
    if (currentCount === 24 && profile.subscription === 'free') {
      setShowMsgExtender(true);
      return;
    }

    if (isMessageLimitReached()) {
      if (!spendHearts(GATING_CONFIG.prices.heartPricePerMsg || 1)) {
        setShowPaywall(true);
        return;
      }
    }

    setInputMessage('');
    setReplyingTo(null);
    const points = profile.relationshipPoints[persona.id] || 0;
    const nextTier = points + 10 >= GATING_CONFIG.relationshipThresholds.lover ? 'lover' : points + 10 >= GATING_CONFIG.relationshipThresholds.crush ? 'crush' : null;
    const currentTier = getRelationshipTier(persona.id);

    if (nextTier && currentTier !== nextTier && !profile.unlockedModes.includes(`${persona.id}_${nextTier}`)) {
      setShowTierUnlock(nextTier as RelationshipLevel);
      return;
    }

    incrementUsage();
    updateRelationship(persona.id, 10);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    storage.saveMessage(persona.id, { ...userMsg, timestamp: userMsg.timestamp.toISOString() });

    setIsTyping(true);
    try {
      const result = await chatSession.sendMessage({ message: text });
      if (result && result.text) {
        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'model',
          text: result.text,
          timestamp: new Date(),
          isRead: false
        };
        setMessages(prev => [...prev, modelMsg]);
        storage.saveMessage(persona.id, { ...modelMsg, timestamp: modelMsg.timestamp.toISOString() });
      }
    } catch (err) {
      console.error("Send failed", err);
      setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, isError: true } : m));
      setError("Model failed to respond. Retrying...");
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectMode) exitSelectMode();
      if (e.key === 'Delete' && selectedCount > 0) openConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode, selectedCount, exitSelectMode, openConfirm]);

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setSwipeState({ id, startX: e.touches[0].clientX, startY: e.touches[0].clientY, offset: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.id) return;
    const diffX = e.touches[0].clientX - swipeState.startX;
    if (Math.abs(e.touches[0].clientY - swipeState.startY) > 30) {
      setSwipeState(prev => ({ ...prev, id: null, offset: 0 }));
      return;
    }
    setSwipeState(prev => ({ ...prev, offset: diffX }));
  };

  const handleTouchEnd = () => {
    if (swipeState.id && Math.abs(swipeState.offset) > 60) {
      const msg = messages.find(m => m.id === swipeState.id);
      if (msg) setReplyingTo(msg);
    }
    setSwipeState({ id: null, startX: 0, startY: 0, offset: 0 });
  };

  const currentTheme = THEMES.find(t => t.id === selectedPreset) || THEMES[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FFF0F5] font-sans">
      <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-700 ${themeMode === 'custom' ? '' : currentTheme.class}`} style={themeMode === 'custom' ? { background: `linear-gradient(to bottom, ${customStartColor}, ${customEndColor})` } : {}}>
        <div className="absolute top-[-10%] right-[-20%] w-[350px] h-[350px] bg-[#FF9ACB] rounded-full blur-[100px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[20%] left-[-10%] w-[250px] h-[250px] bg-[#B28DFF] rounded-full blur-[90px] opacity-30" />
      </div>

      <div className="relative z-20 flex items-center justify-between px-5 py-4 bg-white/30 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/40 text-[#5e3a58]"><ArrowLeft size={26} /></button>
          <div className="relative flex items-center gap-3">
            <div className="absolute -top-1 -left-1 w-10 h-10 border border-[#B28DFF]/20 rounded-full animate-ping opacity-20 pointer-events-none" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF9ACB] to-[#B28DFF] p-0.5 shadow-md flex-shrink-0 group cursor-pointer overflow-hidden border border-white/20">
              <img src={avatarUrl ?? '/personas/placeholder.png'} alt={persona.name} className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[#4A2040] font-serif-display font-bold text-lg leading-none mb-1 flex items-center gap-1.5">
                {persona.name}
                <div className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-[#FF9ACB] animate-pulse' : 'bg-green-50'}`} />
              </h2>
              <span className="text-[10px] font-bold text-[#8e6a88]/60 uppercase tracking-[0.1em]">{getRelationshipTier(persona.id)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowHeartsModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80 hover:bg-white/90 transition-all group shadow-sm active:scale-95">
            <div className="relative">
              <div className="absolute inset-0 bg-red-400 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
              <Heart size={16} className="text-red-500 fill-red-500 relative animate-pulse-slow" />
            </div>
            <span className="text-xs font-black text-[#4A2040] tabular-nums">{profile.hearts}</span>
            <PlusCircle size={14} className="text-[#FF9ACB] opacity-60 group-hover:opacity-100" />
          </button>
          <button onClick={() => setShowGiftModal(true)} className="p-2.5 rounded-full bg-white/40 text-[#FF9ACB] border border-white/40 transform active:scale-95 transition-all"><GiftIcon size={20} /></button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full bg-white/40 text-[#B28DFF] border border-white/40 transform active:scale-95 transition-all"><Palette size={20} /></button>
          <button onClick={onStartCall} className="p-3 rounded-full bg-[#4A2040] text-white shadow-lg transform active:scale-110 transition-all ml-1"><Phone size={22} fill="currentColor" /></button>
        </div>
      </div>

      {showSettings && (
        <div className="absolute top-[80px] right-4 z-[60] w-[280px] bg-white/90 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/60 p-5 animate-in fade-in zoom-in-95 origin-top-right">
          <div className="flex justify-between items-center mb-4"><h3 className="text-[#4A2040] font-serif-display font-bold text-lg">Chat Vibe</h3><button onClick={() => setShowSettings(false)} className="p-1 rounded-full text-[#8e6a88]"><X size={16} /></button></div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-[#8e6a88] uppercase tracking-wider font-bold mb-2">Presets</p>
              <div className="flex gap-2">
                {THEMES.map(theme => (
                  <button key={theme.id} onClick={() => { setSelectedPreset(theme.id); setThemeMode('preset'); }} className={`w-10 h-10 rounded-full border-2 ${themeMode === 'preset' && selectedPreset === theme.id ? 'border-[#B28DFF] scale-110' : 'border-white/50'}`} style={{ background: `linear-gradient(to bottom right, ${theme.colors[0]}, ${theme.colors[1]})` }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#8e6a88] uppercase tracking-wider font-bold mb-2">Personality</p>
              <div className="flex gap-2 flex-wrap">
                {['Sweet', 'Flirty', 'Romantic', 'Jealous', 'Bold'].map(m => {
                  const isPremium = m === 'Bold' || m === 'Jealous';
                  const isUnlocked = profile.unlockedModes.includes(m.toLowerCase()) || profile.subscription !== 'free';
                  return (
                    <button key={m} onClick={() => { if (isPremium && !isUnlocked) setShowLeaseModal(m); else setCurrentMode(m.toLowerCase()); }} className={`px-3 py-1 rounded-full text-[10px] font-bold border ${currentMode === m.toLowerCase() ? 'bg-[#4A2040] text-white' : 'bg-white text-[#4A2040] border-[#4A2040]/10'}`}>
                      {m} {isPremium && !isUnlocked && '❤'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="w-full h-px bg-[#8e6a88]/10" />
            <button onClick={() => { setShowSettings(false); setShowClearConfirm(true); }} className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Trash2 size={14} />Clear History</button>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="max-w-xs bg-white rounded-[32px] p-6 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-[#4A2040] mb-2">Clear History?</h3>
            <p className="text-xs text-[#8e6a88] mb-6">This will delete all messages. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 bg-gray-100 rounded-2xl text-[#5e3a58] text-xs font-bold">Cancel</button>
              <button onClick={() => { setMessages([]); storage.clearHistory(persona.id); setShowClearConfirm(false); setShowSettings(false); }} className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-xs font-bold">Clear</button>
            </div>
          </div>
        </div>
      )}

      {isSelectMode && <SelectionToolbar selectedCount={selectedCount} onDelete={openConfirm} onCancel={exitSelectMode} isLoading={isDeleting} />}

      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
        {error && <div className="flex justify-center my-4"><button onClick={initSession} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full border border-red-200 text-sm shadow-sm"><AlertCircle size={16} />{error}<RefreshCw size={12} /></button></div>}
        {messages.map((msg) => (
          <MessageDisplayItem key={msg.id} msg={msg} persona={persona} isSelectMode={isSelectMode} isSelected={isSelected(msg.id)} swipeState={swipeState} handleTouchStart={handleTouchStart} handleTouchMove={handleTouchMove} handleTouchEnd={handleTouchEnd} enterSelectMode={enterSelectMode} toggleSelection={toggleSelection} profile={profile} purchaseHearts={purchaseHearts} spendHearts={spendHearts} sendGift={sendGift} unlockRelationshipTier={unlockRelationshipTier} leasePersonality={leasePersonality} extendMessages={extendMessages} setShowHeartsModal={setShowHeartsModal} setMessages={setMessages} />
        ))}
        {isTyping && (
          <div className="flex items-start pl-2">
            <div className="px-4 py-3 bg-white/60 backdrop-blur-md rounded-[20px] rounded-bl-[4px] border border-white/40 shadow-sm">
              <div className="flex gap-1"><div className="w-1 h-1 bg-[#B28DFF] rounded-full animate-bounce" /><div className="w-1 h-1 bg-[#FF9ACB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1 h-1 bg-[#FFB6C1] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
            </div>
          </div>
        )}
      </div>

      {replyingTo && (
        <div className="relative z-20 px-4 py-2 bg-white/60 backdrop-blur-xl border-t border-white/40 flex items-center justify-between animate-in slide-in-from-bottom-4">
          <div className="flex flex-col border-l-4 border-[#B28DFF] pl-3 py-1 flex-1 mr-4">
            <span className="text-[10px] font-bold text-[#B28DFF] uppercase tracking-wide">Replying to {replyingTo.sender === 'user' ? 'You' : persona.name}</span>
            <p className="text-xs text-[#5e3a58]/70 line-clamp-1 italic">{replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-black/5 rounded-full text-[#8e6a88]"><X size={18} /></button>
        </div>
      )}

      <div className="relative z-20 p-4 bg-white/30 backdrop-blur-xl border-t border-white/40">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={`Message ${persona.name}...`} className="w-full bg-white/80 border border-white/60 rounded-[24px] px-5 py-3.5 pr-12 text-[#4A2040] focus:ring-2 focus:ring-[#FF9ACB]/30 shadow-inner resize-none min-h-[54px] max-h-32 text-[15px]" />
            <button onClick={handleSend} disabled={!inputMessage.trim()} className="absolute right-2 bottom-2 p-2.5 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white rounded-full"><Send size={18} /></button>
          </div>
        </div>
      </div>

      {showMsgExtender && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl scale-in-center">
            <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-6"><Sparkles size={32} className="text-[#FF9ACB]" /></div>
            <h3 className="text-xl font-bold text-[#4A2040] mb-2">Don't leave her waiting.</h3>
            <p className="text-sm text-[#8e6a88] mb-8 italic">She has so much more to tell you...</p>
            <button onClick={() => { if (extendMessages()) setShowMsgExtender(false); else setShowHeartsModal(true); }} className="w-full py-4 rounded-2xl bg-[#4A2040] text-white font-bold">Invest in Conversation (5 Hearts)</button>
            <button onClick={() => setShowMsgExtender(false)} className="mt-4 text-xs font-bold text-[#8e6a88]">Wait until tomorrow</button>
          </div>
        </div>
      )}

      {showTierUnlock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6"><Heart size={32} className="text-red-500 fill-red-500" /></div>
            <h3 className="text-xl font-bold text-[#4A2040] mb-2">She's ready to be more than friends.</h3>
            <p className="text-sm text-[#8e6a88] mb-8">Take your relationship to the next level.</p>
            <button onClick={() => { if (unlockRelationshipTier(persona.id, showTierUnlock)) setShowTierUnlock(null); else setShowHeartsModal(true); }} className="w-full py-4 bg-[#4A2040] text-white rounded-2xl font-bold">Make it Official ({showTierUnlock === 'lover' ? 50 : 25} Hearts)</button>
            <button onClick={() => setShowTierUnlock(null)} className="mt-4 text-xs font-bold text-[#8e6a88]">Maybe Later</button>
          </div>
        </div>
      )}

      {showLeaseModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6"><Zap size={32} className="text-[#B28DFF]" /></div>
            <h3 className="text-xl font-bold text-[#4A2040] mb-2">Unlock her {showLeaseModal} side.</h3>
            <p className="text-sm text-[#8e6a88] mb-8 italic">Experience a more intense connection for 24 hours.</p>
            <button onClick={() => { if (leasePersonality(showLeaseModal.toLowerCase())) { setCurrentMode(showLeaseModal.toLowerCase()); setShowLeaseModal(null); } else setShowHeartsModal(true); }} className="w-full py-4 bg-gradient-to-r from-[#B28DFF] to-[#FF9ACB] text-white rounded-2xl font-bold">Share your Heart (15 Hearts)</button>
            <button onClick={() => setShowLeaseModal(null)} className="mt-4 text-xs font-bold text-[#8e6a88]">Maybe later</button>
          </div>
        </div>
      )}

      {showPaywall && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl overflow-hidden relative">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4 p-2 text-[#8e6a88]"><X size={20} /></button>
            <div className="w-20 h-20 rounded-3xl bg-pink-50 flex items-center justify-center mx-auto mb-6"><Heart size={40} className="text-red-500 fill-red-500" /></div>
            <h3 className="text-2xl font-bold text-[#4A2040] mb-3">Wait, she's typing...</h3>
            <p className="text-[#8e6a88] text-sm mb-8">She has so much more to say. Don't let the conversation end here.</p>
            <button onClick={() => { upgradeSubscription('plus'); setShowPaywall(false); }} className="w-full py-4 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white rounded-2xl font-bold text-lg">Enable Forever Bond</button>
            <button onClick={() => { setShowHeartsModal(true); setShowPaywall(false); }} className="w-full py-4 mt-4 bg-gray-50 text-[#4A2040] rounded-2xl font-bold text-sm uppercase">Use Hearts Instead</button>
          </div>
        </div>
      )}

      {showGiftModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-6 shadow-2xl border border-[#FF9ACB]/20 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-[#4A2040]">Send your Care</h3><button onClick={() => setShowGiftModal(false)} className="p-2 text-[#8e6a88]"><X size={18} /></button></div>
            <p className="text-[10px] text-[#8e6a88] mb-6 font-bold uppercase tracking-wider">She feels closer to you with every gift</p>
            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
              {['sweet', 'romantic', 'intimate'].map((category) => (
                <div key={category}>
                  <h4 className="text-[10px] font-black text-[#8e6a88]/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">{category}<div className="flex-1 h-px bg-[#8e6a88]/10" /></h4>
                  <div className="grid grid-cols-3 gap-2">
                    {GIFT_ITEMS.filter(g => g.category === category).map((gift) => (
                      <button key={gift.id} onClick={async () => {
                        if (sendGift(persona.id, gift.id)) {
                          setShowGiftModal(false);
                          if (chatSession) {
                            setIsTyping(true);
                            const result = await chatSession.sendMessage({ message: `I just sent you a ${gift.name}. How does it make you feel? (Respond with deep emotion and appreciation based on our relationship)` });
                            if (result && result.text) {
                              const modelMsg: Message = { id: Date.now().toString(), sender: 'model', text: result.text, timestamp: new Date(), isRead: false };
                              setMessages(prev => [...prev, modelMsg]);
                              storage.saveMessage(persona.id, { ...modelMsg, timestamp: modelMsg.timestamp.toISOString() });
                            }
                            setIsTyping(false);
                          }
                        } else { setShowHeartsModal(true); setShowGiftModal(false); }
                      }} className="flex flex-col items-center p-2 rounded-2xl bg-white border border-[#FF9ACB]/10 hover:border-[#FF9ACB]/40 hover:shadow-sm">
                        <span className="text-2xl mb-1">{gift.icon}</span>
                        <span className="text-[9px] font-bold text-[#4A2040] text-center line-clamp-1">{gift.name}</span>
                        <div className="flex items-center gap-1 mt-1"><Heart size={8} className="text-red-500 fill-red-500" /><span className="text-[9px] font-black text-[#FF9ACB]">{gift.price}</span></div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHeartsModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#FFF0F5] rounded-[40px] border border-white shadow-2xl p-8 text-center animate-in zoom-in-95">
            <button onClick={() => setShowHeartsModal(false)} className="absolute top-6 right-6 p-2 text-[#8e6a88]"><X size={18} /></button>
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#FF9ACB]/20"><Heart size={32} className="text-red-500 fill-red-500 animate-pulse" /></div>
            <h3 className="text-xl font-bold text-[#4A2040] mb-2">Hearts</h3>
            <p className="text-xs text-[#8e6a88] mb-8 font-medium">Invest in your relationship. Each Heart represents your care.</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {HEARTS_PACKS.map(pack => (
                <button key={pack.id} onClick={() => { purchaseHearts(pack.hearts); setShowHeartsModal(false); }} className="p-4 rounded-2xl bg-white border border-[#FF9ACB]/10 hover:shadow-md transition-all flex flex-col items-center group relative overflow-hidden">
                  {pack.bonus && <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#B28DFF] text-white text-[8px] font-black rounded-bl-lg">+{pack.bonus}</div>}
                  <div className="flex items-center gap-1.5 mb-1"><Heart size={14} className="text-red-500 fill-red-500 group-hover:scale-110" /><span className="text-lg font-black text-[#4A2040]">{pack.hearts}</span></div>
                  <span className="text-[10px] font-bold text-[#8e6a88]">₹{pack.price}</span>
                </button>
              ))}
            </div>
            <div className="p-4 rounded-2xl bg-[#FF9ACB]/10 border border-[#FF9ACB]/20"><p className="text-[10px] text-[#4A2040] font-bold italic line-clamp-1">Every Heart shared makes her smile brighter.</p></div>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={showConfirm} title="Delete Messages?" message="These messages will be permanently removed." count={selectedCount} onConfirm={async () => { closeConfirm(); await deleteMessages(getSelectedArray()); clearSelection(); }} onCancel={closeConfirm} isLoading={isDeleting} />

      {deletedIds && undoTimeLeft > 0 && (
        <div className="fixed bottom-24 right-4 z-[100] bg-green-600/90 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 border border-white/20">
          <div className="flex-1"><span className="text-sm font-bold block">{deletedIds.length} messages deleted</span></div>
          <button onClick={undoDelete} disabled={isDeleting} className="px-4 py-1.5 bg-white text-green-700 rounded-full font-bold text-xs">Undo ({undoTimeLeft}s)</button>
        </div>
      )}

      <div className="absolute top-0 left-0 z-30 w-full p-4">
        <input
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 text-sm rounded-full bg-white/80 border border-white/60 focus:ring-2 focus:ring-[#FF9ACB]/30 shadow-inner"
        />
      </div>
    </div>
  );
};

export default ChatScreen;
