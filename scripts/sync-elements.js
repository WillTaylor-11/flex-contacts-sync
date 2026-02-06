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

function upsertElement(data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM elements WHERE flex_id = ?').get(data.id);

  const mapped = {
    name: data.name || null,
    document_number: data.documentNumber,
    definition_name: data.definitionName,
    parent_name: data.parentName || null
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE elements
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO elements (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncElements() {
  console.log('\n📦 Syncing Elements (Quotes, POs, Invoices, Payments)\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('elements', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    status: 'success',
    error: null,
    byType: {}
  };

  try {
    // First, get total count
    const initialResponse = await api.get('/element/search', {
      params: { page: 0, size: 1 }
    });

    const totalElements = initialResponse.data.totalElements;
    const pageSize = 100;
    const totalPages = Math.ceil(totalElements / pageSize);

    console.log(`📋 Found ${totalElements} total elements across ${totalPages} pages\n`);

    // Fetch all pages
    for (let page = 0; page < totalPages; page++) {
      try {
        const response = await api.get('/element/search', {
          params: { page, size: pageSize }
        });

        const elements = response.data.content || [];

        for (const element of elements) {
          stats.fetched++;

          // Track by type
          const type = element.definitionName || 'Unknown';
          stats.byType[type] = (stats.byType[type] || 0) + 1;

          const result = upsertElement(element);
          if (result.action === 'inserted') {
            stats.inserted++;
          } else {
            stats.updated++;
          }
        }

        // Progress indicator
        const progress = ((page + 1) / totalPages * 100).toFixed(1);
        const current = Math.min((page + 1) * pageSize, totalElements);
        process.stdout.write(`\r⏳ Progress: ${progress}% (${current}/${totalElements})`);

        await new Promise(r => setTimeout(r, 120)); // Rate limiting

      } catch (error) {
        logger.error(`Error fetching page ${page}: ${error.message}`);
        stats.error = error.message;
      }
    }

    console.log('\n');

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

    console.log('\n📊 Elements by Type:\n');
    Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(20)} ${count}`);
      });

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Elements synced successfully!\n');

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

syncElements();
