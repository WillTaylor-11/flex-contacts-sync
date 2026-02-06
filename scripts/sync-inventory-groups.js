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

function upsertInventoryGroup(data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM inventory_groups WHERE flex_id = ?').get(data.id);

  const mapped = {
    name: data.name,
    full_display_string: data.fullDisplayString,
    icon_id: data.iconId || data.icon?.id,
    icon_url: data.iconURL,
    domain_id: data.domainId,
    parent_group_id: data.parentGroup?.id,
    parent_group_name: data.parentGroup?.name,
    parent_group_full_display_string: data.parentGroup?.fullDisplayString,
    icon_name: data.icon?.name,
    icon_category: data.icon?.category,
    management_group: data.managementGroup ? 1 : 0,
    sales_account_id: data.salesAccount?.id,
    sales_account_name: data.salesAccount?.name,
    purchase_account_id: data.purchaseAccount?.id,
    purchase_account_name: data.purchaseAccount?.name,
    view_group_ids: data.viewGroupIds ? JSON.stringify(data.viewGroupIds) : null,
    safe_work_method_ids: data.safeWorkMethodIds ? JSON.stringify(data.safeWorkMethodIds) : null
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE inventory_groups
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO inventory_groups (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncInventoryGroups() {
  console.log('\n📁 Syncing Inventory Groups (Categories)\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('inventory_groups', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    status: 'success',
    error: null
  };

  try {
    // Get all groups from search (returns array directly)
    console.log('🔍 Fetching all inventory groups...\n');

    const searchResponse = await api.get('/inventory-group/search', {
      params: { searchText: 'ab' }
    });

    const groups = searchResponse.data;
    console.log(`📋 Found ${groups.length} inventory groups\n`);

    // Fetch detail for each group
    for (let i = 0; i < groups.length; i++) {
      const groupId = groups[i].id;

      try {
        const response = await api.get(`/inventory-group/${groupId}`);
        const group = response.data;
        stats.fetched++;

        const result = upsertInventoryGroup(group);
        if (result.action === 'inserted') {
          stats.inserted++;
        } else {
          stats.updated++;
        }

        // Progress indicator
        if ((i + 1) % 50 === 0 || i === groups.length - 1) {
          const progress = ((i + 1) / groups.length * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${progress}% (${i + 1}/${groups.length}) - ${stats.inserted} inserted, ${stats.updated} updated`);
        }

        await new Promise(r => setTimeout(r, 150)); // Rate limiting

      } catch (error) {
        stats.errors++;
        logger.error(`Error fetching group ${groupId}: ${error.message}`);
        if (!stats.error) stats.error = `First error: ${error.message}`;
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
    console.log(`  Errors:   ${stats.errors}`);
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Inventory groups synced successfully!\n');

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

syncInventoryGroups();
