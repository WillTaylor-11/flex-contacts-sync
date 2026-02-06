#!/usr/bin/env node

require('dotenv').config();
const { getAllContacts, getContactCount, getRecentSyncLogs } = require('../src/database/operations');

console.log('\n📊 Database Statistics\n');
console.log('='.repeat(60));

// Get contact count
const count = getContactCount();
console.log(`Total contacts in database: ${count}`);

// Get recent sync logs
console.log('\n📋 Recent Sync History:');
const syncLogs = getRecentSyncLogs(5);
syncLogs.forEach(log => {
  console.log(`\nSync ID: ${log.id}`);
  console.log(`  Status: ${log.status}`);
  console.log(`  Started: ${log.sync_started_at}`);
  console.log(`  Completed: ${log.sync_completed_at}`);
  console.log(`  Fetched: ${log.records_fetched}, Inserted: ${log.records_inserted}, Updated: ${log.records_updated}`);
  if (log.error_message) {
    console.log(`  Error: ${log.error_message}`);
  }
});

// Sample some contacts
console.log('\n📇 Sample Contacts (first 10):');
console.log('='.repeat(60));
const contacts = getAllContacts();
contacts.slice(0, 10).forEach(contact => {
  console.log(`\nID: ${contact.flex_id}`);
  console.log(`  Name: ${contact.name}`);
  console.log(`  Short Name: ${contact.short_name || 'N/A'}`);
  console.log(`  Deleted: ${contact.deleted ? 'Yes' : 'No'}`);
  console.log(`  Class: ${contact.class_name}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✅ Database check completed!\n');
