#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { upsertContact, getContactCount, startSyncLog, completeSyncLog } = require('../src/database/operations');
const logger = require('../src/utils/logger');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Auth-Token': API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

/**
 * Fetch all contacts from Flex API with pagination
 */
async function fetchAllContacts() {
  const allContacts = [];
  let currentPage = 0;
  let totalPages = 1;
  let totalElements = 0;

  console.log('\n🔄 Starting Flex contacts sync...\n');

  try {
    // Start with first page to get total info
    const firstResponse = await api.get('/contact', {
      params: { page: 0, size: 100 } // Use larger page size for efficiency
    });

    totalPages = firstResponse.data.totalPages;
    totalElements = firstResponse.data.totalElements;

    console.log(`📊 Total contacts: ${totalElements}`);
    console.log(`📄 Total pages: ${totalPages}\n`);

    // Process first page
    const firstPageContacts = firstResponse.data.content || [];
    allContacts.push(...firstPageContacts);
    console.log(`✓ Page 1/${totalPages} - Fetched ${firstPageContacts.length} contacts`);

    // Fetch remaining pages
    for (currentPage = 1; currentPage < totalPages; currentPage++) {
      const response = await api.get('/contact', {
        params: { page: currentPage, size: 100 }
      });

      const pageContacts = response.data.content || [];
      allContacts.push(...pageContacts);

      console.log(`✓ Page ${currentPage + 1}/${totalPages} - Fetched ${pageContacts.length} contacts`);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Successfully fetched ${allContacts.length} contacts from Flex API\n`);
    return allContacts;

  } catch (error) {
    console.error('\n❌ Error fetching contacts:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Sync contacts to database
 */
async function syncContacts() {
  const syncId = startSyncLog();
  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    status: 'running',
    error: null
  };

  try {
    // Fetch all contacts from Flex
    const contacts = await fetchAllContacts();
    stats.fetched = contacts.length;

    console.log('💾 Storing contacts in database...\n');

    // Insert/update contacts in database
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      try {
        const result = upsertContact(contact);

        if (result.action === 'inserted') {
          stats.inserted++;
        } else if (result.action === 'updated') {
          stats.updated++;
        }

        // Progress indicator
        if ((i + 1) % 100 === 0 || i === contacts.length - 1) {
          console.log(`Progress: ${i + 1}/${contacts.length} contacts processed`);
        }
      } catch (error) {
        logger.error(`Error upserting contact ${contact.id}: ${error.message}`);
      }
    }

    stats.status = 'success';
    completeSyncLog(syncId, stats);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Sync Summary');
    console.log('='.repeat(60));
    console.log(`Total fetched:  ${stats.fetched}`);
    console.log(`New contacts:   ${stats.inserted}`);
    console.log(`Updated:        ${stats.updated}`);
    console.log(`Total in DB:    ${getContactCount()}`);
    console.log('='.repeat(60));
    console.log('\n✅ Sync completed successfully!\n');

  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    completeSyncLog(syncId, stats);

    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncContacts();
