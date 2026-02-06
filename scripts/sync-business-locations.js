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

function upsertBusinessLocation(data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM business_locations WHERE flex_id = ?').get(data.id);

  const mapped = {
    name: data.name,
    location_code: data.locationCode,
    onsite: data.onsite ? 1 : 0,
    owning_corporate_entity_id: data.owningCorporateEntityId,
    corporate_entity: data.corporateEntity,
    local_currency_id: data.localCurrencyId,
    currency_name: data.currencyName,
    locale: data.locale,
    locale_name: data.localeName,
    time_zone: data.timeZone,
    time_zone_offset: data.timeZoneOffset,
    default_paper_size: data.defaultPaperSize,
    holiday_scheme_id: data.holidaySchemeId,
    logo_scale_to_fit: data.logoScaleToFit ? 1 : 0,
    logo_fit_width: data.logoFitWidth,
    logo_fit_height: data.logoFitHeight,
    created_by_user_name: data.createdByUserName,
    flex_created_date: data.createdDate,
    location_type_id: data.locationType?.id,
    location_type_name: data.locationType?.name
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE business_locations
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO business_locations (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncBusinessLocations() {
  console.log('\n🏢 Syncing Business Locations\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('business_locations', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = { fetched: 0, inserted: 0, updated: 0, status: 'success', error: null };

  try {
    // Get unique location IDs from contacts
    const locationIds = db.prepare(`
      SELECT DISTINCT homebase_location_id
      FROM contacts
      WHERE homebase_location_id IS NOT NULL
    `).all().map(r => r.homebase_location_id);

    console.log(`📋 Found ${locationIds.length} unique business location ID(s) in contacts\n`);

    // Fetch each location by ID
    for (const locationId of locationIds) {
      try {
        const response = await api.get(`/business-location/${locationId}`);
        const location = response.data;
        stats.fetched++;

        const result = upsertBusinessLocation(location);
        if (result.action === 'inserted') {
          stats.inserted++;
          console.log(`✅ Inserted: ${location.name} (${location.locationCode})`);
        } else {
          stats.updated++;
          console.log(`🔄 Updated: ${location.name} (${location.locationCode})`);
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        logger.error(`Error fetching location ${locationId}: ${error.message}`);
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
    console.log('\n✅ Business locations synced successfully!\n');

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

syncBusinessLocations();
