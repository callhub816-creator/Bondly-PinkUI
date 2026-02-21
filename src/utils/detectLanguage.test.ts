import { detectLanguage } from '../utils/detectLanguage';

describe('detectLanguage', () => {
  describe('Hinglish detection', () => {
    it('should detect Devanagari script as Hinglish', () => {
      expect(detectLanguage('नमस्ते')).toBe('hinglish');
      expect(detectLanguage('हेलो, कैसे हो?')).toBe('hinglish');
      expect(detectLanguage('यह एक संदेश है')).toBe('hinglish');
    });

    it('should detect Hindi stopwords in Hinglish', () => {
      expect(detectLanguage('haan bilkul')).toBe('hinglish');
      expect(detectLanguage('kya hal hai')).toBe('hinglish');
      expect(detectLanguage('batao kaise ho')).toBe('hinglish');
    });

    it('should detect Hinglish patterns', () => {
      expect(detectLanguage('haan main samajh gaya')).toBe('hinglish');
      expect(detectLanguage('ok theek hai na')).toBe('hinglish');
      expect(detectLanguage('shukriya bahut')).toBe('hinglish');
    });

    it('should detect mixed Hindi-English as Hinglish', () => {
      expect(detectLanguage('I am doing good, tu kaise ho?')).toBe('hinglish');
      expect(detectLanguage('Hello everyone, batao aap sab kaise ho')).toBe('hinglish');
    });
  });

  describe('English detection', () => {
    it('should detect pure English', () => {
      expect(detectLanguage('Hello, how are you?')).toBe('english');
      expect(detectLanguage('This is a test message')).toBe('english');
      expect(detectLanguage('Good morning everyone')).toBe('english');
    });

    it('should detect English with minimal Hinglish', () => {
      expect(detectLanguage('I am doing fine thank you')).toBe('english');
      expect(detectLanguage('Hello world this is great')).toBe('english');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(detectLanguage('')).toBe('english');
      expect(detectLanguage('   ')).toBe('english');
    });

    it('should handle single word', () => {
      expect(detectLanguage('hello')).toBe('english');
      expect(detectLanguage('नमस्ते')).toBe('hinglish');
    });

    it('should handle numbers and special characters', () => {
      expect(detectLanguage('hello123')).toBe('english');
      expect(detectLanguage('नमस्ते123')).toBe('hinglish');
    });
  });
});
