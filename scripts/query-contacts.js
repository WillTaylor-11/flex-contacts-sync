#!/usr/bin/env node

require('dotenv').config();
const { getDatabase } = require('../src/database/schema');

const db = getDatabase();

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const searchTerm = args.slice(1).join(' ');

function displayContact(contact) {
  console.log('\n' + '─'.repeat(60));
  console.log(`ID: ${contact.flex_id}`);
  console.log(`Name: ${contact.name}`);
  if (contact.short_name) console.log(`Short Name: ${contact.short_name}`);
  if (contact.preferred_display_string) console.log(`Display String: ${contact.preferred_display_string}`);
  if (contact.barcode) console.log(`Barcode: ${contact.barcode}`);
  console.log(`Deleted: ${contact.deleted ? 'Yes' : 'No'}`);
  console.log(`Class: ${contact.class_name}`);
  console.log(`Domain: ${contact.domain_id}`);
  console.log(`Created: ${contact.created_at}`);
  console.log(`Updated: ${contact.updated_at}`);
}

function showHelp() {
  console.log('\n📋 Contact Query Tool\n');
  console.log('Usage:');
  console.log('  node query-contacts.js [command] [search term]');
  console.log('\nCommands:');
  console.log('  search <name>    - Search contacts by name');
  console.log('  id <flex_id>     - Get contact by Flex ID');
  console.log('  count            - Show total contact count');
  console.log('  deleted          - Show deleted contacts');
  console.log('  recent [limit]   - Show recently updated contacts (default: 10)');
  console.log('  stats            - Show database statistics');
  console.log('\nExamples:');
  console.log('  node query-contacts.js search Meyer Sound');
  console.log('  node query-contacts.js id 002b4bee-bd62-43f1-90ee-af8d535b2718');
  console.log('  node query-contacts.js recent 20');
  console.log('  node query-contacts.js deleted\n');
}

switch (command) {
  case 'search':
    if (!searchTerm) {
      console.log('\n❌ Please provide a search term\n');
      showHelp();
      break;
    }
    console.log(`\n🔍 Searching for: "${searchTerm}"\n`);
    const searchResults = db.prepare(
      'SELECT * FROM contacts WHERE name LIKE ? OR short_name LIKE ? ORDER BY name LIMIT 50'
    ).all(`%${searchTerm}%`, `%${searchTerm}%`);

    console.log(`Found ${searchResults.length} contacts:`);
    searchResults.forEach(displayContact);
    break;

  case 'id':
    if (!searchTerm) {
      console.log('\n❌ Please provide a Flex ID\n');
      showHelp();
      break;
    }
    const contact = db.prepare('SELECT * FROM contacts WHERE flex_id = ?').get(searchTerm);
    if (contact) {
      displayContact(contact);
      console.log('\n📄 Full JSON Data:');
      console.log(JSON.stringify(JSON.parse(contact.flex_data), null, 2));
    } else {
      console.log(`\n❌ Contact not found: ${searchTerm}\n`);
    }
    break;

  case 'count':
    const count = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    const deletedCount = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE deleted = 1').get();
    console.log('\n📊 Contact Statistics:');
    console.log(`  Total contacts: ${count.count}`);
    console.log(`  Active contacts: ${count.count - deletedCount.count}`);
    console.log(`  Deleted contacts: ${deletedCount.count}\n`);
    break;

  case 'deleted':
    const deleted = db.prepare('SELECT * FROM contacts WHERE deleted = 1 ORDER BY name').all();
    console.log(`\n🗑️  Found ${deleted.length} deleted contacts:\n`);
    deleted.forEach(displayContact);
    break;

  case 'recent':
    const limit = parseInt(searchTerm) || 10;
    const recent = db.prepare('SELECT * FROM contacts ORDER BY updated_at DESC LIMIT ?').all(limit);
    console.log(`\n🕒 ${limit} Most Recently Updated Contacts:\n`);
    recent.forEach(displayContact);
    break;

  case 'stats':
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM contacts').get().count,
      deleted: db.prepare('SELECT COUNT(*) as count FROM contacts WHERE deleted = 1').get().count,
      withBarcode: db.prepare('SELECT COUNT(*) as count FROM contacts WHERE barcode IS NOT NULL').get().count,
      withShortName: db.prepare('SELECT COUNT(*) as count FROM contacts WHERE short_name IS NOT NULL').get().count,
      classes: db.prepare('SELECT class_name, COUNT(*) as count FROM contacts GROUP BY class_name').all()
    };

    console.log('\n📊 Database Statistics:');
    console.log('='.repeat(60));
    console.log(`Total Contacts:        ${stats.total}`);
    console.log(`Active Contacts:       ${stats.total - stats.deleted}`);
    console.log(`Deleted Contacts:      ${stats.deleted}`);
    console.log(`With Barcode:          ${stats.withBarcode}`);
    console.log(`With Short Name:       ${stats.withShortName}`);
    console.log('\nBy Class:');
    stats.classes.forEach(c => {
      console.log(`  ${c.class_name}: ${c.count}`);
    });
    console.log('='.repeat(60) + '\n');
    break;

  default:
    showHelp();
}

console.log();
