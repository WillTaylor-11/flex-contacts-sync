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

async function testSerialUnitEndpoints() {
  console.log('\n🔍 Testing Serial Unit Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();

  // Get a few sample inventory model IDs
  const sampleModels = db.prepare(`
    SELECT flex_id, name, barcode
    FROM inventory_models
    WHERE tracked_by_serial_unit = 1
    LIMIT 10
  `).all();

  console.log(`📋 Found ${sampleModels.length} sample models with serial tracking\n`);

  if (sampleModels.length === 0) {
    console.log('⚠️  No models with serial tracking found. Trying any models...\n');
    const anyModels = db.prepare('SELECT flex_id, name, barcode FROM inventory_models LIMIT 5').all();
    sampleModels.push(...anyModels);
  }

  // Test with first model
  const testModel = sampleModels[0];
  console.log(`Testing with model: ${testModel.name}`);
  console.log(`ID: ${testModel.flex_id}\n`);

  const tests = [
    { name: 'serial-unit/node-list', endpoint: `/serial-unit/node-list/${testModel.flex_id}` },
    { name: 'serial-unit/list', endpoint: `/serial-unit/list/${testModel.flex_id}` },
    { name: 'serial-unit/search', endpoint: `/serial-unit/search`, params: { inventoryModelId: testModel.flex_id } },
    { name: 'item-instance/list', endpoint: `/item-instance/list/${testModel.flex_id}` }
  ];

  let workingEndpoint = null;
  let serialUnits = [];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint, { params: test.params });
      const data = response.data;

      let count = 0;
      if (Array.isArray(data)) {
        count = data.length;
        serialUnits = data;
      } else if (data.content) {
        count = data.content.length;
        serialUnits = data.content;
      } else if (typeof data === 'object') {
        count = Object.keys(data).length;
      }

      console.log(`✅ ${test.name}: SUCCESS (${count} items)`);
      if (count > 0) {
        workingEndpoint = test;
        console.log(`   Sample keys: ${Object.keys(serialUnits[0]).slice(0, 8).join(', ')}`);
      }

    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  if (workingEndpoint && serialUnits.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Serial unit list endpoint found!\n');
    console.log(`Endpoint: ${workingEndpoint.endpoint}\n`);

    // Test detail endpoint with first serial unit
    const testSerialId = serialUnits[0].id || serialUnits[0].serialUnitId;
    console.log(`🔍 Testing detail endpoint with ID: ${testSerialId}\n`);

    const detailTests = [
      `/serial-unit/${testSerialId}`,
      `/serial-unit/detail/${testSerialId}`,
      `/item-instance/${testSerialId}`
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

    // Save results
    const fs = require('fs');
    fs.writeFileSync('./serial-unit-test-results.json', JSON.stringify({
      listEndpoint: workingEndpoint,
      sampleList: serialUnits.slice(0, 3),
      detailSample: detailData
    }, null, 2));

    console.log('\n💾 Test results saved to: serial-unit-test-results.json\n');

    if (detailData) {
      console.log('📋 Detail fields:');
      console.log(`   ${Object.keys(detailData).slice(0, 15).join(', ')}...\n`);
    }

  } else {
    console.log('\n⚠️  No serial unit list endpoint found for this model.\n');
    console.log('Testing with other models...\n');

    // Try a few more models
    for (let i = 1; i < Math.min(5, sampleModels.length); i++) {
      const model = sampleModels[i];
      try {
        const response = await api.get(`/serial-unit/node-list/${model.flex_id}`);
        if (response.data && response.data.length > 0) {
          console.log(`✅ Found serial units for: ${model.name} (${response.data.length} units)`);
          serialUnits = response.data;
          break;
        }
      } catch (error) {
        // Continue
      }
      await new Promise(r => setTimeout(r, 120));
    }
  }

  console.log('='.repeat(70) + '\n');
}

testSerialUnitEndpoints().catch(console.error);
