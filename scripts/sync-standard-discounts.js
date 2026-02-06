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

function upsertStandardDiscount(data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM standard_discounts WHERE flex_id = ?').get(data.discountId);

  const mapped = {
    name: data.discountName,
    rules: JSON.stringify(data.rules || [])
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE standard_discounts
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.discountId);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.discountId, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO standard_discounts (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncStandardDiscounts() {
  console.log('\n🎟️  Syncing Standard Discounts\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('standard_discounts', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    // Get unique discount IDs from contacts
    const discountIds = db.prepare(`
      SELECT DISTINCT standard_discount_id
      FROM contacts
      WHERE standard_discount_id IS NOT NULL
    `).all().map(r => r.standard_discount_id);

    console.log(`📋 Found ${discountIds.length} unique discount ID(s) in contacts\n`);

    // Fetch each discount by ID
    for (const discountId of discountIds) {
      try {
        const response = await api.get(`/standard-discount/${discountId}`);
        const discount = response.data;
        stats.fetched++;

        const result = upsertStandardDiscount(discount);
        if (result.action === 'inserted') {
          stats.inserted++;
          console.log(`✅ Inserted: ${discount.discountName}`);
        } else {
          stats.updated++;
          console.log(`🔄 Updated: ${discount.discountName}`);
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        logger.error(`Error fetching discount ${discountId}: ${error.message}`);
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
    console.log('\n✅ Standard discounts synced successfully!\n');

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

syncStandardDiscounts();
