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

async function testInventoryWithSearch() {
  console.log('\n🔍 Testing inventory-model/search with searchText Parameter\n');
  console.log('='.repeat(70) + '\n');

  // Test with various common search terms
  const searchTerms = [
    'a',      // Single letter
    'ab',     // 2 letters (minimum)
    'the',    // Common word
    'cam',    // Camera-related
    'led',    // LED lights
    'mic',    // Microphone
    'ca',     // Generic prefix
    '*'       // Wildcard
  ];

  let workingSearch = null;

  for (const term of searchTerms) {
    try {
      const response = await api.get('/inventory-model/search', {
        params: {
          searchText: term,
          page: 0,
          size: 5
        }
      });

      const totalElements = response.data.totalElements || response.data.length || 0;
      console.log(`✅ searchText="${term}": SUCCESS (${totalElements} total records)`);

      if (!workingSearch && totalElements > 0) {
        workingSearch = { term, response: response.data };
      }

      if (totalElements > 0) {
        const sample = response.data.content?.[0] || response.data[0];
        if (sample) {
          console.log(`   Sample fields (${Object.keys(sample).length}): ${Object.keys(sample).slice(0, 8).join(', ')}...`);
        }
      }

    } catch (error) {
      console.log(`❌ searchText="${term}": ${error.response?.status || error.message}`);
      if (error.response?.data?.exceptionMessage) {
        console.log(`   ${error.response.data.exceptionMessage}`);
      }
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));

  if (workingSearch) {
    console.log(`\n✅ inventory-model/search is WORKING!\n`);
    console.log(`Total inventory models: ${workingSearch.response.totalElements || 'Unknown'}`);

    const fs = require('fs');
    fs.writeFileSync('./inventory-model-search-sample.json', JSON.stringify(workingSearch, null, 2));
    console.log('💾 Sample data saved to: inventory-model-search-sample.json\n');

    // Now test if we can get ALL items with a broad search
    console.log('🔍 Testing if we can retrieve all inventory models...\n');

    try {
      // Try getting first page with minimal search term
      const fullResponse = await api.get('/inventory-model/search', {
        params: {
          searchText: 'ab',
          page: 0,
          size: 100
        }
      });

      console.log(`📋 Found ${fullResponse.data.totalElements} total inventory models`);
      console.log(`   Pages available: ${Math.ceil(fullResponse.data.totalElements / 100)}`);
      console.log(`   Ready to sync!\n`);

      fs.writeFileSync('./inventory-model-full-sample.json', JSON.stringify({
        totalElements: fullResponse.data.totalElements,
        samplePage: fullResponse.data.content?.slice(0, 3)
      }, null, 2));

    } catch (error) {
      console.log(`❌ Could not get full list: ${error.message}`);
    }

  } else {
    console.log(`\n❌ Could not find a working search term\n`);
  }
}

testInventoryWithSearch().catch(console.error);
