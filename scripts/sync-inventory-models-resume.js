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

function upsertInventoryModel(data) {
  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM inventory_models WHERE flex_id = ?').get(data.id);

  const mapped = {
    name: data.name,
    code: data.code,
    short_name: data.shortName,
    preferred_display_string: data.preferredDisplayString,
    narrative_description: data.narrativeDescription,
    barcode: data.barcode,
    rfid_tag: data.rfidTag,
    number: data.number,
    number_sequence: data.numberSequence,
    external_number: data.externalNumber,
    deleted: data.deleted ? 1 : 0,
    presumed_missing: data.presumedMissing ? 1 : 0,
    line_mute_by_default: data.lineMuteByDefault ? 1 : 0,
    note_mute_by_default: data.noteMuteByDefault ? 1 : 0,
    catalogue_item: data.catalogueItem ? 1 : 0,
    public_catalogue_item: data.publicCatalogueItem ? 1 : 0,
    discountable: data.discountable ? 1 : 0,
    max_discount: data.maxDiscount,
    barcode_label: data.barcodeLabel,
    imported: data.imported ? 1 : 0,
    short_hand: data.shortHand,
    size: data.size,
    tracked_by_serial_unit: data.trackedBySerialUnit ? 1 : 0,
    container: data.container ? 1 : 0,
    virtual_model: data.virtualModel ? 1 : 0,
    serialized_contents: data.serializedContents ? 1 : 0,
    free_pick_container: data.freePickContainer ? 1 : 0,
    contents_available: data.contentsAvailable ? 1 : 0,
    contents_permanent: data.contentsPermanent ? 1 : 0,
    replacement_cost: data.replacementCost || 0,
    purchase_cost: data.purchaseCost || 0,
    depreciation_period: data.depreciationPeriod || 0,
    salvage_value: data.salvageValue || 0,
    content_list_id: data.contentListId,
    image_id: data.imageId,
    image_thumbnail_id: data.imageThumbnailId,
    manufacturer: data.manufacturer,
    manufacture_country: data.manufactureCountry,
    notes: data.notes,
    prep_time: data.prepTime || 0,
    deprep_time: data.deprepTime || 0,
    weight: data.weight || 0,
    height: data.height || 0,
    model_length: data.modelLength || 0,
    width: data.width || 0,
    icon_id: data.referenceData?.icon?.id,
    icon_name: data.referenceData?.icon?.name,
    preset_id: data.referenceData?.preset?.id,
    preset_name: data.referenceData?.preset?.name,
    linear_unit_id: data.referenceData?.linearUnit?.id,
    linear_unit_name: data.referenceData?.linearUnit?.name,
    weight_unit_id: data.referenceData?.weightUnit?.id,
    weight_unit_name: data.referenceData?.weightUnit?.name,
    group_id: data.referenceData?.group?.id,
    group_name: data.referenceData?.group?.name,
    group_full_display_string: data.referenceData?.group?.fullDisplayString,
    is_track_depreciation: data.referenceData?.isTrackDepreciation ? 1 : 0,
    scheduled_maintenance_enabled: data.referenceData?.scheduledMaintenanceEnabled ? 1 : 0,
    average_cost: data.referenceData?.averageCost || 0,
    created_by_user_id: data.createdByUserId,
    flex_created_date: data.createdDate,
    last_edit_user_id: data.lastEditUserId,
    flex_last_edit_date: data.lastEditDate,
    deleted_by_user_id: data.deletedByUserId,
    deleted_by_date: data.deletedByDate
  };

  if (existing) {
    const setClauses = Object.keys(mapped).map(f => `${f} = ?`).join(', ');
    const values = Object.values(mapped);
    db.prepare(`
      UPDATE inventory_models
      SET ${setClauses}, flex_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE flex_id = ?
    `).run(...values, JSON.stringify(data), data.id);
    return { action: 'updated' };
  } else {
    const columns = ['flex_id', ...Object.keys(mapped), 'flex_data'];
    const placeholders = columns.map(() => '?').join(', ');
    const values = [data.id, ...Object.values(mapped), JSON.stringify(data)];
    db.prepare(`
      INSERT INTO inventory_models (${columns.join(', ')})
      VALUES (${placeholders})
    `).run(...values);
    return { action: 'inserted' };
  }
}

async function syncInventoryModelsResume() {
  console.log('\n🔄 Resuming Inventory Models Sync\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const syncId = db.prepare(`
    INSERT INTO sync_log (entity_type, sync_started_at, status)
    VALUES ('inventory_models_resume', CURRENT_TIMESTAMP, 'running')
  `).run().lastInsertRowid;

  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    status: 'success',
    error: null
  };

  try {
    // Get all IDs from search
    const searchTerm = 'e ';
    console.log(`🔍 Searching with term: "${searchTerm}"\n`);

    const initialResponse = await api.get('/inventory-model/search', {
      params: { searchText: searchTerm, page: 0, size: 1 }
    });

    const totalElements = initialResponse.data.totalElements;
    const pageSize = 100;
    const totalPages = Math.ceil(totalElements / pageSize);

    console.log(`📋 Found ${totalElements} inventory models\n`);

    const allIds = new Set();

    // Collect all IDs
    for (let page = 0; page < totalPages; page++) {
      try {
        const response = await api.get('/inventory-model/search', {
          params: { searchText: searchTerm, page, size: pageSize }
        });

        const items = response.data.content || [];
        items.forEach(item => allIds.add(item.id));

        await new Promise(r => setTimeout(r, 150));

      } catch (error) {
        logger.error(`Error fetching search page ${page}: ${error.message}`);
      }
    }

    // Get existing IDs from database
    const existingIds = new Set(
      db.prepare('SELECT flex_id FROM inventory_models').all().map(r => r.flex_id)
    );

    const missingIds = Array.from(allIds).filter(id => !existingIds.has(id));

    console.log(`✅ Collected ${allIds.size} total IDs`);
    console.log(`📊 Already in DB: ${existingIds.size}`);
    console.log(`📥 Need to fetch: ${missingIds.length}\n`);

    if (missingIds.length === 0) {
      console.log('✅ All inventory models already synced!\n');
      db.prepare(`
        UPDATE sync_log SET
          sync_completed_at = CURRENT_TIMESTAMP,
          status = 'success'
        WHERE id = ?
      `).run(syncId);
      return;
    }

    console.log('='.repeat(70));
    console.log('\n📥 Fetching missing models with slower rate (250ms delay)...\n');

    for (let i = 0; i < missingIds.length; i++) {
      const modelId = missingIds[i];

      try {
        const response = await api.get(`/inventory-model/${modelId}`);
        const model = response.data;
        stats.fetched++;

        const result = upsertInventoryModel(model);
        if (result.action === 'inserted') {
          stats.inserted++;
        } else {
          stats.updated++;
        }

        // Progress indicator
        if ((i + 1) % 10 === 0 || i === missingIds.length - 1) {
          const progress = ((i + 1) / missingIds.length * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${progress}% (${i + 1}/${missingIds.length}) - ${stats.inserted} inserted, ${stats.errors} errors`);
        }

        await new Promise(r => setTimeout(r, 250)); // Slower rate to avoid 429

      } catch (error) {
        stats.errors++;
        if (error.response?.status === 429) {
          console.log(`\n⚠️  Rate limit hit at item ${i + 1}. Waiting 60 seconds...\n`);
          await new Promise(r => setTimeout(r, 60000));
        } else {
          logger.error(`Error fetching model ${modelId}: ${error.message}`);
          if (!stats.error) stats.error = `First error: ${error.message}`;
        }
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
    console.log('\n📊 Resume Sync Summary:\n');
    console.log(`  Fetched:  ${stats.fetched}`);
    console.log(`  Inserted: ${stats.inserted}`);
    console.log(`  Updated:  ${stats.updated}`);
    console.log(`  Errors:   ${stats.errors}`);
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Resume sync completed!\n');

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

syncInventoryModelsResume();
