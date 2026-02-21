/**
 * lib/retry.js
 * 
 * Retry logic with exponential backoff for external API calls.
 * Handles transient failures (timeouts, 429s, 5xx errors).
 */

const logger = require('./logger');

/**
 * Retry an async function with exponential backoff.
 * 
 * @param {Function} fn - Async function to retry
 * @param {object} opts - Options
 * @param {number} opts.maxAttempts - Max number of attempts (default: 3)
 * @param {number} opts.initialDelayMs - Initial delay in ms (default: 100)
 * @param {number} opts.maxDelayMs - Max delay in ms (default: 5000)
 * @param {string} opts.name - Function name for logging
 * @returns {Promise<any>} Result of successful call
 * @throws {Error} If all retries exhausted
 */
async function withRetries(fn, opts = {}) {
  const {
    maxAttempts = parseInt(process.env.MAX_RETRIES || 3),
    initialDelayMs = 100,
    maxDelayMs = 5000,
    name = 'unknown',
  } = opts;

  let lastError;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[RETRY] Attempt ${attempt}/${maxAttempts} - ${name}`);
      const result = await fn();
      return result;
    } catch (err) {
      lastError = err;

      // Check if error is retryable
      if (!isRetryable(err)) {
        logger.warn(`[RETRY] Non-retryable error on attempt ${attempt}: ${err.message}`);
        throw err;
      }

      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.1 * delay; // 10% jitter
        const waitTime = Math.min(delay + jitter, maxDelayMs);

        logger.warn(`[RETRY] Failed (${err.message}), retrying in ${Math.round(waitTime)}ms...`);
        await sleep(waitTime);

        delay = Math.min(delay * 2, maxDelayMs); // Double delay, cap at max
      }
    }
  }

  logger.error(`[RETRY] All ${maxAttempts} attempts failed for ${name}: ${lastError.message}`);
  throw lastError;
}

/**
 * Determine if an error is retryable.
 * 
 * @param {Error} err
 * @returns {boolean}
 */
function isRetryable(err) {
  // Timeout errors are retryable
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    return true;
  }

  // Network errors
  if (err.code && err.code.startsWith('E')) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (err.statusCode && retryableStatusCodes.includes(err.statusCode)) {
    return true;
  }

  // Message-based heuristics
  if (err.message && err.message.match(/(timeout|temporarily unavailable|UNAVAILABLE)/i)) {
    return true;
  }

  return false;
}

/**
 * Sleep for a given duration.
 * 
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  withRetries,
  isRetryable,
  sleep,
};
