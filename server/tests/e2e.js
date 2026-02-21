/**
 * tests/e2e.js
 * 
 * End-to-end test for voice call flow.
 * Tests cache hit/miss, timing measurements, and streaming (if available).
 * 
 * Usage: node tests/e2e.js
 */

const http = require('http');
const logger = require('../lib/logger');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

/**
 * Make HTTP POST request.
 * 
 * @param {string} url
 * @param {object} body
 * @param {object} query
 * @returns {Promise<{statusCode, body, headers}>}
 */
async function httpPost(url, body = {}, query = {}) {
  return new Promise((resolve, reject) => {
    const queryStr = new URLSearchParams(query).toString();
    const fullUrl = `${url}${queryStr ? '?' + queryStr : ''}`;
    const urlObj = new URL(fullUrl);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Make HTTP GET request.
 * 
 * @param {string} url
 * @returns {Promise<{statusCode, body}>}
 */
async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Test 1: First call (cache miss) with timing breakdown.
 */
async function test1_CacheMiss() {
  logger.info('\n' + '='.repeat(60));
  logger.info('TEST 1: First Call (Cache Miss)');
  logger.info('='.repeat(60));

  const text = 'Hello, welcome to CallHub voice assistant. How can I help you today?';

  try {
    const result = await httpPost(`${BASE_URL}/call`, {
      callId: 'test-call-1',
      text,
      format: 'MP3',
      streaming: false,
    }, { debug: 'true' });

    if (result.statusCode !== 200) {
      logger.error(`Request failed with status ${result.statusCode}`);
      logger.error(`Response: ${JSON.stringify(result.body)}`);
      return false;
    }

    const { success, cached, timings } = result.body;

    logger.info(`Response Status: ${success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`Cache Status: ${cached ? 'HIT' : 'MISS'}`);

    if (timings) {
      logger.info('\nTiming Breakdown (ms):');
      Object.entries(timings).forEach(([key, value]) => {
        logger.info(`  ${key.padEnd(25)}: ${value}`);
      });
    }

    return success && !cached;
  } catch (err) {
    logger.error(`Test 1 failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 2: Same call again (cache hit) - should be much faster.
 */
async function test2_CacheHit() {
  logger.info('\n' + '='.repeat(60));
  logger.info('TEST 2: Repeated Call (Cache Hit)');
  logger.info('='.repeat(60));

  const text = 'Hello, welcome to CallHub voice assistant. How can I help you today?';

  try {
    const result = await httpPost(`${BASE_URL}/call`, {
      callId: 'test-call-2',
      text,
      format: 'MP3',
      streaming: false,
    }, { debug: 'true' });

    if (result.statusCode !== 200) {
      logger.error(`Request failed with status ${result.statusCode}`);
      return false;
    }

    const { success, cached, timings } = result.body;

    logger.info(`Response Status: ${success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`Cache Status: ${cached ? 'HIT' : 'MISS'}`);

    if (timings) {
      logger.info('\nTiming Breakdown (ms):');
      Object.entries(timings).forEach(([key, value]) => {
        logger.info(`  ${key.padEnd(25)}: ${value}`);
      });
    }

    return success && cached;
  } catch (err) {
    logger.error(`Test 2 failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 3: Different text (new cache miss).
 */
async function test3_DifferentText() {
  logger.info('\n' + '='.repeat(60));
  logger.info('TEST 3: Different Text (New Cache Miss)');
  logger.info('='.repeat(60));

  const text = 'Thank you for calling CallHub. Your call is important to us.';

  try {
    const result = await httpPost(`${BASE_URL}/call`, {
      callId: 'test-call-3',
      text,
      format: 'MP3',
    }, { debug: 'true' });

    if (result.statusCode !== 200) {
      logger.error(`Request failed with status ${result.statusCode}`);
      return false;
    }

    const { success, cached } = result.body;

    logger.info(`Response Status: ${success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`Cache Status: ${cached ? 'HIT' : 'MISS'}`);

    return success && !cached;
  } catch (err) {
    logger.error(`Test 3 failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 4: Check metrics.
 */
async function test4_Metrics() {
  logger.info('\n' + '='.repeat(60));
  logger.info('TEST 4: Metrics Endpoint');
  logger.info('='.repeat(60));

  try {
    const result = await httpGet(`${BASE_URL}/metrics.json`);

    if (result.statusCode !== 200) {
      logger.error(`Metrics request failed with status ${result.statusCode}`);
      return false;
    }

    const { counters, histograms } = result.body;

    logger.info('\nCounters:');
    Object.entries(counters).forEach(([key, value]) => {
      logger.info(`  ${key.padEnd(30)}: ${value}`);
    });

    logger.info('\nHistograms (aggregates):');
    Object.entries(histograms || {}).forEach(([key, stats]) => {
      logger.info(`  ${key}:`);
      logger.info(`    count: ${stats.count}`);
      logger.info(`    avg:   ${stats.avg || 0}ms`);
      logger.info(`    p99:   ${stats.p99 || 0}ms`);
    });

    return true;
  } catch (err) {
    logger.error(`Test 4 failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 5: Health check.
 */
async function test5_Health() {
  logger.info('\n' + '='.repeat(60));
  logger.info('TEST 5: Health Check');
  logger.info('='.repeat(60));

  try {
    const result = await httpGet(`${BASE_URL}/health`);

    if (result.statusCode !== 200) {
      logger.error(`Health check failed with status ${result.statusCode}`);
      return false;
    }

    logger.info(`Health Status: ${result.body.status}`);
    logger.info(`Timestamp: ${result.body.timestamp}`);

    return result.body.status === 'ok';
  } catch (err) {
    logger.error(`Test 5 failed: ${err.message}`);
    return false;
  }
}

/**
 * Main test runner.
 */
async function runTests() {
  logger.info('\n' + '█'.repeat(60));
  logger.info('█ CallHub Voice Call E2E Test Suite');
  logger.info('█ ' + new Date().toISOString());
  logger.info('█'.repeat(60));

  const tests = [
    { name: 'Health Check', fn: test5_Health },
    { name: 'Cache Miss (First Call)', fn: test1_CacheMiss },
    { name: 'Cache Hit (Repeated Call)', fn: test2_CacheHit },
    { name: 'Different Text (New Cache Miss)', fn: test3_DifferentText },
    { name: 'Metrics Endpoint', fn: test4_Metrics },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (err) {
      logger.error(`Test "${test.name}" threw error: ${err.message}`);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  logger.info('\n' + '█'.repeat(60));
  logger.info('█ Test Summary');
  logger.info('█'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach(({ name, passed: p }) => {
    const status = p ? '✓ PASS' : '✗ FAIL';
    logger.info(`  ${status}: ${name}`);
  });

  logger.info(`\n  ${passed}/${total} tests passed\n`);

  if (passed === total) {
    logger.info('█ All tests passed! ✓');
    process.exit(0);
  } else {
    logger.error('█ Some tests failed. ✗');
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  logger.error(`E2E test suite failed: ${err.message}`);
  process.exit(1);
});
