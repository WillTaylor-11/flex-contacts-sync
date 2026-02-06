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
 * Fetch all contact IDs from the list endpoint (fast)
 */
async function fetchAllContactIds() {
  const allIds = [];
  let currentPage = 0;
  let totalPages = 1;

  console.log('\n📋 Fetching contact list...\n');

  try {
    // Get first page to determine total
    const firstResponse = await api.get('/contact', {
      params: { page: 0, size: 100 }
    });

    totalPages = firstResponse.data.totalPages;
    const totalElements = firstResponse.data.totalElements;

    console.log(`📊 Total contacts: ${totalElements}`);
    console.log(`📄 Total pages: ${totalPages}\n`);

    // Collect all contact IDs from first page
    firstResponse.data.content.forEach(c => allIds.push(c.id));
    console.log(`✓ Page 1/${totalPages} - Found ${firstResponse.data.content.length} contact IDs`);

    // Fetch remaining pages
    for (currentPage = 1; currentPage < totalPages; currentPage++) {
      const response = await api.get('/contact', {
        params: { page: currentPage, size: 100 }
      });

      response.data.content.forEach(c => allIds.push(c.id));
      console.log(`✓ Page ${currentPage + 1}/${totalPages} - Found ${response.data.content.length} contact IDs`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`\n✅ Collected ${allIds.length} contact IDs\n`);
    return allIds;

  } catch (error) {
    console.error('\n❌ Error fetching contact list:', error.message);
    throw error;
  }
}

/**
 * Fetch full details for a single contact
 */
async function fetchContactDetails(contactId, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await api.get(`/contact/${contactId}`);
      return response.data;
    } catch (error) {
      if (attempt < retries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        logger.warn(`Retry ${attempt + 1}/${retries} for contact ${contactId} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Sync all contacts with full details
 */
async function syncContactsWithFullDetails() {
  const syncId = startSyncLog();
  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    status: 'running',
    error: null
  };

  try {
    // Step 1: Get all contact IDs
    const contactIds = await fetchAllContactIds();
    const totalContacts = contactIds.length;

    console.log('📥 Fetching full details for each contact...');
    console.log('⏱️  Estimated time: ~' + Math.ceil(totalContacts * 0.15 / 60) + ' minutes');
    console.log('🔄 Rate: ~8 req/sec (respecting API guidelines)\n');

    const startTime = Date.now();

    // Step 2: Fetch and store full details for each contact
    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];

      try {
        // Fetch full details
        const contactDetails = await fetchContactDetails(contactId);
        stats.fetched++;

        // Store in database
        const result = upsertContact(contactDetails);
        if (result.action === 'inserted') {
          stats.inserted++;
        } else if (result.action === 'updated') {
          stats.updated++;
        }

        // Progress indicator with ETA
        if ((i + 1) % 10 === 0 || i === contactIds.length - 1) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = (i + 1) / elapsed;
          const remaining = (contactIds.length - i - 1) / rate;
          const eta = Math.ceil(remaining / 60);

          console.log(
            `Progress: ${i + 1}/${contactIds.length} ` +
            `(${Math.round((i + 1) / contactIds.length * 100)}%) - ` +
            `ETA: ${eta}m | ` +
            `Rate: ${rate.toFixed(1)}/s | ` +
            `Inserted: ${stats.inserted}, Updated: ${stats.updated}, Errors: ${stats.errors}`
          );
        }

        // Rate limiting: 120ms delay between requests (~8 req/sec)
        // This is conservative to respect API guidelines and avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 120));

      } catch (error) {
        stats.errors++;
        logger.error(`Error processing contact ${contactId}: ${error.message}`);

        // Continue with next contact
        if (stats.errors > 50) {
          throw new Error('Too many errors, aborting sync');
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    stats.status = 'success';
    completeSyncLog(syncId, stats);

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('📈 Sync Summary');
    console.log('='.repeat(70));
    console.log(`Duration:       ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`Total fetched:  ${stats.fetched}`);
    console.log(`New contacts:   ${stats.inserted}`);
    console.log(`Updated:        ${stats.updated}`);
    console.log(`Errors:         ${stats.errors}`);
    console.log(`Total in DB:    ${getContactCount()}`);
    console.log('='.repeat(70));
    console.log('\n✅ Full sync completed successfully!\n');

  } catch (error) {
    stats.status = 'failed';
    stats.error = error.message;
    completeSyncLog(syncId, stats);

    console.error('\n❌ Sync failed:', error.message);
    console.error('Partial data may have been saved.');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isQuickSync = args.includes('--quick');

if (isQuickSync) {
  console.log('\n⚠️  Quick sync mode - using list endpoint only (limited data)');
  console.log('For full details, run without --quick flag\n');
  require('./sync-contacts');
} else {
  console.log('\n🔄 Starting FULL contact sync (with detailed information)');
  console.log('This fetches complete data for each contact including:');
  console.log('  • Personal details (name, email, phone, address)');
  console.log('  • Business info (company, employer, job title)');
  console.log('  • Financial data (credit limit, pricing, terms)');
  console.log('  • Relationships (resource types, contact types)');
  console.log('  • And much more...\n');

  syncContactsWithFullDetails();
}
