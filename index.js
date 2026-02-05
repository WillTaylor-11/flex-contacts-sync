#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const syncService = require('./src/services/syncService');
const logger = require('./src/utils/logger');
const { closeDatabase } = require('./src/database/schema');

/**
 * Main application entry point
 */
async function main() {
  try {
    // Display startup banner
    console.log('\n' + '='.repeat(60));
    console.log('  FLEX CONTACTS SYNC');
    console.log('  Syncing contacts from Flex Rental Solutions to SQLite');
    console.log('='.repeat(60) + '\n');

    // Run sync operation
    const stats = await syncService.syncAllContacts();

    // Exit with success
    process.exit(0);
  } catch (error) {
    logger.error(`Application error: ${error.message}`);
    console.error(`\n❌ Sync failed: ${error.message}\n`);

    // Exit with error
    process.exit(1);
  } finally {
    // Clean up database connection
    closeDatabase();
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  closeDatabase();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  closeDatabase();
  process.exit(1);
});

// Run the application
main();
