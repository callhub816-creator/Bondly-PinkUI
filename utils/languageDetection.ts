/**
 * Lightweight, dependency-free language detection utility.
 * Detects Hindi, English, or Hinglish (default).
 * Also detects explicit user requests for pure language switching.
 */

export type DetectedLanguage = 'hindi' | 'english' | 'hinglish';

/**
 * Core language detection: analyzes text for script type and word patterns.
 *
 * Rules:
 * - If >60% Devanagari (Hindi script) OR contains Hindi-specific words → 'hindi'
 * - If ASCII >80% with common English words → 'english'
 * - Otherwise → 'hinglish' (default)
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) return 'hinglish';

  const t = text.toLowerCase().trim();

  // Devanagari Unicode range: \u0900-\u097F (Hindi/Marathi)
  const devanagariCount = (t.match(/[\u0900-\u097F]/g) || []).length;
  const devanagariRatio = devanagariCount / Math.max(1, t.length);

  // If >60% Devanagari script → Hindi
  if (devanagariRatio > 0.6) {
    return 'hindi';
  }

  // Hindi-specific words (no English equiv)
  const hindiWords = [
    'hai', 'kya', 'kaise', 'tum', 'main', 'acha', 'nahi', 'kuch', 'haan',
    'bhai', 'yaar', 'dekho', 'suno', 'batao', 'lagta', 'tha', 'hoga', 'hoon'
  ];
  const hindiWordCount = hindiWords.filter(w => t.includes(w)).length;
  if (hindiWordCount >= 2) {
    return 'hinglish'; // Mixed, not pure Hindi
  }

  // ASCII + English word heuristic
  const asciiMatch = t.match(/[A-Za-z0-9\s\.,\?!'-]/gi);
  const asciiRatio = asciiMatch ? asciiMatch.length / Math.max(1, t.length) : 0;

  const commonEnglishWords = [
    'the', 'is', 'and', 'you', 'hello', 'how', 'are', 'i', 'am', 'what',
    'why', 'when', 'where', 'do', 'does', 'did', 'can', 'will', 'would',
    'should', 'could', 'have', 'has', 'had', 'be', 'been', 'being'
  ];
  const englishWordCount = commonEnglishWords.filter(w => t.includes(w)).length;

  // If >80% ASCII with >=2 common English words → English
  if (asciiRatio > 0.8 && englishWordCount >= 2) {
    return 'english';
  }

  // Very high ASCII ratio alone (no Indian scripts) → English
  if (asciiRatio > 0.88 && devanagariRatio === 0) {
    return 'english';
  }

  // Default: Hinglish
  return 'hinglish';
}

/**
 * Detects if user explicitly requested pure English response.
 * Examples: "reply only in English", "pure English", "English only", "speak English"
 */
export function shouldSwitchToPureEnglish(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return /\b(english\s+only|pure\s+english|reply\s+only\s+in\s+english|speak\s+english|only\s+english)\b/i.test(t);
}

/**
 * Detects if user explicitly requested pure Hindi response.
 * Examples: "pure Hindi", "Hindi only", "reply in pure Hindi", "sirf Hindi"
 */
export function shouldSwitchToPureHindi(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return /\b(pure\s+hindi|hindi\s+only|sirf\s+hindi|reply\s+in\s+pure\s+hindi|reply\s+pure\s+hindi)\b/i.test(t);
}

/**
 * Returns a system-level hint for the LLM if user explicitly requested language switch.
 * This is a SECONDARY hint, not a replacement for LANGUAGE_CONTROL_SYSTEM_MESSAGE.
 */
export function getLanguageSwitchHint(text: string): string | null {
  if (shouldSwitchToPureEnglish(text)) {
    return '[USER_REQUEST: User explicitly asked for pure English. Respond in English only.]';
  }
  if (shouldSwitchToPureHindi(text)) {
    return '[USER_REQUEST: User explicitly asked for pure Hindi. Respond in Hindi only.]';
  }
  return null;
}
