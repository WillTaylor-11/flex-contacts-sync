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

async function testAdditionalEndpoints() {
  console.log('\n🔍 Testing Additional Inventory & Related Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const tests = [
    // Inventory instances/items
    { name: 'item-instance/search', endpoint: '/item-instance/search', params: { searchText: 'ab' } },
    { name: 'inventory-item-instance/search', endpoint: '/inventory-item-instance/search', params: { searchText: 'ab' } },
    { name: 'inventory-instance/search', endpoint: '/inventory-instance/search', params: { searchText: 'ab' } },

    // Inventory groups/categories
    { name: 'inventory-group', endpoint: '/inventory-group', params: { page: 0, size: 5 } },
    { name: 'inventory-group/search', endpoint: '/inventory-group/search', params: { searchText: 'ab' } },

    // Inventory tags
    { name: 'inventory-tag', endpoint: '/inventory-tag', params: { page: 0, size: 5 } },
    { name: 'tag', endpoint: '/tag', params: { page: 0, size: 5 } },

    // Kits/packages
    { name: 'kit', endpoint: '/kit', params: { page: 0, size: 5 } },
    { name: 'kit/search', endpoint: '/kit/search', params: { searchText: 'ab' } },
    { name: 'package', endpoint: '/package', params: { page: 0, size: 5 } },

    // Presets/templates
    { name: 'preset', endpoint: '/preset', params: { page: 0, size: 5 } },
    { name: 'template', endpoint: '/template', params: { page: 0, size: 5 } },

    // Icons
    { name: 'icon', endpoint: '/icon', params: { page: 0, size: 5 } },

    // Locations/sites
    { name: 'site', endpoint: '/site', params: { page: 0, size: 5 } },
    { name: 'venue', endpoint: '/venue', params: { page: 0, size: 5 } },

    // Users/staff
    { name: 'staff', endpoint: '/staff', params: { page: 0, size: 5 } },
    { name: 'employee', endpoint: '/employee', params: { page: 0, size: 5 } },

    // Custom fields
    { name: 'custom-field', endpoint: '/custom-field', params: { page: 0, size: 5 } },
    { name: 'custom-field-definition', endpoint: '/custom-field-definition', params: { page: 0, size: 5 } }
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

      console.log(`✅ ${test.name.padEnd(35)} ${recordCount} records`);
      working.push({ ...test, recordCount, sample: data.content?.[0] || data[0] });

    } catch (error) {
      console.log(`❌ ${test.name.padEnd(35)} ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${working.length > 0 ? '✅' : '❌'} Found ${working.length} new working endpoints\n`);

  if (working.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('./additional-endpoints-found.json', JSON.stringify(working, null, 2));
    console.log('💾 Results saved to: additional-endpoints-found.json\n');

    console.log('📋 Summary of New Endpoints:\n');
    working.forEach(w => {
      console.log(`   • ${w.name}: ${w.recordCount} records`);
    });
    console.log();
  } else {
    console.log('ℹ️  No new accessible endpoints found.\n');
  }
}

testAdditionalEndpoints().catch(console.error);
