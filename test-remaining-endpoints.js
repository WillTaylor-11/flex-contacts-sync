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

async function testEndpoints() {
  console.log('\n🔍 Testing Discount Model and Alternative Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const discountIds = [
    '25a2fbbd-d530-43ea-bf0a-abe464292301',
    'c5715ed9-49c0-408b-b751-58db41c0c74a',
    '9d92023c-ca76-11e0-a8de-00e08175e43e',
    'ca3ce5f9-9ebe-4ce0-b975-92f2d6f7d81a'
  ];

  const tests = [
    { name: 'Discount Model #1', endpoint: `/discount-model/${discountIds[0]}` },
    { name: 'Discount #1', endpoint: `/discount/${discountIds[0]}` },
    { name: 'Standard Discount #1', endpoint: `/standard-discount/${discountIds[0]}` }
  ];

  const working = [];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint);
      console.log(`✅ ${test.name}: FOUND (${Object.keys(response.data).length} fields)`);
      working.push({ ...test, data: response.data });
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${working.length > 0 ? '✅' : '❌'} Found ${working.length} working endpoints\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./discount-model-sample.json', JSON.stringify(working, null, 2));
    console.log('💾 Sample data saved to: discount-model-sample.json\n');
  }
}

testEndpoints().catch(console.error);
