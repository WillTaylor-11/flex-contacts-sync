const { getDatabase } = require('./schema');
const logger = require('../utils/logger');

/**
 * Insert a new contact into the database
 */
function insertContact(contactData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO contacts (
      contact_id, first_name, last_name, contact_type, status,
      default_bill_to_contact_id, pricing_model_id, flex_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      contactData.contactId,
      contactData.firstName || null,
      contactData.lastName || null,
      contactData.contactType || null,
      contactData.status || null,
      contactData.defaultBillToContactId || null,
      contactData.pricingModelId || null,
      JSON.stringify(contactData) // Store full data as JSON
    );
    logger.debug(`Inserted contact: ${contactData.contactId}`);
    return result.lastInsertRowid;
  } catch (error) {
    logger.error(`Error inserting contact ${contactData.contactId}: ${error.message}`);
    throw error;
  }
}

/**
 * Update an existing contact in the database
 */
function updateContact(contactId, contactData) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE contacts SET
      first_name = ?,
      last_name = ?,
      contact_type = ?,
      status = ?,
      default_bill_to_contact_id = ?,
      pricing_model_id = ?,
      flex_data = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE contact_id = ?
  `);

  try {
    const result = stmt.run(
      contactData.firstName || null,
      contactData.lastName || null,
      contactData.contactType || null,
      contactData.status || null,
      contactData.defaultBillToContactId || null,
      contactData.pricingModelId || null,
      JSON.stringify(contactData),
      contactId
    );
    logger.debug(`Updated contact: ${contactId}`);
    return result.changes;
  } catch (error) {
    logger.error(`Error updating contact ${contactId}: ${error.message}`);
    throw error;
  }
}

/**
 * Upsert contact - Insert if new, update if exists
 */
function upsertContact(contactData) {
  const db = getDatabase();

  // Check if contact exists
  const stmt = db.prepare('SELECT id FROM contacts WHERE contact_id = ?');
  const existing = stmt.get(contactData.contactId);

  if (existing) {
    updateContact(contactData.contactId, contactData);
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
 * Get a single contact by contact_id
 */
function getContactById(contactId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM contacts WHERE contact_id = ?');
  return stmt.get(contactId);
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

module.exports = {
  insertContact,
  updateContact,
  upsertContact,
  getAllContacts,
  getContactById,
  getContactCount,
  startSyncLog,
  completeSyncLog,
  getRecentSyncLogs
};
