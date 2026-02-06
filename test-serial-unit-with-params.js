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

async function testSerialUnitWithParams() {
  console.log('\n🔍 Testing /serial-unit/node-list with Query Parameters\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();

  // Get a few inventory models to test
  const models = db.prepare(`
    SELECT flex_id, name, barcode, tracked_by_serial_unit
    FROM inventory_models
    ORDER BY tracked_by_serial_unit DESC
    LIMIT 10
  `).all();

  console.log(`📋 Testing ${models.length} inventory models...\n`);

  let successCount = 0;
  let serialUnits = [];
  let workingEndpoint = null;

  for (const model of models) {
    console.log(`Testing: ${model.name} (${model.flex_id})`);

    // Try different endpoint variations
    const tests = [
      { name: 'node-list path', url: `/serial-unit/node-list/${model.flex_id}`, params: {} },
      { name: 'node-list query', url: `/serial-unit/node-list`, params: { inventoryModelId: model.flex_id } },
      { name: 'node-list query (modelId)', url: `/serial-unit/node-list`, params: { modelId: model.flex_id } },
      { name: 'node-list query (id)', url: `/serial-unit/node-list`, params: { id: model.flex_id } },
      { name: 'list path', url: `/serial-unit/list/${model.flex_id}`, params: {} },
      { name: 'list query', url: `/serial-unit/list`, params: { inventoryModelId: model.flex_id } },
    ];

    for (const test of tests) {
      try {
        const response = await api.get(test.url, { params: test.params });
        const data = response.data;

        let count = 0;
        let units = [];

        if (Array.isArray(data)) {
          count = data.length;
          units = data;
        } else if (data.content && Array.isArray(data.content)) {
          count = data.content.length;
          units = data.content;
        }

        if (count > 0) {
          console.log(`  ✅ ${test.name}: ${count} units found`);
          if (units[0]) {
            console.log(`     Fields: ${Object.keys(units[0]).slice(0, 8).join(', ')}`);
          }

          successCount++;
          serialUnits = serialUnits.concat(units.map(u => ({
            ...u,
            inventoryModelId: model.flex_id,
            inventoryModelName: model.name
          })));
          workingEndpoint = { ...test, modelId: model.flex_id };
          break; // Found working endpoint for this model
        }

      } catch (error) {
        const status = error.response?.status;
        if (status !== 404) {
          console.log(`  ⚠️  ${test.name}: ${status || error.message}`);
        }
      }

      await new Promise(r => setTimeout(r, 80));
    }

    if (!workingEndpoint || serialUnits.length === 0) {
      console.log(`  ❌ No serial units found\n`);
    } else {
      console.log('');
    }

    // If we found a working endpoint, use it for remaining models
    if (workingEndpoint) {
      break;
    }
  }

  console.log('='.repeat(70));

  if (workingEndpoint) {
    console.log(`\n✅ Found working endpoint!\n`);
    console.log(`Endpoint: ${workingEndpoint.url}`);
    console.log(`Params: ${JSON.stringify(workingEndpoint.params)}`);
    console.log(`Total serial units: ${serialUnits.length}\n`);

    // Save results
    const fs = require('fs');
    fs.writeFileSync('./serial-unit-working-endpoint.json', JSON.stringify({
      endpoint: workingEndpoint,
      totalUnits: serialUnits.length,
      sampleUnits: serialUnits.slice(0, 3),
      allFields: Object.keys(serialUnits[0] || {})
    }, null, 2));

    console.log('💾 Results saved to: serial-unit-working-endpoint.json\n');

  } else {
    console.log('\n❌ No serial units accessible via GET requests.\n');
  }
}

testSerialUnitWithParams().catch(console.error);
