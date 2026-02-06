#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('./src/database/schema');
const {
  upsertSerialUnit,
  updateSerialUnitDetail,
  getSerialUnitCount,
  getSerialUnitsWithoutDetailCount,
  startSyncLog,
  completeSyncLog
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
  delayBetweenRequests: 300,    // ms between requests (slower to avoid rate limits)
  delayAfter429: 10000,          // ms to wait after 429 error
  maxRetries: 3,
  batchSize: 25,                 // Progress update frequency
  fetchDetails: true             // Set to false to only fetch list data
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
        logger.warn(`Rate limited (2,000/hour limit reached), waiting ${backoffDelay}ms before retry ${retries + 1}/${CONFIG.maxRetries}`);
        await sleep(backoffDelay);
        return fetchWithRetry(url, params, retries + 1);
      }
      return { success: false, error: '429', message: 'Rate limit exceeded (2,000 requests/hour)' };
    } else if (error.response?.status === 404) {
      return { success: false, error: '404', message: 'Not found' };
    } else {
      return { success: false, error: error.response?.status || 'unknown', message: error.message };
    }
  }
}

async function syncSerialUnits() {
  console.log('\n🔄 Starting Complete Serial Units Sync (List + Details)\n');
  console.log('='.repeat(70) + '\n');
  console.log(`⚙️  Configuration:`);
  console.log(`   Delay between requests: ${CONFIG.delayBetweenRequests}ms`);
  console.log(`   Delay after 429 error: ${CONFIG.delayAfter429}ms`);
  console.log(`   Fetch detailed data: ${CONFIG.fetchDetails ? 'Yes' : 'No'}`);
  console.log(`   API Rate Limit: 2,000 requests/hour\n`);

  const db = getDatabase();
  const syncId = startSyncLog();

  const stats = {
    step1: {
      modelsChecked: 0,
      modelsWithUnits: 0,
      serialUnitsFound: 0,
      inserted: 0,
      updated: 0,
      errors: { rate_limited: 0, not_found: 0, other: 0 }
    },
    step2: {
      detailsAttempted: 0,
      detailsFetched: 0,
      detailsUpdated: 0,
      errors: { rate_limited: 0, not_found: 0, other: 0 }
    },
    totalRequests: 0,
    status: 'success'
  };

  const startTime = Date.now();

  try {
    // ========================================================================
    // STEP 1: Get Serial Unit Lists from all Inventory Models
    // ========================================================================
    console.log('📋 STEP 1: Fetching Serial Unit Lists\n');

    const models = db.prepare('SELECT flex_id, name, barcode FROM inventory_models').all();
    console.log(`   Found ${models.length} inventory models to check\n`);

    let lastProgressUpdate = 0;

    for (const model of models) {
      stats.step1.modelsChecked++;
      stats.totalRequests++;

      // Fetch serial units list for this model
      const result = await fetchWithRetry('/serial-unit/node-list', { modelId: model.flex_id });

      if (result.success) {
        const serialUnits = result.data;

        if (Array.isArray(serialUnits) && serialUnits.length > 0) {
          stats.step1.modelsWithUnits++;

          // Process each serial unit
          for (const unit of serialUnits) {
            unit.inventoryModelId = model.flex_id;
            unit.inventoryModelName = model.name;

            // Store list data with detail_fetched = 0
            const upsertResult = upsertSerialUnit(unit);
            stats.step1.serialUnitsFound++;

            if (upsertResult.action === 'inserted') {
              stats.step1.inserted++;
            } else if (upsertResult.action === 'updated') {
              stats.step1.updated++;
            }
          }

          console.log(`   ✓ ${model.name}: ${serialUnits.length} units`);
        }
      } else {
        // Track errors
        if (result.error === '429') {
          stats.step1.errors.rate_limited++;
          console.log(`   ⚠️  Rate limited. Pausing sync. Resume with sync-serial-units-details.js`);
          break; // Stop on rate limit
        } else if (result.error === '404') {
          stats.step1.errors.not_found++;
        } else {
          stats.step1.errors.other++;
          logger.error(`Error fetching ${model.name}: ${result.message}`);
        }
      }

      // Show progress periodically
      if (stats.step1.modelsChecked - lastProgressUpdate >= CONFIG.batchSize) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (stats.step1.modelsChecked / elapsed).toFixed(2);
        const remaining = models.length - stats.step1.modelsChecked;
        const eta = ((remaining / rate) / 60).toFixed(1);

        console.log(`\n   Progress: ${stats.step1.modelsChecked}/${models.length} models (${rate}/s)`);
        console.log(`   Serial units found: ${stats.step1.serialUnitsFound} from ${stats.step1.modelsWithUnits} models`);
        console.log(`   API requests made: ${stats.totalRequests}`);
        console.log(`   ETA: ${eta} minutes\n`);

        lastProgressUpdate = stats.step1.modelsChecked++;
      }

      await sleep(CONFIG.delayBetweenRequests);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ STEP 1 Complete: Found ${stats.step1.serialUnitsFound} serial units\n`);

    // ========================================================================
    // STEP 2: Fetch Detailed Data for Each Serial Unit
    // ========================================================================
    if (CONFIG.fetchDetails && stats.step1.serialUnitsFound > 0) {
      console.log('='.repeat(70));
      console.log('\n📋 STEP 2: Fetching Detailed Data for Each Serial Unit\n');

      const unitsWithoutDetail = db.prepare(`
        SELECT flex_id, name
        FROM serial_units
        WHERE detail_fetched = 0
        ORDER BY created_at
      `).all();

      console.log(`   Found ${unitsWithoutDetail.length} serial units needing details\n`);

      for (const unit of unitsWithoutDetail) {
        stats.step2.detailsAttempted++;
        stats.totalRequests++;

        // Fetch detail for this serial unit
        const result = await fetchWithRetry(`/serial-unit/${unit.flex_id}`);

        if (result.success) {
          // Update with detailed data
          updateSerialUnitDetail(unit.flex_id, result.data);
          stats.step2.detailsFetched++;
          stats.step2.detailsUpdated++;
          console.log(`   ✓ ${unit.name}`);
        } else {
          if (result.error === '429') {
            stats.step2.errors.rate_limited++;
            console.log(`\n   ⚠️  Rate limited at ${stats.step2.detailsAttempted}/${unitsWithoutDetail.length}`);
            console.log(`   Resume later with: node sync-serial-units-details.js\n`);
            break; // Stop on rate limit
          } else if (result.error === '404') {
            stats.step2.errors.not_found++;
          } else {
            stats.step2.errors.other++;
          }
        }

        // Show progress
        if (stats.step2.detailsAttempted % 10 === 0) {
          console.log(`   Progress: ${stats.step2.detailsAttempted}/${unitsWithoutDetail.length} - Requests: ${stats.totalRequests}`);
        }

        await sleep(CONFIG.delayBetweenRequests);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Serial Units Sync Complete!\n');
    console.log(`📊 STEP 1 Statistics (List Data):`);
    console.log(`   Models checked: ${stats.step1.modelsChecked}`);
    console.log(`   Models with serial units: ${stats.step1.modelsWithUnits}`);
    console.log(`   Serial units found: ${stats.step1.serialUnitsFound}`);
    console.log(`   New records inserted: ${stats.step1.inserted}`);
    console.log(`   Existing records updated: ${stats.step1.updated}`);
    console.log(`   Rate limit errors (429): ${stats.step1.errors.rate_limited}`);
    console.log(`   Not found errors (404): ${stats.step1.errors.not_found}`);
    console.log(`   Other errors: ${stats.step1.errors.other}\n`);

    if (CONFIG.fetchDetails) {
      console.log(`📊 STEP 2 Statistics (Detail Data):`);
      console.log(`   Details attempted: ${stats.step2.detailsAttempted}`);
      console.log(`   Details fetched: ${stats.step2.detailsFetched}`);
      console.log(`   Records updated: ${stats.step2.detailsUpdated}`);
      console.log(`   Rate limit errors (429): ${stats.step2.errors.rate_limited}`);
      console.log(`   Not found errors (404): ${stats.step2.errors.not_found}`);
      console.log(`   Other errors: ${stats.step2.errors.other}\n`);
    }

    console.log(`⏱️  Duration: ${duration}s (${(duration / 60).toFixed(1)} minutes)`);
    console.log(`📡 Total API Requests: ${stats.totalRequests}\n`);

    const totalCount = getSerialUnitCount();
    const withoutDetailCount = getSerialUnitsWithoutDetailCount();
    console.log(`💾 Database Summary:`);
    console.log(`   Total serial units: ${totalCount}`);
    console.log(`   With details: ${totalCount - withoutDetailCount}`);
    console.log(`   Without details: ${withoutDetailCount}\n`);

    // Update sync log
    db.prepare('UPDATE sync_log SET entity_type = ? WHERE id = ?').run('serial_units_full', syncId);
    completeSyncLog(syncId, {
      fetched: stats.step1.serialUnitsFound,
      inserted: stats.step1.inserted,
      updated: stats.step1.updated + stats.step2.detailsUpdated,
      status: stats.status
    });

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    stats.status = 'failed';
    completeSyncLog(syncId, {
      fetched: stats.step1.serialUnitsFound,
      inserted: stats.step1.inserted,
      updated: stats.step1.updated,
      status: 'failed',
      error: error.message
    });
    process.exit(1);
  }
}

// Run the sync
syncSerialUnits().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
