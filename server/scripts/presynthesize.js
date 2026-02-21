/**
 * scripts/presynthesize.js
 * 
 * Pre-synthesize common phrases for all voices and cache in Redis + S3.
 * Usage: node scripts/presynthesize.js [--phrases phrases.json] [--voices voices.json]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load modules (ensure they're available)
const cache = require('../lib/cache');
const storage = require('../lib/storage');
const ttsAdapter = require('../lib/ttsAdapter');
const logger = require('../lib/logger');
const { withRetries } = require('../lib/retry');

/**
 * Load phrases from JSON file.
 * 
 * Format:
 * [
 *   { text: "Hello, how can I help?", context: "greeting" },
 *   { text: "Thank you for calling", context: "closing" }
 * ]
 */
async function loadPhrases(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    logger.error(`Failed to load phrases from ${filePath}:`, err.message);
    return [];
  }
}

/**
 * Load voices config.
 * 
 * Format:
 * [
 *   { id: "en-US-Neural2-A", name: "Veena", role: "assistant" },
 *   { id: "en-US-Neural2-C", name: "Simran", role: "representative" }
 * ]
 */
async function loadVoices(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    logger.error(`Failed to load voices from ${filePath}:`, err.message);
    return [];
  }
}

/**
 * Generate cache key.
 */
function generateCacheKey(voiceId, text) {
  const textHash = crypto.createHash('sha256').update(text).digest('hex');
  return `tts:${voiceId}:${textHash}`;
}

/**
 * Generate S3 key.
 */
function generateS3Key(voiceId, text, index) {
  const timestamp = Date.now();
  const textHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);
  return `tts/presynthesized/${voiceId}/${timestamp}-${index}-${textHash}.mp3`;
}

/**
 * Main presynthesize routine.
 */
async function presynthesizeAll() {
  const phrasesPath = process.argv[3] || path.join(__dirname, '../config/phrases.json');
  const voicesPath = process.argv[4] || path.join(__dirname, '../config/voices.json');

  logger.info(`Loading phrases from ${phrasesPath}`);
  const phrases = await loadPhrases(phrasesPath);

  logger.info(`Loading voices from ${voicesPath}`);
  const voices = await loadVoices(voicesPath);

  if (phrases.length === 0) {
    logger.warn('No phrases loaded. Check phrases.json file.');
    return;
  }

  if (voices.length === 0) {
    logger.warn('No voices loaded. Check voices.json file.');
    return;
  }

  logger.info(`Starting presynthesis: ${voices.length} voices × ${phrases.length} phrases = ${voices.length * phrases.length} audio files`);

  let successCount = 0;
  let failureCount = 0;

  for (const voice of voices) {
    logger.info(`\nProcessing voice: ${voice.name} (${voice.id})`);

    for (let i = 0; i < phrases.length; i++) {
      const { text, context } = phrases[i];

      try {
        const cacheKey = generateCacheKey(voice.id, text);
        const s3Key = generateS3Key(voice.id, text, i);

        // Check if already cached
        const existing = await cache.get(cacheKey);
        if (existing) {
          logger.debug(`  ✓ [SKIP] Already cached: ${text.slice(0, 30)}...`);
          successCount++;
          continue;
        }

        // Synthesize
        logger.debug(`  → [TTS] Synthesizing: "${text.slice(0, 30)}..."`);
        const audioBuffer = await withRetries(
          () => ttsAdapter.speak({ voice: voice.id, text, format: 'MP3' }),
          { name: `presynth:${voice.id}:${i}` }
        );

        // Upload to S3
        logger.debug(`  → [S3] Uploading ${audioBuffer.length} bytes...`);
        const publicUrl = await withRetries(
          () => storage.uploadBuffer(s3Key, audioBuffer, {
            contentType: 'audio/mpeg',
            metadata: { voiceId: voice.id, context, phrasalIndex: i },
          }),
          { name: `presynth_s3:${s3Key}` }
        );

        // Cache in Redis
        await cache.set(cacheKey, publicUrl);

        logger.info(`  ✓ [SUCCESS] ${text.slice(0, 40)}... => ${publicUrl.slice(-30)}`);
        successCount++;
      } catch (err) {
        logger.error(`  ✗ [FAILED] ${text.slice(0, 40)}... => ${err.message}`);
        failureCount++;
      }
    }
  }

  // Summary
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`Presynthesis Complete:`);
  logger.info(`  Successful: ${successCount}`);
  logger.info(`  Failed: ${failureCount}`);
  logger.info(`  Total: ${successCount + failureCount}`);
  logger.info(`${'='.repeat(60)}\n`);

  // Close connections
  await cache.close();
}

// Run
presynthesizeAll().catch((err) => {
  logger.error(`Presynthesis failed:`, err);
  process.exit(1);
});
