// Types for chat messages and calls
export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  reply_to?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  soft_delete_expires_at?: string | null;
  lang_hint?: 'hinglish' | 'english' | null;
  created_at: string;
  role?: string; // Added for D1 compatibility
  sender?: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
  repliedMessage?: Message | null;
  audioUrl?: string;
}

export interface ChatUser {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface CallRecord {
  call_id: string;
  caller_id: string;
  callee_id: string;
  start_ts: string;
  end_ts?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  preferred_reply_language?: 'auto' | 'hinglish' | 'english';
  created_at?: string;
  updated_at?: string;
}

// Typing indicator event
export interface TypingIndicator {
  chat_id: string;
  user_id: string;
  typing: boolean;
}

// Message read receipt
export interface ReadReceipt {
  message_id: string;
  user_id: string;
  readAt: string;
}

export const isMessageDeleted = (msg: Message): boolean => !!msg.deleted_at;

export const formatTimestamp = (ts: string): string => {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const truncateText = (text: string, length: number = 50): string => {
  return text.length > length ? text.slice(0, length) + '...' : text;
};
