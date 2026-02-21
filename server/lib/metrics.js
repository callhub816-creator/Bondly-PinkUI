/**
 * lib/metrics.js
 * 
 * Simple Prometheus-compatible metrics for monitoring TTS and call performance.
 * Tracks: TTS generation time, cache hits/misses, retries, call counts, errors.
 */

const logger = require('./logger');

class MetricsCollector {
  constructor() {
    // Counters
    this.counters = {
      tts_cache_hits: 0,
      tts_cache_misses: 0,
      tts_retries: 0,
      call_total: 0,
      call_errors: 0,
      s3_uploads: 0,
      s3_upload_failures: 0,
      provider_calls: 0,
      provider_failures: 0,
    };

    // Histograms (simplified: just store all values)
    this.histograms = {
      tts_generation_ms: [],
      tts_cache_lookup_ms: [],
      s3_upload_ms: [],
      call_total_ms: [],
      provider_response_ms: [],
    };

    // Max histogram size before summarization
    this.maxHistogramSize = 10000;
  }

  // ============ COUNTER OPERATIONS ============

  /**
   * Increment a counter.
   * 
   * @param {string} name - Counter name
   * @param {number} value - Amount to increment (default: 1)
   */
  incr(name, value = 1) {
    if (this.counters.hasOwnProperty(name)) {
      this.counters[name] += value;
      logger.debug(`[METRIC INCR] ${name}=${this.counters[name]}`);
    } else {
      logger.warn(`Unknown counter: ${name}`);
    }
  }

  /**
   * Get counter value.
   * 
   * @param {string} name
   * @returns {number}
   */
  getCounter(name) {
    return this.counters[name] || 0;
  }

  // ============ HISTOGRAM OPERATIONS ============

  /**
   * Record a value in a histogram (e.g., response time).
   * 
   * @param {string} name - Histogram name
   * @param {number} ms - Duration in milliseconds
   */
  recordHistogram(name, ms) {
    if (!this.histograms.hasOwnProperty(name)) {
      logger.warn(`Unknown histogram: ${name}`);
      return;
    }

    this.histograms[name].push(ms);

    // Trim histogram to prevent memory bloat
    if (this.histograms[name].length > this.maxHistogramSize) {
      this.histograms[name] = this.histograms[name].slice(-this.maxHistogramSize);
    }
  }

  /**
   * Get percentile from histogram (e.g., p99 latency).
   * 
   * @param {string} name - Histogram name
   * @param {number} percentile - Percentile (0-100, e.g., 99 for p99)
   * @returns {number|null} Value or null if not available
   */
  getPercentile(name, percentile = 99) {
    if (!this.histograms.hasOwnProperty(name)) {
      return null;
    }

    const values = [...this.histograms[name]].sort((a, b) => a - b);
    if (values.length === 0) return null;

    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Get average from histogram.
   * 
   * @param {string} name
   * @returns {number|null}
   */
  getAverage(name) {
    if (!this.histograms.hasOwnProperty(name)) {
      return null;
    }

    const values = this.histograms[name];
    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }

  // ============ EXPORT METRICS (Prometheus Format) ============

  /**
   * Export metrics in Prometheus text format.
   * 
   * @returns {string} Prometheus-compatible metrics
   */
  toPrometheus() {
    let output = '# HELP tts_cache_hits_total Total TTS cache hits\n';
    output += '# TYPE tts_cache_hits_total counter\n';
    output += `tts_cache_hits_total ${this.counters.tts_cache_hits}\n`;

    output += '# HELP tts_cache_misses_total Total TTS cache misses\n';
    output += '# TYPE tts_cache_misses_total counter\n';
    output += `tts_cache_misses_total ${this.counters.tts_cache_misses}\n`;

    output += '# HELP tts_retries_total Total TTS retries\n';
    output += '# TYPE tts_retries_total counter\n';
    output += `tts_retries_total ${this.counters.tts_retries}\n`;

    output += '# HELP call_total_total Total calls processed\n';
    output += '# TYPE call_total_total counter\n';
    output += `call_total_total ${this.counters.call_total}\n`;

    output += '# HELP call_errors_total Total call errors\n';
    output += '# TYPE call_errors_total counter\n';
    output += `call_errors_total ${this.counters.call_errors}\n`;

    output += '# HELP tts_generation_ms_avg Average TTS generation time (ms)\n';
    output += '# TYPE tts_generation_ms_avg gauge\n';
    output += `tts_generation_ms_avg ${this.getAverage('tts_generation_ms') || 0}\n`;

    output += '# HELP tts_generation_ms_p99 P99 TTS generation time (ms)\n';
    output += '# TYPE tts_generation_ms_p99 gauge\n';
    output += `tts_generation_ms_p99 ${this.getPercentile('tts_generation_ms', 99) || 0}\n`;

    output += '# HELP call_total_ms_avg Average total call time (ms)\n';
    output += '# TYPE call_total_ms_avg gauge\n';
    output += `call_total_ms_avg ${this.getAverage('call_total_ms') || 0}\n`;

    return output;
  }

  /**
   * Export metrics as JSON.
   * 
   * @returns {object}
   */
  toJSON() {
    return {
      counters: this.counters,
      histograms: {
        tts_generation_ms: {
          count: this.histograms.tts_generation_ms.length,
          avg: this.getAverage('tts_generation_ms'),
          p99: this.getPercentile('tts_generation_ms', 99),
        },
        call_total_ms: {
          count: this.histograms.call_total_ms.length,
          avg: this.getAverage('call_total_ms'),
          p99: this.getPercentile('call_total_ms', 99),
        },
      },
    };
  }

  /**
   * Reset all metrics (useful for testing).
   */
  reset() {
    Object.keys(this.counters).forEach((key) => {
      this.counters[key] = 0;
    });
    Object.keys(this.histograms).forEach((key) => {
      this.histograms[key] = [];
    });
    logger.info('[METRICS RESET]');
  }
}

module.exports = new MetricsCollector();
