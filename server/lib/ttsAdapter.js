/**
 * lib/ttsAdapter.js
 * 
 * Text-to-speech client adapter.
 * Abstracts provider-specific details (Google Cloud, AWS Polly, Azure, etc.).
 * Supports both synchronous (buffer) and streaming modes.
 */

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const logger = require('./logger');
const { Readable } = require('stream');

class TTSAdapter {
  constructor() {
    // TODO: Support multiple providers via factory pattern
    // For now, using Google Cloud Text-to-Speech as example
    if (process.env.TTS_PROVIDER === 'google') {
      this.client = new TextToSpeechClient();
      this.provider = 'google';
    } else {
      logger.warn(`TTS_PROVIDER not recognized: ${process.env.TTS_PROVIDER}. Using mock mode.`);
      this.provider = 'mock';
    }
  }

  /**
   * Synthesize text to audio buffer (synchronous).
   * 
   * @param {object} opts - Options object
   * @param {string} opts.voice - Voice ID (e.g., 'en-US-Neural2-A')
   * @param {string} opts.text - Text to synthesize
   * @param {string} opts.format - Audio format (e.g., 'MP3', 'LINEAR16')
   * @returns {Promise<Buffer>} Audio buffer
   * @throws {Error} If synthesis fails
   */
  async speak({ voice, text, format = 'MP3' }) {
    const startTime = Date.now();

    try {
      if (this.provider === 'mock') {
        return this._mockSpeak(text, format);
      }

      if (this.provider === 'google') {
        return await this._googleSpeak({ voice, text, format });
      }

      throw new Error(`Unknown TTS provider: ${this.provider}`);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(`[TTS SPEAK FAILED] voice=${voice}, duration=${duration}ms, error=${err.message}`);
      throw err;
    }
  }

  /**
   * Stream text-to-speech audio (for real-time forwarding).
   * 
   * @param {object} opts - Options object (same as speak)
   * @param {string} opts.voice
   * @param {string} opts.text
   * @param {string} opts.format
   * @returns {Readable} Readable stream of audio chunks
   * @throws {Error} If streaming not supported
   */
  stream({ voice, text, format = 'MP3' }) {
    if (!process.env.ENABLE_STREAMING || process.env.ENABLE_STREAMING !== 'true') {
      logger.warn('[TTS STREAM] Streaming disabled. Use sync speak() instead.');
      throw new Error('Streaming not enabled. Set ENABLE_STREAMING=true.');
    }

    try {
      if (this.provider === 'mock') {
        return this._mockStream(text, format);
      }

      if (this.provider === 'google') {
        // TODO: Implement Google Cloud streaming TTS
        // For now, fall back to buffer-based approach
        return this._bufferToStream(async () => 
          this._googleSpeak({ voice, text, format })
        );
      }

      throw new Error(`Streaming not implemented for provider: ${this.provider}`);
    } catch (err) {
      logger.error(`[TTS STREAM FAILED] voice=${voice}, error=${err.message}`);
      throw err;
    }
  }

  // ============ GOOGLE CLOUD IMPLEMENTATION ============

  async _googleSpeak({ voice, text, format }) {
    const request = {
      input: { text },
      voice: {
        languageCode: voice.split('-').slice(0, 2).join('-'), // Extract lang from voice ID
        name: voice,
      },
      audioConfig: {
        audioEncoding: format === 'LINEAR16' ? 1 : 3, // LINEAR16=1, MP3=3
        sampleRateHertz: 16000, // Request 16kHz to avoid re-encoding
      },
    };

    const [response] = await this.client.synthesizeSpeech(request);
    logger.debug(`[TTS SYNTHESIZED] voice=${voice}, format=${format}, size=${response.audioContent.length} bytes`);
    return response.audioContent;
  }

  // ============ MOCK IMPLEMENTATION (for testing) ============

  _mockSpeak(text, format) {
    // Return a small MP3/WAV header followed by silence (for testing)
    // In real scenarios, this would be a proper audio file
    const mockBuffer = Buffer.from([
      0xFF, 0xFB, 0x10, 0x00, // MP3 frame header (simplified)
      ...Array(1000).fill(0), // Mock audio data
    ]);
    logger.debug(`[TTS MOCK SPEAK] text="${text.slice(0, 50)}...", format=${format}`);
    return mockBuffer;
  }

  _mockStream(text, format) {
    // Return a readable stream of mock audio chunks
    const chunks = [];
    for (let i = 0; i < 5; i++) {
      chunks.push(Buffer.from([0xFF, 0xFB, ...Array(100).fill(0)]));
    }

    let index = 0;
    return new Readable({
      read() {
        if (index < chunks.length) {
          this.push(chunks[index++]);
        } else {
          this.push(null); // End stream
        }
      },
    });
  }

  // ============ HELPER ============

  /**
   * Convert buffer-based speak() to a stream for compatibility.
   * 
   * @param {Function} bufferFn - Async function returning Buffer
   * @returns {Readable}
   */
  _bufferToStream(bufferFn) {
    const passThrough = new (require('stream').PassThrough)();

    // Start async buffer generation
    bufferFn()
      .then((buffer) => {
        passThrough.end(buffer);
      })
      .catch((err) => {
        passThrough.destroy(err);
      });

    return passThrough;
  }
}

module.exports = new TTSAdapter();
