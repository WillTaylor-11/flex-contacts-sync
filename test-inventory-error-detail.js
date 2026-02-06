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

async function testInventoryErrorDetail() {
  console.log('\n🔍 Getting Full Error Details from inventory-model/search\n');
  console.log('='.repeat(70) + '\n');

  try {
    const response = await api.get('/inventory-model/search', {
      params: { page: 0, size: 5 }
    });
    console.log('✅ Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('❌ Error Response:\n');
      console.log(`Status: ${error.response.status}`);
      console.log(`\nFull Error Data:`);
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 Testing Alternative Inventory Endpoints\n');

  const alternatives = [
    '/inventory',
    '/inventory-model-search',
    '/inventory-models',
    '/item-model/search',
    '/item-model'
  ];

  for (const endpoint of alternatives) {
    try {
      const response = await api.get(endpoint, { params: { page: 0, size: 1 } });
      console.log(`✅ ${endpoint}: FOUND (${response.data.totalElements || 'unknown'} records)`);

      const fs = require('fs');
      fs.writeFileSync('./inventory-found.json', JSON.stringify({
        endpoint,
        data: response.data
      }, null, 2));
      console.log('   💾 Saved to: inventory-found.json');
      break;
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }
}

testInventoryErrorDetail().catch(console.error);
