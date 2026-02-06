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

async function testNewEndpoints() {
  console.log('\n🔍 Testing New Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const tests = [
    { name: 'Element Definitions', endpoint: '/element-definition', params: { page: 0, size: 5 } },
    { name: 'Element Definitions (alt)', endpoint: '/element-definitions', params: { page: 0, size: 5 } },
    { name: 'Element Search', endpoint: '/element/search', params: { page: 0, size: 5 } },
    { name: 'Element Search (POST)', endpoint: '/element/search', method: 'POST', data: {} },
    { name: 'User Profile', endpoint: '/user-profile', params: { page: 0, size: 5 } },
    { name: 'User Profile (me)', endpoint: '/user-profile/me' }
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
        recordCount = `${data.length}+`;
        sample = data[0];
      } else if (typeof data === 'object') {
        recordCount = '1 (single object)';
        sample = data;
      }

      console.log(`✅ ${test.name}: FOUND`);
      console.log(`   Records: ${recordCount}`);
      console.log(`   Fields: ${sample ? Object.keys(sample).length : 'N/A'}`);

      working.push({
        name: test.name,
        endpoint: test.endpoint,
        method: test.method || 'GET',
        recordCount,
        sample
      });

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Found ${working.length} working endpoints\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./new-endpoints-sample.json', JSON.stringify(working, null, 2));
    console.log('💾 Sample data saved to: new-endpoints-sample.json\n');
  }
}

testNewEndpoints().catch(console.error);
