export type DetectedLanguage = 'hindi' | 'english' | 'hinglish';

export interface ModeCardData {
  id: number;
  title: string;
  subtitle: string;
  gradientConfig: string; // Tailwind classes for specific gradients
  accentColor: string; // Hex for shadows/glows
}

export interface Persona {
  id: number | string;
  name: string;
  description: string;
  gender: 'female' | 'male';
  basePrompt: string;
  tags: string[];
  avatarUrl?: string; // For user-created or pre-generated images
  voiceId?: string;   // Identifier for specific voice tones
  modeId?: number;    // To track which mode created this
  // New optional fields for user-created personas
  mode?: string;
  createdAt?: number;
  language?: 'hinglish' | 'english';
  defaultLanguage?: 'hinglish'; // Only Hinglish is the default language
  launchHidden?: boolean;
}

// --- MONETIZATION & RELATIONSHIP TYPES ---

export type SubscriptionPlan = 'free' | 'starter' | 'core' | 'plus';

export type ConnectionLevel = 'stranger' | 'friend' | 'close' | 'trusted';

export interface EarningRecord {
  id: string;
  type: 'bonus' | 'purchase' | 'mission';
  amount: number;
  label: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  nickname?: string;
  avatarUrl?: string;
  subscription: SubscriptionPlan;
  connectionPoints: Record<string | number, number>; // companionId -> points
  messageCountToday: number;
  lastActive: string; // ISO
  voiceMinutesLeft: number;
  unlockedModes: string[]; // e.g., ["jealous", "bold"]
  hearts: number; // Virtual balance
  midnightPassExpiry?: string; // ISO date for expiration
  sessionsCount?: number; // To track retention nudges logic
  lastDailyBonusClaim?: string; // ISO date
  earningsHistory: EarningRecord[];
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
  points: number;
  category: 'sweet' | 'warm' | 'elite';
}

export interface GatingConfig {
  maxFreeMessages: number;
  connectionThresholds: {
    friend: number;
    close: number;
    trusted: number;
  };
  prices: {
    basic: number;
    plus: number;
    voiceCall10: number;
    voiceCall30: number;
    personalityUnlock: number;
    memorySave: number;
    memoryUnlock: number;
    midnightPass: number;
  };
}