/**
 * Language Detection Utility
 * Detects Indian languages (Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Punjabi, Gujarati, Bengali, Odia, Urdu)
 * or English. Excludes simple greetings like Hey, Hello, Hi.
 */

// Unicode ranges for Indian scripts
const DEVANAGARI_RANGE = /[\u0900-\u097F]/; // Hindi, Sanskrit, Marathi, Punjabi
const TAMIL_RANGE = /[\u0B80-\u0BFF]/;
const TELUGU_RANGE = /[\u0C60-\u0C7F]/;
const KANNADA_RANGE = /[\u0C80-\u0CFF]/;
const MALAYALAM_RANGE = /[\u0D00-\u0D7F]/;
const GUJARATI_RANGE = /[\u0A80-\u0AFF]/;
const BENGALI_RANGE = /[\u0980-\u09FF]/;
const ORIYA_RANGE = /[\u0B00-\u0B7F]/;
const URDU_RANGE = /[\u0600-\u06FF]/; // Urdu/Arabic script

const INDIAN_SCRIPTS = [DEVANAGARI_RANGE, TAMIL_RANGE, TELUGU_RANGE, KANNADA_RANGE, MALAYALAM_RANGE, GUJARATI_RANGE, BENGALI_RANGE, ORIYA_RANGE];

// Greetings to exclude from Hinglish detection (pure greeting messages)
const GREETINGS = new Set(['hey', 'hello', 'hi', 'hii', 'hiiii', 'heyy', 'hello!', 'hi!', 'hey!', 'hola', 'yo', 'sup']);

// Common Hindi/Hinglish content tokens (non-greeting)
const HINDI_TOKENS = new Set([
  'hai', 'haan', 'haanji', 'nahi', 'na', 'acha', 'theek', 'bilkul', 'shukriya', 'dhanyavaad',
  'kya', 'kaise', 'kahan', 'kaun', 'kab', 'kitna', 'kitne', 'mein', 'maine', 'tune', 'tum', 'tumne',
  'tumhare', 'tera', 'mera', 'hum', 'humne', 'iska', 'uska', 'inka', 'unka', 'aur', 'ya', 'to', 'lekin', 'par',
  'isliye', 'kyunki', 'batao', 'btao', 'suno', 'dekho', 'sunao', 'chalo', 'chal', 'karo', 'kar', 'raha', 'rahi', 
  'tha', 'thi', 'hen', 'ho', 'hoon', 'kuch', 'kisi', 'kisne', 'kis', 'ka', 'ke', 'ko', 'se', 'me', 'per', 'nahin',
  'acha', 'haan', 'bhi', 'abhi', 'tab', 'jab', 'woh', 'yeh', 'voh', 'iska', 'uska', 'inke', 'unke', 'apna', 'apne'
]);

/**
 * Detect language from text
 * Returns: 'hinglish' if Indian language/Hinglish detected, else 'english'
 */
export const detectLanguage = (text: string): 'hinglish' | 'english' => {
  if (!text || text.trim().length === 0) return 'english';

  // Check if entire message is just a simple greeting (exclude these)
  const trimmed = text.trim().toLowerCase();
  if (GREETINGS.has(trimmed)) {
    return 'english'; // Pure greeting, treat as English
  }

  // Check for any Indian script characters
  for (const scriptRange of INDIAN_SCRIPTS) {
    if (scriptRange.test(text)) {
      return 'hinglish'; // Contains Indian script
    }
  }

  // Also check for Urdu script
  if (URDU_RANGE.test(text)) {
    return 'hinglish';
  }

  // Token-based heuristic for transliterated Hindi words
  const words = text.toLowerCase().split(/\s+/).map((w) => w.replace(/[.,!?;:()"']/g, ''));
  
  // If only greetings, return english
  if (words.every(word => GREETINGS.has(word))) {
    return 'english';
  }

  const hindiTokenCount = words.filter((word) => HINDI_TOKENS.has(word)).length;
  // If more than 20% tokens match common Hindi translit words, treat as hinglish
  if (words.length > 0 && hindiTokenCount / words.length >= 0.2) return 'hinglish';

  // Regex patterns for common Hinglish constructions
  const hinglishPatterns = /\b(kya|kaise|kaun|kahan|karo|kar|raha|rahi|tu|tum|main|maine|haan|nahi|acha|btao|batao|bol|bolna|likha|likhi|likhe|dekha|dekhi|dekhe)\b/i;
  if (hinglishPatterns.test(text)) return 'hinglish';

  return 'english';
};

export const getLanguageLabel = (lang: 'hinglish' | 'english'): string => {
  return lang === 'hinglish' ? 'हिंग्लिश' : 'English';
};
