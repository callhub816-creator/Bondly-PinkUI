export type Lang = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'kn' | 'gu' | 'ml' | 'pa' | 'od' | 'hinglish';

const englishWords = [
  'the', 'is', 'and', 'you', 'hello', 'how', 'are', 'do', 'not', 'please',
  'what', 'where', 'why', 'when', 'have', 'has', 'had', 'be', 'can', 'would',
  'could', 'should', 'will', 'want', 'need', 'like', 'love', 'good', 'okay', 'ok',
  'me', 'him', 'her', 'but', 'that', 'this', 'with', 'from', 'to', 'in', 'on', 'at',
  'for', 'as', 'by', 'about', 'which', 'there', 'their', 'my', 'your'
];

const hindiWords = [
  'hai', 'kya', 'kaise', 'tum', 'main', 'acha', 'nahi', 'kuch', 'haan', 'nahin',
  'bhai', 'yaar', 'dekho', 'suno', 'batao', 'samaj', 'lagta', 'ho', 'tha', 'hoga',
  'hoon', 'na', 'aur', 'lekin', 'par', 'itna', 'utna', 'mujhe', 'humko', 'tera', 'mera'
];

/**
 * Detects language from user input using unicode ranges and word matching.
 * Supports: English, Hindi (Devanagari), Tamil, Telugu, Kannada, Malayalam, Bengali, 
 * Gujarati, Punjabi, Marathi, Oriya, and Hinglish (mixed).
 * Defaults to 'hinglish' unless clear language signals are detected.
 */
export function detectLanguage(text: string): Lang {
  if (!text || text.trim().length === 0) return 'hinglish';

  const t = text.toLowerCase().trim();

  // Check for Devanagari script (Hindi/Marathi: \u0900-\u097F)
  if (/[\u0900-\u097F]/.test(t)) {
    return 'hi';
  }

  // Check for Tamil script (\u0B80-\u0BFF)
  if (/[\u0B80-\u0BFF]/.test(t)) {
    return 'ta';
  }

  // Check for Telugu script (\u0C00-\u0C7F)
  if (/[\u0C00-\u0C7F]/.test(t)) {
    return 'te';
  }

  // Check for Kannada script (\u0C80-\u0CFF)
  if (/[\u0C80-\u0CFF]/.test(t)) {
    return 'kn';
  }

  // Check for Malayalam script (\u0D00-\u0D7F)
  if (/[\u0D00-\u0D7F]/.test(t)) {
    return 'ml';
  }

  // Check for Bengali script (\u0980-\u09FF)
  if (/[\u0980-\u09FF]/.test(t)) {
    return 'bn';
  }

  // Check for Gujarati script (\u0A80-\u0AFF)
  if (/[\u0A80-\u0AFF]/.test(t)) {
    return 'gu';
  }

  // Check for Punjabi script (\u0A00-\u0A7F)
  if (/[\u0A00-\u0A7F]/.test(t)) {
    return 'pa';
  }

  // Check for Oriya script (\u0B00-\u0B7F)
  if (/[\u0B00-\u0B7F]/.test(t)) {
    return 'od';
  }

  // Count English words
  let engCount = 0;
  for (const word of englishWords) {
    if (t.includes(word)) engCount++;
  }

  // Count Hindi/Hinglish words
  let hindCount = 0;
  for (const word of hindiWords) {
    if (t.includes(word)) hindCount++;
  }

  // Calculate ASCII ratio
  const asciiMatch = t.match(/[a-z0-9\s\.,\?!'-]/gi);
  const asciiRatio = asciiMatch ? asciiMatch.length / Math.max(1, t.length) : 0;

  // Decision logic
  if (hindCount >= 1) {
    return 'hinglish';
  }

  if (engCount >= 2 && asciiRatio > 0.85) {
    return 'en';
  }

  if (asciiRatio > 0.88) {
    return 'en';
  }

  return 'hinglish';
}
