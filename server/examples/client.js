/**
 * examples/client.js
 * 
 * Example client code showing how to call the voice handler.
 * Can be run from another service or tested locally.
 */

const http = require('http');
const https = require('https');

/**
 * Call the voice handler endpoint.
 * 
 * @param {object} opts
 * @param {string} opts.baseUrl - Server URL (default: http://localhost:3001)
 * @param {string} opts.callId - Unique call identifier
 * @param {string} opts.text - Text to synthesize
 * @param {string} opts.format - Audio format (default: MP3)
 * @param {boolean} opts.streaming - Use streaming mode (default: false)
 * @param {boolean} opts.debug - Enable timing breakdown (default: false)
 * @returns {Promise<object>} Response with audioUrl and timings
 */
async function callVoiceHandler(opts) {
  const {
    baseUrl = 'http://localhost:3001',
    callId = `call-${Date.now()}`,
    text,
    format = 'MP3',
    streaming = false,
    debug = false,
  } = opts;

  if (!text || text.trim().length === 0) {
    throw new Error('text is required');
  }

  const protocol = baseUrl.startsWith('https') ? https : http;
  const urlObj = new URL(baseUrl);
  const url = `${baseUrl}/call${debug ? '?debug=true' : ''}`;

  const body = JSON.stringify({
    callId,
    text: text.trim(),
    format,
    streaming,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: `/call${debug ? '?debug=true' : ''}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`Server error: ${res.statusCode} - ${result.error}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Example: Make a basic call and print results
 */
async function exampleBasicCall() {
  console.log('\n=== Example 1: Basic Call ===\n');

  try {
    const result = await callVoiceHandler({
      text: 'Hello, welcome to CallHub voice assistant.',
      debug: true,
    });

    console.log('✓ Call successful!');
    console.log(`  URL: ${result.audioUrl}`);
    console.log(`  Cached: ${result.cached}`);
    console.log(`  Total time: ${result.timings?.total_ms}ms\n`);
  } catch (err) {
    console.error(`✗ Call failed: ${err.message}\n`);
  }
}

/**
 * Example: Compare cache hit vs miss
 */
async function exampleCacheComparison() {
  console.log('\n=== Example 2: Cache Hit vs Miss ===\n');

  const text = 'Thank you for calling CallHub. How can I assist you?';

  try {
    // First call (cache miss)
    console.log('→ First call (cache miss)...');
    const miss = await callVoiceHandler({ text, debug: true });
    console.log(`  ✓ Completed in ${miss.timings?.total_ms}ms`);
    console.log(`  Cached: ${miss.cached}\n`);

    // Wait a moment
    await new Promise((r) => setTimeout(r, 100));

    // Second call (cache hit)
    console.log('→ Second call (cache hit)...');
    const hit = await callVoiceHandler({ text, debug: true });
    console.log(`  ✓ Completed in ${hit.timings?.total_ms}ms`);
    console.log(`  Cached: ${hit.cached}\n`);

    // Calculate speedup
    const speedup = (miss.timings?.total_ms || 0) / (hit.timings?.total_ms || 1);
    console.log(`→ Speedup: ${speedup.toFixed(1)}x faster\n`);
  } catch (err) {
    console.error(`✗ Failed: ${err.message}\n`);
  }
}

/**
 * Example: Check metrics
 */
async function exampleMetrics() {
  console.log('\n=== Example 3: Check Metrics ===\n');

  const protocol = 'http';
  const hostname = 'localhost';
  const port = 3001;

  return new Promise((resolve) => {
    const req = require('http').request(
      {
        hostname,
        port,
        path: '/metrics.json',
        method: 'GET',
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const metrics = JSON.parse(data);

            console.log('Counters:');
            Object.entries(metrics.counters).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`);
            });

            console.log('\nHistograms:');
            Object.entries(metrics.histograms || {}).forEach(([key, stats]) => {
              console.log(`  ${key}:`);
              console.log(`    count: ${stats.count}`);
              console.log(`    avg: ${stats.avg}ms`);
              console.log(`    p99: ${stats.p99}ms`);
            });

            console.log();
            resolve();
          } catch (err) {
            console.error(`Failed to parse metrics: ${err.message}`);
            resolve();
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error(`Failed to fetch metrics: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

/**
 * Example: Simulate multiple concurrent calls
 */
async function exampleConcurrentCalls() {
  console.log('\n=== Example 4: Concurrent Calls ===\n');

  const phrases = [
    'Hello, this is CallHub.',
    'How can I help you today?',
    'Thank you for calling.',
    'Your call is important to us.',
    'Please hold while we connect you.',
  ];

  const concurrency = 5;
  const results = [];

  console.log(`→ Making ${concurrency} concurrent calls...\n`);

  const startTime = Date.now();

  const promises = Array.from({ length: concurrency }).map(async (_, i) => {
    try {
      const text = phrases[i % phrases.length];
      const result = await callVoiceHandler({
        callId: `concurrent-${i}`,
        text,
        debug: true,
      });
      results.push({
        index: i,
        success: true,
        time: result.timings?.total_ms,
        cached: result.cached,
      });
    } catch (err) {
      results.push({
        index: i,
        success: false,
        error: err.message,
      });
    }
  });

  await Promise.all(promises);

  const totalTime = Date.now() - startTime;

  // Print results
  const successful = results.filter((r) => r.success).length;
  const avgTime = results
    .filter((r) => r.success)
    .reduce((sum, r) => sum + (r.time || 0), 0) / successful;

  console.log(`\nResults:`);
  console.log(`  Successful: ${successful}/${concurrency}`);
  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Average per call: ${avgTime.toFixed(0)}ms\n`);

  results.forEach(({ index, success, time, cached, error }) => {
    if (success) {
      console.log(`  ${index}: ${time}ms ${cached ? '(cached)' : ''}`);
    } else {
      console.log(`  ${index}: ERROR - ${error}`);
    }
  });

  console.log();
}

/**
 * Run all examples
 */
async function runAll() {
  console.log('\n█'.repeat(60));
  console.log('█ CallHub Voice Handler Examples');
  console.log('█'.repeat(60));

  await exampleBasicCall();
  await exampleCacheComparison();
  await exampleMetrics();
  await exampleConcurrentCalls();

  console.log('✓ All examples completed\n');
}

// Export for use as module
module.exports = {
  callVoiceHandler,
  exampleBasicCall,
  exampleCacheComparison,
  exampleMetrics,
  exampleConcurrentCalls,
};

// Run if called directly
if (require.main === module) {
  runAll().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
