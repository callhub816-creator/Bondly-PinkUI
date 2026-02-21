
/**
 * Intent-Based Response Gating System
 * Classification: PRACTICAL vs EMOTIONAL vs NEUTRAL
 */

export type UserIntent = 'PRACTICAL' | 'EMOTIONAL' | 'NEUTRAL';

const PRACTICAL_KEYWORDS = [
    'paisa', 'money', 'salary', 'job', 'office', 'work', 'kaam', 'business', 'loan', 'bank', 'interview', 'career', 'boss', 'loss', 'profit', 'investment',
    'hospital', 'doctor', 'medicine', 'dawai', 'health', 'bimari', 'sick', 'pain', 'dard', 'emergency', 'accident', 'death', 'family problem', 'parents', 'papa', 'mummy',
    'advice', 'solution', 'problem', 'help', 'help me', 'madad', 'sujhav', 'guide', 'fix', 'stuck', 'tension'
];

const URGENT_PHRASES = [
    'urgent', 'immediate', 'asap', 'jaldi', 'bilkul abhi', 'zaroori hai'
];

export const detectIntent = (text: string): UserIntent => {
    const cleanText = text.trim().toLowerCase();
    const wordCount = cleanText.split(/\s+/).length;

    // 1. NEUTRAL DETECTION (Short replies, < 5 words)
    const neutralWords = ['hmm', 'ok', 'picha', 'pata nahi', 'theek h', 'thik h', 'ji', 'acha', 'han', 'yes', 'no', 'nahi', 'kuch nahi'];
    if (wordCount < 5 || neutralWords.includes(cleanText)) {
        return 'NEUTRAL';
    }

    // 2. PRACTICAL DETECTION
    const hasPracticalKeyword = PRACTICAL_KEYWORDS.some(word => cleanText.includes(word));
    const hasUrgentPhrase = URGENT_PHRASES.some(phrase => cleanText.includes(phrase));
    const isAdviceSeeking = cleanText.startsWith('how to') || cleanText.startsWith('kaise') || cleanText.includes('kya karun') || cleanText.includes('kya karoon');

    if (hasPracticalKeyword || hasUrgentPhrase || isAdviceSeeking) {
        return 'PRACTICAL';
    }

    // 3. DEFAULT: EMOTIONAL
    return 'EMOTIONAL';
};
