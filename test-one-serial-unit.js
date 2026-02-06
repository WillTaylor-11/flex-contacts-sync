#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('./src/database/schema');
const { upsertSerialUnit } = require('./src/database/operations');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function testOneSerialUnit() {
  console.log('\n🔍 Testing Single Model Serial Unit Fetch\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();

  // Get the model we know has a serial unit
  const modelId = 'f1750330-029b-46cd-a5c8-3d0531b0345c';
  const model = db.prepare('SELECT flex_id, name FROM inventory_models WHERE flex_id = ?').get(modelId);

  console.log(`Testing model: ${model.name}`);
  console.log(`Model ID: ${model.flex_id}\n`);

  try {
    const response = await api.get('/serial-unit/node-list', {
      params: { modelId: model.flex_id }
    });

    const serialUnits = response.data;
    console.log(`✅ Found ${serialUnits.length} serial unit(s)\n`);

    if (serialUnits.length > 0) {
      // Add to database
      for (const unit of serialUnits) {
        unit.inventoryModelId = model.flex_id;
        unit.inventoryModelName = model.name;

        const result = upsertSerialUnit(unit);
        console.log(`💾 ${result.action === 'inserted' ? 'Inserted' : 'Updated'} serial unit:`);
        console.log(`   ID: ${unit.id}`);
        console.log(`   Name: ${unit.name}`);
        console.log(`   Barcode: ${unit.barcode}`);
        console.log(`   Stencil: ${unit.stencil}`);
        console.log(`   Location: ${unit.currentLocation}`);
        console.log('');
      }

      // Verify in database
      const count = db.prepare('SELECT COUNT(*) as count FROM serial_units').get();
      console.log(`✅ Total serial units in database: ${count.count}\n`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.response?.status || error.message}`);
  }

  console.log('='.repeat(70) + '\n');
}

testOneSerialUnit().catch(console.error);
