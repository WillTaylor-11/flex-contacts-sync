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

// Priority endpoints to test based on resource types
const priorityEndpoints = {
  'Inventory': [
    '/inventory-item',
    '/item-instance',
    '/item',
    '/equipment-item',
    '/rental-item'
  ],
  'Services': [
    '/service-offering',
    '/service',
    '/labor',
    '/service-item'
  ],
  'Locations': [
    '/business-location',
    '/location',
    '/facility',
    '/warehouse-location'
  ],
  'Projects': [
    '/project',
    '/work-order',
    '/sales-order',
    '/rental-order',
    '/booking'
  ],
  'Users': [
    '/user-account',
    '/system-user',
    '/user',
    '/employee'
  ]
};

async function testEndpoint(endpoint) {
  try {
    const response = await api.get(endpoint, {
      params: { page: 0, size: 1 },
      validateStatus: (status) => status < 500
    });

    if (response.status === 200) {
      const data = response.data;
      let recordCount = 'Unknown';
      let sample = null;

      if (data.totalElements !== undefined) {
        recordCount = data.totalElements;
        sample = data.content?.[0];
      } else if (Array.isArray(data)) {
        recordCount = `${data.length}+`;
        sample = data[0];
      }

      return {
        found: true,
        recordCount,
        fields: sample ? Object.keys(sample).length : 0,
        sample
      };
    }
    return { found: false };
  } catch (error) {
    return { found: false };
  }
}

async function discoverPriorityEndpoints() {
  console.log('\n🔍 Discovering Priority Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const discovered = [];

  for (const [category, endpoints] of Object.entries(priorityEndpoints)) {
    console.log(`📂 ${category}:`);

    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);

      if (result.found) {
        console.log(`   ✅ ${endpoint.padEnd(30)} ${result.recordCount} records (${result.fields} fields)`);
        discovered.push({
          category,
          endpoint,
          recordCount: result.recordCount,
          fields: result.fields,
          sample: result.sample
        });
      } else {
        console.log(`   ❌ ${endpoint}`);
      }

      await new Promise(r => setTimeout(r, 100));
    }
    console.log();
  }

  console.log('='.repeat(70));
  console.log(`\n✅ Found ${discovered.length} working endpoints\n`);

  if (discovered.length > 0) {
    console.log('📋 Summary:\n');
    discovered.forEach(d => {
      console.log(`   ${d.category.padEnd(15)} ${d.endpoint.padEnd(30)} ${d.recordCount} records`);
    });

    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      './priority-endpoints.json',
      JSON.stringify(discovered, null, 2)
    );
    console.log('\n💾 Saved to: priority-endpoints.json\n');
  } else {
    console.log('⚠️  No additional endpoints found. You may need to check API documentation.');
    console.log('   The 4 endpoints already synced may be all that\'s available.\n');
  }
}

discoverPriorityEndpoints().catch(console.error);
