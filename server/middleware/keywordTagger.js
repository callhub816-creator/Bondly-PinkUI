import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load keywords from config
let keywords = [];

try {
  const keywordPath = path.join(__dirname, '../config/keywords.txt');
  const keywordFile = fs.readFileSync(keywordPath, 'utf-8');
  keywords = keywordFile
    .split('\n')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);
  console.log(`✅ Loaded ${keywords.length} keywords`);
} catch (error) {
  console.error('❌ Error loading keywords:', error.message);
  keywords = [];
}

/**
 * Extract tags from message text by matching keywords
 * @param {string} message - The message text to analyze
 * @returns {Array<string>} - Array of matched keywords
 */
export function extractTags(message) {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const messageLower = message.toLowerCase();
  const tags = new Set();

  // Match keywords with word boundaries to avoid partial matches
  keywords.forEach(keyword => {
    // Create regex with word boundaries
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(messageLower)) {
      tags.add(keyword);
    }
  });

  return Array.from(tags);
}

/**
 * Middleware to attach tags to message object
 */
export function tagMessageMiddleware(req, res, next) {
  if (req.body && req.body.message) {
    req.body.tags = extractTags(req.body.message);
  }
  next();
}

export default {
  extractTags,
  tagMessageMiddleware,
  getKeywords: () => keywords
};
