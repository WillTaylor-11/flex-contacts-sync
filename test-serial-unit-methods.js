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

async function testSerialUnitMethods() {
  console.log('\n🔍 Testing Serial Unit with Different Methods\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const model = db.prepare('SELECT flex_id, name FROM inventory_models LIMIT 1').get();

  console.log(`Testing with: ${model.name}`);
  console.log(`ID: ${model.flex_id}\n`);

  const tests = [
    // POST requests
    {
      name: 'POST /serial-unit with inventoryModelId',
      method: 'POST',
      endpoint: '/serial-unit',
      data: { inventoryModelId: model.flex_id }
    },
    {
      name: 'POST /serial-unit/search with modelId',
      method: 'POST',
      endpoint: '/serial-unit/search',
      data: { inventoryModelId: model.flex_id }
    },
    {
      name: 'POST /serial-unit/node-list',
      method: 'POST',
      endpoint: '/serial-unit/node-list',
      data: { inventoryModelId: model.flex_id }
    },

    // GET with different query params
    {
      name: 'GET /serial-unit?inventoryModelId',
      method: 'GET',
      endpoint: '/serial-unit',
      params: { inventoryModelId: model.flex_id, page: 0, size: 10 }
    },
    {
      name: 'GET /serial-unit with modelId',
      method: 'GET',
      endpoint: '/serial-unit',
      params: { modelId: model.flex_id }
    }
  ];

  let workingApproach = null;

  for (const test of tests) {
    try {
      let response;
      if (test.method === 'POST') {
        response = await api.post(test.endpoint, test.data, { params: test.params });
      } else {
        response = await api.get(test.endpoint, { params: test.params });
      }

      const data = response.data;
      let count = 0;

      if (Array.isArray(data)) {
        count = data.length;
      } else if (data.content) {
        count = data.content.length || 0;
      } else if (data.totalElements !== undefined) {
        count = data.totalElements;
      }

      console.log(`✅ ${test.name}: SUCCESS (${count} items)`);
      if (count > 0 || data) {
        workingApproach = { ...test, response: data };
        console.log(`   Response type: ${Array.isArray(data) ? 'array' : 'object'}`);
        if (data[0] || data.content?.[0]) {
          const sample = data[0] || data.content[0];
          console.log(`   Sample keys: ${Object.keys(sample).slice(0, 8).join(', ')}`);
        }
      }

    } catch (error) {
      const status = error.response?.status;
      console.log(`❌ ${test.name}: ${status || error.message}`);
      if (status === 400 && error.response?.data) {
        const msg = error.response.data.exceptionMessage || JSON.stringify(error.response.data).substring(0, 100);
        console.log(`   Error: ${msg}`);
      }
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\n' + '='.repeat(70));

  if (workingApproach) {
    console.log('\n✅ Found working approach!\n');
    console.log(`Method: ${workingApproach.method}`);
    console.log(`Endpoint: ${workingApproach.endpoint}`);
    console.log(`Params: ${JSON.stringify(workingApproach.params || workingApproach.data)}\n`);

    const fs = require('fs');
    fs.writeFileSync('./serial-unit-working-method.json', JSON.stringify(workingApproach, null, 2));
    console.log('💾 Saved to: serial-unit-working-method.json\n');
  } else {
    console.log('\n❌ No working method found.\n');
    console.log('Trying alternative: checking if models have associated serial numbers...\n');

    // Check a few models to see if any have data
    const models = db.prepare('SELECT flex_id, name, barcode FROM inventory_models LIMIT 20').all();

    for (const m of models) {
      try {
        // Try a generic serial unit list
        const response = await api.get('/serial-unit', {
          params: { inventoryModelId: m.flex_id, page: 0, size: 1 },
          validateStatus: (s) => s < 500
        });

        if (response.status === 200 && response.data) {
          console.log(`✅ Found data for: ${m.name}`);
          console.log(`   Barcode: ${m.barcode}`);
          workingApproach = { model: m, response: response.data };
          break;
        }
      } catch (e) {
        // Continue
      }
      await new Promise(r => setTimeout(r, 50));
    }
  }
}

testSerialUnitMethods().catch(console.error);
