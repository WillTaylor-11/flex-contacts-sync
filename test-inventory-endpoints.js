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

async function testInventoryEndpoints() {
  console.log('\n🔍 Testing Inventory Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const tests = [
    { name: 'inventory-model/search', endpoint: '/inventory-model/search', params: { page: 0, size: 5 } },
    { name: 'inventory-model', endpoint: '/inventory-model', params: { page: 0, size: 5 } },
    { name: 'inventory-item/search', endpoint: '/inventory-item/search', params: { page: 0, size: 5 } },
    { name: 'inventory-item', endpoint: '/inventory-item', params: { page: 0, size: 5 } },
    { name: 'item/search', endpoint: '/item/search', params: { page: 0, size: 5 } },
    { name: 'item', endpoint: '/item', params: { page: 0, size: 5 } }
  ];

  const working = [];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint, { params: test.params });
      const data = response.data;

      let recordCount = 'Unknown';
      let sample = null;

      if (data.totalElements !== undefined) {
        recordCount = data.totalElements;
        sample = data.content?.[0];
      } else if (Array.isArray(data)) {
        recordCount = data.length;
        sample = data[0];
      } else if (typeof data === 'object') {
        recordCount = '1 (single object)';
        sample = data;
      }

      console.log(`✅ ${test.name}: FOUND`);
      console.log(`   Records: ${recordCount}`);
      if (sample) {
        console.log(`   Fields: ${Object.keys(sample).length}`);
        console.log(`   Sample keys: ${Object.keys(sample).slice(0, 10).join(', ')}`);
      }

      working.push({
        name: test.name,
        endpoint: test.endpoint,
        recordCount,
        sample
      });

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${working.length > 0 ? '✅' : '❌'} Found ${working.length} working inventory endpoints\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./inventory-endpoints-sample.json', JSON.stringify(working, null, 2));
    console.log('💾 Sample data saved to: inventory-endpoints-sample.json\n');
  }
}

testInventoryEndpoints().catch(console.error);
