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

async function testElementDetails() {
  console.log('\n🔍 Testing Element Details\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Get a sample of elements
    const searchResponse = await api.get('/element/search', {
      params: { page: 0, size: 20 }
    });

    const elements = searchResponse.data.content;
    console.log(`📋 Found ${searchResponse.data.totalElements} total elements\n`);

    // Group by definition name to see types
    const byDefinition = {};
    elements.forEach(el => {
      const def = el.definitionName || 'Unknown';
      if (!byDefinition[def]) byDefinition[def] = [];
      byDefinition[def].push(el);
    });

    console.log('📊 Element Types in Sample:\n');
    Object.keys(byDefinition).forEach(def => {
      console.log(`   ${def}: ${byDefinition[def].length} elements`);
    });

    // Test detail endpoint with first element
    const testElement = elements[0];
    console.log(`\n🔍 Testing Detail Endpoint with: ${testElement.documentNumber}\n`);

    const detailTests = [
      { name: 'element/{id}', endpoint: `/element/${testElement.id}` },
      { name: 'element/detail/{id}', endpoint: `/element/detail/${testElement.id}` }
    ];

    for (const test of detailTests) {
      try {
        const response = await api.get(test.endpoint);
        console.log(`✅ ${test.name}: FOUND (${Object.keys(response.data).length} fields)`);

        const fs = require('fs');
        fs.writeFileSync('./element-detail-sample.json', JSON.stringify(response.data, null, 2));
        console.log('   💾 Saved sample to: element-detail-sample.json');
        break;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
      }
      await new Promise(r => setTimeout(r, 120));
    }

    // Save the search results
    const fs = require('fs');
    fs.writeFileSync('./element-search-sample.json', JSON.stringify({
      totalElements: searchResponse.data.totalElements,
      sampleElements: elements,
      elementTypes: byDefinition
    }, null, 2));
    console.log('\n💾 Search results saved to: element-search-sample.json\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testElementDetails().catch(console.error);
