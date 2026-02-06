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
  console.log('\n🔍 Testing Next Priority Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const tests = [
    { name: 'Pricing Model', endpoint: '/pricing-model/af4a35ac-aedf-11df-b8d5-00e08175e43e' },
    { name: 'Currency', endpoint: '/currency/911e3d4c-aedc-11df-b8d5-00e08175e43e' },
    { name: 'Corporate Entity', endpoint: '/corporate-entity/4149edac-b139-11df-b8d5-00e08175e43e' },
    { name: 'Discount Model', endpoint: '/discount-model/test-id' }
  ];

  const working = [];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint);
      console.log(`✅ ${test.name}: FOUND (${Object.keys(response.data).length} fields)`);
      working.push({ ...test, data: response.data });
    } catch (error) {
      console.log(`❌ ${test.name}: NOT FOUND (${error.response?.status || error.message})`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Found ${working.length} working endpoints\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./next-endpoints-sample.json', JSON.stringify(working, null, 2));
    console.log('💾 Sample data saved to: next-endpoints-sample.json\n');
  }
}

testEndpoints().catch(console.error);
