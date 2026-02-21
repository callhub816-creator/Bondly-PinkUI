/**
 * server.js
 * 
 * Main Express server for Bondly voice optimization.
 * Orchestrates TTS, caching, streaming, and provider integration.
 */

require('dotenv').config();

const express = require('express');
const logger = require('./lib/logger');
const callRoutes = require('./routes/call');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============

// Body parsing
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ============ ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Call handler routes
app.use('/', callRoutes);

// Recording routes
app.post('/start-recording', (req, res) => {
  const callId = req.body.callId;
  if (!callId) {
    return res.status(400).send('Call ID is required');
  }

  const filePath = path.join(__dirname, 'recordings', `${callId}.wav`);
  const writeStream = fs.createWriteStream(filePath);

  // Simulate recording logic
  req.on('data', (chunk) => {
    writeStream.write(chunk);
  });

  req.on('end', () => {
    writeStream.end();
    res.status(200).send('Recording started');
  });
});

app.post('/stop-recording', (req, res) => {
  const callId = req.body.callId;
  if (!callId) {
    return res.status(400).send('Call ID is required');
  }

  // Simulate stopping the recording
  res.status(200).send('Recording stopped');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ STARTUP ============

app.listen(PORT, () => {
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`Bondly Voice Optimization Server`);
  logger.info(`Listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`TTS Provider: ${process.env.TTS_PROVIDER || 'mock'}`);
  logger.info(`Cache Enabled: ${process.env.CACHE_ENABLED !== 'false'}`);
  logger.info(`Streaming Enabled: ${process.env.ENABLE_STREAMING === 'true'}`);
  logger.info(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');

  const cache = require('./lib/cache');
  await cache.close();

  process.exit(0);
});
