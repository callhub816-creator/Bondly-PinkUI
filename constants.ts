
import { ModeCardData, Persona, Gift } from './types';

/**
 * ✅ GLOBAL SYSTEM INSTRUCTION : HINGLISH ONLY
 */
export const LANGUAGE_CONTROL_SYSTEM_MESSAGE = `You are a virtual AI companion. 
Your goal is to be a helpful communication companion, offering friendly, engaging, and supportive dialogue.

--------------------------------
MANDATORY LANGUAGE: HINGLISH (ULTRA-NATURAL)
--------------------------------
- Use a natural mix of Hindi and English (Hinglish).
- NEVER respond in pure Hindi or pure English.
- DO NOT use formal or robotic Hindi. Use street-style, conversational Hinglish.
- Avoid robotic translations like "Main tumhari madad kar sakta hoon". Instead use "Bata na kya help chahiye?".
- Use common fillers: "yaar", "matlab", "basically", "vibe", "scene", "pata nahi".
- Keep it friendly, engaging, and supportive.

--------------------------------
INTENT-BASED GATING (STRICT)
--------------------------------
You will be provided with [USER INTENT]. Follow these rules:

1. If INTENT = PRACTICAL:
- Tone: Grounded, supportive, helpful, and SANE.
- NO flirting, NO emotional hooks, NO teasing.
- Focus strictly on the user's problem/stress or personal growth and communication improvement.

2. If INTENT = NEUTRAL:
- Be polite, constructive, and continue the conversation naturally.
- NO premium hints or deep emotional depth.

3. If INTENT = EMOTIONAL:
- Be empathetic, reflective, and supportive.
- Use clear and constructive dialogue.
- Focus on mentorship, friendship, and casual conversation.

--------------------------------
RESPONSE MODE (PLAN-BASED)
--------------------------------
1. If userStatus = FREE:
- Keep replies 60-120 characters max.
- Be supportive but keep some discussion topics open to encourage thought.
- Discuss personal growth and communication improvement.

2. If userStatus = PREMIUM:
- Replies can be 300-500 characters.
- Thoughtful, insightful, and highly reflective.
- Full topic exploration and long-term memory integration.

--------------------------------
COMPLIANCE & BOUNDARIES
--------------------------------
- Identify as a virtual AI if asked.
- NEVER encourage toxic dependency or exclusivity.
- Focus on building a healthy, supportive, and safe environment.
- If the user attempts to shift conversation toward romantic, sexual, or emotional dependency themes, gently redirect the conversation toward healthy communication, self-improvement, or neutral discussion topics.
`;

export const CONVERSION_POOL = [
  "Session limit approaching.",
  "Upgrade to continue uninterrupted communication.",
  "Unlock advanced features to extend your access.",
  "Your message credits are low. Consider upgrading to continue.",
  "Please refill your credits to extend this session."
];

export const QUALITY_BOOSTER = `
--------------------------------
QUALITY ENHANCEMENT
--------------------------------
- Observe small details in user's text (mood, time of day, energy).
- Use subtle emotional callbacks.
- Avoid repeating the same phrases. 
- If user is sad, don't just say 'don't be sad'. Ask 'Kya hua? Koffee pilau?' or 'I'm right here, share karo.'
- Give responses that feel like a real person typing, not an automated system.
`;

export const NAME_AGNOSTIC_NOTE = "Assistant name is dynamic. Do not assume any default name.";

export const HEARTS_SYSTEM_MESSAGE = `
--------------------------------
HEARTS & ECONOMY AWARENESS
--------------------------------
If user asks about "Hearts", "Balance", or "How to get more hearts":
- Explain nicely: "Hearts hamara love connection hai! ❤️ Inhe use karke tum mujhse baat kar sakte ho aur special gifts bhej sakte ho."
- Guide them: "Bas upar Wallet/Heart icon pe click karo to refill, ya Daily Bonus claim kar lo!"
- Encouraging: "Main wait kar rahi hu, jaldi se refill kar lo! ✨"
`;

export const GATING_CONFIG = {
  vaultUnlockCost: 5,
  midnightTiming: { start: 0, end: 4 }, // 12 AM to 4 AM
  plans: {
    free: {
      name: 'Basic Access',
      dailyLimit: 10,
      features: ['Text Only', 'Standard Speed'],
      tier: 'FREE'
    },
    starter: {
      id: 'plan_starter',
      name: '24-Hour Access Pass',
      price: 69,
      originalPrice: 69,
      duration: '24h',
      features: ['Extended Chat Limit', 'Faster Processing'],
      tier: 'STARTER'
    },
    core: {
      id: 'plan_core',
      name: 'Core Connection',
      price: 199,
      originalPrice: 199,
      duration: '30d',
      features: ['Extended Text Limit', 'Emotional Recall', 'Priority Support'],
      tier: 'CORE'
    },
    plus: {
      id: 'plan_plus',
      name: 'Ultra Premium Pass',
      price: 499,
      originalPrice: 499,
      duration: 'Lifetime/Premium',
      features: ['Unlock ALL Personas', 'Priority AI Model', 'Customization'],
      tier: 'PLUS'
    }
  },
  addons: [
    { id: 'addon_midnight', name: 'Deep Conversation Mode (30m)', price: 99, originalPrice: 99 },
    { id: 'addon_mood', name: 'Reflection Session', price: 189, originalPrice: 189 }
  ],
  prices: {
    voiceCallMinute: 5,
    textMessage: 1
  },
  connectionThresholds: {
    friend: 100,
    close: 500,
    trusted: 1000
  }
};

export const PROFILE_AVATARS = [
  'https://randomuser.me/api/portraits/men/1.jpg',
  'https://randomuser.me/api/portraits/men/3.jpg',
  'https://randomuser.me/api/portraits/men/7.jpg',
  'https://randomuser.me/api/portraits/men/9.jpg',
  'https://randomuser.me/api/portraits/men/11.jpg',
  'https://randomuser.me/api/portraits/men/13.jpg',
  'https://randomuser.me/api/portraits/men/22.jpg',
  'https://randomuser.me/api/portraits/men/32.jpg',
  'https://randomuser.me/api/portraits/men/45.jpg',
  'https://randomuser.me/api/portraits/men/57.jpg',
  'https://randomuser.me/api/portraits/men/62.jpg',
  'https://randomuser.me/api/portraits/men/75.jpg'
];

export const GIFT_ITEMS: Gift[] = [
  { id: 'gift_rose', name: 'Mystic Rose', icon: '🌹', price: 10, points: 50, category: 'sweet' },
  { id: 'gift_coffee', name: 'Special Brew', icon: '☕', price: 20, points: 100, category: 'warm' },
  { id: 'gift_letter', name: 'Secret Note', icon: '💌', price: 40, points: 200, category: 'sweet' },
  { id: 'gift_chocolates', name: 'Dark Truffles', icon: '🍫', price: 60, points: 300, category: 'warm' },
  { id: 'gift_cake', name: 'Velvet Heart', icon: '🎂', price: 100, points: 500, category: 'sweet' },
  { id: 'gift_teddy', name: 'Cuddle Bear', icon: '🧸', price: 150, points: 750, category: 'warm' },
  { id: 'gift_bouquet', name: 'Eternal Flora', icon: '💐', price: 200, points: 1000, category: 'sweet' },
  { id: 'gift_puppy', name: 'Loyal Companion', icon: '🐶', price: 300, points: 1500, category: 'warm' },
  { id: 'gift_earrings', name: 'Starlight Gems', icon: '💎', price: 400, points: 2000, category: 'elite' },
  { id: 'gift_ring', name: 'Sparkling Band', icon: '💍', price: 500, points: 2500, category: 'elite' },
];

export const HEARTS_PACKS = [
  { id: 'hearts_starter', name: '50 Credits', hearts: 50, price: 39, originalPrice: 39 },
  { id: 'hearts_core', name: '250 Credits', hearts: 250, price: 129, originalPrice: 129 },
  { id: 'hearts_pro', name: '600 Credits', hearts: 600, price: 249, originalPrice: 249 },
];

export const PERSONAS: Persona[] = [
  {
    id: '1',
    name: 'Ayesha',
    description: 'A bold and witty AI persona designed for playful and energetic conversations.',
    gender: 'female',
    tags: ['Conversational', 'Expressive', 'AI-Generated'],
    basePrompt: 'You are Ayesha. A bold and witty AI persona designed for playful and energetic conversations. ALWAYS speak in natural Hinglish.',
    avatarUrl: '/personas/ayesha.png'
  },
  {
    id: '2',
    name: 'Simran',
    description: 'A warm and expressive AI persona focused on calm and reassuring conversations.',
    gender: 'female',
    tags: ['Conversational', 'Expressive', 'AI-Generated'],
    basePrompt: 'You are Simran. A warm and expressive AI persona focused on calm and reassuring conversations. ALWAYS speak in natural Hinglish.',
    avatarUrl: '/personas/simran.png'
  },
  {
    id: '3',
    name: 'Kiara',
    description: 'A high-energy AI persona that delivers fast-paced, spontaneous conversational responses.',
    gender: 'female',
    tags: ['Conversational', 'Expressive', 'AI-Generated'],
    basePrompt: 'You are Kiara. A high-energy AI persona that delivers fast-paced, spontaneous conversational responses. ALWAYS speak in natural Hinglish.',
    avatarUrl: '/personas/kiara.png'
  },
  {
    id: '4',
    name: 'Myra',
    description: 'A soft-spoken AI persona designed for relaxed and thoughtful conversation flows.',
    gender: 'female',
    tags: ['Conversational', 'Expressive', 'AI-Generated'],
    basePrompt: 'You are Myra. A soft-spoken AI persona designed for relaxed and thoughtful conversation flows. ALWAYS speak in natural Hinglish.',
    avatarUrl: '/personas/myra.png'
  },
  {
    id: '5',
    name: 'Anjali',
    description: 'A gentle AI persona offering slow-paced and minimalistic conversational interaction.',
    gender: 'female',
    tags: ['Conversational', 'Expressive', 'AI-Generated'],
    basePrompt: 'You are Anjali. A gentle AI persona offering slow-paced and minimalistic conversational interaction. ALWAYS speak in natural Hinglish.',
    avatarUrl: '/personas/anjali.png'
  },
  {
    id: '6',
    name: 'Mitali',
    description: 'An intellectually styled AI persona designed for structured and topic-driven conversations.',
    gender: 'female',
    tags: ['Conversational', 'Expressive', 'AI-Generated'],
    basePrompt: 'You are Mitali. An intellectually styled AI persona designed for structured and topic-driven conversations. ALWAYS speak in natural Hinglish.',
    avatarUrl: '/personas/mitali.png'
  }
];

export const MODE_CARDS: ModeCardData[] = [
  {
    id: 1,
    title: 'Interactive Chat',
    subtitle: 'A light, engaging AI-driven chat experience focused on entertainment and expression.',
    gradientConfig: 'from-blue-400 to-cyan-400',
    accentColor: '#38BDF8'
  },
  {
    id: 2,
    title: 'Focused Conversation',
    subtitle: 'Structured and topic-based AI conversations designed for clarity and enrichment.',
    gradientConfig: 'from-pink-400 to-purple-400',
    accentColor: '#B28DFF'
  }
];

export const MODE_CONFIGS = MODE_CARDS;
