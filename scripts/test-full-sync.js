#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { upsertContact, getContactById } = require('../src/database/operations');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function testFullSync() {
  console.log('\n🧪 Testing Full Contact Sync (3 contacts)\n');
  console.log('='.repeat(70));

  try {
    // Get first 3 contact IDs
    const listResponse = await api.get('/contact', { params: { page: 0, size: 3 } });
    const contacts = listResponse.data.content;

    console.log(`\n📋 Found ${contacts.length} test contacts:\n`);
    contacts.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.id})`);
    });

    console.log('\n📥 Fetching full details and saving to database...\n');

    for (let i = 0; i < contacts.length; i++) {
      const contactId = contacts[i].id;

      // Fetch full details
      console.log(`\nFetching: ${contacts[i].name}...`);
      const detailResponse = await api.get(`/contact/${contactId}`);
      const fullContact = detailResponse.data;

      console.log(`  ✓ Fetched ${Object.keys(fullContact).length} fields`);

      // Show some key details
      if (fullContact.firstName) console.log(`    Name: ${fullContact.firstName} ${fullContact.lastName || ''}`);
      if (fullContact.company) console.log(`    Company: ${fullContact.company}`);
      if (fullContact.internetAddresses && fullContact.internetAddresses.length > 0) {
        console.log(`    Email: ${fullContact.internetAddresses[0].url}`);
      }
      if (fullContact.resourceTypes && fullContact.resourceTypes.length > 0) {
        console.log(`    Types: ${fullContact.resourceTypes.map(rt => rt.name).join(', ')}`);
      }

      // Save to database
      const result = upsertContact(fullContact);
      console.log(`  ✓ ${result.action === 'inserted' ? 'Inserted' : 'Updated'} in database`);

      // Verify saved data
      const saved = getContactById(contactId);
      console.log(`  ✓ Verified: ${saved.first_name || saved.name} saved with ${JSON.parse(saved.internet_addresses).length} email(s)`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Test completed successfully!');
    console.log('\nThe full sync is working correctly. To sync all 1,600 contacts, run:');
    console.log('  node scripts/sync-contacts-full.js\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testFullSync();
