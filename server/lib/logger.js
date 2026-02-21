/**
 * lib/logger.js
 * 
 * Simple structured logging for consistent output and filtering.
 */

const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const levelName = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

class Logger {
  constructor(name = 'app') {
    this.name = name;
    this.level = LogLevel[process.env.LOG_LEVEL?.toUpperCase() || 'INFO'] ?? LogLevel.INFO;
  }

  /**
   * Log message at specified level.
   * 
   * @param {number} logLevel
   * @param {string} message
   * @param {any} meta - Additional metadata
   */
  log(logLevel, message, meta = null) {
    if (logLevel > this.level) {
      return; // Skip if below threshold
    }

    const timestamp = new Date().toISOString();
    const level = levelName[logLevel];
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';

    console.log(`[${timestamp}] ${level} [${this.name}]${metaStr} ${message}`);
  }

  error(message, meta) {
    this.log(LogLevel.ERROR, message, meta);
  }

  warn(message, meta) {
    this.log(LogLevel.WARN, message, meta);
  }

  info(message, meta) {
    this.log(LogLevel.INFO, message, meta);
  }

  debug(message, meta) {
    this.log(LogLevel.DEBUG, message, meta);
  }
}

module.exports = new Logger('Bondly');
