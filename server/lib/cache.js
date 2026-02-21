/**
 * lib/cache.js
 * 
 * Redis-backed caching layer for TTS audio URLs and metadata.
 * Handles get/set operations with TTL and automatic expiration.
 */

const Redis = require('ioredis');
const logger = require('./logger');

class CacheManager {
  constructor(redisUrl = process.env.REDIS_URL) {
    this.redis = new Redis(redisUrl, {
      enableReadyCheck: false,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  /**
   * Get a value from cache.
   * 
   * @param {string} key - Redis key
   * @returns {Promise<any|null>} Parsed JSON value or null if not found
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.debug(`[CACHE HIT] ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`[CACHE MISS] ${key}`);
      return null;
    } catch (err) {
      logger.error(`Cache GET failed for ${key}:`, err);
      return null; // Fail open: return null and proceed to generate
    }
  }

  /**
   * Set a value in cache with optional TTL.
   * 
   * @param {string} key - Redis key
   * @param {any} value - Value to store (will be JSON serialized)
   * @param {number} ttl - Time-to-live in seconds (default: CACHE_TTL_SECONDS)
   * @returns {Promise<boolean>} True if set successfully
   */
  async set(key, value, ttl = parseInt(process.env.CACHE_TTL_SECONDS || 2592000)) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      logger.debug(`[CACHE SET] ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (err) {
      logger.error(`Cache SET failed for ${key}:`, err);
      return false; // Fail open: continue without caching
    }
  }

  /**
   * Delete a key from cache.
   * 
   * @param {string} key - Redis key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    try {
      await this.redis.del(key);
      logger.debug(`[CACHE DELETE] ${key}`);
      return true;
    } catch (err) {
      logger.error(`Cache DELETE failed for ${key}:`, err);
      return false;
    }
  }

  /**
   * Flush all cache (use with caution).
   * 
   * @returns {Promise<boolean>}
   */
  async flush() {
    try {
      await this.redis.flushdb();
      logger.info('[CACHE FLUSHED] All keys deleted');
      return true;
    } catch (err) {
      logger.error('Cache FLUSH failed:', err);
      return false;
    }
  }

  /**
   * Check if key exists.
   * 
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (err) {
      logger.error(`Cache EXISTS check failed for ${key}:`, err);
      return false;
    }
  }

  /**
   * Get all keys matching a pattern (use with caution on large datasets).
   * 
   * @param {string} pattern - Redis glob pattern (e.g., 'tts:*')
   * @returns {Promise<string[]>}
   */
  async keys(pattern) {
    try {
      return await this.redis.keys(pattern);
    } catch (err) {
      logger.error(`Cache KEYS lookup failed for pattern ${pattern}:`, err);
      return [];
    }
  }

  /**
   * Close Redis connection gracefully.
   */
  async close() {
    try {
      await this.redis.quit();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.error('Error closing Redis:', err);
    }
  }
}

module.exports = new CacheManager();
