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

async function testInventoryDetail() {
  console.log('\n🔍 Testing Inventory Model Detail Endpoints\n');
  console.log('='.repeat(70) + '\n');

  // Get a sample ID from the search results
  const searchSample = JSON.parse(fs.readFileSync('./inventory-model-search-sample.json', 'utf-8'));
  const sampleId = searchSample.response.content[0].id;
  const sampleName = searchSample.response.content[0].name;

  console.log(`Testing with: ${sampleName}`);
  console.log(`ID: ${sampleId}\n`);

  const detailTests = [
    { name: 'inventory-model/{id}', endpoint: `/inventory-model/${sampleId}` },
    { name: 'inventory-model/detail/{id}', endpoint: `/inventory-model/detail/${sampleId}` },
    { name: 'inventory-item/{id}', endpoint: `/inventory-item/${sampleId}` },
    { name: 'item/{id}', endpoint: `/item/${sampleId}` }
  ];

  let workingEndpoint = null;

  for (const test of detailTests) {
    try {
      const response = await api.get(test.endpoint);
      console.log(`✅ ${test.name}: SUCCESS`);
      console.log(`   Fields: ${Object.keys(response.data).length}`);
      console.log(`   Top fields: ${Object.keys(response.data).slice(0, 10).join(', ')}`);

      workingEndpoint = { ...test, data: response.data };
      break;

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));

  if (workingEndpoint) {
    console.log(`\n✅ Detail endpoint found: ${workingEndpoint.endpoint}\n`);
    fs.writeFileSync('./inventory-model-detail-sample.json', JSON.stringify(workingEndpoint.data, null, 2));
    console.log('💾 Full detail sample saved to: inventory-model-detail-sample.json\n');
  } else {
    console.log(`\n⚠️  No detail endpoint available. Will use search data only.\n`);
  }

  // Now test comprehensive search strategy
  console.log('='.repeat(70));
  console.log('\n🔍 Testing Comprehensive Search Strategy\n');

  // Test with all single letters and common 2-letter combos
  const searchTerms = [
    'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj',
    'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at',
    'au', 'av', 'aw', 'ax', 'ay', 'az',
    'ba', 'ca', 'da', 'ea', 'fa', 'ga', 'ha', 'ia', 'ja', 'ka',
    'la', 'ma', 'na', 'oa', 'pa', 'qa', 'ra', 'sa', 'ta', 'ua',
    'va', 'wa', 'xa', 'ya', 'za',
    '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '20'
  ];

  let maxFound = 0;
  let bestTerm = '';

  console.log('Testing search terms to find the one that returns the most results...\n');

  for (const term of searchTerms.slice(0, 10)) { // Test first 10 to save time
    try {
      const response = await api.get('/inventory-model/search', {
        params: { searchText: term, page: 0, size: 1 }
      });

      const total = response.data.totalElements || 0;
      if (total > maxFound) {
        maxFound = total;
        bestTerm = term;
      }

      process.stdout.write(`\r   Tested ${searchTerms.indexOf(term) + 1} terms, max: ${maxFound} (term: "${bestTerm}")`);

    } catch (error) {
      // Skip errors
    }
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n\n✅ Best search term: "${bestTerm}" returns ${maxFound} inventory models\n`);
}

testInventoryDetail().catch(console.error);
