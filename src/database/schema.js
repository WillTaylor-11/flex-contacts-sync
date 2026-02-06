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

  // Create contacts table with full detail endpoint fields
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,

      -- Personal Information
      first_name TEXT,
      middle_name TEXT,
      last_name TEXT,
      salutation TEXT,
      birthday TEXT,

      -- Display & Identification
      short_name TEXT,
      preferred_display_string TEXT,
      short_name_or_name TEXT,
      code TEXT,
      barcode TEXT,
      rfid_tag TEXT,
      external_number TEXT,
      assigned_number TEXT,

      -- Business Information
      organization BOOLEAN DEFAULT 0,
      company TEXT,
      job_title TEXT,
      employer_id TEXT,

      -- Contact Details (JSON stored separately)
      default_email_id TEXT,
      default_phone_id TEXT,
      default_fax_id TEXT,
      default_mailing_address_id TEXT,
      default_shipping_address_id TEXT,

      -- Financial
      credit_limit REAL,
      default_bill_to_contact BOOLEAN DEFAULT 0,
      currency_id TEXT,
      default_pricing_model_id TEXT,
      standard_discount_id TEXT,
      standard_terms_id TEXT,
      standard_tax_rule_id TEXT,
      discountable BOOLEAN DEFAULT 0,
      max_discount REAL,

      -- Location & Entity
      homebase_location_id TEXT,
      corporate_entity_id TEXT,

      -- Status & Flags
      deleted BOOLEAN DEFAULT 0,
      deleted_by_user_id TEXT,
      deleted_by_date TEXT,
      presumed_missing BOOLEAN DEFAULT 0,
      imported BOOLEAN DEFAULT 0,
      catalogue_item BOOLEAN DEFAULT 0,
      public_catalogue_item BOOLEAN DEFAULT 0,

      -- Settings
      line_mute_by_default BOOLEAN DEFAULT 0,
      note_mute_by_default BOOLEAN DEFAULT 1,
      default_terms_inherited BOOLEAN DEFAULT 1,

      -- User & Audit
      created_by_user_id TEXT,
      flex_created_date TEXT,
      last_edit_user_id TEXT,
      flex_last_edit_date TEXT,
      associated_user_id TEXT,

      -- System
      domain_id TEXT,
      class_name TEXT,
      number_sequence INTEGER DEFAULT 0,

      -- Complex Data (stored as JSON)
      addresses TEXT,
      internet_addresses TEXT,
      phone_numbers TEXT,
      resource_types TEXT,
      contact_types TEXT,
      reference_data TEXT,
      tag_ids TEXT,

      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      -- Full JSON backup
      flex_data TEXT
    );
  `);

  // Create indexes for contacts table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_flex_id ON contacts(flex_id);
    CREATE INDEX IF NOT EXISTS idx_name ON contacts(name);
    CREATE INDEX IF NOT EXISTS idx_first_name ON contacts(first_name);
    CREATE INDEX IF NOT EXISTS idx_last_name ON contacts(last_name);
    CREATE INDEX IF NOT EXISTS idx_company ON contacts(company);
    CREATE INDEX IF NOT EXISTS idx_deleted ON contacts(deleted);
    CREATE INDEX IF NOT EXISTS idx_organization ON contacts(organization);
    CREATE INDEX IF NOT EXISTS idx_employer_id ON contacts(employer_id);
    CREATE INDEX IF NOT EXISTS idx_homebase_location_id ON contacts(homebase_location_id);
  `);

  // Create resource_types table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_plural TEXT,
      parent_type_id TEXT,
      applicable_class_name TEXT,
      availability_mode TEXT,
      applicable_towards_resource_type_name TEXT,
      discount_enabled BOOLEAN DEFAULT 0,
      taxable BOOLEAN DEFAULT 0,
      domain_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_resource_type_flex_id ON resource_types(flex_id);
    CREATE INDEX IF NOT EXISTS idx_resource_type_name ON resource_types(name);
    CREATE INDEX IF NOT EXISTS idx_resource_type_class ON resource_types(applicable_class_name);
  `);

  // Create payment_terms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_by_user_id TEXT,
      flex_created_date TEXT,
      last_edit_user_id TEXT,
      flex_last_edit_date TEXT,
      grace_period INTEGER,
      credit_card BOOLEAN DEFAULT 0,
      domain_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_term_flex_id ON payment_terms(flex_id);
    CREATE INDEX IF NOT EXISTS idx_payment_term_name ON payment_terms(name);
  `);

  // Create maintenance_procedures table
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_procedures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      procedure_type TEXT,
      created_by_user_id TEXT,
      flex_created_date TEXT,
      last_edit_user_id TEXT,
      flex_last_edit_date TEXT,
      domain_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_maintenance_proc_flex_id ON maintenance_procedures(flex_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_proc_name ON maintenance_procedures(name);
  `);

  // Create pricing_models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      deleted INTEGER DEFAULT 0,
      unit_of_measure_id TEXT,
      unit_of_measure_name TEXT,
      count_unit_id TEXT,
      count_unit_name TEXT,
      start_date TEXT,
      end_date TEXT,
      disabled_by_default INTEGER DEFAULT 0,
      price_calculation_method TEXT,
      price_multiplier REAL,
      price_base_pricing_model_id TEXT,
      price_base_pricing_model_name TEXT,
      price_manual_tiers_enabled INTEGER DEFAULT 0,
      price_override_enabled INTEGER DEFAULT 0,
      price_line_qty_as_price_multiplier INTEGER DEFAULT 0,
      price_calculate_time INTEGER DEFAULT 0,
      price_time_slicing INTEGER DEFAULT 0,
      cost_calculation_method TEXT,
      cost_multiplier REAL,
      cost_base_pricing_model_id TEXT,
      cost_base_pricing_model_name TEXT,
      cost_manual_tiers_enabled INTEGER DEFAULT 0,
      cost_override_enabled INTEGER DEFAULT 0,
      cost_line_qty_as_price_multiplier INTEGER DEFAULT 0,
      has_manual_cost_tiers INTEGER DEFAULT 0,
      has_manual_price_tiers INTEGER DEFAULT 0,
      resource_type_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pricing_models_flex_id ON pricing_models(flex_id);
    CREATE INDEX IF NOT EXISTS idx_pricing_models_name ON pricing_models(name);
  `);

  // Create standard_discounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS standard_discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      rules TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_standard_discounts_flex_id ON standard_discounts(flex_id);
    CREATE INDEX IF NOT EXISTS idx_standard_discounts_name ON standard_discounts(name);
  `);

  // Create elements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS elements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT,
      document_number TEXT,
      definition_name TEXT,
      parent_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_elements_flex_id ON elements(flex_id);
    CREATE INDEX IF NOT EXISTS idx_elements_document_number ON elements(document_number);
    CREATE INDEX IF NOT EXISTS idx_elements_definition_name ON elements(definition_name);
    CREATE INDEX IF NOT EXISTS idx_elements_parent_name ON elements(parent_name);
  `);

  // Create inventory_models table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      short_name TEXT,
      preferred_display_string TEXT,
      narrative_description TEXT,
      barcode TEXT,
      rfid_tag TEXT,
      number TEXT,
      number_sequence INTEGER,
      external_number TEXT,
      deleted INTEGER DEFAULT 0,
      presumed_missing INTEGER DEFAULT 0,
      line_mute_by_default INTEGER DEFAULT 0,
      note_mute_by_default INTEGER DEFAULT 0,
      catalogue_item INTEGER DEFAULT 0,
      public_catalogue_item INTEGER DEFAULT 0,
      discountable INTEGER DEFAULT 0,
      max_discount REAL,
      barcode_label TEXT,
      imported INTEGER DEFAULT 0,
      short_hand TEXT,
      size TEXT,
      tracked_by_serial_unit INTEGER DEFAULT 0,
      container INTEGER DEFAULT 0,
      virtual_model INTEGER DEFAULT 0,
      serialized_contents INTEGER DEFAULT 0,
      free_pick_container INTEGER DEFAULT 0,
      contents_available INTEGER DEFAULT 0,
      contents_permanent INTEGER DEFAULT 0,
      replacement_cost REAL DEFAULT 0,
      purchase_cost REAL DEFAULT 0,
      depreciation_period INTEGER DEFAULT 0,
      salvage_value REAL DEFAULT 0,
      content_list_id TEXT,
      image_id TEXT,
      image_thumbnail_id TEXT,
      manufacturer TEXT,
      manufacture_country TEXT,
      notes TEXT,
      prep_time INTEGER DEFAULT 0,
      deprep_time INTEGER DEFAULT 0,
      weight REAL DEFAULT 0,
      height REAL DEFAULT 0,
      model_length REAL DEFAULT 0,
      width REAL DEFAULT 0,
      icon_id TEXT,
      icon_name TEXT,
      preset_id TEXT,
      preset_name TEXT,
      linear_unit_id TEXT,
      linear_unit_name TEXT,
      weight_unit_id TEXT,
      weight_unit_name TEXT,
      group_id TEXT,
      group_name TEXT,
      group_full_display_string TEXT,
      is_track_depreciation INTEGER DEFAULT 0,
      scheduled_maintenance_enabled INTEGER DEFAULT 0,
      average_cost REAL DEFAULT 0,
      created_by_user_id TEXT,
      flex_created_date TEXT,
      last_edit_user_id TEXT,
      flex_last_edit_date TEXT,
      deleted_by_user_id TEXT,
      deleted_by_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_inventory_models_flex_id ON inventory_models(flex_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_models_name ON inventory_models(name);
    CREATE INDEX IF NOT EXISTS idx_inventory_models_barcode ON inventory_models(barcode);
    CREATE INDEX IF NOT EXISTS idx_inventory_models_number ON inventory_models(number);
    CREATE INDEX IF NOT EXISTS idx_inventory_models_manufacturer ON inventory_models(manufacturer);
    CREATE INDEX IF NOT EXISTS idx_inventory_models_deleted ON inventory_models(deleted);
  `);

  // Create inventory_groups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flex_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      full_display_string TEXT,
      icon_id TEXT,
      icon_url TEXT,
      domain_id TEXT,
      parent_group_id TEXT,
      parent_group_name TEXT,
      parent_group_full_display_string TEXT,
      icon_name TEXT,
      icon_category TEXT,
      management_group INTEGER DEFAULT 0,
      sales_account_id TEXT,
      sales_account_name TEXT,
      purchase_account_id TEXT,
      purchase_account_name TEXT,
      view_group_ids TEXT,
      safe_work_method_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      flex_data TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_inventory_groups_flex_id ON inventory_groups(flex_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_groups_name ON inventory_groups(name);
    CREATE INDEX IF NOT EXISTS idx_inventory_groups_full_display ON inventory_groups(full_display_string);
    CREATE INDEX IF NOT EXISTS idx_inventory_groups_parent ON inventory_groups(parent_group_id);
  `);

  // Create serial_units table
  db.exec(`
    CREATE TABLE IF NOT EXISTS serial_units (
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_serial_units_flex_id ON serial_units(flex_id);
    CREATE INDEX IF NOT EXISTS idx_serial_units_barcode ON serial_units(barcode);
    CREATE INDEX IF NOT EXISTS idx_serial_units_stencil ON serial_units(stencil);
    CREATE INDEX IF NOT EXISTS idx_serial_units_serial ON serial_units(serial);
    CREATE INDEX IF NOT EXISTS idx_serial_units_model_id ON serial_units(inventory_model_id);
    CREATE INDEX IF NOT EXISTS idx_serial_units_location ON serial_units(current_location);
    CREATE INDEX IF NOT EXISTS idx_serial_units_deleted ON serial_units(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_serial_units_detail_fetched ON serial_units(detail_fetched);
  `);

  // Create sync_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT,
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
