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

async function testUserEndpoints() {
  console.log('\n🔍 Testing User-Related Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const tests = [
    { name: 'user', endpoint: '/user', params: { page: 0, size: 5 } },
    { name: 'user-account', endpoint: '/user-account', params: { page: 0, size: 5 } },
    { name: 'system-user', endpoint: '/system-user', params: { page: 0, size: 5 } },
    { name: 'user-profile', endpoint: '/user-profile', params: { page: 0, size: 5 } },
    { name: 'current-user', endpoint: '/current-user' },
    { name: 'me', endpoint: '/me' },
    { name: 'auth/user', endpoint: '/auth/user' }
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

      console.log(`✅ ${test.name}: FOUND (${recordCount} records)`);
      if (sample) {
        console.log(`   Fields: ${Object.keys(sample).length}`);
      }

      working.push({ ...test, data, sample });

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${working.length > 0 ? '✅' : '❌'} Found ${working.length} working user endpoints\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./user-endpoints-sample.json', JSON.stringify(working, null, 2));
    console.log('💾 Saved to: user-endpoints-sample.json\n');
  }
}

testUserEndpoints().catch(console.error);
