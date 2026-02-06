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

async function testSerialUnitGETOnly() {
  console.log('\n🔍 Testing Serial Unit GET Endpoints ONLY\n');
  console.log('='.repeat(70) + '\n');

  // Test various GET endpoints for serial units
  const tests = [
    // List endpoints
    { name: 'GET /serial-unit', endpoint: '/serial-unit' },
    { name: 'GET /serial-unit with page params', endpoint: '/serial-unit', params: { page: 0, size: 10 } },
    { name: 'GET /item-instance', endpoint: '/item-instance' },
    { name: 'GET /item-instance with page params', endpoint: '/item-instance', params: { page: 0, size: 10 } },

    // Alternative endpoints
    { name: 'GET /serial-number', endpoint: '/serial-number' },
    { name: 'GET /inventory-item', endpoint: '/inventory-item' },
    { name: 'GET /inventory-item with page params', endpoint: '/inventory-item', params: { page: 0, size: 10 } },
    { name: 'GET /item', endpoint: '/item' },
    { name: 'GET /item with page params', endpoint: '/item', params: { page: 0, size: 10 } },
  ];

  let successCount = 0;
  let results = [];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint, { params: test.params });
      const data = response.data;

      let count = 0;
      if (Array.isArray(data)) {
        count = data.length;
      } else if (data.content && Array.isArray(data.content)) {
        count = data.content.length;
      } else if (data.totalElements !== undefined) {
        count = data.totalElements;
      }

      console.log(`✅ ${test.name}: SUCCESS - ${count} items found`);
      successCount++;

      if (count > 0) {
        const sample = Array.isArray(data) ? data[0] : data.content?.[0];
        if (sample) {
          console.log(`   Sample fields: ${Object.keys(sample).slice(0, 10).join(', ')}`);
          results.push({ test, sample });
        }
      }

    } catch (error) {
      const status = error.response?.status || 'Network Error';
      console.log(`❌ ${test.name}: ${status}`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Results: ${successCount} out of ${tests.length} endpoints successful\n`);

  if (results.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./serial-unit-get-results.json', JSON.stringify(results, null, 2));
    console.log('✅ Working endpoints found! Results saved to: serial-unit-get-results.json\n');
  } else {
    console.log('❌ No serial unit endpoints are accessible via GET requests.\n');
    console.log('Serial unit data is NOT available through this API.\n');
  }
}

testSerialUnitGETOnly().catch(console.error);
