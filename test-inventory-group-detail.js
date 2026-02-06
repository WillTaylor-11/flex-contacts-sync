#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function testInventoryGroupDetail() {
  console.log('\n🔍 Testing Inventory Group Details\n');
  console.log('='.repeat(70) + '\n');

  // Get sample from search
  const searchResponse = await api.get('/inventory-group/search', {
    params: { searchText: 'ab', page: 0, size: 10 }
  });

  console.log(`📋 Found ${searchResponse.data.totalElements} total inventory groups\n`);
  console.log('Sample groups:\n');

  const samples = searchResponse.data.content.slice(0, 5);
  samples.forEach((group, i) => {
    console.log(`   ${i + 1}. ${group.name || group.id}`);
    console.log(`      Fields: ${Object.keys(group).join(', ')}`);
  });

  // Test detail endpoint
  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 Testing Detail Endpoint\n');

  const sampleId = samples[0].id;
  console.log(`Testing with ID: ${sampleId}\n`);

  const detailTests = [
    `/inventory-group/${sampleId}`,
    `/inventory-group/detail/${sampleId}`
  ];

  let detailData = null;

  for (const endpoint of detailTests) {
    try {
      const response = await api.get(endpoint);
      console.log(`✅ ${endpoint}: SUCCESS`);
      console.log(`   Fields: ${Object.keys(response.data).length}`);
      detailData = response.data;
      break;
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  // Save samples
  fs.writeFileSync('./inventory-group-sample.json', JSON.stringify({
    searchSample: samples,
    detailSample: detailData,
    totalElements: searchResponse.data.totalElements
  }, null, 2));

  console.log('\n💾 Samples saved to: inventory-group-sample.json\n');

  if (detailData) {
    console.log('📋 Detail fields available:');
    console.log(`   ${Object.keys(detailData).join(', ')}\n`);
  }
}

testInventoryGroupDetail().catch(console.error);
