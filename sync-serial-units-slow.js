#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('./src/database/schema');
const {
  upsertSerialUnit,
  getSerialUnitCount,
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

// Configurable delays and retry settings
const CONFIG = {
  delayBetweenRequests: 200, // ms between normal requests
  delayAfter429: 5000,        // ms to wait after 429 error
  maxRetries: 3,
  batchSize: 50               // Progress update frequency
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
      return { success: false, error: '429', message: 'Rate limit exceeded' };
    } else if (error.response?.status === 404) {
      return { success: false, error: '404', message: 'Not found' };
    } else {
      return { success: false, error: error.response?.status || 'unknown', message: error.message };
    }
  }
}

async function syncSerialUnits() {
  console.log('\n🔄 Starting Serial Units Sync (Rate-Limited)\n');
  console.log('='.repeat(70) + '\n');
  console.log(`⚙️  Configuration:`);
  console.log(`   Delay between requests: ${CONFIG.delayBetweenRequests}ms`);
  console.log(`   Delay after 429 error: ${CONFIG.delayAfter429}ms`);
  console.log(`   Max retries: ${CONFIG.maxRetries}\n`);

  const db = getDatabase();
  const syncId = startSyncLog();

  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    modelsChecked: 0,
    modelsWithUnits: 0,
    errors: {
      rate_limited: 0,
      not_found: 0,
      other: 0
    },
    status: 'success'
  };

  try {
    // Get all inventory models
    const models = db.prepare('SELECT flex_id, name, barcode FROM inventory_models').all();
    console.log(`📋 Found ${models.length} inventory models to check\n`);
    console.log(`⏱️  Estimated time: ${((models.length * CONFIG.delayBetweenRequests) / 1000 / 60).toFixed(1)} minutes\n`);

    const startTime = Date.now();
    let lastProgressUpdate = 0;

    for (const model of models) {
      stats.modelsChecked++;

      // Fetch serial units for this model
      const result = await fetchWithRetry('/serial-unit/node-list', { modelId: model.flex_id });

      if (result.success) {
        const serialUnits = result.data;

        if (Array.isArray(serialUnits) && serialUnits.length > 0) {
          stats.modelsWithUnits++;

          // Process each serial unit
          for (const unit of serialUnits) {
            unit.inventoryModelId = model.flex_id;
            unit.inventoryModelName = model.name;

            const upsertResult = upsertSerialUnit(unit);
            stats.fetched++;

            if (upsertResult.action === 'inserted') {
              stats.inserted++;
            } else if (upsertResult.action === 'updated') {
              stats.updated++;
            }
          }

          console.log(`✓ ${model.name}: ${serialUnits.length} units`);
        }
      } else {
        // Track errors
        if (result.error === '429') {
          stats.errors.rate_limited++;
        } else if (result.error === '404') {
          stats.errors.not_found++;
        } else {
          stats.errors.other++;
          logger.error(`Error fetching ${model.name}: ${result.message}`);
        }
      }

      // Show progress periodically
      if (stats.modelsChecked - lastProgressUpdate >= CONFIG.batchSize) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (stats.modelsChecked / elapsed).toFixed(2);
        const remaining = models.length - stats.modelsChecked;
        const eta = ((remaining / rate) / 60).toFixed(1);

        console.log(`\n   Progress: ${stats.modelsChecked}/${models.length} (${rate}/s)`);
        console.log(`   Serial units found: ${stats.fetched} from ${stats.modelsWithUnits} models`);
        console.log(`   Errors: 429=${stats.errors.rate_limited}, 404=${stats.errors.not_found}, other=${stats.errors.other}`);
        console.log(`   ETA: ${eta} minutes\n`);

        lastProgressUpdate = stats.modelsChecked;
      }

      // Rate limiting delay
      await sleep(CONFIG.delayBetweenRequests);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Serial Units Sync Complete!\n');
    console.log(`📊 Statistics:`);
    console.log(`   Models checked: ${stats.modelsChecked}`);
    console.log(`   Models with serial units: ${stats.modelsWithUnits}`);
    console.log(`   Serial units fetched: ${stats.fetched}`);
    console.log(`   New records inserted: ${stats.inserted}`);
    console.log(`   Existing records updated: ${stats.updated}`);
    console.log(`   Rate limit errors (429): ${stats.errors.rate_limited}`);
    console.log(`   Not found errors (404): ${stats.errors.not_found}`);
    console.log(`   Other errors: ${stats.errors.other}`);
    console.log(`   Duration: ${duration}s (${(duration / 60).toFixed(1)} minutes)\n`);

    const totalCount = getSerialUnitCount();
    console.log(`💾 Total serial units in database: ${totalCount}\n`);

    // Update sync log
    db.prepare('UPDATE sync_log SET entity_type = ? WHERE id = ?').run('serial_units', syncId);
    completeSyncLog(syncId, {
      fetched: stats.fetched,
      inserted: stats.inserted,
      updated: stats.updated,
      status: stats.status
    });

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    stats.status = 'failed';
    completeSyncLog(syncId, {
      fetched: stats.fetched,
      inserted: stats.inserted,
      updated: stats.updated,
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
