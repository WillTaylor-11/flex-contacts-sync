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

async function testInventoryGroupFixed() {
  console.log('\n🔍 Testing Inventory Group Details\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Get sample from search
    const searchResponse = await api.get('/inventory-group/search', {
      params: { searchText: 'ab', page: 0, size: 10 }
    });

    console.log('Response structure:', JSON.stringify(searchResponse.data, null, 2).substring(0, 500));

    const data = searchResponse.data;
    let items = [];
    let total = 0;

    if (data.content) {
      items = data.content;
      total = data.totalElements || items.length;
    } else if (Array.isArray(data)) {
      items = data;
      total = items.length;
    } else {
      console.log('Unknown response structure');
      return;
    }

    console.log(`\n📋 Found ${total} total inventory groups\n`);
    console.log('Sample groups:\n');

    const samples = items.slice(0, 5);
    samples.forEach((group, i) => {
      console.log(`   ${i + 1}. ${group.name || group.id}`);
      console.log(`      ID: ${group.id}`);
      if (group.fullDisplayString) {
        console.log(`      Path: ${group.fullDisplayString}`);
      }
    });

    // Test detail endpoint if we have an ID
    if (samples.length > 0 && samples[0].id) {
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
        totalElements: total
      }, null, 2));

      console.log('\n💾 Samples saved to: inventory-group-sample.json\n');

      if (detailData) {
        console.log('📋 Detail fields available:');
        console.log(`   ${Object.keys(detailData).join(', ')}\n`);
      } else {
        console.log('\n⚠️  No detail endpoint available. Using search data only.\n');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testInventoryGroupFixed().catch(console.error);
