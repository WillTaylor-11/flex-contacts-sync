#!/usr/bin/env node

require('dotenv').config();
const { getDatabase } = require('../src/database/schema');
const db = getDatabase();

console.log('\n📊 COMPLETE FLEX DATABASE SUMMARY\n');
console.log('='.repeat(70) + '\n');

// Get all table stats
const tables = ['contacts', 'resource_types', 'payment_terms', 'maintenance_procedures'];

tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  const sample = db.prepare(`SELECT * FROM ${table} LIMIT 1`).get();

  console.log(`📋 ${table.toUpperCase().replace(/_/g, ' ')}`);
  console.log(`   Records: ${count}`);

  if (sample) {
    const fields = Object.keys(sample).filter(k => !['id', 'flex_data', 'created_at', 'updated_at'].includes(k));
    console.log(`   Key fields: ${fields.slice(0, 5).join(', ')}...`);
  }
  console.log();
});

// Resource type breakdown
console.log('🏷️  RESOURCE TYPE CATEGORIES:\n');
const resourceTypes = db.prepare('SELECT name, applicable_class_name FROM resource_types ORDER BY name').all();
const byClass = {};
resourceTypes.forEach(rt => {
  const className = rt.applicable_class_name.split('.').pop();
  if (!byClass[className]) byClass[className] = [];
  byClass[className].push(rt.name);
});

Object.entries(byClass).forEach(([className, types]) => {
  console.log(`   ${className}:`);
  types.forEach(t => console.log(`     • ${t}`));
  console.log();
});

// Payment terms
console.log('💳 PAYMENT TERMS:\n');
const paymentTerms = db.prepare('SELECT name, credit_card FROM payment_terms ORDER BY name').all();
paymentTerms.forEach(pt => {
  console.log(`   • ${pt.name} ${pt.credit_card ? '(Credit Card)' : ''}`);
});

// Maintenance procedures
console.log(`\n🔧 MAINTENANCE PROCEDURES:\n`);
const procedures = db.prepare('SELECT name, procedure_type FROM maintenance_procedures').all();
procedures.forEach(mp => {
  console.log(`   • ${mp.name}${mp.procedure_type ? ` (${mp.procedure_type})` : ''}`);
});

// Sync history
console.log(`\n📋 SYNC HISTORY:\n`);
const syncs = db.prepare('SELECT entity_type, sync_completed_at, records_fetched, status FROM sync_log ORDER BY id DESC LIMIT 10').all();
syncs.forEach(s => {
  const entity = s.entity_type || 'contacts';
  console.log(`   ${s.sync_completed_at}: ${entity.padEnd(25)} ${s.records_fetched} records - ${s.status}`);
});

console.log('\n' + '='.repeat(70) + '\n');
