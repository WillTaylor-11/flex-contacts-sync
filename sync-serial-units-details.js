#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('./src/database/schema');
const {
  updateSerialUnitDetail,
  getSerialUnitsWithoutDetail,
  getSerialUnitsWithoutDetailCount
} = require('./src/database/operations');
const logger = require('./src/utils/logger');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

// Configuration
const CONFIG = {
  delayBetweenRequests: 300,    // ms between requests
  delayAfter429: 10000,          // ms to wait after 429 error
  maxRetries: 3,
  batchSize: 1000                // Fetch this many units at a time
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, params, retries = 0) {
  try {
    const response = await api.get(url, { params });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 429) {
      if (retries < CONFIG.maxRetries) {
        const backoffDelay = CONFIG.delayAfter429 * (retries + 1);
        logger.warn(`Rate limited, waiting ${backoffDelay}ms before retry ${retries + 1}/${CONFIG.maxRetries}`);
        await sleep(backoffDelay);
        return fetchWithRetry(url, params, retries + 1);
      }
      return { success: false, error: '429', message: 'Rate limit exceeded (2,000/hour)' };
    } else if (error.response?.status === 404) {
      return { success: false, error: '404', message: 'Not found' };
    } else {
      return { success: false, error: error.response?.status || 'unknown', message: error.message };
    }
  }
}

async function syncSerialUnitDetails() {
  console.log('\n🔄 Fetching Serial Unit Details\n');
  console.log('='.repeat(70) + '\n');

  const totalWithoutDetail = getSerialUnitsWithoutDetailCount();
  console.log(`📋 Found ${totalWithoutDetail} serial units needing details\n`);

  if (totalWithoutDetail === 0) {
    console.log('✅ All serial units already have details!\n');
    return;
  }

  console.log(`⚙️  Configuration:`);
  console.log(`   Delay between requests: ${CONFIG.delayBetweenRequests}ms`);
  console.log(`   API Rate Limit: 2,000 requests/hour`);
  console.log(`   Estimated time: ${((totalWithoutDetail * CONFIG.delayBetweenRequests) / 1000 / 60).toFixed(1)} minutes\n`);

  const stats = {
    attempted: 0,
    fetched: 0,
    updated: 0,
    errors: {
      rate_limited: 0,
      not_found: 0,
      other: 0
    }
  };

  const startTime = Date.now();

  try {
    // Fetch in batches
    let processed = 0;

    while (processed < totalWithoutDetail) {
      const units = getSerialUnitsWithoutDetail(CONFIG.batchSize);

      if (units.length === 0) {
        break; // No more units to process
      }

      console.log(`Processing batch: ${processed + 1} to ${processed + units.length}\n`);

      for (const unit of units) {
        stats.attempted++;
        processed++;

        // Fetch detail for this serial unit
        const result = await fetchWithRetry(`/serial-unit/${unit.flex_id}`);

        if (result.success) {
          // Update with detailed data
          updateSerialUnitDetail(unit.flex_id, result.data);
          stats.fetched++;
          stats.updated++;
          console.log(`   ✓ ${unit.name || unit.barcode || unit.flex_id}`);
        } else {
          if (result.error === '429') {
            stats.errors.rate_limited++;
            console.log(`\n   ⚠️  Rate limited at ${stats.attempted}/${totalWithoutDetail}`);
            console.log(`   Wait 1 hour, then run this script again to resume.\n`);

            // Show progress before stopping
            const elapsed = (Date.now() - startTime) / 1000;
            console.log('='.repeat(70));
            console.log(`\n📊 Progress Before Rate Limit:\n`);
            console.log(`   Details attempted: ${stats.attempted}`);
            console.log(`   Details fetched: ${stats.fetched}`);
            console.log(`   Remaining: ${totalWithoutDetail - stats.attempted}`);
            console.log(`   Duration: ${elapsed.toFixed(1)}s (${(elapsed / 60).toFixed(1)} minutes)\n`);

            return; // Stop on rate limit
          } else if (result.error === '404') {
            stats.errors.not_found++;
            console.log(`   ⚠️  Not found: ${unit.name || unit.barcode}`);
          } else {
            stats.errors.other++;
            console.log(`   ❌ Error: ${unit.name || unit.barcode} - ${result.message}`);
          }
        }

        // Show progress every 10 units
        if (stats.attempted % 10 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = (stats.attempted / elapsed).toFixed(2);
          const remaining = totalWithoutDetail - stats.attempted;
          const eta = ((remaining / rate) / 60).toFixed(1);

          console.log(`\n   Progress: ${stats.attempted}/${totalWithoutDetail} (${rate}/s) - ETA: ${eta}min\n`);
        }

        await sleep(CONFIG.delayBetweenRequests);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const remainingCount = getSerialUnitsWithoutDetailCount();

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Serial Unit Details Sync Complete!\n');
    console.log(`📊 Statistics:`);
    console.log(`   Details attempted: ${stats.attempted}`);
    console.log(`   Details fetched: ${stats.fetched}`);
    console.log(`   Records updated: ${stats.updated}`);
    console.log(`   Rate limit errors (429): ${stats.errors.rate_limited}`);
    console.log(`   Not found errors (404): ${stats.errors.not_found}`);
    console.log(`   Other errors: ${stats.errors.other}`);
    console.log(`   Duration: ${duration}s (${(duration / 60).toFixed(1)} minutes)\n`);

    console.log(`💾 Database Status:`);
    console.log(`   Serial units with details: ${totalWithoutDetail - remainingCount}`);
    console.log(`   Serial units without details: ${remainingCount}\n`);

    if (remainingCount > 0) {
      console.log(`⚠️  ${remainingCount} units still need details. Run this script again to continue.\n`);
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncSerialUnitDetails().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
