#!/usr/bin/env node

require('dotenv').config();
const { getDatabase } = require('./src/database/schema');

console.log('\n🔄 Migrating serial_units table to add detail fields\n');
console.log('='.repeat(70) + '\n');

const db = getDatabase();

try {
  // Drop the old table
  console.log('📋 Dropping old serial_units table...');
  db.exec('DROP TABLE IF EXISTS serial_units');
  console.log('✅ Old table dropped\n');

  // Recreate with new schema
  console.log('📋 Creating new serial_units table with detail fields...');
  db.exec(`
    CREATE TABLE serial_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT,
      barcode TEXT,
      serial TEXT,
      stencil TEXT,

      -- Model relationship
      inventory_model_id TEXT,
      inventory_model_name TEXT,

      -- Location & status
      current_location TEXT,
      current_location_id TEXT,
      homebase_location_id TEXT,
      homebase_location_name TEXT,
      is_deleted INTEGER DEFAULT 0,
      out_of_commission INTEGER DEFAULT 0,
      presumed_missing INTEGER DEFAULT 0,

      -- Dates
      return_date TEXT,
      flex_created_date TEXT,
      last_edit_date TEXT,
      deleted_date TEXT,

      -- User tracking
      created_by_user_id TEXT,
      last_edit_user_id TEXT,
      deleted_by_user_id TEXT,

      -- Financial
      replacement_cost REAL DEFAULT 0,
      purchase_cost REAL DEFAULT 0,
      depreciation_period INTEGER DEFAULT 0,
      salvage_value REAL DEFAULT 0,

      -- Additional fields (from detail endpoint)
      rfid_tag TEXT,
      notes TEXT,
      short_name TEXT,
      preferred_display_string TEXT,
      code TEXT,
      external_number TEXT,

      -- Maintenance
      scheduled_maintenance_enabled INTEGER DEFAULT 0,
      last_maintenance_date TEXT,
      next_maintenance_date TEXT,

      -- Flags for two-step sync
      detail_fetched INTEGER DEFAULT 0,
      detail_fetch_date TEXT,

      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      -- Full JSON data storage
      flex_list_data TEXT,
      flex_detail_data TEXT,

      FOREIGN KEY (inventory_model_id) REFERENCES inventory_models(flex_id)
    );
  `);

  console.log('✅ New table created\n');

  // Create indexes
  console.log('📋 Creating indexes...');
  db.exec(`
    CREATE INDEX idx_serial_units_flex_id ON serial_units(flex_id);
    CREATE INDEX idx_serial_units_barcode ON serial_units(barcode);
    CREATE INDEX idx_serial_units_stencil ON serial_units(stencil);
    CREATE INDEX idx_serial_units_serial ON serial_units(serial);
    CREATE INDEX idx_serial_units_model_id ON serial_units(inventory_model_id);
    CREATE INDEX idx_serial_units_location ON serial_units(current_location);
    CREATE INDEX idx_serial_units_deleted ON serial_units(is_deleted);
    CREATE INDEX idx_serial_units_detail_fetched ON serial_units(detail_fetched);
  `);

  console.log('✅ Indexes created\n');

  console.log('='.repeat(70));
  console.log('\n✅ Migration complete! The serial_units table is ready.\n');
  console.log('You can now run: node sync-serial-units-full.js\n');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}
