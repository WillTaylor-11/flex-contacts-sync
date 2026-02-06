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

// Extended Flex-specific endpoints
const flexEndpoints = [
  // From contact structure - related entities
  '/contact-type',
  '/contact-internet-address',
  '/contact-phone',
  '/contact-address',

  // From the base URL structure hints
  '/item-instance',
  '/item-type',
  '/catalog-item',
  '/inventory-item',

  // Project/Order related
  '/project-instance',
  '/work-order',
  '/sales-order',
  '/purchase-order',

  // Resource related (we found resource-type)
  '/resource',
  '/resource-instance',
  '/resource-assignment',

  // Location/facility
  '/facility',
  '/building',
  '/storage-location',
  '/corporate-entity',

  // User/auth
  '/user-account',
  '/system-user',

  // Financial
  '/pricing-model',
  '/discount-model',
  '/tax-rule',
  '/payment-term',
  '/currency',

  // Other domain objects
  '/vendor',
  '/manufacturer',
  '/supplier',
  '/customer',
  '/client'
];

async function discoverExtendedEndpoints() {
  console.log('\n🔍 Extended Flex API Discovery\n');
  console.log('='.repeat(70) + '\n');

  const discovered = [];

  for (const endpoint of flexEndpoints) {
    try {
      const response = await api.get(endpoint, {
        params: { page: 0, size: 1 },
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        const data = response.data;
        let recordCount = 'N/A';
        let sampleRecord = null;

        if (data.totalElements !== undefined) {
          recordCount = data.totalElements;
          sampleRecord = data.content?.[0];
        } else if (Array.isArray(data)) {
          recordCount = data.length;
          sampleRecord = data[0];
        }

        console.log(`✅ ${endpoint.padEnd(30)} - ${recordCount} records`);

        if (sampleRecord) {
          const fields = Object.keys(sampleRecord);
          console.log(`   Fields (${fields.length}): ${fields.slice(0, 8).join(', ')}${fields.length > 8 ? '...' : ''}`);
        }

        discovered.push({
          endpoint,
          recordCount,
          fields: sampleRecord ? Object.keys(sampleRecord) : [],
          sample: data
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      if (error.response?.status !== 404) {
        console.log(`⚠️  ${endpoint.padEnd(30)} - Status ${error.response?.status || 'Error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Found ${discovered.length} additional endpoints\n`);

  if (discovered.length > 0) {
    const fs = require('fs');
    const allResults = JSON.parse(fs.readFileSync('./api-discovery-results.json', 'utf8'));
    allResults.push(...discovered);
    fs.writeFileSync('./api-discovery-results.json', JSON.stringify(allResults, null, 2));
    console.log('💾 Updated: api-discovery-results.json\n');
  }

  return discovered;
}

discoverExtendedEndpoints().catch(console.error);
