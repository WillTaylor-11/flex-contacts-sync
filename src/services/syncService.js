const flexApi = require('../api/flexApi');
const db = require('../database/operations');
const logger = require('../utils/logger');

/**
 * Sync all contacts from Flex API to local database
 * @returns {Promise<object>} Sync summary with statistics
 */
async function syncAllContacts() {
  logger.info('='.repeat(60));
  logger.info('Starting contact sync operation...');
  logger.info('='.repeat(60));

  const syncId = db.startSyncLog();
  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    status: 'success',
    error: null
  };

  try {
    // Test API connection first
    logger.info('Testing API connection...');
    const connected = await flexApi.testConnection();

    if (!connected) {
      throw new Error('Failed to connect to Flex API');
    }

    // Fetch all contacts from Flex API
    logger.info('Fetching contacts from Flex API...');
    const contacts = await flexApi.getContacts();

    if (!contacts || !Array.isArray(contacts)) {
      throw new Error('Invalid response from Flex API');
    }

    stats.fetched = contacts.length;
    logger.info(`Fetched ${stats.fetched} contacts from Flex API`);

    // Process each contact
    logger.info('Processing contacts...');
    for (const contact of contacts) {
      try {
        const result = db.upsertContact(contact);

        if (result.action === 'inserted') {
          stats.inserted++;
        } else if (result.action === 'updated') {
          stats.updated++;
        }

        // Log progress every 50 contacts
        const total = stats.inserted + stats.updated;
        if (total % 50 === 0) {
          logger.info(`Processed ${total}/${stats.fetched} contacts...`);
        }
      } catch (error) {
        stats.errors++;
        logger.error(`Error processing contact ${contact.contactId}: ${error.message}`);
        // Continue with next contact instead of failing entire sync
      }
    }

    // Final statistics
    logger.info('-'.repeat(60));
    logger.info('Sync completed successfully!');
    logger.info(`Total fetched: ${stats.fetched}`);
    logger.info(`New contacts: ${stats.inserted}`);
    logger.info(`Updated contacts: ${stats.updated}`);
    logger.info(`Errors: ${stats.errors}`);
    logger.info(`Total in database: ${db.getContactCount()}`);
    logger.info('-'.repeat(60));

    stats.status = stats.errors > 0 ? 'partial' : 'success';

  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    logger.error(`Sync failed: ${error.message}`);
    throw error;
  } finally {
    // Complete sync log
    db.completeSyncLog(syncId, stats);
  }

  return stats;
}

/**
 * Sync a specific contact by ID
 * @param {string} contactId - Contact ID to sync
 * @returns {Promise<object>} Sync result
 */
async function syncContactById(contactId) {
  logger.info(`Syncing contact: ${contactId}`);

  try {
    const contact = await flexApi.getContactById(contactId);
    const result = db.upsertContact(contact);

    logger.info(`Contact ${contactId} ${result.action}`);
    return { success: true, action: result.action };
  } catch (error) {
    logger.error(`Failed to sync contact ${contactId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get sync history
 * @param {number} limit - Number of records to return
 * @returns {Array} Sync log entries
 */
function getSyncHistory(limit = 10) {
  return db.getRecentSyncLogs(limit);
}

module.exports = {
  syncAllContacts,
  syncContactById,
  getSyncHistory
};
