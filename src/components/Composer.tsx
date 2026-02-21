import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types/chat';
import { useNotification } from '../../components/NotificationProvider';
import { detectLanguage, getLanguageLabel } from '../utils/detectLanguage';
import { shouldSwitchToPureEnglish, shouldSwitchToPureHindi } from '../../utils/languageDetection';

interface ComposerProps {
  onSendMessage: (body: string, replyTo?: string, langHint?: 'hinglish' | 'english') => Promise<void>;
  isLoading?: boolean;
  quotedMessage?: Message | null;
  onClearQuote?: () => void;
  editingMessage?: Message | null;
  onClearEdit?: () => void;
  onTyping?: () => void;
  onEditSave?: (messageId: string, newBody: string) => Promise<void>;
  preferredLanguage?: 'auto' | 'hinglish' | 'english';
  onSetPreferredLanguage?: (lang: 'auto' | 'hinglish' | 'english') => Promise<void> | void;
}

/**
 * Composer: message input + send button
 * Features:
 * - Textarea with auto-expand
 * - Quoted reply block (WhatsApp-style)
 * - Edit mode (pre-filled message)
 * - Send loading state
 * - Keyboard: Shift+Enter for newline, Enter to send
 */
export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isLoading = false,
  quotedMessage,
  onClearQuote,
  editingMessage,
  onClearEdit,
  onTyping,
  onEditSave,
  preferredLanguage,
  onSetPreferredLanguage,
}) => {
  const { showNotification } = useNotification();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill textarea when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.body);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const replyTo = quotedMessage?.id;
      // Determine language hint
      // Default to Hinglish unless user explicitly requests pure English.
      const userPref = preferredLanguage ?? 'auto';
      let langHint: 'hinglish' | 'english';
      if (userPref !== 'auto') {
        langHint = userPref as 'hinglish' | 'english';
      } else if (shouldSwitchToPureEnglish(text.trim())) {
        langHint = 'english';
      } else {
        // Default behavior: always prefer Hinglish unless explicitly asked for English
        langHint = 'hinglish';
      }

      if (editingMessage) {
        // Save edit instead of sending new message
        await onEditSave?.(editingMessage.id, text.trim());
      } else {
        // Send new message with lang_hint
        await onSendMessage(text.trim(), replyTo, langHint);
      }

      setText('');
      onClearQuote?.();
      onClearEdit?.();
    } catch (err) {
      console.error('Failed to send message:', err);
      showNotification('Failed to send message. Please try again.', 'error');
    }
  };

  return (
    <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 p-4 space-y-3 transition-colors relative z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
      {/* Language toggle */}
      <div className="flex items-center gap-3 justify-end pointer-events-auto">
        <label className="text-xs font-medium text-pink-300/80 drop-shadow-[0_0_2px_rgba(236,72,153,0.5)]">Reply Language:</label>
        <div className="relative group">
          <select
            value={preferredLanguage || 'auto'}
            onChange={(e) => onSetPreferredLanguage?.(e.target.value as any)}
            className="appearance-none bg-black/40 border border-pink-500/30 text-white text-xs rounded-full px-4 py-1.5 focus:outline-none focus:border-pink-500 hover:bg-white/5 transition-colors cursor-pointer pr-8"
            aria-label="Preferred language"
          >
            <option value="auto" className="bg-gray-900 text-white">Auto (Smart)</option>
            <option value="hinglish" className="bg-gray-900 text-white">Hinglish (Casual)</option>
            <option value="english" className="bg-gray-900 text-white">English (Formal)</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-pink-400 text-[10px]">▼</div>
        </div>
      </div>
      {/* Quoted reply block */}
      {quotedMessage && (
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border-l-4 border-pink-500 backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in">
          <div className="flex-1">
            <p className="text-xs font-bold text-pink-400 mb-1">Replying to {quotedMessage.sender?.full_name || 'User'}</p>
            <p className="text-sm text-gray-300 truncate italic border-l-2 border-white/20 pl-2">{quotedMessage.body}</p>
          </div>
          <button
            onClick={onClearQuote}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      {editingMessage && (
        <div className="flex items-center gap-3 bg-blue-50 p-3 rounded border-l-4 border-blue-500">
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-600">Editing message</p>
          </div>
          <button
            onClick={onClearEdit}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Cancel edit"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative group">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-3 rounded-2xl focus:outline-none focus:border-pink-500/50 focus:bg-white/10 focus:ring-1 focus:ring-pink-500/30 resize-none transition-all shadow-inner"
            rows={1}
            disabled={isLoading}
            aria-label="Message input"
          />
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-pink-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
        </div>

        <button
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
          className="h-[46px] w-[46px] flex items-center justify-center bg-gradient-to-br from-pink-600 to-purple-600 text-white rounded-full shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.6)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-[10px] text-gray-500 text-center opacity-0 group-hover:opacity-100 transition-opacity delay-500">
        <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Enter</span> to send
      </p>
    </div>
  );
};

export default Composer;
