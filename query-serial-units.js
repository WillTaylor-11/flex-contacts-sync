#!/usr/bin/env node

require('dotenv').config();
const { getDatabase } = require('./src/database/schema');

const db = getDatabase();

console.log('\n📦 Serial Units Database Query\n');
console.log('='.repeat(70) + '\n');

// Get total count
const countResult = db.prepare('SELECT COUNT(*) as count FROM serial_units').get();
console.log(`Total serial units in database: ${countResult.count}\n`);

if (countResult.count > 0) {
  // Get all serial units with details
  const units = db.prepare(`
    SELECT
      su.flex_id,
      su.name,
      su.barcode,
      su.stencil,
      su.serial,
      su.current_location,
      su.is_deleted,
      su.out_of_commission,
      su.inventory_model_name,
      su.created_at
    FROM serial_units su
    ORDER BY su.created_at DESC
  `).all();

  console.log('Serial Units:\n');
  units.forEach((unit, index) => {
    console.log(`${index + 1}. ${unit.name}`);
    console.log(`   ID: ${unit.flex_id}`);
    console.log(`   Barcode/Stencil: ${unit.barcode || unit.stencil || 'N/A'}`);
    console.log(`   Serial: ${unit.serial || 'N/A'}`);
    console.log(`   Location: ${unit.current_location || 'N/A'}`);
    console.log(`   Model: ${unit.inventory_model_name || 'N/A'}`);
    console.log(`   Deleted: ${unit.is_deleted ? 'Yes' : 'No'}`);
    console.log(`   Out of Commission: ${unit.out_of_commission ? 'Yes' : 'No'}`);
    console.log('');
  });

  // Get stats by model
  const modelStats = db.prepare(`
    SELECT
      inventory_model_name,
      COUNT(*) as unit_count
    FROM serial_units
    GROUP BY inventory_model_name
    ORDER BY unit_count DESC
    LIMIT 10
  `).all();

  if (modelStats.length > 0) {
    console.log('='.repeat(70));
    console.log('\nTop Models by Serial Unit Count:\n');
    modelStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.inventory_model_name}: ${stat.unit_count} units`);
    });
    console.log('');
  }

} else {
  console.log('⚠️  No serial units found in database.\n');
  console.log('Run sync-serial-units-slow.js to fetch serial units from the API.\n');
}

console.log('='.repeat(70) + '\n');
