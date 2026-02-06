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

async function syncSerialUnits() {
  console.log('\n🔄 Starting Serial Units Sync\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = startSyncLog();

  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    modelsChecked: 0,
    modelsWithUnits: 0,
    errors: 0,
    status: 'success'
  };

  try {
    // Get all inventory models
    const models = db.prepare('SELECT flex_id, name, barcode FROM inventory_models').all();
    console.log(`📋 Found ${models.length} inventory models to check\n`);

    let progressCount = 0;
    const startTime = Date.now();

    for (const model of models) {
      progressCount++;
      stats.modelsChecked++;

      try {
        // GET /serial-unit/node-list?modelId={id}
        const response = await api.get('/serial-unit/node-list', {
          params: { modelId: model.flex_id }
        });

        const serialUnits = response.data;

        if (Array.isArray(serialUnits) && serialUnits.length > 0) {
          stats.modelsWithUnits++;

          // Process each serial unit
          for (const unit of serialUnits) {
            // Add model info to unit data
            unit.inventoryModelId = model.flex_id;
            unit.inventoryModelName = model.name;

            const result = upsertSerialUnit(unit);
            stats.fetched++;

            if (result.action === 'inserted') {
              stats.inserted++;
            } else if (result.action === 'updated') {
              stats.updated++;
            }
          }

          logger.info(`✓ ${model.name}: ${serialUnits.length} units`);
        }

        // Show progress every 50 models
        if (progressCount % 50 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (progressCount / elapsed).toFixed(1);
          console.log(`   Progress: ${progressCount}/${models.length} models (${rate}/s) - ${stats.fetched} units found`);
        }

      } catch (error) {
        // Only log non-404 errors (404 means no serial units for this model)
        if (error.response?.status !== 404) {
          stats.errors++;
          logger.error(`Error fetching serial units for ${model.name}: ${error.message}`);
        }
      }

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
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
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Duration: ${duration}s\n`);

    const totalCount = getSerialUnitCount();
    console.log(`💾 Total serial units in database: ${totalCount}\n`);

    // Update sync log with entity_type
    db.prepare('UPDATE sync_log SET entity_type = ? WHERE id = ?').run('serial_units', syncId);
    completeSyncLog(syncId, stats);

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    stats.status = 'failed';
    stats.error = error.message;
    completeSyncLog(syncId, stats);
    process.exit(1);
  }
}

// Run the sync
syncSerialUnits().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
