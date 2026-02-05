const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Database configuration
const DB_PATH = process.env.DB_PATH || './data/contacts.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.info(`Created data directory: ${dataDir}`);
}

// Initialize database connection
let db;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH, { verbose: logger.debug });
    logger.info(`Connected to database: ${DB_PATH}`);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Initialize schema
    initSchema();
  }
  return db;
}

function initSchema() {
  logger.info('Initializing database schema...');

  // Create contacts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      contact_type TEXT,
      status TEXT,
      default_bill_to_contact_id TEXT,
      pricing_model_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  // Create indexes for contacts table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contact_id ON contacts(contact_id);
    CREATE INDEX IF NOT EXISTS idx_status ON contacts(status);
    CREATE INDEX IF NOT EXISTS idx_contact_type ON contacts(contact_type);
  `);

  // Create sync_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_started_at DATETIME,
      sync_completed_at DATETIME,
      records_fetched INTEGER DEFAULT 0,
      records_inserted INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      status TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  logger.info('Database schema initialized successfully');
}

function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Database connection closed');
    db = null;
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

module.exports = {
  getDatabase,
  closeDatabase
};
