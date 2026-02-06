const { getDatabase } = require('./schema');
const logger = require('../utils/logger');

/**
 * Insert a new contact into the database with full details
 */
function insertContact(contactData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO contacts (
      flex_id, name,
      first_name, middle_name, last_name, salutation, birthday,
      short_name, preferred_display_string, short_name_or_name,
      code, barcode, rfid_tag, external_number, assigned_number,
      organization, company, job_title, employer_id,
      default_email_id, default_phone_id, default_fax_id,
      default_mailing_address_id, default_shipping_address_id,
      credit_limit, default_bill_to_contact, currency_id,
      default_pricing_model_id, standard_discount_id, standard_terms_id,
      standard_tax_rule_id, discountable, max_discount,
      homebase_location_id, corporate_entity_id,
      deleted, deleted_by_user_id, deleted_by_date,
      presumed_missing, imported, catalogue_item, public_catalogue_item,
      line_mute_by_default, note_mute_by_default, default_terms_inherited,
      created_by_user_id, flex_created_date, last_edit_user_id, flex_last_edit_date,
      associated_user_id, domain_id, class_name, number_sequence,
      addresses, internet_addresses, phone_numbers, resource_types,
      contact_types, reference_data, tag_ids, flex_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  try {
    const result = stmt.run(
      contactData.id,
      contactData.name,
      // Personal
      contactData.firstName || null,
      contactData.middleName || null,
      contactData.lastName || null,
      contactData.salutation || null,
      contactData.birthday || null,
      // Display
      contactData.shortName || null,
      contactData.preferredDisplayString || null,
      contactData.shortNameOrName || null,
      contactData.code || null,
      contactData.barcode || null,
      contactData.rfidTag || null,
      contactData.externalNumber || null,
      contactData.assignedNumber || null,
      // Business
      contactData.organization ? 1 : 0,
      contactData.company || null,
      contactData.jobTitle || null,
      contactData.employerId || null,
      // Contact IDs
      contactData.defaultEmailId || null,
      contactData.defaultPhoneId || null,
      contactData.defaultFaxId || null,
      contactData.defaultMailingAddressId || null,
      contactData.defaultShippingAddressId || null,
      // Financial
      contactData.creditLimit || null,
      contactData.defaultBillToContact ? 1 : 0,
      contactData.currencyId || null,
      contactData.defaultPricingModelId || null,
      contactData.standardDiscountId || null,
      contactData.standardTermsId || null,
      contactData.standardTaxRuleId || null,
      contactData.discountable ? 1 : 0,
      contactData.maxDiscount || null,
      // Location
      contactData.homebaseLocationId || null,
      contactData.corporateEntityId || null,
      // Status
      contactData.deleted ? 1 : 0,
      contactData.deletedByUserId || null,
      contactData.deletedByDate || null,
      contactData.presumedMissing ? 1 : 0,
      contactData.imported ? 1 : 0,
      contactData.catalogueItem ? 1 : 0,
      contactData.publicCatalogueItem ? 1 : 0,
      // Settings
      contactData.lineMuteByDefault ? 1 : 0,
      contactData.noteMuteByDefault ? 1 : 0,
      contactData.defaultTermsInherited ? 1 : 0,
      // Audit
      contactData.createdByUserId || null,
      contactData.createdDate || null,
      contactData.lastEditUserId || null,
      contactData.lastEditDate || null,
      contactData.associatedUserId || null,
      // System
      contactData.domainId || null,
      contactData.className || null,
      contactData.numberSequence || 0,
      // Complex data as JSON
      JSON.stringify(contactData.addresses || []),
      JSON.stringify(contactData.internetAddresses || []),
      JSON.stringify(contactData.phoneNumbers || []),
      JSON.stringify(contactData.resourceTypes || []),
      JSON.stringify(contactData.contactTypes || null),
      JSON.stringify(contactData.referenceData || {}),
      JSON.stringify(contactData.tagIds || null),
      // Full backup
      JSON.stringify(contactData)
    );
    logger.debug(`Inserted contact: ${contactData.id} - ${contactData.name}`);
    return result.lastInsertRowid;
  } catch (error) {
    logger.error(`Error inserting contact ${contactData.id}: ${error.message}`);
    throw error;
  }
}

/**
 * Update an existing contact in the database with full details
 */
function updateContact(flexId, contactData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE contacts SET
      name = ?,
      first_name = ?, middle_name = ?, last_name = ?, salutation = ?, birthday = ?,
      short_name = ?, preferred_display_string = ?, short_name_or_name = ?,
      code = ?, barcode = ?, rfid_tag = ?, external_number = ?, assigned_number = ?,
      organization = ?, company = ?, job_title = ?, employer_id = ?,
      default_email_id = ?, default_phone_id = ?, default_fax_id = ?,
      default_mailing_address_id = ?, default_shipping_address_id = ?,
      credit_limit = ?, default_bill_to_contact = ?, currency_id = ?,
      default_pricing_model_id = ?, standard_discount_id = ?, standard_terms_id = ?,
      standard_tax_rule_id = ?, discountable = ?, max_discount = ?,
      homebase_location_id = ?, corporate_entity_id = ?,
      deleted = ?, deleted_by_user_id = ?, deleted_by_date = ?,
      presumed_missing = ?, imported = ?, catalogue_item = ?, public_catalogue_item = ?,
      line_mute_by_default = ?, note_mute_by_default = ?, default_terms_inherited = ?,
      created_by_user_id = ?, flex_created_date = ?, last_edit_user_id = ?, flex_last_edit_date = ?,
      associated_user_id = ?, domain_id = ?, class_name = ?, number_sequence = ?,
      addresses = ?, internet_addresses = ?, phone_numbers = ?, resource_types = ?,
      contact_types = ?, reference_data = ?, tag_ids = ?,
      flex_data = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE flex_id = ?
  `);

  try {
    const result = stmt.run(
      contactData.name,
      // Personal
      contactData.firstName || null,
      contactData.middleName || null,
      contactData.lastName || null,
      contactData.salutation || null,
      contactData.birthday || null,
      // Display
      contactData.shortName || null,
      contactData.preferredDisplayString || null,
      contactData.shortNameOrName || null,
      contactData.code || null,
      contactData.barcode || null,
      contactData.rfidTag || null,
      contactData.externalNumber || null,
      contactData.assignedNumber || null,
      // Business
      contactData.organization ? 1 : 0,
      contactData.company || null,
      contactData.jobTitle || null,
      contactData.employerId || null,
      // Contact IDs
      contactData.defaultEmailId || null,
      contactData.defaultPhoneId || null,
      contactData.defaultFaxId || null,
      contactData.defaultMailingAddressId || null,
      contactData.defaultShippingAddressId || null,
      // Financial
      contactData.creditLimit || null,
      contactData.defaultBillToContact ? 1 : 0,
      contactData.currencyId || null,
      contactData.defaultPricingModelId || null,
      contactData.standardDiscountId || null,
      contactData.standardTermsId || null,
      contactData.standardTaxRuleId || null,
      contactData.discountable ? 1 : 0,
      contactData.maxDiscount || null,
      // Location
      contactData.homebaseLocationId || null,
      contactData.corporateEntityId || null,
      // Status
      contactData.deleted ? 1 : 0,
      contactData.deletedByUserId || null,
      contactData.deletedByDate || null,
      contactData.presumedMissing ? 1 : 0,
      contactData.imported ? 1 : 0,
      contactData.catalogueItem ? 1 : 0,
      contactData.publicCatalogueItem ? 1 : 0,
      // Settings
      contactData.lineMuteByDefault ? 1 : 0,
      contactData.noteMuteByDefault ? 1 : 0,
      contactData.defaultTermsInherited ? 1 : 0,
      // Audit
      contactData.createdByUserId || null,
      contactData.createdDate || null,
      contactData.lastEditUserId || null,
      contactData.lastEditDate || null,
      contactData.associatedUserId || null,
      // System
      contactData.domainId || null,
      contactData.className || null,
      contactData.numberSequence || 0,
      // Complex data as JSON
      JSON.stringify(contactData.addresses || []),
      JSON.stringify(contactData.internetAddresses || []),
      JSON.stringify(contactData.phoneNumbers || []),
      JSON.stringify(contactData.resourceTypes || []),
      JSON.stringify(contactData.contactTypes || null),
      JSON.stringify(contactData.referenceData || {}),
      JSON.stringify(contactData.tagIds || null),
      // Full backup
      JSON.stringify(contactData),
      // WHERE clause
      flexId
    );
    logger.debug(`Updated contact: ${flexId} - ${contactData.name}`);
    return result.changes;
  } catch (error) {
    logger.error(`Error updating contact ${flexId}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert contact - Insert if new, update if exists
 */
function upsertContact(contactData) {
  const db = getDatabase();

  // Check if contact exists
  const stmt = db.prepare('SELECT id FROM contacts WHERE flex_id = ?');
  const existing = stmt.get(contactData.id);

  if (existing) {
    updateContact(contactData.id, contactData);
    return { action: 'updated', id: existing.id };
  } else {
    const id = insertContact(contactData);
    return { action: 'inserted', id };
  }
}

/**
 * Get all contacts from the database
 */
function getAllContacts() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM contacts ORDER BY updated_at DESC');
  return stmt.all();
}

/**
 * Get a single contact by flex_id
 */
function getContactById(flexId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM contacts WHERE flex_id = ?');
  return stmt.get(flexId);
}

/**
 * Get contact count
 */
function getContactCount() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM contacts');
  return stmt.get().count;
}

/**
 * Start a sync log entry
 */
function startSyncLog() {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sync_log (sync_started_at, status)
    VALUES (CURRENT_TIMESTAMP, 'running')
  `);

  const result = stmt.run();
  logger.info(`Started sync log entry: ${result.lastInsertRowid}`);
  return result.lastInsertRowid;
}

/**
 * Complete a sync log entry
 */
function completeSyncLog(syncId, stats) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE sync_log SET
      sync_completed_at = CURRENT_TIMESTAMP,
      records_fetched = ?,
      records_inserted = ?,
      records_updated = ?,
      status = ?,
      error_message = ?
    WHERE id = ?
  `);

  stmt.run(
    stats.fetched || 0,
    stats.inserted || 0,
    stats.updated || 0,
    stats.status || 'success',
    stats.error || null,
    syncId
  );
  logger.info(`Completed sync log entry: ${syncId}`);
}

/**
 * Get recent sync logs
 */
function getRecentSyncLogs(limit = 10) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM sync_log
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Insert a new serial unit into the database
 */
function insertSerialUnit(serialUnitData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO serial_units (
      flex_id, name, barcode, serial, stencil,
      inventory_model_id, inventory_model_name,
      current_location, is_deleted, out_of_commission,
      return_date, flex_created_date, flex_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      serialUnitData.id,
      serialUnitData.name || null,
      serialUnitData.barcode || null,
      serialUnitData.serial || null,
      serialUnitData.stencil || null,
      serialUnitData.modelId || serialUnitData.inventoryModelId || null,
      serialUnitData.inventoryModelName || null,
      serialUnitData.currentLocation || null,
      serialUnitData.isDeleted ? 1 : 0,
      serialUnitData.ooc ? 1 : 0,
      serialUnitData.returnDate || null,
      serialUnitData.createdDate || null,
      JSON.stringify(serialUnitData)
    );
    logger.debug(`Inserted serial unit: ${serialUnitData.id} - ${serialUnitData.name}`);
    return result.lastInsertRowid;
  } catch (error) {
    logger.error(`Error inserting serial unit ${serialUnitData.id}: ${error.message}`);
    throw error;
  }
}

/**
 * Update an existing serial unit in the database
 */
function updateSerialUnit(flexId, serialUnitData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE serial_units SET
      name = ?, barcode = ?, serial = ?, stencil = ?,
      inventory_model_id = ?, inventory_model_name = ?,
      current_location = ?, is_deleted = ?, out_of_commission = ?,
      return_date = ?, flex_created_date = ?,
      flex_data = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE flex_id = ?
  `);

  try {
    const result = stmt.run(
      serialUnitData.name || null,
      serialUnitData.barcode || null,
      serialUnitData.serial || null,
      serialUnitData.stencil || null,
      serialUnitData.modelId || serialUnitData.inventoryModelId || null,
      serialUnitData.inventoryModelName || null,
      serialUnitData.currentLocation || null,
      serialUnitData.isDeleted ? 1 : 0,
      serialUnitData.ooc ? 1 : 0,
      serialUnitData.returnDate || null,
      serialUnitData.createdDate || null,
      JSON.stringify(serialUnitData),
      flexId
    );
    logger.debug(`Updated serial unit: ${flexId} - ${serialUnitData.name}`);
    return result.changes;
  } catch (error) {
    logger.error(`Error updating serial unit ${flexId}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert serial unit - Insert if new, update if exists
 */
function upsertSerialUnit(serialUnitData) {
  const db = getDatabase();

  // Check if serial unit exists
  const stmt = db.prepare('SELECT id FROM serial_units WHERE flex_id = ?');
  const existing = stmt.get(serialUnitData.id);

  if (existing) {
    updateSerialUnit(serialUnitData.id, serialUnitData);
    return { action: 'updated', id: existing.id };
  } else {
    const id = insertSerialUnit(serialUnitData);
    return { action: 'inserted', id };
  }
}

/**
 * Get all serial units from the database
 */
function getAllSerialUnits() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM serial_units ORDER BY updated_at DESC');
  return stmt.all();
}

/**
 * Get serial units by inventory model ID
 */
function getSerialUnitsByModelId(modelId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM serial_units WHERE inventory_model_id = ? ORDER BY barcode');
  return stmt.all(modelId);
}

/**
 * Get serial unit count
 */
function getSerialUnitCount() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM serial_units');
  return stmt.get().count;
}

/**
 * Update serial unit with detailed data from detail endpoint
 */
function updateSerialUnitDetail(flexId, detailData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE serial_units SET
      name = COALESCE(?, name),
      barcode = COALESCE(?, barcode),
      serial = COALESCE(?, serial),
      stencil = COALESCE(?, stencil),
      rfid_tag = ?,
      notes = ?,
      short_name = ?,
      preferred_display_string = ?,
      code = ?,
      external_number = ?,
      current_location_id = ?,
      homebase_location_id = ?,
      homebase_location_name = ?,
      presumed_missing = ?,
      replacement_cost = ?,
      purchase_cost = ?,
      depreciation_period = ?,
      salvage_value = ?,
      scheduled_maintenance_enabled = ?,
      last_maintenance_date = ?,
      next_maintenance_date = ?,
      last_edit_date = ?,
      last_edit_user_id = ?,
      created_by_user_id = ?,
      deleted_date = ?,
      deleted_by_user_id = ?,
      flex_detail_data = ?,
      detail_fetched = 1,
      detail_fetch_date = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE flex_id = ?
  `);

  try {
    const result = stmt.run(
      detailData.name || null,
      detailData.barcode || null,
      detailData.serial || null,
      detailData.stencil || null,
      detailData.rfidTag || null,
      detailData.notes || null,
      detailData.shortName || null,
      detailData.preferredDisplayString || null,
      detailData.code || null,
      detailData.externalNumber || null,
      detailData.currentLocationId || null,
      detailData.homebaseLocationId || null,
      detailData.homebaseLocationName || null,
      detailData.presumedMissing ? 1 : 0,
      detailData.replacementCost || 0,
      detailData.purchaseCost || 0,
      detailData.depreciationPeriod || 0,
      detailData.salvageValue || 0,
      detailData.scheduledMaintenanceEnabled ? 1 : 0,
      detailData.lastMaintenanceDate || null,
      detailData.nextMaintenanceDate || null,
      detailData.lastEditDate || null,
      detailData.lastEditUserId || null,
      detailData.createdByUserId || null,
      detailData.deletedDate || null,
      detailData.deletedByUserId || null,
      JSON.stringify(detailData),
      flexId
    );
    logger.debug(`Updated serial unit detail: ${flexId}`);
    return result.changes;
  } catch (error) {
    logger.error(`Error updating serial unit detail ${flexId}: ${error.message}`);
    throw error;
  }
}

/**
 * Get serial units that haven't had details fetched yet
 */
function getSerialUnitsWithoutDetail(limit = 100) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT flex_id, name, barcode
    FROM serial_units
    WHERE detail_fetched = 0
    ORDER BY created_at
    LIMIT ?
  `);
  return stmt.all(limit);
}

/**
 * Get count of serial units without detail
 */
function getSerialUnitsWithoutDetailCount() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM serial_units WHERE detail_fetched = 0');
  return stmt.get().count;
}

module.exports = {
  insertContact,
  updateContact,
  upsertContact,
  getAllContacts,
  getContactById,
  getContactCount,
  startSyncLog,
  completeSyncLog,
  getRecentSyncLogs,
  insertSerialUnit,
  updateSerialUnit,
  upsertSerialUnit,
  getAllSerialUnits,
  getSerialUnitsByModelId,
  getSerialUnitCount,
  updateSerialUnitDetail,
  getSerialUnitsWithoutDetail,
  getSerialUnitsWithoutDetailCount
};
