
import { Persona } from '../types';

// Keys for Local Storage
const COMPANIONS_KEY = 'bondly_local_companions';
// New required prefix as requested: chat_history_<id>
const CHATS_PREFIX = 'chat_history_';

interface StoredCompanion extends Persona {
  createdAt: number;
  retentionUntil: number;
}

interface StoredMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  mood?: string;
  reactions?: string[];
  audioUrl?: string; // Voice note data
  timestamp: string; // ISO
}

export const storage = {
  getCompanions: (): StoredCompanion[] => {
    try {
      const raw = localStorage.getItem(COMPANIONS_KEY);
      if (!raw) return [];

      const companions: StoredCompanion[] = JSON.parse(raw);

      // Filter out expired companions automatically
      const validCompanions = companions.filter(p => p.retentionUntil >= Date.now());

      // If we filtered some out, update storage immediately
      if (validCompanions.length !== companions.length) {
        localStorage.setItem(COMPANIONS_KEY, JSON.stringify(validCompanions));
        // Also cleanup their chats
        companions.forEach(p => {
          if (p.retentionUntil < Date.now()) {
            localStorage.removeItem(CHATS_PREFIX + p.id);
          }
        });
      }

      return validCompanions;
    } catch (e) {
      console.error("Storage Read Error", e);
      return [];
    }
  },

  saveCompanion: (persona: Persona) => {
    const companions = storage.getCompanions();
    const now = Date.now();
    const retentionDate = now + 7 * 24 * 60 * 60 * 1000; // +7 Days

    const newCompanion: StoredCompanion = {
      ...persona,
      createdAt: now,
      retentionUntil: retentionDate
    };

    // Remove existing if updating
    const updatedList = [newCompanion, ...companions.filter(p => p.id !== persona.id)];
    localStorage.setItem(COMPANIONS_KEY, JSON.stringify(updatedList));
    return newCompanion;
  },

  deleteCompanion: (id: string | number) => {
    const companions = storage.getCompanions();
    const updated = companions.filter(p => p.id !== id);
    localStorage.setItem(COMPANIONS_KEY, JSON.stringify(updated));
    localStorage.removeItem(CHATS_PREFIX + id);
  },

  extendRetention: (id: string | number) => {
    const companions = storage.getCompanions();
    const companion = companions.find(p => p.id === id);
    if (companion) {
      // Add 7 days to current expiry
      companion.retentionUntil = companion.retentionUntil + 7 * 24 * 60 * 60 * 1000;

      localStorage.setItem(COMPANIONS_KEY, JSON.stringify(companions));
      return companion;
    }
    return null;
  },

  // --- CHATS ---

  getMessages: (companionId: string | number): StoredMessage[] => {
    try {
      const raw = localStorage.getItem(CHATS_PREFIX + companionId);
      if (!raw) return [];
      const messages: StoredMessage[] = JSON.parse(raw);

      // Keep only messages from the last 7 days
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = messages.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        return !isNaN(ts) && ts >= cutoff;
      });

      // If some old messages were present, overwrite storage with only recent ones
      if (recent.length !== messages.length) {
        if (recent.length > 0) {
          localStorage.setItem(CHATS_PREFIX + companionId, JSON.stringify(recent));
        } else {
          localStorage.removeItem(CHATS_PREFIX + companionId);
        }
      }

      return recent;
    } catch (e) {
      console.error('Storage: Error getting messages', e);
      return [];
    }
  },

  saveMessage: (companionId: string | number, message: StoredMessage) => {
    try {
      const messages = storage.getMessages(companionId);
      messages.push(message);
      // Keep only last 100 messages to avoid excessive storage growth
      const pruned = messages.slice(-100);
      localStorage.setItem(CHATS_PREFIX + companionId, JSON.stringify(pruned));
    } catch (e) {
      console.error('Storage: Error saving message', e);
    }
  },

  saveMessages: (companionId: string | number, messages: StoredMessage[]) => {
    try {
      // Keep only last 100 messages
      const pruned = messages.slice(-100);
      localStorage.setItem(CHATS_PREFIX + companionId, JSON.stringify(pruned));
    } catch (e) {
      console.error('Storage saveMessages error', e);
    }
  },

  deleteMessages: (companionId: string | number, messageIds: string[]) => {
    try {
      const messages = storage.getMessages(companionId);
      const filtered = messages.filter(m => !messageIds.includes(m.id));
      localStorage.setItem(CHATS_PREFIX + companionId, JSON.stringify(filtered));
    } catch (e) {
      console.error('Storage deleteMessages error', e);
    }
  },

  clearHistory: (companionId: string | number) => {
    localStorage.removeItem(CHATS_PREFIX + companionId);
  },

  // Clear all chat_history_* keys (used when user logs out)
  clearAllHistories: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith(CHATS_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.error('Storage clearAllHistories error', e);
    }
  },

  // --- USER PROFILE & USAGE ---

  getProfile: (): UserProfile => {
    const defaultProfile: UserProfile = {
      id: 'local_user',
      subscription: 'free',
      connectionPoints: {},
      messageCountToday: 0,
      lastActive: new Date().toISOString(),
      voiceMinutesLeft: 0,
      unlockedModes: [],
      hearts: 20,
      midnightPassExpiry: undefined,
      sessionsCount: 0,
      streakCount: 0,
      earningsHistory: [],
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya'
    };

    try {
      const raw = localStorage.getItem('bondly_user_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...defaultProfile,
          ...parsed,
          connectionPoints: parsed.connectionPoints || {},
          unlockedModes: parsed.unlockedModes || [],
          earningsHistory: parsed.earningsHistory || []
        };
      }
    } catch (e) { }

    return defaultProfile;
  },

  saveProfile: (profile: UserProfile) => {
    // Auto-prune earnings history older than 7 days
    if (profile.earningsHistory) {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      profile.earningsHistory = profile.earningsHistory
        .filter(item => new Date(item.timestamp).getTime() > cutoff)
        .slice(0, 50);
    }
    localStorage.setItem('bondly_user_profile', JSON.stringify(profile));
  },

  incrementSessionsCount: () => {
    const profile = storage.getProfile();
    profile.sessionsCount = (profile.sessionsCount || 0) + 1;
    storage.saveProfile(profile);
    return profile.sessionsCount;
  },

  addHearts: (amount: number) => {
    const profile = storage.getProfile();
    profile.hearts = (profile.hearts || 0) + amount;
    storage.saveProfile(profile);
    return profile.hearts;
  },

  spendHearts: (amount: number) => {
    const profile = storage.getProfile();
    if ((profile.hearts || 0) < amount) return false;
    profile.hearts -= amount;
    storage.saveProfile(profile);
    return true;
  },

  unlockMode: (modeTitle: string) => {
    const profile = storage.getProfile();
    if (!profile.unlockedModes.includes(modeTitle)) {
      profile.unlockedModes.push(modeTitle);
      storage.saveProfile(profile);
    }
  },

  addConnectionPoints: (companionId: string | number, points: number) => {
    const profile = storage.getProfile();
    if (!profile.connectionPoints) profile.connectionPoints = {};
    const currentPoints = profile.connectionPoints[companionId] || 0;
    profile.connectionPoints[companionId] = currentPoints + points;
    storage.saveProfile(profile);
    return profile.connectionPoints[companionId];
  },

  incrementMessageCount: () => {
    const profile = storage.getProfile();
    const lastActiveDate = new Date(profile.lastActive).toDateString();
    const today = new Date().toDateString();

    if (lastActiveDate !== today) {
      profile.messageCountToday = 1;
      // DAILY LOGIN BONUS: 5 Hearts as per strategy
      profile.hearts = (profile.hearts || 0) + 5;
    } else {
      profile.messageCountToday += 1;
    }

    profile.lastActive = new Date().toISOString();
    storage.saveProfile(profile);
    return profile.messageCountToday;
  },

  getUsage: () => {
    return parseInt(localStorage.getItem('bondly_global_usage') || '0');
  },

  saveUsage: (val: number) => {
    localStorage.setItem('bondly_global_usage', val.toString());
  },

  // --- TASK 2: MEMORY ILLUSION ---
  getMemory: (companionId: string | number) => {
    try {
      const raw = localStorage.getItem(`memory_${companionId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) { }
    return { lastMood: 'neutral', lastTopic: 'none', preferredTime: 'unknown', facts: [] };
  },

  saveMemory: (companionId: string | number, data: { lastMood?: string, lastTopic?: string, preferredTime?: string, facts?: string[] }) => {
    const current = storage.getMemory(companionId);
    // If facts are provided, we should probably deduplicate or manage them carefully.
    // For now, we'll just merge them if provided.
    const updated = { ...current, ...data };
    if (data.facts) {
      updated.facts = Array.from(new Set([...(current.facts || []), ...data.facts])).slice(-20); // Keep last 20 facts
    }
    localStorage.setItem(`memory_${companionId}`, JSON.stringify(updated));
  },

  // --- TASK 3: TOKEN CONTROL ---
  getSummary: (companionId: string | number): string => {
    return localStorage.getItem(`persona_summary_${companionId}`) || '';
  },

  saveSummary: (companionId: string | number, summary: string) => {
    localStorage.setItem(`persona_summary_${companionId}`, summary);
  }
};

import { UserProfile } from '../types';
