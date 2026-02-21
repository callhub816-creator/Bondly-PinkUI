import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { detectLanguage } from '../utils/detectLanguage';
import { canEditMessage as canEditMessageUtil } from '../utils/editUtils';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { useNotification } from '../../components/NotificationProvider';
import { useAuth } from '../contexts/AuthContext'; // Added useAuth
import type { Message } from '../types/chat';
import type { Persona } from '../types'; // Corrected import source for Persona
import { Lock, Moon } from 'lucide-react'; // Added icons

interface ChatScreenProps {
  persona: Persona;
  avatarUrl?: string;
  onBack: () => void;
  onStartCall: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  onOpenShop: () => void;
}

/**
 * Chat Screen Component
 * - Midnight Trap Logic: Limits free users to 5 messages at night.
 */
export const ChatScreen: React.FC<ChatScreenProps> = ({
  persona,
  avatarUrl,
  onBack,
  onStartCall,
  isDarkMode,
  setIsDarkMode,
  onOpenShop
}) => {
  const { user, profile } = useAuth();
  const userId = user?.id || 'guest';

  const { messages, loading, sendMessage, deleteMessage, restoreMessage, editMessage, setPreferredLanguage, isTyping } = useChat({
    chatId: persona.id,
    userId,
  });

  const { showNotification } = useNotification();

  // Night Mode Logic
  // Independent Night Logic for Trap (10 PM - 6 AM)
  const isNightTime = (() => {
    const h = new Date().getHours();
    return h >= 22 || h < 6;
  })(); // Calculated on render
  const isPremium = profile?.subscription_tier === 'plus' || profile?.subscription_tier === 'pro';
  const NIGHT_MESSAGE_LIMIT = 5;

  // Count user messages sent in the last session window or just total length if simplistic
  // Ideally we track specific night messages, but for now we limit TOTAL interaction if in night mode
  // A better approach: local counter for "messages sent this session"
  const [sessionMsgCount, setSessionMsgCount] = useState(0);
  const isTrapActive = isNightTime && !isPremium;
  const isBlocked = isTrapActive && sessionMsgCount >= NIGHT_MESSAGE_LIMIT;

  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deletedUndoMap, setDeletedUndoMap] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [languagePreference, setLanguagePreference] = useState<'auto' | 'hinglish' | 'english'>('auto');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const listRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle reply
  const handleReply = useCallback((message: Message) => {
    setQuotedMessage(message);
  }, []);

  // Handle message delete with undo
  const handleDeleteWithUndo = useCallback(
    (messageId: string) => {
      // Soft delete immediately
      // deleteMessage(messageId); // Disabled in Migration MVP

      // Add to undo map with 10s timer
      const timeoutId = setTimeout(() => {
        setDeletedUndoMap((prev) => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      }, 10000);

      setDeletedUndoMap((prev) => new Map(prev).set(messageId, timeoutId));
    },
    [deleteMessage]
  );

  // Handle undo delete
  const handleUndoDelete = useCallback(
    (messageId: string) => {
      const timeout = deletedUndoMap.get(messageId);
      if (timeout) {
        clearTimeout(timeout);
      }
      // restoreMessage(messageId); // Disabled in Migration MVP
      setDeletedUndoMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
    },
    [deletedUndoMap, restoreMessage]
  );

  // Handle message send
  const handleSendMessage = useCallback(
    async (body: string, replyTo?: string) => {
      // Midnight Trap Check
      if (isBlocked) {
        showNotification("It's late... Unlock Night Pass to message her.", 'error');
        onOpenShop();
        return;
      }

      try {
        const langHint = languagePreference === 'auto' ? detectLanguage(body) : languagePreference;

        await sendMessage(body, replyTo, langHint);

        // Increment session count if in trap mode
        if (isTrapActive) {
          setSessionMsgCount(prev => prev + 1);
        }

        setQuotedMessage(null);
        setEditingMessage(null);

        // Broadcast typing stop
        broadcastTyping(false);
      } catch (err: any) {
        if (err.message === 'INSUFFICIENT_HEARTS') {
          showNotification("You're out of hearts! ❤️", 'error');
          onOpenShop();
        } else {
          console.error('Failed to send message:', err);
        }
      }
    },
    [languagePreference, sendMessage, isBlocked, isTrapActive, showNotification, onOpenShop]
  );

  // Handle edit save
  const handleEditSave = useCallback(
    async (messageId: string, newBody: string) => {
      try {
        await editMessage(messageId, newBody);
        setEditingMessage(null);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [editMessage]
  );

  // Broadcast typing indicator
  const broadcastTyping = useCallback((typing: boolean) => {
    // TODO: Implement realtime typing broadcast via Supabase channel
    console.log('Typing:', typing);
  }, []);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    broadcastTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 1000);
  }, [broadcastTyping]);

  // Multi-select handlers
  const handleSelectMessages = useCallback((ids: string[]) => {
    setSelectedMessageIds(new Set(ids));
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedMessageIds.size === 0) return;

    if (!window.confirm(`Delete ${selectedMessageIds.size} message(s)? This can be undone for 10 seconds.`)) {
      return;
    }

    selectedMessageIds.forEach((id) => {
      handleDeleteWithUndo(id);
    });

    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
  }, [selectedMessageIds, handleDeleteWithUndo]);

  // Edit message check (5 minute window)
  const canEditMessage = (message: Message): boolean => {
    return canEditMessageUtil(message.created_at, userId, message.sender_id);
  };

  // Scroll to message when quoted message is clicked
  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index >= 0 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [messages]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#05000a] bg-[linear-gradient(rgba(236,72,153,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,0.1)_1px,transparent_1px)] bg-[size:40px_40px] relative overflow-hidden isolate">
      {/* Ambient Glow */}
      <div className="absolute inset-0 z-[-1] pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-purple-900/30 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-pink-900/20 rounded-full blur-[120px]" />
      </div>
      {/* Chat Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden text-white/80 hover:text-white">
            ←
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-purple-200 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">{persona.name}</h2>
            {typingUsers.size > 0 && <p className="text-xs text-pink-300 font-medium animate-pulse drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]">typing…</p>}
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          ref={listRef}
          messages={messages}
          currentUserId={userId}
          onReply={handleReply}
          onDelete={handleDeleteWithUndo}
          onEdit={(msg) => {
            if (canEditMessage(msg)) {
              setEditingMessage(msg);
            } else {
              showNotification('Can only edit messages within 5 minutes of sending.', 'info');
            }
          }}
          onSelect={handleSelectMessages}
          selectedMessageIds={selectedMessageIds}
          isSelectionMode={isSelectionMode}
          onScrollToMessage={scrollToMessage}
          deletedUndoMap={deletedUndoMap}
          onUndoDelete={handleUndoDelete}
          canEditMessage={canEditMessage}
          chatHeight={500}
        />
      </div>

      {/* Night Trap Overlay */}
      {isBlocked && (
        <div className="absolute inset-x-0 bottom-0 top-[60px] z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
          <Moon className="w-16 h-16 text-purple-400 mb-6 animate-pulse" />
          <div className="relative mb-4">
            <Lock className="w-8 h-8 text-white relative z-10" />
            <div className="absolute inset-0 bg-pink-500 blur-lg opacity-50"></div>
          </div>
          <h2 className="text-3xl font-serif text-white mb-3">It's Late...</h2>
          <p className="text-purple-200/80 mb-8 max-w-sm leading-relaxed">
            She is in <span className="text-pink-400 font-bold">Midnight Mode</span>.
            <br />Unlock Night Pass to whisper secrets.
          </p>
          <button
            onClick={onOpenShop}
            className="group relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:scale-105 transition-transform overflow-hidden"
          >
            <span className="relative z-10">Unlock Night Access</span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
      )}

      {/* Selection Toolbar */}
      {isSelectionMode && selectedMessageIds.size > 0 && (
        <div className="bg-gray-100 dark:bg-[#1A1F2C] px-4 py-3 border-t border-gray-300 dark:border-white/10 flex items-center justify-between text-gray-900 dark:text-gray-100 transition-colors">
          <span className="text-sm font-semibold">
            {selectedMessageIds.size} message(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedMessageIds(new Set());
                setIsSelectionMode(false);
              }}
              className="px-3 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Language Preference Toggle */}
      <div className="px-4 py-2 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center gap-2 transition-colors">
        <label className="text-xs font-semibold text-pink-300/80 drop-shadow-[0_0_2px_rgba(236,72,153,0.5)]">Reply language:</label>
        <select
          value={languagePreference}
          onChange={(e) => setLanguagePreference(e.target.value as any)}
          className="px-2 py-1 text-xs border border-white/20 rounded bg-black/60 text-white focus:outline-none focus:border-pink-500 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <option value="auto" className="bg-gray-900">Auto-detect</option>
          <option value="hinglish" className="bg-gray-900">हिंग्लिश</option>
          <option value="english" className="bg-gray-900">English</option>
        </select>
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md flex items-center gap-2">
          <span className="text-xs text-pink-400/80 animate-pulse">Jennifer is typing...</span>
        </div>
      )}

      {/* Composer */}
      <Composer
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        quotedMessage={quotedMessage}
        onClearQuote={() => setQuotedMessage(null)}
        editingMessage={editingMessage}
        onClearEdit={() => setEditingMessage(null)}
        onEditSave={handleEditSave}
        preferredLanguage={languagePreference}
        onSetPreferredLanguage={(lang) => {
          setLanguagePreference(lang);
          // persist to profiles
          setPreferredLanguage?.(lang).catch((e) => console.debug('Failed to persist language:', e));
        }}
      />

      {/* Selection Mode Toggle (Mobile) */}
      <div className="px-4 py-2 bg-black/40 backdrop-blur-md border-t border-white/10 flex gap-2 transition-colors">
        <button
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            if (!isSelectionMode) {
              setSelectedMessageIds(new Set());
            }
          }}
          className={`text-xs px-3 py-1 rounded transition-colors ${isSelectionMode
            ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.4)]'
            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/5'
            }`}
        >
          {isSelectionMode ? '✓ Selection ON' : 'Select'}
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;
