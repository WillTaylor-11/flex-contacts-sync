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

function upsertUnitOfMeasure(data) {
  const db = getDatabase();

  // Check if table exists, if not create it
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='units_of_measure'
  `).get();

  if (!tableExists) {
    db.exec(`
      CREATE TABLE units_of_measure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flex_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        name_plural TEXT,
        abbreviation TEXT,
        unit_of_time TEXT,
        count_unit INTEGER DEFAULT 0,
        time_unit INTEGER DEFAULT 0,
        counts_per_unit REAL DEFAULT 0,
        default_linear_unit INTEGER DEFAULT 0,
        default_weight_unit INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_by_user_id TEXT,
        flex_created_date TEXT,
        last_edit_user_id TEXT,
        flex_last_edit_date TEXT,
        domain_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        flex_data TEXT
      );
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_uom_flex_id ON units_of_measure(flex_id);
      CREATE INDEX IF NOT EXISTS idx_uom_name ON units_of_measure(name);
    `);
  }

  const existing = db.prepare('SELECT id FROM units_of_measure WHERE flex_id = ?').get(data.id);

  const mapped = {
    name: data.name,
    name_plural: data.namePlural,
    abbreviation: data.abbreviation,
    unit_of_time: data.unitOfTime,
    count_unit: data.countUnit ? 1 : 0,
    time_unit: data.timeUnit ? 1 : 0,
    counts_per_unit: data.countsPerUnit || 0,
    default_linear_unit: data.defaultLinearUnit ? 1 : 0,
    default_weight_unit: data.defaultWeightUnit ? 1 : 0,
    deleted: data.deleted ? 1 : 0,
    created_by_user_id: data.createdByUserId,
    flex_created_date: data.createdDate,
    last_edit_user_id: data.lastEditUserId,
    flex_last_edit_date: data.lastEditDate,
    domain_id: data.domainId
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE units_of_measure
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO units_of_measure (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncUnitsOfMeasure() {
  console.log('\n📏 Syncing Units of Measure\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('units_of_measure', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    // Get unique unit of measure IDs from pricing models
    const uomIds = db.prepare(`
      SELECT DISTINCT unit_of_measure_id
      FROM pricing_models
      WHERE unit_of_measure_id IS NOT NULL
    `).all().map(r => r.unit_of_measure_id);

    console.log(`📋 Found ${uomIds.length} unique unit of measure ID(s) in pricing models\n`);

    // Fetch each unit of measure by ID
    for (const uomId of uomIds) {
      try {
        const response = await api.get(`/unit-of-measure/${uomId}`);
        const uom = response.data;
        stats.fetched++;

        const result = upsertUnitOfMeasure(uom);
        if (result.action === 'inserted') {
          stats.inserted++;
          console.log(`✅ Inserted: ${uom.name} (${uom.abbreviation})`);
        } else {
          stats.updated++;
          console.log(`🔄 Updated: ${uom.name} (${uom.abbreviation})`);
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        logger.error(`Error fetching unit of measure ${uomId}: ${error.message}`);
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
    console.log('\n✅ Units of measure synced successfully!\n');

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

syncUnitsOfMeasure();
