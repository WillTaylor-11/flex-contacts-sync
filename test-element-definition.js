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

async function testElementDefinition() {
  console.log('\n🔍 Testing Element Definition Endpoints\n');
  console.log('='.repeat(70) + '\n');

  // Get unique definition names from element search
  const fs = require('fs');
  const searchData = JSON.parse(fs.readFileSync('./element-search-sample.json', 'utf-8'));

  const definitionNames = new Set();
  searchData.sampleElements.forEach(el => {
    if (el.definitionName) definitionNames.add(el.definitionName);
  });

  console.log(`📋 Found ${definitionNames.size} unique definition types:\n`);
  Array.from(definitionNames).forEach(name => {
    console.log(`   • ${name}`);
  });

  // Test various element-definition endpoint patterns
  console.log('\n🔍 Testing Element Definition Endpoints:\n');

  const tests = [
    { name: 'element-definition (list)', endpoint: '/element-definition', params: { page: 0, size: 10 } },
    { name: 'element-definition (no params)', endpoint: '/element-definition' }
  ];

  const working = [];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint, { params: test.params });
      const data = response.data;

      let recordCount = 'Unknown';
      if (data.totalElements !== undefined) {
        recordCount = data.totalElements;
      } else if (Array.isArray(data)) {
        recordCount = data.length;
      }

      console.log(`✅ ${test.name}: FOUND (${recordCount} records)`);
      working.push({ ...test, data });

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  if (working.length > 0) {
    fs.writeFileSync('./element-definition-sample.json', JSON.stringify(working, null, 2));
    console.log('\n💾 Saved to: element-definition-sample.json\n');
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${working.length > 0 ? '✅' : '❌'} Found ${working.length} working element-definition endpoints\n`);
}

testElementDefinition().catch(console.error);
