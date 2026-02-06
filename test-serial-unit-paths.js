#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('./src/database/schema');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function testSerialUnitPaths() {
  console.log('\n🔍 Testing Various Serial Unit Path Structures\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();

  // Get a sample inventory model ID
  const models = db.prepare('SELECT flex_id, name FROM inventory_models LIMIT 5').all();
  const testModel = models[0];

  console.log(`Testing with: ${testModel.name}`);
  console.log(`ID: ${testModel.flex_id}\n`);

  const pathTests = [
    // Original suggestions
    `/serial-unit/node-list/${testModel.flex_id}`,
    `/serial-unit/${testModel.flex_id}/node-list`,

    // Alternative paths
    `/inventory-model/${testModel.flex_id}/serial-unit`,
    `/inventory-model/${testModel.flex_id}/serial-units`,
    `/inventory-model/${testModel.flex_id}/item-instance`,
    `/inventory-model/${testModel.flex_id}/instances`,

    // Query parameter approach
    { path: '/serial-unit', params: { inventoryModelId: testModel.flex_id } },
    { path: '/serial-unit/list', params: { inventoryModelId: testModel.flex_id } },
    { path: '/serial-unit', params: { modelId: testModel.flex_id } },

    // Node-based paths
    `/node/serial-unit/${testModel.flex_id}`,
    `/node/list/${testModel.flex_id}`,

    // Item instance paths
    `/item-instance`,
    `/item-instance/model/${testModel.flex_id}`
  ];

  let found = [];

  for (const test of pathTests) {
    const endpoint = typeof test === 'string' ? test : test.path;
    const params = typeof test === 'object' ? test.params : {};

    try {
      const response = await api.get(endpoint, { params });
      const data = response.data;

      let count = 0;
      if (Array.isArray(data)) {
        count = data.length;
      } else if (data.content) {
        count = data.content.length;
      } else if (data.totalElements !== undefined) {
        count = data.totalElements;
      }

      console.log(`✅ ${endpoint} ${JSON.stringify(params)}: SUCCESS (${count} items)`);
      found.push({ endpoint, params, count, sample: data[0] || data.content?.[0] });

    } catch (error) {
      const status = error.response?.status;
      if (status === 400 || status === 405) {
        console.log(`⚠️  ${endpoint}: ${status} (endpoint exists but wrong params/method)`);
      } else {
        console.log(`❌ ${endpoint}: ${status || error.message}`);
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n' + '='.repeat(70));

  if (found.length > 0) {
    console.log(`\n✅ Found ${found.length} working endpoint(s)!\n`);
    found.forEach(f => {
      console.log(`   ${f.endpoint} - ${f.count} items`);
    });

    const fs = require('fs');
    fs.writeFileSync('./serial-unit-paths-found.json', JSON.stringify(found, null, 2));
    console.log('\n💾 Saved to: serial-unit-paths-found.json\n');
  } else {
    console.log('\n❌ No working serial unit endpoints found with this inventory model.\n');
    console.log('The serial unit data might not be accessible via REST API,');
    console.log('or may require different access methods.\n');
  }
}

testSerialUnitPaths().catch(console.error);
