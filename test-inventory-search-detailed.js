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

async function testInventorySearchDetailed() {
  console.log('\n🔍 Testing inventory-model/search with Various Parameters\n');
  console.log('='.repeat(70) + '\n');

  const tests = [
    {
      name: 'GET with no params',
      method: 'GET',
      endpoint: '/inventory-model/search',
      params: {}
    },
    {
      name: 'GET with empty query',
      method: 'GET',
      endpoint: '/inventory-model/search',
      params: { query: '' }
    },
    {
      name: 'GET with wildcard',
      method: 'GET',
      endpoint: '/inventory-model/search',
      params: { query: '*' }
    },
    {
      name: 'GET with pagination only',
      method: 'GET',
      endpoint: '/inventory-model/search',
      params: { page: 0, size: 10 }
    },
    {
      name: 'POST with empty body',
      method: 'POST',
      endpoint: '/inventory-model/search',
      data: {}
    },
    {
      name: 'POST with query in body',
      method: 'POST',
      endpoint: '/inventory-model/search',
      data: { query: '' }
    },
    {
      name: 'POST with search params',
      method: 'POST',
      endpoint: '/inventory-model/search',
      data: { page: 0, size: 10 }
    },
    {
      name: 'GET inventory-model list',
      method: 'GET',
      endpoint: '/inventory-model',
      params: {}
    }
  ];

  const working = [];

  for (const test of tests) {
    try {
      let response;
      if (test.method === 'POST') {
        response = await api.post(test.endpoint, test.data, { params: test.params });
      } else {
        response = await api.get(test.endpoint, { params: test.params });
      }

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

      console.log(`✅ ${test.name}: SUCCESS`);
      console.log(`   Method: ${test.method}`);
      console.log(`   Records: ${recordCount}`);
      if (sample) {
        console.log(`   Fields: ${Object.keys(sample).length}`);
      }

      working.push({
        ...test,
        recordCount,
        sample
      });

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
      if (error.response?.status === 400 && error.response?.data) {
        console.log(`   Error detail: ${JSON.stringify(error.response.data).substring(0, 100)}`);
      }
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${working.length > 0 ? '✅' : '❌'} Found ${working.length} working approaches\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./inventory-search-working.json', JSON.stringify(working, null, 2));
    console.log('💾 Sample data saved to: inventory-search-working.json\n');
  }
}

testInventorySearchDetailed().catch(console.error);
