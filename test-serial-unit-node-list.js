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

async function testSerialUnitNodeList() {
  console.log('\n🔍 Testing /serial-unit/node-list with Inventory Model IDs\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();

  // Get inventory models, prioritizing those with serial tracking
  const models = db.prepare(`
    SELECT flex_id, name, barcode, tracked_by_serial_unit
    FROM inventory_models
    ORDER BY tracked_by_serial_unit DESC
    LIMIT 20
  `).all();

  console.log(`📋 Testing ${models.length} inventory models...\n`);

  let successCount = 0;
  let serialUnits = [];
  let workingModelIds = [];

  for (const model of models) {
    try {
      // Test GET /serial-unit/node-list/{id}
      const response = await api.get(`/serial-unit/node-list/${model.flex_id}`);
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
        console.log(`✅ ${model.name}`);
        console.log(`   Model ID: ${model.flex_id}`);
        console.log(`   Serial Units: ${count}`);
        console.log(`   Tracked by serial: ${model.tracked_by_serial_unit ? 'Yes' : 'No'}`);

        if (units[0]) {
          console.log(`   Sample fields: ${Object.keys(units[0]).slice(0, 10).join(', ')}`);
        }
        console.log('');

        successCount++;
        serialUnits = serialUnits.concat(units.map(u => ({ ...u, inventoryModelId: model.flex_id, inventoryModelName: model.name })));
        workingModelIds.push(model.flex_id);
      }

    } catch (error) {
      // Only log non-404 errors to reduce noise
      if (error.response?.status !== 404) {
        console.log(`⚠️  ${model.name}: ${error.response?.status || error.message}`);
      }
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log('='.repeat(70));
  console.log(`\n📊 Results: Found serial units for ${successCount} models\n`);

  if (serialUnits.length > 0) {
    console.log(`✅ Total serial units found: ${serialUnits.length}\n`);

    // Save results
    const fs = require('fs');
    fs.writeFileSync('./serial-unit-node-list-results.json', JSON.stringify({
      totalUnits: serialUnits.length,
      modelCount: successCount,
      workingModelIds: workingModelIds,
      sampleUnits: serialUnits.slice(0, 5),
      allFields: Object.keys(serialUnits[0] || {})
    }, null, 2));

    console.log('💾 Results saved to: serial-unit-node-list-results.json\n');

    // Show field analysis
    if (serialUnits[0]) {
      console.log('📋 Serial Unit Fields:');
      const fields = Object.keys(serialUnits[0]);
      fields.forEach(field => {
        const sampleValue = serialUnits[0][field];
        const type = typeof sampleValue;
        console.log(`   - ${field}: ${type} ${type === 'string' ? `(${sampleValue?.substring(0, 50)})` : `(${sampleValue})`}`);
      });
      console.log('');
    }

  } else {
    console.log('❌ No serial units found for any inventory models.\n');
  }
}

testSerialUnitNodeList().catch(console.error);
