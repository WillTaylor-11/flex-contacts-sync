#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

// Common endpoint patterns to test
const potentialEndpoints = [
  // Core entities
  '/contact',
  '/item',
  '/inventory',
  '/equipment',
  '/product',
  '/asset',

  // Orders and rentals
  '/order',
  '/rental',
  '/booking',
  '/reservation',
  '/project',
  '/quote',
  '/invoice',

  // Organization
  '/location',
  '/venue',
  '/warehouse',
  '/department',
  '/category',

  // People and users
  '/user',
  '/employee',
  '/crew',
  '/staff',

  // Resources
  '/resource',
  '/resource-type',

  // Financial
  '/pricing',
  '/payment',
  '/transaction',
  '/tax',
  '/discount',

  // Configuration
  '/settings',
  '/configuration',
  '/preference',

  // Other
  '/tag',
  '/note',
  '/attachment',
  '/document',
  '/report'
];

async function discoverEndpoints() {
  console.log('\n🔍 Discovering Flex API Endpoints\n');
  console.log('Testing common endpoint patterns...\n');
  console.log('='.repeat(70) + '\n');

  const discovered = [];
  const notFound = [];

  for (const endpoint of potentialEndpoints) {
    try {
      const response = await api.get(endpoint, {
        params: { page: 0, size: 1 },
        validateStatus: (status) => status < 500 // Don't throw on 4xx
      });

      if (response.status === 200) {
        const data = response.data;
        let recordCount = 'N/A';

        // Try to determine record count
        if (data.totalElements !== undefined) {
          recordCount = data.totalElements;
        } else if (Array.isArray(data)) {
          recordCount = data.length + '+';
        } else if (data.content && Array.isArray(data.content)) {
          recordCount = data.totalElements || data.content.length + '+';
        }

        console.log(`✅ ${endpoint.padEnd(25)} - ${recordCount} records`);
        discovered.push({
          endpoint,
          status: response.status,
          recordCount,
          sample: data
        });
      } else if (response.status === 404) {
        console.log(`❌ ${endpoint.padEnd(25)} - Not found`);
        notFound.push(endpoint);
      } else {
        console.log(`⚠️  ${endpoint.padEnd(25)} - Status ${response.status}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`❌ ${endpoint.padEnd(25)} - Not found`);
        notFound.push(endpoint);
      } else if (error.response?.status === 403) {
        console.log(`🔒 ${endpoint.padEnd(25)} - Forbidden (may exist but no permission)`);
      } else {
        console.log(`❌ ${endpoint.padEnd(25)} - Error: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Discovery Summary:\n`);
  console.log(`  Found: ${discovered.length} working endpoints`);
  console.log(`  Not Found: ${notFound.length} endpoints`);

  if (discovered.length > 0) {
    console.log('\n📋 Discovered Endpoints:\n');
    discovered.forEach(d => {
      console.log(`\n${d.endpoint}`);
      console.log(`  Records: ${d.recordCount}`);

      // Show structure
      if (d.sample.content && d.sample.content.length > 0) {
        const fields = Object.keys(d.sample.content[0]);
        console.log(`  Fields: ${fields.length} (${fields.slice(0, 5).join(', ')}...)`);
      } else if (Array.isArray(d.sample) && d.sample.length > 0) {
        const fields = Object.keys(d.sample[0]);
        console.log(`  Fields: ${fields.length} (${fields.slice(0, 5).join(', ')}...)`);
      }
    });

    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      './api-discovery-results.json',
      JSON.stringify(discovered, null, 2)
    );
    console.log('\n💾 Detailed results saved to: api-discovery-results.json');
  }

  console.log('\n');
}

discoverEndpoints().catch(console.error);
