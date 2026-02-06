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

/**
 * Generic upsert function for reference data
 * Maps common fields and stores everything in flex_data
 */
function upsertReferenceData(tableName, data) {
  const db = getDatabase();

  // Check if record exists
  const existing = db.prepare(`SELECT id FROM ${tableName} WHERE flex_id = ?`).get(data.id);

  // Map fields based on table type
  const mappedData = mapFieldsForTable(tableName, data);

  if (existing) {
    // Update with mapped fields
    const setClauses = Object.keys(mappedData).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mappedData);

    db.prepare(`
      UPDATE ${tableName}
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);

    return { action: 'updated' };
  } else {
    // Insert with mapped fields
    const columns = ['flex_id', ...Object.keys(mappedData), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mappedData), JSON.stringify(data)];

    db.prepare(`
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);

    return { action: 'inserted' };
  }
}

/**
 * Map API fields to database columns for each table
 */
function mapFieldsForTable(tableName, data) {
  const mapped = {};

  if (tableName === 'resource_types') {
    mapped.name = data.name;
    mapped.name_plural = data.namePlural;
    mapped.parent_type_id = data.parentTypeId;
    mapped.applicable_class_name = data.applicableClassName;
    mapped.availability_mode = data.availabilityMode;
    mapped.applicable_towards_resource_type_name = data.applicableTowardsResourceTypeName;
    mapped.discount_enabled = data.discountEnabled ? 1 : 0;
    mapped.taxable = data.taxable ? 1 : 0;
    mapped.domain_id = data.domainId;
  } else if (tableName === 'payment_terms') {
    mapped.name = data.name;
    mapped.created_by_user_id = data.createdByUserId;
    mapped.flex_created_date = data.createdDate;
    mapped.last_edit_user_id = data.lastEditUserId;
    mapped.flex_last_edit_date = data.lastEditDate;
    mapped.grace_period = data.gracePeriod;
    mapped.credit_card = data.creditCard ? 1 : 0;
    mapped.domain_id = data.domainId;
  } else if (tableName === 'maintenance_procedures') {
    mapped.name = data.name;
    mapped.description = data.description;
    mapped.procedure_type = data.procedureType || data.resourceTypeName;
    mapped.created_by_user_id = data.createdByUserId;
    mapped.flex_created_date = data.createdDate;
    mapped.last_edit_user_id = data.lastEditUserId;
    mapped.flex_last_edit_date = data.lastEditDate;
    mapped.domain_id = data.domainId;
  }

  return mapped;
}

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function convertValue(val) {
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

/**
 * Log sync start
 */
function logSyncStart(entityType) {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES (?, CURRENT_TIMESTAMP, 'running')
  `).run(entityType);
  return result.lastInsertRowid;
}

/**
 * Log sync completion
 */
function logSyncComplete(syncId, stats) {
  const db = getDatabase();
  db.prepare(`
    UPDATE sync_log SET
      sync_completed_at = CURRENT_TIMESTAMP,
      records_fetched = ?,
      records_inserted = ?,
      records_updated = ?,
      status = ?,
      error_message = ?
    WHERE id = ?
  `).run(
    stats.fetched,
    stats.inserted,
    stats.updated,
    stats.status,
    stats.error || null,
    syncId
  );
}

/**
 * Sync resource types
 */
async function syncResourceTypes() {
  console.log('\n📋 Syncing Resource Types...');
  const syncId = logSyncStart('resource_types');
  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    const response = await api.get('/resource-type');
    const data = Array.isArray(response.data) ? response.data : response.data.content || [];

    stats.fetched = data.length;
    console.log(`   Found ${data.length} resource types`);

    for (const item of data) {
      const result = upsertReferenceData('resource_types', item);
      if (result.action === 'inserted') stats.inserted++;
      else if (result.action === 'updated') stats.updated++;
    }

    console.log(`   ✅ Inserted: ${stats.inserted}, Updated: ${stats.updated}`);
  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    console.error(`   ❌ Error: ${error.message}`);
  }

  logSyncComplete(syncId, stats);
  return stats;
}

/**
 * Sync payment terms
 */
async function syncPaymentTerms() {
  console.log('\n💳 Syncing Payment Terms...');
  const syncId = logSyncStart('payment_terms');
  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    const response = await api.get('/payment-term');
    const data = Array.isArray(response.data) ? response.data : response.data.content || [];

    stats.fetched = data.length;
    console.log(`   Found ${data.length} payment terms`);

    for (const item of data) {
      const result = upsertReferenceData('payment_terms', item);
      if (result.action === 'inserted') stats.inserted++;
      else if (result.action === 'updated') stats.updated++;
    }

    console.log(`   ✅ Inserted: ${stats.inserted}, Updated: ${stats.updated}`);
  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    console.error(`   ❌ Error: ${error.message}`);
  }

  logSyncComplete(syncId, stats);
  return stats;
}

/**
 * Sync maintenance procedures
 */
async function syncMaintenanceProcedures() {
  console.log('\n🔧 Syncing Maintenance Procedures...');
  const syncId = logSyncStart('maintenance_procedures');
  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    const response = await api.get('/maintenance-procedure');
    const data = Array.isArray(response.data) ? response.data : response.data.content || [];

    stats.fetched = data.length;
    console.log(`   Found ${data.length} procedures`);

    for (const item of data) {
      const result = upsertReferenceData('maintenance_procedures', item);
      if (result.action === 'inserted') stats.inserted++;
      else if (result.action === 'updated') stats.updated++;
    }

    console.log(`   ✅ Inserted: ${stats.inserted}, Updated: ${stats.updated}`);
  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    console.error(`   ❌ Error: ${error.message}`);
  }

  logSyncComplete(syncId, stats);
  return stats;
}

/**
 * Main sync function
 */
async function syncAllReferenceData() {
  console.log('\n🔄 Starting Full Reference Data Sync\n');
  console.log('='.repeat(70));

  const results = [];

  // Sync all reference data
  results.push(await syncResourceTypes());
  await new Promise(r => setTimeout(r, 200));

  results.push(await syncPaymentTerms());
  await new Promise(r => setTimeout(r, 200));

  results.push(await syncMaintenanceProcedures());

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Sync Summary:\n');

  const totals = results.reduce((acc, r) => ({
    fetched: acc.fetched + r.fetched,
    inserted: acc.inserted + r.inserted,
    updated: acc.updated + r.updated,
    failed: acc.failed + (r.status === 'failed' ? 1 : 0)
  }), { fetched: 0, inserted: 0, updated: 0, failed: 0 });

  console.log(`  Total Records Fetched:  ${totals.fetched}`);
  console.log(`  Total Inserted:         ${totals.inserted}`);
  console.log(`  Total Updated:          ${totals.updated}`);
  console.log(`  Failed Syncs:           ${totals.failed}`);

  console.log('\n' + '='.repeat(70));
  console.log(totals.failed === 0 ? '\n✅ All reference data synced successfully!\n' : '\n⚠️  Some syncs failed. Check logs above.\n');
}

// Run if called directly
if (require.main === module) {
  syncAllReferenceData().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncResourceTypes, syncPaymentTerms, syncMaintenanceProcedures, syncAllReferenceData };
