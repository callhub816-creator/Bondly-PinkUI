/**
 * routes/call.js
 * 
 * Express handler for POST /call endpoint.
 * Orchestrates: timing logs, profile fetch, TTS generation, caching, streaming, and provider forwarding.
 * 
 * Request body:
 * {
 *   callId: string,
 *   text: string,
 *   format?: string (default: 'MP3'),
 *   streaming?: boolean (default: false),
 *   debug?: boolean (default: false)
 * }
 */

const express = require('express');
const crypto = require('crypto');
const { Readable } = require('stream');
const router = express.Router();

const cache = require('../lib/cache');
const storage = require('../lib/storage');
const ttsAdapter = require('../lib/ttsAdapter');
const provider = require('../lib/provider');
const metrics = require('../lib/metrics');
const logger = require('../lib/logger');
const { withRetries } = require('../lib/retry');

/**
 * Helper: Generate cache key for TTS audio.
 * 
 * @param {string} voiceId - Voice identifier
 * @param {string} text - Text to synthesize
 * @returns {string} Cache key (tts:{voiceId}:{sha256(text)})
 */
function generateCacheKey(voiceId, text) {
  const textHash = crypto.createHash('sha256').update(text).digest('hex');
  return `tts:${voiceId}:${textHash}`;
}

/**
 * Helper: Generate S3 key for audio upload.
 * 
 * @param {string} voiceId
 * @param {string} text
 * @param {string} format
 * @returns {string} S3 key
 */
function generateS3Key(voiceId, text, format) {
  const timestamp = Date.now();
  const textHash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 8);
  const ext = format === 'LINEAR16' ? 'wav' : 'mp3';
  return `tts/${voiceId}/${timestamp}-${textHash}.${ext}`;
}

/**
 * Helper: Fetch callee profile from database/API.
 * TODO: Replace with actual profile fetch logic.
 * 
 * @param {string} calleeId
 * @returns {Promise<object|null>} Profile with voice_id, or null if not found
 */
async function fetchCalleeProfile(calleeId) {
  // In production, query your database or API
  // Example: const profile = await db.getProfile(calleeId);
  
  // Mock implementation:
  const profiles = {
    'callee-456': { voice_id: 'en-US-Neural2-A', name: 'Veena', role: 'assistant' },
    'callee-789': { voice_id: 'en-US-Neural2-C', name: 'Simran', role: 'assistant' },
  };

  return profiles[calleeId] || null;
}

/**
 * Helper: Resolve voice ID from request or profile.
 * Server-side resolution prevents client from spoofing voices.
 * 
 * @param {object} req - Express request
 * @param {object} callInfo - Call info from provider
 * @returns {Promise<string>} Resolved voice ID
 */
async function resolveVoiceId(req, callInfo) {
  // Priority 1: Server-fetched callee profile (most secure)
  if (callInfo && callInfo.calleeProfile) {
    logger.debug(`[VOICE RESOLVE] Using callee profile voice: ${callInfo.calleeProfile.voice_id}`);
    return callInfo.calleeProfile.voice_id;
  }

  // Priority 2: Fetch callee profile from database
  if (callInfo && callInfo.calleeId) {
    const profile = await fetchCalleeProfile(callInfo.calleeId);
    if (profile) {
      logger.debug(`[VOICE RESOLVE] Fetched callee profile voice: ${profile.voice_id}`);
      return profile.voice_id;
    }
  }

  // Priority 3: Role-based default (if role available)
  if (callInfo && callInfo.calleeProfile && callInfo.calleeProfile.role) {
    const roleDefaults = {
      'assistant': 'en-US-Neural2-A',
      'representative': 'en-US-Neural2-C',
      'bot': 'en-US-Standard-A',
    };
    const roleVoice = roleDefaults[callInfo.calleeProfile.role];
    if (roleVoice) {
      logger.debug(`[VOICE RESOLVE] Using role-based default: ${roleVoice}`);
      return roleVoice;
    }
  }

  // Priority 4: Fall back to default voice (should not trust client voice_id)
  const defaultVoice = 'en-US-Neural2-A';
  logger.warn(`[VOICE RESOLVE] No callee profile found. Using default voice: ${defaultVoice}`);
  return defaultVoice;
}

/**
 * POST /call
 * Main call handler endpoint.
 * 
 * Query params:
 * - debug=true: Return timing breakdown in response
 */
router.post('/call', async (req, res) => {
  const overallStart = Date.now();
  const callId = req.body.callId || `call-${Date.now()}`;
  const text = (req.body.text || '').trim();
  const format = req.body.format || 'MP3';
  const useStreaming = req.body.streaming === true && process.env.ENABLE_STREAMING === 'true';
  const debugMode = req.query.debug === 'true' || process.env.DEBUG_TIMINGS === 'true';

  const timings = {
    request_received_ms: 0,
    profile_fetch_ms: 0,
    voice_resolve_ms: 0,
    cache_lookup_ms: 0,
    tts_generate_ms: 0,
    s3_upload_ms: 0,
    provider_play_ms: 0,
    total_ms: 0,
  };

  metrics.incr('call_total');

  try {
    // ========== LOGGING STAGE 1: Request Received ==========
    timings.request_received_ms = Date.now() - overallStart;
    logger.info(`[CALL START] callId=${callId}, text="${text.slice(0, 50)}...", format=${format}, streaming=${useStreaming}`);

    // Validate input
    if (!text || text.length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }

    // ========== LOGGING STAGE 2: Fetch Call Info & Resolve Voice ==========
    const profileFetchStart = Date.now();
    const callInfo = await provider.getCallInfo(callId);
    const voiceId = await resolveVoiceId(req, callInfo);
    timings.profile_fetch_ms = Date.now() - profileFetchStart;
    timings.voice_resolve_ms = Date.now() - profileFetchStart - timings.profile_fetch_ms;

    logger.debug(`[CALL VOICE] callId=${callId}, voiceId=${voiceId}`);

    // ========== LOGGING STAGE 3: Cache Lookup ==========
    const cacheKey = generateCacheKey(voiceId, text);
    const cacheLookupStart = Date.now();
    const cachedUrl = await cache.get(cacheKey);
    timings.cache_lookup_ms = Date.now() - cacheLookupStart;

    if (cachedUrl) {
      // ===== CACHE HIT =====
      metrics.incr('tts_cache_hits');
      logger.info(`[CACHE HIT] callId=${callId}, key=${cacheKey}, url=${cachedUrl}`);

      // Play cached audio immediately
      const playStart = Date.now();
      const playSuccess = await provider.playUrl(callId, cachedUrl);
      timings.provider_play_ms = Date.now() - playStart;

      if (!playSuccess) {
        metrics.incr('call_errors');
        return res.status(500).json({ error: 'Provider play failed' });
      }

      timings.total_ms = Date.now() - overallStart;
      metrics.recordHistogram('call_total_ms', timings.total_ms);

      logger.info(`[CALL COMPLETE] callId=${callId}, type=cached, duration=${timings.total_ms}ms`);

      return res.json({
        success: true,
        callId,
        cached: true,
        audioUrl: cachedUrl,
        ...(debugMode && { timings }),
      });
    }

    // ===== CACHE MISS =====
    metrics.incr('tts_cache_misses');
    logger.info(`[CACHE MISS] callId=${callId}, key=${cacheKey}`);

    // ========== LOGGING STAGE 4: TTS Generation ==========
    let audioBuffer;
    let audioStream;

    if (useStreaming) {
      // Streaming mode: forward chunks as they arrive
      logger.debug(`[TTS STREAMING] Initiating stream for callId=${callId}`);

      const streamStart = Date.now();
      audioStream = await withRetries(
        () => ttsAdapter.stream({ voice: voiceId, text, format }),
        { name: `tts_stream:${voiceId}` }
      );
      timings.tts_generate_ms = Date.now() - streamStart;

      // Forward chunks to provider in real-time
      let chunkCount = 0;
      for await (const chunk of audioStream) {
        chunkCount++;
        const forwardSuccess = await provider.forwardChunk(callId, chunk);
        if (!forwardSuccess) {
          logger.warn(`[STREAM FORWARD FAILED] callId=${callId}, chunk=${chunkCount}`);
        }
      }

      // Signal end of stream
      await provider.signalEnd(callId);

      timings.total_ms = Date.now() - overallStart;
      metrics.recordHistogram('call_total_ms', timings.total_ms);

      logger.info(`[CALL COMPLETE] callId=${callId}, type=streaming, chunks=${chunkCount}, duration=${timings.total_ms}ms`);

      return res.json({
        success: true,
        callId,
        cached: false,
        streaming: true,
        ...(debugMode && { timings }),
      });
    } else {
      // Sync mode: generate full buffer, upload, then play
      const ttsStart = Date.now();
      audioBuffer = await withRetries(
        () => ttsAdapter.speak({ voice: voiceId, text, format }),
        { name: `tts_speak:${voiceId}` }
      );
      timings.tts_generate_ms = Date.now() - ttsStart;

      metrics.recordHistogram('tts_generation_ms', timings.tts_generate_ms);
      logger.debug(`[TTS GENERATED] callId=${callId}, buffer_size=${audioBuffer.length} bytes, duration=${timings.tts_generate_ms}ms`);

      // ========== LOGGING STAGE 5: S3 Upload ==========
      const s3Key = generateS3Key(voiceId, text, format);
      const uploadStart = Date.now();

      const audioUrl = await withRetries(
        () => storage.uploadBuffer(s3Key, audioBuffer, {
          contentType: format === 'LINEAR16' ? 'audio/wav' : 'audio/mpeg',
          metadata: { voiceId, callId },
        }),
        { name: `s3_upload:${s3Key}` }
      );

      timings.s3_upload_ms = Date.now() - uploadStart;
      metrics.incr('s3_uploads');
      logger.debug(`[S3 UPLOADED] callId=${callId}, key=${s3Key}, url=${audioUrl}, duration=${timings.s3_upload_ms}ms`);

      // ========== LOGGING STAGE 6: Cache Store ==========
      await cache.set(cacheKey, audioUrl);
      logger.debug(`[CACHE STORED] callId=${callId}, key=${cacheKey}, ttl=${process.env.CACHE_TTL_SECONDS || 2592000}s`);

      // ========== LOGGING STAGE 7: Provider Play ==========
      const playStart = Date.now();
      const playSuccess = await provider.playUrl(callId, audioUrl);
      timings.provider_play_ms = Date.now() - playStart;

      if (!playSuccess) {
        metrics.incr('call_errors');
        return res.status(500).json({ error: 'Provider play failed' });
      }

      timings.total_ms = Date.now() - overallStart;
      metrics.recordHistogram('call_total_ms', timings.total_ms);

      logger.info(`[CALL COMPLETE] callId=${callId}, type=generated, duration=${timings.total_ms}ms`);

      return res.json({
        success: true,
        callId,
        cached: false,
        audioUrl,
        ...(debugMode && { timings }),
      });
    }
  } catch (err) {
    metrics.incr('call_errors');
    timings.total_ms = Date.now() - overallStart;

    logger.error(`[CALL FAILED] callId=${callId}, error=${err.message}, duration=${timings.total_ms}ms`);

    return res.status(500).json({
      error: err.message,
      callId,
      ...(debugMode && { timings }),
    });
  }
});

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint.
 */
router.get('/metrics', (req, res) => {
  const prometheusFormat = metrics.toPrometheus();
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(prometheusFormat);
});

/**
 * GET /metrics.json
 * JSON metrics format.
 */
router.get('/metrics.json', (req, res) => {
  res.json(metrics.toJSON());
});

/**
 * GET /health
 * Health check endpoint.
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
