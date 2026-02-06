#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('../src/database/schema');
const logger = require('../src/utils/logger');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

function upsertPricingModel(data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM pricing_models WHERE flex_id = ?').get(data.id);

  const mapped = {
    name: data.name,
    code: data.code,
    deleted: data.deleted ? 1 : 0,
    unit_of_measure_id: data.unitOfMeasureIdentity?.id,
    unit_of_measure_name: data.unitOfMeasureIdentity?.name,
    count_unit_id: data.countUnitIdentity?.id,
    count_unit_name: data.countUnitIdentity?.name,
    start_date: data.startDate,
    end_date: data.endDate,
    disabled_by_default: data.disabledByDefault ? 1 : 0,
    price_calculation_method: data.priceCalculationMethod,
    price_multiplier: data.priceMultiplier,
    price_base_pricing_model_id: data.priceBasePricingModel?.id,
    price_base_pricing_model_name: data.priceBasePricingModel?.name,
    price_manual_tiers_enabled: data.priceManualTiersEnabled ? 1 : 0,
    price_override_enabled: data.priceOverrideEnabled ? 1 : 0,
    price_line_qty_as_price_multiplier: data.priceLineQtyAsPriceMultiplier ? 1 : 0,
    price_calculate_time: data.priceCalculateTime ? 1 : 0,
    price_time_slicing: data.priceTimeSlicing ? 1 : 0,
    cost_calculation_method: data.costCalculationMethod,
    cost_multiplier: data.costMultiplier,
    cost_base_pricing_model_id: data.costBasePricingModel?.id,
    cost_base_pricing_model_name: data.costBasePricingModel?.name,
    cost_manual_tiers_enabled: data.costManualTiersEnabled ? 1 : 0,
    cost_override_enabled: data.costOverrideEnabled ? 1 : 0,
    cost_line_qty_as_price_multiplier: data.costLineQtyAsPriceMultiplier ? 1 : 0,
    has_manual_cost_tiers: data.hasManualCostTiers ? 1 : 0,
    has_manual_price_tiers: data.hasManualPriceTiers ? 1 : 0,
    resource_type_ids: JSON.stringify(data.resourceTypeIdentities || [])
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE pricing_models
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO pricing_models (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncPricingModels() {
  console.log('\n💰 Syncing Pricing Models\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('pricing_models', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    // Get unique pricing model IDs from contacts
    const pricingModelIds = db.prepare(`
      SELECT DISTINCT default_pricing_model_id
      FROM contacts
      WHERE default_pricing_model_id IS NOT NULL
    `).all().map(r => r.default_pricing_model_id);

    console.log(`📋 Found ${pricingModelIds.length} unique pricing model ID(s) in contacts\n`);

    // Fetch each pricing model by ID
    for (const modelId of pricingModelIds) {
      try {
        const response = await api.get(`/pricing-model/${modelId}`);
        const model = response.data;
        stats.fetched++;

        const result = upsertPricingModel(model);
        if (result.action === 'inserted') {
          stats.inserted++;
          console.log(`✅ Inserted: ${model.name} (${model.code || 'no code'})`);
        } else {
          stats.updated++;
          console.log(`🔄 Updated: ${model.name} (${model.code || 'no code'})`);
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        logger.error(`Error fetching pricing model ${modelId}: ${error.message}`);
        stats.error = error.message;
      }
    }

    db.prepare(`
      UPDATE sync_log SET
        sync_completed_at = CURRENT_TIMESTAMP,
        records_fetched = ?,
        records_inserted = ?,
        records_updated = ?,
        status = ?,
        error_message = ?
      WHERE id = ?
    `).run(stats.fetched, stats.inserted, stats.updated, stats.status, stats.error, syncId);

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 Sync Summary:\n');
    console.log(`  Fetched:  ${stats.fetched}`);
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Updated:  ${stats.updated}`);
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Pricing models synced successfully!\n');

  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    db.prepare(`
      UPDATE sync_log SET status = 'failed', error_message = ? WHERE id = ?
    `).run(error.message, syncId);
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncPricingModels();
